"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, UploadCloud } from "lucide-react";
import { Upload } from "tus-js-client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SamplePatientOption } from "@/lib/samples";

interface SampleUploadFormProps {
  organizationId: string;
  patients: SamplePatientOption[];
}

type UploadPhase = "idle" | "uploading" | "processing" | "success" | "error";

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isAcceptedVcf(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".vcf") || name.endsWith(".vcf.gz") || name.endsWith(".gz");
}

function getStorageEndpoint(url: string) {
  return `${url.replace(/\/$/, "")}/storage/v1/upload/resumable`;
}

export function SampleUploadForm({
  organizationId,
  patients,
}: SampleUploadFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [sampleType, setSampleType] = useState("germline_vcf");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [message, setMessage] = useState("");
  const [uploadedSampleId, setUploadedSampleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canUpload = useMemo(
    () => Boolean(selectedFile && selectedPatientId && sampleType && phase !== "uploading"),
    [phase, sampleType, selectedFile, selectedPatientId],
  );

  function handleFileSelection(file: File | null) {
    setUploadedSampleId(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isAcceptedVcf(file)) {
      setSelectedFile(null);
      setPhase("error");
      setMessage("Select a `.vcf` or `.vcf.gz` file.");
      return;
    }

    setPhase("idle");
    setMessage("");
    setProgress(0);
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || !selectedPatientId) {
      setPhase("error");
      setMessage("Choose a patient and VCF file before uploading.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setPhase("error");
      setMessage("Your session expired. Sign in again and retry the upload.");
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      setPhase("error");
      setMessage("Supabase environment variables are missing.");
      return;
    }

    const objectName = `${organizationId}/${selectedPatientId}/${Date.now()}-${sanitizeFileName(selectedFile.name)}`;
    const endpoint = getStorageEndpoint(supabaseUrl);

    setPhase("uploading");
    setMessage("Uploading VCF to Supabase Storage...");
    setProgress(0);

    try {
      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(selectedFile, {
          chunkSize: 6 * 1024 * 1024,
          endpoint,
          headers: {
            apikey: supabaseAnonKey,
            authorization: `Bearer ${session.access_token}`,
            "x-upsert": "false",
          },
          metadata: {
            bucketName: "genomic-samples",
            cacheControl: "3600",
            contentType: selectedFile.type || "application/octet-stream",
            objectName,
          },
          onError: (error) => {
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
            setProgress(percentage);
          },
          onSuccess: () => {
            resolve();
          },
          removeFingerprintOnSuccess: true,
          retryDelays: [0, 1000, 3000, 5000],
          uploadDataDuringCreation: true,
        });

        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length > 0) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }

          upload.start();
        });
      });

      setPhase("processing");
      setMessage("Upload complete. Registering the sample and queuing downstream processing...");

      const { data, error } = await supabase
        .from("genomic_samples")
        .insert({
          file_name: selectedFile.name,
          file_path: objectName,
          patient_id: selectedPatientId,
          sample_type: sampleType,
          status: "uploaded",
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      setUploadedSampleId(data.id);
      setPhase("success");
      setProgress(100);
      setMessage("Sample uploaded and marked as uploaded. Open the Samples page to run automated parsing and QC.");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <div className="surface-enter surface-enter-delay-2 space-y-6">
      {phase === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {phase !== "error" && message ? (
        <Alert variant={phase === "success" ? "success" : "default"}>
          <AlertTitle>
            {phase === "success"
              ? "Sample uploaded"
              : phase === "processing"
                ? "Processing queued"
                : "Ready to upload"}
          </AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="patientId">
            Patient
          </label>
          <select
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
            id="patientId"
            onChange={(event) => setSelectedPatientId(event.target.value)}
            value={selectedPatientId}
          >
            <option value="">Select patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.external_id})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="sampleType">
            Sample Type
          </label>
          <select
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
            id="sampleType"
            onChange={(event) => setSampleType(event.target.value)}
            value={sampleType}
          >
            <option value="germline_vcf">Germline VCF</option>
            <option value="somatic_vcf">Somatic VCF</option>
            <option value="trio_vcf">Trio VCF</option>
            <option value="panel_vcf">Panel VCF</option>
          </select>
        </div>
      </div>

      <div
        className={`rounded-[28px] border border-dashed p-8 text-center transition-all duration-200 ${
          isDragging
            ? "border-sky-400 bg-sky-50 shadow-[0_20px_40px_rgba(14,165,233,0.12)] scale-[1.01]"
            : "border-slate-200 bg-white"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFileSelection(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          accept=".vcf,.gz,.vcf.gz"
          className="hidden"
          onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
          ref={inputRef}
          type="file"
        />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-sky-100 to-cyan-50 text-sky-600 shadow-[0_16px_36px_rgba(14,165,233,0.12)]">
          <UploadCloud className="h-7 w-7" />
        </div>
        <p className="mt-5 font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
          Drag & Drop
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Upload a VCF to Supabase Storage
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Drop a `.vcf` or `.vcf.gz` file here, or browse from disk. The upload will use
          Supabase Storage resumable uploads so progress is tracked live.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => inputRef.current?.click()} type="button" variant="secondary">
            Choose File
          </Button>
          {selectedFile ? (
            <span className="text-sm text-slate-300">{selectedFile.name}</span>
          ) : (
            <span className="text-sm text-slate-500">No file selected</span>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(148,163,184,0.1)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Upload progress</span>
          <span className="font-mono text-sky-700">{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              phase === "error"
                ? "bg-red-400"
                : phase === "success"
                  ? "bg-emerald-500"
                  : "bg-sky-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {phase === "processing" || phase === "success" ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {phase === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <LoaderCircle className="h-4 w-4 animate-spin text-amber-500" />
            )}
            <span>
              Sample is ready for automated processing. Current database status is `uploaded`.
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button disabled={!canUpload} onClick={handleUpload} type="button">
          {phase === "uploading" ? "Uploading..." : "Upload Sample"}
        </Button>
        <Link
          className="ui-button inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          href="/samples"
        >
          View Samples
        </Link>
        {uploadedSampleId ? (
          <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Sample saved
          </span>
        ) : null}
      </div>
    </div>
  );
}
