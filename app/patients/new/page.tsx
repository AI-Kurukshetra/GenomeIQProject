import Link from "next/link";
import type { Metadata } from "next";

import { createPatientAction } from "@/app/patients/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageGuideButton } from "@/components/ui/page-guide-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { hpoPhenotypeOptions } from "@/lib/hpo";

export const metadata: Metadata = {
  title: "New Patient | GenomeIQ",
  description: "Create a patient record in GenomeIQ.",
};

interface NewPatientPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function NewPatientPage({ searchParams }: NewPatientPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const error = params?.error ?? null;

  return (
    <div className="space-y-6">
      <div className="surface-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
            Patient Intake
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Add a new patient</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PageGuideButton
            description="This page creates the patient record used by samples, variants, reports, and collaboration workflows."
            items={[
              "Capture the patient name and date of birth first.",
              "Set gender if available so the case metadata is complete.",
              "Select the HPO phenotype terms that best describe the patient presentation.",
              "Submit the form to create the patient and open the case detail page.",
            ]}
            title="Patient Intake Guide"
          />
          <Link
            className="ui-button inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900"
            href="/patients"
          >
            Back to patients
          </Link>
        </div>
      </div>

      <Card className="surface-enter surface-enter-delay-1">
        <CardHeader>
          <CardTitle>Patient demographics and phenotypes</CardTitle>
          <CardDescription>
            The patient will be stored inside the current organization workspace with a
            generated internal identifier and selected phenotype tags.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Patient could not be created</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form action={createPatientAction} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Patient Name</Label>
                <Input id="name" name="name" placeholder="Jane Doe" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="gender"
                name="gender"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Phenotypes</Label>
                <p className="mt-1 text-sm text-slate-400">
                  Select from the starter HPO phenotype set used for hereditary cancer
                  intake. Multiple terms can be attached to the same patient.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {hpoPhenotypeOptions.map((term) => (
                  <label
                    key={term.value}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_32px_rgba(148,163,184,0.14)]"
                  >
                    <input
                      className="mt-1 h-4 w-4 rounded border-slate-300 bg-white text-sky-500"
                      name="phenotypes"
                      type="checkbox"
                      value={term.value}
                    />
                    <span>
                      <span className="block font-semibold text-slate-950">{term.label}</span>
                      <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-slate-500">
                        {term.category}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <SubmitButton className="w-full sm:w-auto" pendingLabel="Creating patient...">
              Create Patient
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
