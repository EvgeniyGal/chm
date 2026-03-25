## 1. Project setup

- [x] 1.1 Initialize Next.js (App Router) project with TypeScript strict mode, Tailwind, shadcn/ui, Radix, lucide-react, TanStack Table, React Hook Form, Zod, Sonner
- [x] 1.2 Configure environment variables for DB, auth, and storage (Neon Postgres, NextAuth, Vercel Storage)
- [x] 1.3 Set up Drizzle ORM configuration, migrations folder structure, and CI migration enforcement

## 2. Authentication and roles

- [x] 2.1 Implement NextAuth configuration (Credentials + optional OAuth) with secure session strategy and cookie settings
- [x] 2.2 Implement sign up flow with email confirmation (pending-confirmation state + confirmation endpoint)
- [x] 2.3 Implement password reset flow (request + time-limited reset + set new password)
- [x] 2.4 Implement change email flow with confirmation of the new email
- [x] 2.5 Implement delete account flow (deactivate/delete + session revocation) per data retention decisions
- [x] 2.6 Implement server-side authorization helpers enforcing Owner/Admin/Manager permissions for all protected operations

## 3. Database schema and numbering

- [x] 3.1 Design and implement Drizzle schema for Companies, Users, Contracts, Invoices, AcceptanceActs, LineItems, Documents, and AuditEvents (with relations and constraints)
- [x] 3.2 Implement concurrency-safe monthly counters for Contract/Invoice/Acceptance Act IDs with `{seq}/{MM}-{YYYY}` formatting
- [x] 3.3 Add indexes and unique constraints for document IDs and key lookup fields (dates, customer/contractor, foreign keys)

## 4. Companies module

- [x] 4.1 Build Companies list view with search, sorting/filtering, and Info modal
- [x] 4.2 Build Companies create/edit form with required Ukrainian business fields and validation
- [x] 4.3 Implement Companies server actions/handlers for CRUD with role enforcement and audit logging

## 5. Work/Service items and totals

- [x] 5.1 Implement reusable line-items table component (add/remove rows, prevent deleting last row)
- [x] 5.2 Implement consistent calculation utilities for row totals, VAT 20%, and formatting to 2 decimals
- [x] 5.3 Implement validation rules for quantity/price non-negative across all document forms

## 6. Contracts module

- [x] 6.1 Build Contracts list view with sorting/filtering (contractor/customer/items/date) and Info modal
- [x] 6.2 Build Contracts create/edit form including signer overrides and required fields
- [x] 6.3 Implement unsaved-changes warning behavior for contract create/edit flows
- [x] 6.4 Implement Contracts server actions for CRUD, numbering assignment, and audit logging
- [x] 6.5 Implement “Create Invoice” and “Create Act” flows from a contract (100% vs custom items/quantities)

## 7. Invoices module

- [x] 7.1 Build Invoices list view with sorting/filtering and origin indicator (standalone/internal/external)
- [x] 7.2 Build Invoices create/edit form supporting standalone vs contract-derived flows (lock derived fields)
- [x] 7.3 Implement external contract checkbox + fields and validation
- [x] 7.4 Implement remaining-quantity constraints when invoicing from contract (based on prior invoices)
- [x] 7.5 Implement unsaved-changes warning behavior for invoice create/edit flows
- [x] 7.6 Implement Invoices server actions for CRUD, numbering assignment, and audit logging

## 8. Acceptance acts module

- [x] 8.1 Build Acceptance Acts list view with sorting/filtering and Info modal
- [x] 8.2 Build Acceptance Acts create/edit form derived from invoice (lock derived fields) including signer fields and completion date
- [x] 8.3 Implement unsaved-changes warning behavior for acceptance act create/edit flows
- [x] 8.4 Implement Acceptance Acts server actions for CRUD, numbering assignment, and audit logging

## 9. Document generation and signed document storage

- [x] 9.1 Define DOCX templates and implement docxtemplater-based DOCX generation endpoints for contracts/invoices/acts
- [x] 9.2 Implement signed document upload endpoints with JPG-only validation and server-side WebP conversion
- [x] 9.3 Implement storage integration (managed object storage) and persist document metadata linked to entities
- [x] 9.4 Implement entity UI for uploading, viewing, and downloading stored documents with permission checks

## 10. Audit history

- [x] 10.1 Implement audit event writing on create/update/delete for Companies/Contracts/Invoices/Acts (actor, timestamp, diffs)
- [x] 10.2 Implement audit history viewing UI per entity ordered by time with actor and change details

## 11. Ukrainian UI and branding

- [x] 11.1 Implement Ukrainian UI copy for navigation, labels, buttons, and validation messages
- [x] 11.2 Apply brand color palette tokens and ensure consistent usage across components
- [x] 11.3 Validate responsive behavior for all main pages on mobile and desktop

