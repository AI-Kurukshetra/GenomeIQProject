import Link from "next/link";
import type { Metadata } from "next";

import { Input } from "@/components/ui/input";
import { calculateAge, formatDate, getPatientsList, normalizePhenotypes } from "@/lib/patients";

export const metadata: Metadata = {
  title: "Patients | GenomeIQ",
  description: "Patient registry and phenotype management for GenomeIQ.",
};

interface PatientsPageProps {
  searchParams?: Promise<{
    q?: string;
    gender?: string;
  }>;
}

function matchesFilters(
  searchTerm: string,
  genderFilter: string,
  patient: Awaited<ReturnType<typeof getPatientsList>>[number],
) {
  const phenotypes = normalizePhenotypes(patient.phenotypes).join(" ").toLowerCase();
  const haystack = `${patient.name} ${patient.external_id} ${phenotypes}`.toLowerCase();
  const matchesSearch = !searchTerm || haystack.includes(searchTerm);
  const matchesGender = !genderFilter || patient.gender === genderFilter;

  return matchesSearch && matchesGender;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const searchTerm = (params?.q ?? "").trim().toLowerCase();
  const genderFilter = (params?.gender ?? "").trim().toLowerCase();
  const patients = await getPatientsList();
  const filteredPatients = patients.filter((patient) =>
    matchesFilters(searchTerm, genderFilter, patient),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
              Patient Registry
            </p>
            <h1 className="text-3xl font-semibold text-white">All patients</h1>
            <p className="text-sm leading-6 text-slate-400">
              Search by patient name, internal identifier, or phenotype. Filters run
              against the current organization&apos;s tenant-scoped records.
            </p>
          </div>

          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(0,212,255,0.24)] transition-colors hover:bg-cyan-300"
            href="/patients/new"
          >
            Add Patient
          </Link>
        </div>

        <form className="mt-6 grid gap-4 sm:grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <Input
            defaultValue={params?.q ?? ""}
            name="q"
            placeholder="Search by name, patient ID, or phenotype"
          />
          <select
            className="h-11 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
            defaultValue={params?.gender ?? ""}
            name="gender"
          >
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="unknown">Unknown</option>
          </select>
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            type="submit"
          >
            Apply Filters
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/60">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left">
            <thead className="bg-white/[0.03]">
              <tr className="text-xs uppercase tracking-[0.22em] text-slate-500">
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">DOB / Age</th>
                <th className="px-6 py-4 font-medium">Gender</th>
                <th className="px-6 py-4 font-medium">Phenotypes</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const age = calculateAge(patient.date_of_birth);
                  const phenotypes = normalizePhenotypes(patient.phenotypes);

                  return (
                    <tr key={patient.id} className="align-top text-sm text-slate-200">
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-semibold text-white">{patient.name}</p>
                          <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">
                            {patient.external_id}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-300">
                        <p>{formatDate(patient.date_of_birth)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {age === null ? "Age unavailable" : `${age} years`}
                        </p>
                      </td>
                      <td className="px-6 py-5 capitalize text-slate-300">
                        {patient.gender ?? "Not provided"}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex max-w-xl flex-wrap gap-2">
                          {phenotypes.length > 0 ? (
                            phenotypes.map((phenotype) => (
                              <span
                                key={phenotype}
                                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                              >
                                {phenotype}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500">No phenotypes captured</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-300">
                        {formatDate(patient.created_at)}
                      </td>
                      <td className="px-6 py-5">
                        <Link
                          className="text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
                          href={`/patients/${patient.id}`}
                        >
                          View patient
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={6}>
                    No patients matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
