import type { Metadata } from "next";

import {
  createGeneDiseaseAssociationAction,
  createIntegrationEndpointAction,
  triggerIntegrationSyncAction,
} from "@/app/settings/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDashboardContext, getDashboardStats } from "@/lib/dashboard";
import {
  getGeneDiseaseAssociations,
  getIntegrationEndpoints,
  getIntegrationSyncEvents,
} from "@/lib/platform-features";

export const metadata: Metadata = {
  title: "Settings | GenomeIQ",
  description: "Platform configuration and feature management for GenomeIQ.",
};

interface SettingsPageProps {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const [context, stats, associations, endpoints, syncEvents] = await Promise.all([
    getDashboardContext(),
    getDashboardStats(),
    getGeneDiseaseAssociations(),
    getIntegrationEndpoints(),
    getIntegrationSyncEvents(),
  ]);

  return (
    <div className="space-y-6">
      {params?.success ? (
        <Alert variant="success">
          <AlertTitle>Settings updated</AlertTitle>
          <AlertDescription>{params.success}</AlertDescription>
        </Alert>
      ) : null}
      {params?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Update failed</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-7 shadow-lg">
        <div className="max-w-3xl space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-600">
            Platform Settings
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Platform configuration for knowledge base, integrations, and security.
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Configure disease-gene associations, API integrations, and review security
            settings for {context?.organizationName ?? "your organization"}.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Knowledge links
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {formatCount(associations.length)}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Integrations</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-300">
              {formatCount(endpoints.length)}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Patients</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">
              {formatCount(stats.totalPatients)}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Protected workspace
            </p>
            <p className="mt-2 text-3xl font-semibold text-fuchsia-300">
              {context?.role ?? "clinician"}
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-600">
            Disease-Gene Knowledge Base
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            Curate a knowledge-base association
          </h2>
          <form action={createGeneDiseaseAssociationAction} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="geneSymbol">Gene Symbol</Label>
                <Input id="geneSymbol" name="geneSymbol" placeholder="BRCA1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geneName">Gene Name</Label>
                <Input id="geneName" name="geneName" placeholder="Breast cancer type 1 susceptibility protein" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="diseaseName">Disease Name</Label>
                <Input id="diseaseName" name="diseaseName" placeholder="Hereditary breast ovarian cancer syndrome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diseaseCategory">Disease Category</Label>
                <Input id="diseaseCategory" name="diseaseCategory" placeholder="Oncology" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="evidenceLevel">Evidence Level</Label>
                <Input id="evidenceLevel" name="evidenceLevel" placeholder="Strong" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input id="source" name="source" placeholder="ClinVar, OMIM, internal review" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confidence">Confidence</Label>
                <Input id="confidence" max="100" min="0" name="confidence" placeholder="92.5" step="0.1" type="number" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="summary"
                name="summary"
                placeholder="Short knowledge-base note about this disease-gene link"
              />
            </div>
            <SubmitButton className="w-full sm:w-auto" pendingLabel="Saving association...">
              Save Association
            </SubmitButton>
          </form>

          <div className="mt-6 space-y-3">
            {associations.length > 0 ? (
              associations.slice(0, 6).map((association) => (
                <div
                  key={association.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {association.geneSymbol} {"->"} {association.diseaseName}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{association.geneName}</p>
                    </div>
                    {association.confidence !== null ? (
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                        {association.confidence}%
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {association.diseaseCategory ? <span>{association.diseaseCategory}</span> : null}
                    {association.evidenceLevel ? <span>{association.evidenceLevel}</span> : null}
                    {association.source ? <span>{association.source}</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No disease-gene associations configured.</p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-600">
            API Integration Hub
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            Register external endpoints
          </h2>
          <form action={createIntegrationEndpointAction} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="integrationName">Name</Label>
                <Input id="integrationName" name="name" placeholder="Lab Information System" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input id="provider" name="provider" placeholder="Epic, Cerner, Internal LIS" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endpointUrl">Endpoint URL</Label>
              <Input id="endpointUrl" name="endpointUrl" placeholder="https://example.org/api/genomics" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="authType">Auth Type</Label>
                <Input id="authType" name="authType" placeholder="api_key, oauth2, basic" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="integrationStatus">Status</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="integrationStatus"
                  name="status"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="notes"
                name="notes"
                placeholder="Describe payload format, auth behavior, or sync expectations"
              />
            </div>
            <SubmitButton className="w-full sm:w-auto" pendingLabel="Saving endpoint...">
              Save Integration
            </SubmitButton>
          </form>

          <div className="mt-6 space-y-3">
            {endpoints.length > 0 ? (
              endpoints.map((endpoint) => (
                <div
                  key={endpoint.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{endpoint.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{endpoint.endpointUrl}</p>
                    </div>
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                      {endpoint.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span>{endpoint.provider}</span>
                    {endpoint.lastSyncAt ? <span>Last sync {endpoint.lastSyncAt}</span> : null}
                  </div>
                  <form action={triggerIntegrationSyncAction} className="mt-4">
                    <input name="endpointId" type="hidden" value={endpoint.id} />
                    <SubmitButton className="h-10 rounded-xl px-4 text-xs" pendingLabel="Syncing...">
                      Run Sync
                    </SubmitButton>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No integration endpoints configured yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-600">
          Integration Sync History
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">
          Recent export and sync events
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {syncEvents.length > 0 ? (
            syncEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{event.endpointName}</p>
                    <p className="mt-1 text-sm text-slate-400">{event.syncType}</p>
                  </div>
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    {event.status}
                  </span>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {event.created_at}
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Payload summary:{" "}
                  {JSON.stringify(event.payloadSummary)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Run an integration sync to create history here.</p>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-600">
          Security Foundation
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">
          What is already enforced in this workspace
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Supabase Auth-protected routes",
            "Organization-scoped row-level security",
            "Tenant-isolated patient and sample access",
            "Per-org writes for consents, omics, comments, and integrations",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
