## Context

We are adding an “Attestation (Атестація)” module that automates welder attestation per НПАОП 0.00-1.16-96, based on the requirements in:
- `requarenments/TRD_Welder_Certification.md` (module scope, data fields, routes, templates workflow)
- `requarenments/Welder_Certification_Rules.md` (domain rules for attestation coding, quality-control constraints, and attestation scope tables)

The existing application stack is Next.js (App Router) + TypeScript, Tailwind/shadcn UI, Drizzle ORM + PostgreSQL, and server-side document generation using docx templating.

Key constraints from requirements:
- Editable dictionaries via settings page; “delete” is soft-archive via `is_active`.
- “Enterprise / workplace” is an existing external entity: only `company_id` is stored.
- Document templates are user-uploaded `.docx`; for each template type, exactly one template may be active.
- Documents generation is blocked if an active template is missing.
- Several computed fields must be deterministic (certificate number, QC protocol numbers, validity dates).

## Goals / Non-Goals

**Goals:**
- Implement persistence for groups, welder attestations, dictionaries, and template metadata with Drizzle migrations.
- Provide UI routes and screens:
  - `/attestation/groups` (list + create/edit group; navigate to group card with its welders)
  - `/attestation/welders` (global list of welder attestations with filters/search; create/edit)
  - `/attestation/settings` (template management + dictionaries CRUD)
- Provide server-side document generation for:
  - per-welder protocol,
  - welder certificate (A5 book layout),
  - group report protocol,
  with download as `.docx` and optionally `.pdf`.
- Encode validations and computed derivations described in TRD (and where needed, Rules).

**Non-Goals:**
- Implement HR/personnel master data for welders as a separate entity (the “welder” is modeled as an attestation record within a group, per TRD).
- Rebuild the existing “companies” selection UX; we only integrate with the existing company picker.
- Full automation of “attestation scope” text from every Rules table on day one if it materially expands scope; the initial implementation focuses on the computations explicitly required in TRD and leaves deeper table-driven expansions as a follow-up spec if needed.

## Decisions

1. **Data model (Drizzle + Postgres)**
   - Use separate tables for dictionaries: `commission_members`, `regulatory_documents`, `sample_materials`, `welding_consumables`, each with `is_active` (soft-archive) and timestamps.
   - Create core business tables:
     - `certification_groups` (group number, dates, location, head, status, timestamps)
     - `certification_group_members` join table (group ↔ commission member, max 5 non-head members; enforce via application validation and DB uniqueness on `(group_id, member_id)`).
     - `welder_certifications` referencing `certification_groups` and `companies`, with all TRD-defined fields.
     - `welder_certification_regulatory_documents` join table (welder certification ↔ regulatory document), max 10 docs enforced at application level.
     - `document_templates` (template_type, name, storage key/path, is_active, uploaded_at/by, created_at) with DB constraint “only one active per type”.
   - Prefer DB constraints for uniqueness and invariants that can be expressed safely (e.g., unique group number, unique order in group, single active template per type) and keep domain validation in server actions.

2. **Computed fields strategy**
   - Compute values at read-time (server) from canonical stored fields to avoid drift:
     - `certificate_number = {group_number}.{order_in_group}-{yy}` (yy derived from group protocol date year % 100).
     - `certificate_valid_until = protocol_date + 730 days` and `next_certification_date = protocol_date + 730 days`.
     - QC protocol numbers per selected inspection methods: `{group_number}/{method_code}`; date from group `inspection_date`.
   - Store only inputs; computed values are returned to UI and used by document generation.

3. **Document template storage**
   - Store template files in an existing server-side storage mechanism (Vercel Blob or local disk in dev), and keep only a stable `file_path`/key in DB.
   - Activation swap for a template type is done in a single transaction:
     - set all templates of that type `is_active=false`,
     - set selected template `is_active=true`,
     protected by the unique-active constraint to prevent races.

4. **Document generation**
   - Use docx templating (existing stack mentions docxtemplater) to fill placeholders in active templates.
   - Provide one server action or route handler per document type:
     - `/attestation/welders/[id]/protocol` (or action invoked from UI)
     - `/attestation/welders/[id]/certificate`
     - `/attestation/groups/[id]/report-protocol`
   - Output format:
     - Always provide `.docx`.
     - Provide `.pdf` only if the repo already has a reliable conversion pipeline; otherwise keep `.pdf` as “optional future enhancement” guarded by a feature flag or capability check.

5. **UI patterns**
   - Lists: TanStack Table with server-side pagination/filtering where needed.
   - Forms: React Hook Form + Zod; conditional validation for combined welding and pipe/plate constraints.
   - Localization: Keep enum values stable in DB, map to UA labels in UI and documents.

6. **Navigation change**
   - Update the side menu to include “Attestation” group with sub-items per TRD, without interfering with any global app settings.

## Risks / Trade-offs

- **[PDF conversion variability]** → **Mitigation**: Implement `.docx` generation first; add `.pdf` only if a deterministic conversion service/library is already present and supported in the target deployment environment.
- **[Single-active template race conditions]** → **Mitigation**: DB unique partial index/constraint + transaction-based swap.
- **[Complex “attestation scope” table logic]** → **Mitigation**: Start with TRD-defined computed fields and validation; encapsulate any scope derivation behind a pure function with test vectors and extend iteratively.
- **[Data integrity for “max 5 members” and “max 10 regulatory docs”]** → **Mitigation**: Enforce in server actions + add defensive checks in UI; document constraints in specs and add tests.
- **[Enum evolution and localization]** → **Mitigation**: Keep enum canonical codes in DB and derive display strings at the boundary (UI/doc generator).
