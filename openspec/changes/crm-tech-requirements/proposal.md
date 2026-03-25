## Why

This CRM is needed to standardize and speed up contract/invoice/acceptance-act workflows for a Ukrainian company, including consistent document generation and storage of signed artifacts.
Today these processes are manual and error-prone, and the system must encode required fields, numbering rules, roles, and auditability.

## What Changes

- Add a Ukrainian-language, responsive CRM web app for managing Companies, Contracts, Invoices, and Acceptance Acts.
- Implement authentication and account lifecycle flows (sign up/sign in, email confirmation, password reset, change email, delete account) with role-based access control (Owner/Admin/Manager).
- Introduce canonical numbering rules for documents (monthly sequence reset) and shared work/service line items with automatic totals and VAT calculations.
- Support document lifecycle: generate DOCX from templates, upload signed scans (JPG only), convert to WebP, and store files in managed object storage.
- Provide full audit history of changes (who/when/what) across core entities.
- Provide list views with sorting/filtering and safe CRUD with data integrity guarantees.

## Capabilities

### New Capabilities

- `auth-and-roles`: Authentication, session management, account lifecycle flows, and role-based access control (Owner/Admin/Manager).
- `companies`: CRUD for companies with Ukrainian business identifiers and signer data used by documents.
- `contracts`: CRUD for contracts including monthly numbering, work/service table, totals/VAT, and document actions.
- `invoices`: CRUD for invoices including monthly numbering, optional external contract details, and deriving data from a contract when created from one.
- `acceptance-acts`: CRUD for acceptance acts derived from invoices (non-editable source fields) with monthly numbering and signer fields.
- `work-service-items`: Shared line-item model and validation rules (quantity/price non-negative, totals calculation, formatting).
- `document-generation-and-storage`: DOCX generation from templates plus signed document upload rules (JPG-only → WebP conversion) and storage metadata.
- `audit-history`: Immutable change history for Contracts/Invoices/Acceptance Acts/Companies with actor and timestamp.
- `list-views-filtering-sorting`: Standardized list + modal info patterns, plus filtering/sorting requirements per entity.
- `ukrainian-ui-branding`: Ukrainian localization, responsive layout, and brand color palette usage across the UI.

### Modified Capabilities

<!-- None (no existing specs in this repo yet). -->

## Impact

- UI: Next.js App Router app pages for Contracts, Invoices, Acceptance Acts, Companies, Users, Profile; reusable table/form components (Tailwind + shadcn/ui + TanStack Table).
- Backend/API: NextAuth flows; Server Actions/Route Handlers for CRUD, numbering, audit log, uploads, and document generation.
- Database: New PostgreSQL schema via Drizzle ORM + migrations for all entities, audit history, and document metadata.
- Storage: Integration with managed object storage for signed documents; server-side image conversion pipeline (JPG → WebP).
