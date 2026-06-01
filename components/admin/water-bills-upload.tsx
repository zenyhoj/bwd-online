"use client";

import { useState } from "react";
import * as xlsx from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadCloud, CheckCircle2, FileWarning, Loader2 } from "lucide-react";
import { uploadWaterBillsAction, type WaterBillUploadData } from "@/actions/water-bills";
import { useRouter } from "next-nprogress-bar";

export function WaterBillsUpload() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<WaterBillUploadData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
      const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (!rows || rows.length === 0) {
        throw new Error("The Excel file is empty.");
      }

      // Check if the first row is a header
      const hasHeader = rows[0] && (String(rows[0][0]).toLowerCase().includes("account") || isNaN(Number(rows[0][2])));
      const dataRows = hasHeader ? rows.slice(1) : rows;

      // The user specified exact columns: 
      // 0: concessionaire_id
      // 1: account_number
      // 2: account_name
      // 3: address
      // 4: current_bill_amount
      // 5: due_date
      // 6: amount_after_duedate
      
      const data: WaterBillUploadData[] = dataRows.map((row) => {
        const getVal = (idx: number) => String(row[idx] || "").trim();
        
        const rawAmount = parseFloat(getVal(4).replace(/[^0-9.-]+/g, ""));
        const rawAmountAfter = parseFloat(getVal(6).replace(/[^0-9.-]+/g, ""));
        
        let parsedDate = getVal(5);
        if (!isNaN(Number(parsedDate)) && parsedDate !== "") {
          const dateObj = xlsx.SSF.parse_date_code(Number(parsedDate));
          if (dateObj) {
            parsedDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
          }
        }

        return {
          account_number: getVal(1),
          account_name: getVal(2),
          address: getVal(3) || null,
          amount: isNaN(rawAmount) ? 0 : rawAmount,
          due_date: parsedDate,
          amount_after_duedate: isNaN(rawAmountAfter) ? null : rawAmountAfter,
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
    
    try {
      const res = await uploadWaterBillsAction(parsedData);
      if (!res.success) {
        throw new Error(res.message);
      }
      setSuccessResult(res.message || "Bills uploaded successfully.");
      setParsedData(null);
      setFile(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to upload water bills to the server.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Water Bills</CardTitle>
        <CardDescription>
          Upload an Excel (.xlsx) file containing the monthly water bills. 
          The system expects columns in this order: Concessionaire ID, Account Number, Account Name, Address, Current Bill Amount, Due Date, Amount After Due Date.
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
            <div className="relative">
              <Button variant="outline" size="sm">Select File</Button>
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileSelect}
              />
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
                    <th className="p-2 font-medium">Amount</th>
                    <th className="p-2 font-medium">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedData.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td className="p-2">{row.account_number}</td>
                      <td className="p-2 truncate max-w-[150px]">{row.account_name}</td>
                      <td className="p-2 font-mono">₱{row.amount.toFixed(2)}</td>
                      <td className="p-2">{row.due_date}</td>
                    </tr>
                  ))}
                  {parsedData.length > 50 && (
                    <tr>
                      <td colSpan={4} className="p-2 text-center text-muted-foreground text-xs italic">
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
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Upload
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
