## Context

We are building a Ukrainian-language, responsive CRM web application to manage Contracts, Invoices, Acceptance Acts, Companies, CRM Users, and a document lifecycle (generate DOCX, store signed scans). The system must enforce Ukrainian business data fields, monthly sequential numbering rules per document type, VAT calculations, and provide immutable audit history for core entities.

The target stack is Next.js (App Router, Server Components by default) with TypeScript strict mode, Tailwind + shadcn/ui + Radix UI, React Hook Form + Zod for forms, and PostgreSQL (Neon) with Drizzle ORM and migrations.

Key constraints:
- Multiple roles (Owner/Admin/Manager) with different permissions.
- Safe data integrity across related entities (contract → invoices → acceptance acts, shared line items).
- File uploads restricted to JPG, converted server-side to WebP for storage efficiency.
- Document generation via DOCX templates (docxtemplater) and storage in managed object storage.

## Goals / Non-Goals

**Goals:**
- Provide a clear architecture for a CRUD-heavy, document-centric CRM with strong validation and auditability.
- Define how numbering sequences are generated safely (monthly reset, concurrency-safe).
- Define entity relationships and the approach to reuse work/service line items across documents.
- Define permission enforcement (UI + server) and a minimal, secure auth/account lifecycle approach.
- Define a file pipeline for signed documents (JPG input → WebP storage) and metadata linkage to entities.
- Define list-view patterns (sorting/filtering/modals) that remain consistent across entities.

**Non-Goals:**
- Implementing full UI polish details, exact component styling, or pixel-perfect designs (covered by UI work later).
- Implementing analytics dashboards (explicitly restricted for Admin, and not specified beyond that).
- Implementing e-signature; only scanned signed documents are handled.
- Implementing complex accounting logic beyond VAT 20% totals and specified fields.

## Decisions

### Decision: Next.js Server Actions for primary CRUD, Route Handlers for uploads/downloads
**Choice:** Use Server Actions for most create/update/delete flows and list fetching; use Route Handlers for file upload/download and cases needing streaming/headers.

**Rationale:** Server Actions fit the CRUD + form flows and reduce client-side API boilerplate. Upload and binary responses (DOCX generation, image conversion) are more robust via Route Handlers for content-type control and streaming.

**Alternatives considered:**
- All via Route Handlers: more explicit but more boilerplate and less ergonomic for forms.
- GraphQL: unnecessary complexity for current scope.

### Decision: Drizzle schema-first relational model + explicit constraints
**Choice:** Model Companies, Contracts, Invoices, Acceptance Acts, Work/Service Items, Document Attachments, and Audit Events with explicit foreign keys, unique constraints, and indexes.

**Rationale:** The domain is relational with strong integrity requirements. Explicit constraints prevent inconsistent states and simplify audits and reporting later.

**Alternatives considered:**
- JSON-heavy denormalization: simpler writes but weaker integrity and harder querying.
- Event-sourcing for everything: overkill; we only need an audit trail of changes.

### Decision: Concurrency-safe monthly numbering using per-(type, year, month) counters
**Choice:** Use a database-backed counter table keyed by (documentType, year, month). Generate numbers inside a transaction using row-level locking (e.g., `SELECT ... FOR UPDATE`), increment, and format as `{seq}/{MM}-{YYYY}`.

**Rationale:** Monthly reset + concurrency requires a single source of truth. DB transactions prevent duplicate numbers under concurrent writes.

**Alternatives considered:**
- Computing sequence by counting existing documents: race conditions and performance issues.
- Using database sequences with monthly reset: operational complexity.

### Decision: Work/Service Items as document-scoped line items with optional link to a “base” contract item
**Choice:** Store line items per document (contract/invoice/act) with normalized fields (title, unit, quantity, price). For invoices/acts created from a contract, copy items from the contract and track provenance (optional reference to contract line item) to support “remaining quantity” validation for subsequent invoices.

**Rationale:** Documents must be historically accurate even if the contract later changes. Copy-on-create preserves history while still enabling guardrails for remaining quantities.

**Alternatives considered:**
- Single shared line item table referenced by all documents: harder to maintain immutability and historical correctness.

### Decision: Audit history as append-only event records
**Choice:** For Contracts/Invoices/Acts/Companies, write an audit event per create/update/delete with actor user id, timestamp, entity id/type, and a structured diff (before/after snapshots or JSON patch).

**Rationale:** Requirements demand “full history what has been changed … and who and when”. Append-only audit events are straightforward and queryable.

**Alternatives considered:**
- Database triggers only: less portable and harder to enforce consistent payload structure.
- Full temporal tables: more complex and DB-specific.

### Decision: Permission enforcement at the server boundary
**Choice:** Enforce role checks in Server Actions/Route Handlers (not just UI). UI hides/locks controls, but server remains authoritative.

**Rationale:** Prevents privilege escalation via crafted requests.

**Alternatives considered:**
- Client-only gating: insufficient security.

### Decision: Signed document pipeline (JPG in, WebP stored)
**Choice:** Accept only JPG uploads, validate mime and file signature server-side, convert to WebP, then store to managed object storage with metadata (original name, size, content hash, linked entity).

**Rationale:** Meets file constraints, saves space, and keeps a consistent storage format.

**Alternatives considered:**
- Storing original JPG: simpler but larger storage footprint.
- Allowing multiple types: contradicts requirements.

## Risks / Trade-offs

- **Risk:** Numbering collisions under concurrency → **Mitigation:** DB transaction + row lock on monthly counter, plus unique index on formatted id.
- **Risk:** Copying line items causes divergence between contract and derived invoices/acts → **Mitigation:** Treat documents as immutable snapshots; allow explicit regeneration only via creating new documents, not mutating old.
- **Risk:** Audit log storage growth → **Mitigation:** Store diffs instead of full snapshots for large fields; index by entity id and timestamp; retention policy later if needed.
- **Risk:** File upload security (malformed files, large files) → **Mitigation:** Validate file signature, enforce size limits, virus scanning hook if needed later, store with random keys and private ACLs.
- **Trade-off:** Server Actions simplify CRUD but require careful cache invalidation and optimistic UI handling → **Mitigation:** Standardize revalidation patterns per mutation and keep list views server-rendered where possible.
