# GenomeIQ Data Model & API Overview

This document mirrors the requested high-level data model and API grouping.

## Key Entities

- Users
- Patients
- GenomicSamples
- Variants
- Genes
- Diseases
- Phenotypes
- ClinicalReports
- Annotations
- Publications
- Pathways
- DrugInteractions
- PopulationData
- QualityMetrics
- Workflows
- Consents
- Organizations
- AnalysisResults
- PhenotypeMatches
- RiskScores

## API Endpoint Groups

- `/auth`
- `/users`
- `/patients`
- `/samples`
- `/variants`
- `/genes`
- `/diseases`
- `/annotations`
- `/reports`
- `/analysis`
- `/workflows`
- `/quality-control`
- `/population-genetics`
- `/pharmacogenomics`
- `/literature`
- `/collaboration`
- `/consent-management`
- `/data-export`

## Implementation Mapping

### Auth and tenancy

- Supabase Auth handles identity.
- App-level authorization and tenant isolation are implemented through RLS.

### Read/write application domains

- `/patients`
- `/samples`
- `/variants`
- `/reports`
- `/workflows`
- `/analysis`
- `/quality-control`

### Reference knowledge domains

- `/genes`
- `/diseases`
- `/annotations`
- `/pharmacogenomics`
- `/literature`
- `/population-genetics`

### Collaboration and governance

- `/users`
- `/collaboration`
- `/consent-management`
- `/data-export`

These groups are reflected in the route scaffolding and the long-term system architecture document.
