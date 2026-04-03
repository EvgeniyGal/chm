## 1. Data model & migrations (Drizzle/Postgres)

- [x] 1.1 Add Drizzle schema for dictionaries: `commission_members`, `regulatory_documents`, `sample_materials`, `welding_consumables` with `is_active` and timestamps
- [x] 1.2 Add Drizzle schema for `certification_groups` (unique `group_number`, dates, issue location, head_id, status, timestamps)
- [x] 1.3 Add Drizzle schema for `certification_group_members` join table and enforce uniqueness `(group_id, member_id)`
- [x] 1.4 Add Drizzle schema for `welder_certifications` with all TRD fields and FK to `certification_groups` + existing `companies`
- [x] 1.5 Add Drizzle schema for `welder_certification_regulatory_documents` join table and enforce uniqueness `(welder_certification_id, regulatory_document_id)`
- [x] 1.6 Add Drizzle schema for `document_templates` with `template_type`, metadata, and “single active per type” constraint
- [x] 1.7 Create and run migration; verify constraints (unique group number, unique order-in-group per group, unique active template per type)

## 2. Domain logic utilities (pure functions + tests)

- [x] 2.1 Implement `computeCertificateNumber(groupNumber, orderInGroup, protocolDate)` → `{group}.{order}-{yy}`
- [x] 2.2 Implement `computeValidityDates(protocolDate)` → `{validUntil, nextCertificationDate}` = `+730 days`
- [x] 2.3 Implement `computeQcProtocolNumbers(groupNumber, inspectionDate, selectedMethods)` → per-method `{number, date}`
- [x] 2.4 Add unit tests for the above with example inputs from requirements

## 3. Server actions / route handlers (CRUD)

- [x] 3.1 Implement commission members CRUD with soft-archive and “exclude inactive from pickers”
- [x] 3.2 Implement regulatory documents CRUD with unique code and soft-archive
- [x] 3.3 Implement sample materials CRUD with soft-archive
- [x] 3.4 Implement welding consumables CRUD with soft-archive
- [x] 3.5 Implement certification groups CRUD with validations (date constraint, max 5 members excluding head, lock edits after completed)
- [x] 3.6 Implement welder attestations CRUD with validations (combined welding fields, pipe vs plate fields, required thickness/diameter rules)
- [x] 3.7 Implement deterministic `order_in_group` assignment on create and resequencing logic on delete
- [x] 3.8 Implement regulatory documents assignment for a welder attestation with “max 10” validation

## 4. UI routes & screens (Next.js App Router)

- [x] 4.1 Add navigation updates: “Attestation” group with links to Groups/Welders/Settings
- [x] 4.2 Build `/attestation/groups` page: list groups + create action
- [x] 4.3 Build group detail page: show group fields + embedded list of welder attestations
- [x] 4.4 Build `/attestation/welders` page: global list with search/filtering and create action
- [x] 4.5 Build welder attestation create/edit form with conditional fields and Zod validation messages per TRD
- [x] 4.6 Build `/attestation/settings` page with sections/tabs for Templates + each dictionary CRUD

## 5. Document templates management

- [x] 5.1 Implement template upload endpoint/action for `.docx` with metadata and inactive-by-default behavior
- [x] 5.2 Implement template activation swap (single transaction) and ensure single-active constraint is enforced
- [x] 5.3 Implement template rename action
- [x] 5.4 Implement template deletion with “cannot delete active template” guard

## 6. Document generation & downloads

- [x] 6.1 Implement protocol generation for a welder attestation using active `protocol` template; block if missing
- [x] 6.2 Implement certificate generation for a welder attestation using active `certificate` template; block if missing
- [x] 6.3 Implement report protocol generation for a group using active `report_protocol` template; block if missing
- [x] 6.4 Wire downloads to return `.docx` consistently; add optional `.pdf` output only if conversion pipeline exists and is enabled (`ATTESTATION_ENABLE_PDF=true` + LibreOffice `soffice`, query `?format=pdf`)

## 7. QA / verification

- [x] 7.1 Add integration tests for critical flows: create group → add welder attestations → generate documents (docx)
- [x] 7.2 Verify validations and resequencing behavior via UI (delete welder attestation updates remaining `order_in_group`)
- [x] 7.3 Verify settings: archived dictionary entries don’t appear in selection controls — pickers use `is_active = true` for materials/consumables/regulatory
