import Link from "next/link";
import type { Metadata } from "next";

import { SampleUploadForm } from "@/components/samples/sample-upload-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageGuideButton } from "@/components/ui/page-guide-button";
import { getDashboardContext } from "@/lib/dashboard";
import { getSampleUploadContext } from "@/lib/samples";

export const metadata: Metadata = {
  title: "Upload Sample | GenomeIQ",
  description: "Upload VCF files into Supabase Storage and register genomic samples.",
};

export default async function UploadSamplePage() {
  const [context, patients] = await Promise.all([
    getDashboardContext(),
    getSampleUploadContext(),
  ]);

  return (
    <div className="space-y-6">
      <div className="surface-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
            Sample Intake
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Upload a VCF sample</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PageGuideButton
            description="Use this flow to upload a VCF, link it to a patient, and queue it for parser and QC processing."
            items={[
              "Select the patient case that the uploaded genomic file belongs to.",
              "Choose the sample type so downstream workflows have the right context.",
              "Drop a .vcf or .vcf.gz file and wait for the resumable upload to finish.",
              "Open the samples registry after upload and trigger automated processing.",
            ]}
            title="Sample Upload Guide"
          />
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900"
            href="/samples"
          >
            Back to samples
          </Link>
        </div>
      </div>

      {patients.length === 0 ? (
        <Alert variant="destructive">
          <AlertTitle>No patients available</AlertTitle>
          <AlertDescription>
            Create at least one patient before uploading a sample, because each
            genomic sample must be linked to a patient record.
          </AlertDescription>
        </Alert>
      ) : null}

      {!context?.organizationId ? (
        <Alert variant="destructive">
          <AlertTitle>Organization context unavailable</AlertTitle>
          <AlertDescription>
            Your account is missing an organization binding, so uploads cannot be stored
            in the org-scoped storage path yet.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="surface-enter surface-enter-delay-1">
        <CardHeader>
          <CardTitle>VCF upload</CardTitle>
          <CardDescription>
            Files are uploaded into Supabase Storage first, then registered in
            `genomic_samples` with status `uploaded`, ready for parser/QC execution from the
            Samples page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {context?.organizationId && patients.length > 0 ? (
            <SampleUploadForm organizationId={context.organizationId} patients={patients} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
