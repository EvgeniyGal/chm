## Why

The organization needs a consistent, auditable workflow to attest welders per НПАОП 0.00-1.16-96, including correct calculation of attestation scope and standardized document output. Doing this manually is slow, error-prone, and makes it hard to maintain a complete registry over time.

## What Changes

- Add a new “Attestation” module with navigation and screens for:
  - Attestation Groups (`/attestation/groups`) to organize commission sessions.
  - Welder Attestations (`/attestation/welders`) to manage individual attestations across all groups.
  - Attestation Settings (`/attestation/settings`) to manage dictionaries and document templates.
- Introduce editable dictionaries for commission members, regulatory documents, sample materials, and welding consumables (soft-archive via `is_active`).
- Implement core entities:
  - Certification group (protocol date, inspection date, certificate issue date/location, commission composition, status).
  - Welder attestation record per welder per group with full data required for protocol/certificate generation.
- Implement derived values and validations from requirements, including:
  - Certificate number generation from group number + order + year.
  - Quality control protocol numbering per selected inspection method(s).
  - Certificate validity/next certification date = protocol date + 2 years.
  - Combined welding rules and form constraints (pipe vs plate, required fields).
- Add document template management for three template types (protocol, certificate, report protocol) with exactly one active template per type.
- Generate documents from active templates and allow download as `.docx` and/or `.pdf`; block generation when an active template is missing.

## Capabilities

### New Capabilities

- `welder-attestation`: Manage attestation groups and welder attestation records, including derived numbers/dates and validation rules.
- `attestation-dictionaries`: CRUD + soft-archive for attestation dictionaries (commission members, regulatory documents, sample materials, welding consumables).
- `attestation-document-templates`: Upload, activate (single active per type), rename, and delete (with constraints) docx templates for attestation documents.
- `attestation-document-generation`: Generate protocol/certificate/report documents from active templates using attestation data, with download as docx/pdf.
- `attestation-navigation`: Add the “Attestation” menu group and routes for Groups/Welders/Settings pages.

### Modified Capabilities

<!-- none -->

## Impact

- **Database**: New tables for groups, welder attestations, template metadata, and dictionaries; relations to existing `companies` and `users`.
- **Backend**: New server actions/route handlers for CRUD, template upload/activation, and document generation.
- **Frontend**: New pages and forms (RHF+Zod) plus list views (TanStack Table) and settings UI; localization of enum labels (UA).
- **Docs/Compliance**: Rules from `Welder_Certification_Rules.md` and `TRD_Welder_Certification.md` become the contract for calculations, validations, and generated documents.
