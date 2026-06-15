"use client";

import { useState } from "react";
import * as xlsx from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadCloud, CheckCircle2, FileWarning, Loader2 } from "lucide-react";
import { uploadWaterBillsAction, clearWaterBillsAction, type WaterBillUploadData } from "@/actions/water-bills";
import { useRouter } from "next-nprogress-bar";
import { ClearWaterBillsButton } from "@/components/admin/clear-water-bills-button";
import { formatDateTime } from "@/lib/format";

export function WaterBillsUpload({
  recordsCount,
  lastUploadDate,
}: {
  recordsCount: number;
  lastUploadDate: string | null;
}) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<WaterBillUploadData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [successResult, setSuccessResult] = useState<string | null>(null);

  const processFile = async (selectedFile: File) => {
    setError(null);
    setSuccessResult(null);
    setFile(selectedFile);
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON array of arrays to rely strictly on column indices
      // Using raw: false ensures we get the formatted string exactly as seen in Excel,
      // preventing Account Numbers or Dates from being read as weird float values.
      const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });

      if (!rows || rows.length === 0) {
        throw new Error("The Excel file is empty.");
      }

      // Check if the first row is a header
      const hasHeader = rows[0] && (String(rows[0][0]).toLowerCase().includes("account") || isNaN(Number(rows[0][2])));
      const dataRows = hasHeader ? rows.slice(1) : rows;

      // The user specified exact columns: 
      // 0: account_number
      // 1: name
      // 2: date_bill
      // 3: consumption
      // 4: total
      // 5: amount_after_due_date
      // 6: due
      // 7: disconnection
      
      const data: WaterBillUploadData[] = dataRows.map((row) => {
        const getVal = (idx: number) => String(row[idx] || "").trim();
        
        const rawConsumption = parseFloat(getVal(3).replace(/[^0-9.-]+/g, ""));
        const rawTotal = parseFloat(getVal(4).replace(/[^0-9.-]+/g, ""));
        const rawAmountAfter = parseFloat(getVal(5).replace(/[^0-9.-]+/g, ""));
        
        const parseExcelDate = (val: string) => {
          if (!isNaN(Number(val)) && val !== "") {
            const dateObj = xlsx.SSF.parse_date_code(Number(val));
            if (dateObj) {
              return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
            }
          }
          return val;
        };
        
        const parseAccountNumber = (val: string) => {
          // If Excel auto-formatted the account number as a date (e.g. 12/20/91)
          // we can reconstruct it back to XXXX-XX-XXX format.
          if (val.includes("/")) {
            const parts = val.split("/");
            if (parts.length === 3) {
              const p1 = parts[0].padStart(4, "0");
              const p2 = parts[1].padStart(2, "0");
              let p3 = parts[2];
              // extract last two digits if year is 4 digits
              if (p3.length >= 4) p3 = p3.slice(-2);
              p3 = p3.padStart(3, "0");
              return `${p1}-${p2}-${p3}`;
            }
          }
          return val;
        };

        return {
          account_number: parseAccountNumber(getVal(0)),
          name: getVal(1),
          date_bill: parseExcelDate(getVal(2)) || null,
          consumption: isNaN(rawConsumption) ? 0 : rawConsumption,
          total: isNaN(rawTotal) ? 0 : rawTotal,
          amount_after_due_date: isNaN(rawAmountAfter) ? null : rawAmountAfter,
          due: parseExcelDate(getVal(6)) || null,
          disconnection: parseExcelDate(getVal(7)) || null,
        };
      }).filter(r => r.account_number !== "");

      if (data.length === 0) {
        throw new Error("Could not extract any valid rows from the file.");
      }

      setParsedData(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to parse the Excel file.");
      setFile(null);
      setParsedData(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!parsedData) return;
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      // Clear existing bills first
      const clearRes = await clearWaterBillsAction();
      if (!clearRes.success) {
        throw new Error(clearRes.message);
      }

      const CHUNK_SIZE = 500;
      let insertedCount = 0;
      
      for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
        const chunk = parsedData.slice(i, i + CHUNK_SIZE);
        const res = await uploadWaterBillsAction(chunk, false); // false = do not clear existing
        
        if (!res.success) {
          throw new Error(res.message);
        }
        
        insertedCount += chunk.length;
        setUploadProgress(Math.round((insertedCount / parsedData.length) * 100));
      }

      setSuccessResult(`Successfully uploaded ${insertedCount} bills.`);
      setParsedData(null);
      setFile(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to upload water bills to the server.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Water Bills</CardTitle>
        <CardDescription>
          Upload an Excel (.xlsx) file containing the monthly water bills. 
          The system expects columns in this exact order: Account Number, Name, Date Bill, Consumption, Total, Amount After Due Date, Due, Disconnection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {!parsedData && !successResult && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="mb-2 text-sm font-medium">Drag & drop your Excel file here</p>
            <p className="text-xs text-muted-foreground mb-4">Supports .xlsx and .xls</p>
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <Button variant="outline" size="sm" className="rounded-full shadow-sm">
                    Select File
                  </Button>
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileSelect}
                  />
                </div>
                <ClearWaterBillsButton />
              </div>
              
              <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-3 whitespace-nowrap py-1.5 px-4 bg-secondary/50 border border-border/30 rounded-full mt-6">
                <span>No. of Records: <span className="text-foreground font-bold">{recordsCount}</span></span>
                <span className="text-muted-foreground/30">|</span>
                <span>Last Upload Date: <span className="text-foreground font-bold">{lastUploadDate ? formatDateTime(lastUploadDate) : "Never"}</span></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <FileWarning className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successResult && (
          <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{successResult}</AlertDescription>
          </Alert>
        )}

        {parsedData && (
          <div className="space-y-4">
            <Alert className="bg-primary/5 border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                Successfully parsed <strong>{parsedData.length}</strong> valid rows from {file?.name}.
              </AlertDescription>
            </Alert>
            
            <div className="max-h-64 overflow-auto rounded-md border text-sm">
              <table className="w-full text-left">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 font-medium">Account #</th>
                    <th className="p-2 font-medium">Name</th>
                    <th className="p-2 font-medium">Date Bill</th>
                    <th className="p-2 font-medium">Consumption</th>
                    <th className="p-2 font-medium">Total</th>
                    <th className="p-2 font-medium">Amount After Due</th>
                    <th className="p-2 font-medium">Due Date</th>
                    <th className="p-2 font-medium">Disconnection</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedData.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td className="p-2">{row.account_number}</td>
                      <td className="p-2 truncate max-w-[150px]">{row.name}</td>
                      <td className="p-2">{row.date_bill || "-"}</td>
                      <td className="p-2">{row.consumption}</td>
                      <td className="p-2 font-mono">₱{row.total.toFixed(2)}</td>
                      <td className="p-2 font-mono">{row.amount_after_due_date !== null && row.amount_after_due_date !== undefined ? `₱${row.amount_after_due_date.toFixed(2)}` : "-"}</td>
                      <td className="p-2">{row.due || "-"}</td>
                      <td className="p-2">{row.disconnection || "-"}</td>
                    </tr>
                  ))}
                  {parsedData.length > 50 && (
                    <tr>
                      <td colSpan={8} className="p-2 text-center text-muted-foreground text-xs italic">
                        ...and {parsedData.length - 50} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setParsedData(null); setFile(null); }} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading} className="min-w-[160px]">
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress !== null ? `Uploading... ${uploadProgress}%` : "Uploading..."}
                  </>
                ) : (
                  "Confirm & Upload"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
