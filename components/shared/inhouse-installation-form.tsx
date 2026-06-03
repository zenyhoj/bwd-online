"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Lock, Camera, Upload, CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/image-utils";

import { updateInhouseInstallationAction } from "@/actions/accredited-plumbers";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { AccreditedPlumber } from "@/types";

type InhouseInstallationFormProps = {
  applicationId: string;
  plumbers: AccreditedPlumber[];
  currentPlumberId?: string | null;
  currentCompletedAt?: string | null;
  currentProofImageUrl?: string | null;
  currentSignedAt?: string | null;
  minimumCompletedAt?: string | null;
  isCompleted?: boolean;
  isLocked?: boolean;
  variant?: "applicant" | "admin";
};

export function InhouseInstallationForm({
  applicationId,
  plumbers,
  currentPlumberId,
  currentCompletedAt,
  currentProofImageUrl,
  currentSignedAt,
  minimumCompletedAt,
  isCompleted = false,
  isLocked = false,
  variant = "applicant"
}: InhouseInstallationFormProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!isCompleted && !isLocked);
  const [state, formAction, pending] = useActionState(updateInhouseInstallationAction, initialActionState);
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const completionDateValue = currentCompletedAt ? currentCompletedAt.slice(0, 10) : "";
  const signedDateValue = currentSignedAt ? currentSignedAt.slice(0, 10) : "";
  const minimumCompletedDateValue = minimumCompletedAt ? minimumCompletedAt.slice(0, 10) : undefined;
  const formResetKey = `${applicationId}:${currentPlumberId ?? ""}:${completionDateValue}:${signedDateValue}:${currentProofImageUrl ?? ""}:${isCompleted ? "done" : "pending"}`;
  const isReadOnly = (variant === "admin" && isCompleted) || isLocked || !isEditing;
  const isApplicant = variant === "applicant";

  const selectedPlumber = plumbers.find(p => p.id === currentPlumberId);

  useEffect(() => {
    if (variant === "applicant" && state.success && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
      setIsEditing(false);
    }
  }, [router, state.redirectTo, state.success, variant]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Check both inputs for the proof image
    const fileInput = fileInputRef.current?.files?.[0];
    const cameraInput = cameraInputRef.current?.files?.[0];
    const file = fileInput || cameraInput;

    const finalFormData = new FormData();
    // Copy all other fields
    formData.forEach((value, key) => {
      if (key !== "proofImage") {
        finalFormData.append(key, value);
      }
    });

    if (file && file.type.startsWith("image/")) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        finalFormData.append("proofImage", compressed);
      } catch (err) {
        console.error("Compression failed", err);
        finalFormData.append("proofImage", file);
      } finally {
        setIsCompressing(false);
      }
    } else if (file) {
      finalFormData.append("proofImage", file);
    }

    startTransition(() => {
      formAction(finalFormData);
    });
  };

  return (
    <div id={variant === "applicant" ? "inhouse-installation" : undefined} className="space-y-4 scroll-mt-24">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {variant === "admin" ? "Inhouse installation" : "Mark inhouse installation complete"}
        </h3>
        {isCompleted && !isLocked && !isEditing && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-2 rounded-full font-bold text-primary"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3 w-3" />
            Edit info
          </Button>
        )}
        {isLocked && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Lock className="h-3 w-3" />
            Locked
          </div>
        )}
      </div>

      {plumbers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No accredited plumbers are available yet. Ask the administrator to add one first.
        </p>
      ) : isCompleted && !isEditing ? (
        <div className="grid gap-6 rounded-xl border border-border/60 bg-muted/5 p-5 md:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border/40 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plumber</p>
                <p className="mt-1 text-sm font-semibold">{selectedPlumber?.full_name ?? "Unknown"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</p>
                <p className="mt-1 text-sm font-semibold">{currentCompletedAt ? formatDate(currentCompletedAt) : "N/A"}</p>
              </div>
            </div>
            {currentProofImageUrl && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Installation Proof</p>
                <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border/50 shadow-sm transition-transform hover:scale-105">
                  <img
                    src={currentProofImageUrl}
                    alt="Proof"
                    className="h-full w-full object-cover"
                  />
                  <Link 
                    href={currentProofImageUrl} 
                    target="_blank" 
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                  >
                    <span className="text-[10px] font-bold text-white underline">Full View</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-end space-y-3">
            <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Status: Fully Verified</p>
            </div>
            {isLocked && (
              <p className="text-[11px] text-center text-muted-foreground leading-relaxed italic">
                This workflow is finalized and can no longer be modified.
              </p>
            )}
          </div>
        </div>
      ) : (
        <form key={formResetKey} onSubmit={handleSubmit} className="grid gap-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="completed" value="true" />

          {isApplicant ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(220px,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              <div className="space-y-2">
                <Label htmlFor={`accreditedPlumberId-${applicationId}`}>Accredited plumber</Label>
                <select
                  id={`accreditedPlumberId-${applicationId}`}
                  name="accreditedPlumberId"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue={currentPlumberId ?? ""}
                  required
                  disabled={isReadOnly}
                >
                  <option value="">Select accredited plumber</option>
                  {plumbers.map((plumber) => (
                    <option key={plumber.id} value={plumber.id}>
                      {plumber.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`completedAt-${applicationId}`}>Date of completion</Label>
                <input
                  id={`completedAt-${applicationId}`}
                  name="completedAt"
                  type="date"
                  defaultValue={completionDateValue}
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Photo proof of the plumber</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center gap-2"
                    onClick={() => {
                      cameraInputRef.current?.click();
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <Camera className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Camera</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center gap-2"
                    onClick={() => {
                      fileInputRef.current?.click();
                      if (cameraInputRef.current) cameraInputRef.current.value = "";
                    }}
                  >
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">File</span>
                  </Button>
                </div>

                {/* Hidden Inputs */}
                <input
                  type="file"
                  name="proofImage"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {selectedFileName ? (
                  <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium truncate">{selectedFileName}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Required: Upload a selfie or work photo.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 items-start">
              <div className="space-y-2">
                <Label htmlFor={`accreditedPlumberId-${applicationId}`}>Accredited plumber</Label>
                <select
                  id={`accreditedPlumberId-${applicationId}`}
                  name="accreditedPlumberId"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue={currentPlumberId ?? ""}
                  required
                  disabled={isReadOnly}
                >
                  <option value="">Select accredited plumber</option>
                  {plumbers.map((plumber) => (
                    <option key={plumber.id} value={plumber.id}>
                      {plumber.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`signedAt-${applicationId}`}>Attendance sheet signed date</Label>
                <input
                  id={`signedAt-${applicationId}`}
                  name="signedAt"
                  type="date"
                  defaultValue={signedDateValue}
                  required
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isReadOnly}
                />
                <p className="text-xs text-muted-foreground">
                  Use the BWD office attendance date.
                </p>
              </div>
            </div>
          )}

          {currentProofImageUrl ? (
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-sm font-medium">Current applicant proof</p>
              <img
                src={currentProofImageUrl}
                alt="Applicant proof of in-house plumbing"
                className="max-h-56 rounded-md border border-border/60 object-cover"
              />
              <Link href={currentProofImageUrl} target="_blank" className="text-sm text-primary hover:underline">
                Open full image
              </Link>
            </div>
          ) : null}

          {variant === "admin" && currentSignedAt ? (
            <p className="text-sm text-muted-foreground">Current signed date on file: {signedDateValue}</p>
          ) : null}

          <div className="space-y-4">
            {variant === "applicant" && isCompleted ? (
              <p className="text-sm text-muted-foreground">
                This application is already marked complete. You can still update the plumber, completion date, or proof image if needed.
              </p>
            ) : null}
            {variant === "admin" && isCompleted ? (
              <p className="text-sm text-muted-foreground">This application is already marked complete.</p>
            ) : null}
            <FormMessage state={state} />
            <Button type="submit" disabled={isReadOnly || pending || isCompressing} className="w-full sm:w-auto lg:min-w-[180px] font-bold">
              {isCompressing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing...
                </>
              ) : isReadOnly ? (
                "Completed"
              ) : isCompleted ? (
                "Save changes"
              ) : (
                "Mark complete"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
