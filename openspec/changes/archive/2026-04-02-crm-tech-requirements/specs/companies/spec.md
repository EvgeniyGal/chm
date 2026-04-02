## ADDED Requirements

### Requirement: Users can create and manage Companies with required Ukrainian business fields
The system MUST allow authorized users to create, view, update, and delete Companies with the required fields used for contracts, invoices, and acceptance acts.

#### Scenario: Create company with required fields
- **WHEN** a user submits a new company with required fields (names, address, identifiers, banking, signer details)
- **THEN** the system MUST persist the company and make it selectable in document forms

#### Scenario: Prevent invalid identifiers
- **WHEN** a user submits a company with missing or invalid EDRPOU/IBAN/TIN fields (where applicable)
- **THEN** the system MUST reject the request with validation errors

### Requirement: Company signer data is available as defaults for document forms
The system MUST provide Company signer fields as defaults when creating or editing contracts, invoices, and acceptance acts, while allowing document-level overrides without mutating the Company unless explicitly saved there.

#### Scenario: Prefill signer fields from selected company
- **WHEN** a user selects a company as Customer or Contractor in a document form
- **THEN** the system MUST prefill signer-related fields from that company’s stored signer data

#### Scenario: Override signer fields on a contract without changing the company
- **WHEN** a user edits signer fields on a contract and saves the contract
- **THEN** the system MUST store the overridden values on the contract and MUST NOT change the company record

### Requirement: Companies list supports search, sorting, filtering, and info modal
The system MUST provide a Companies list view with searching, sorting, filtering, and an “Info” view presented as a modal.

#### Scenario: Search companies by name
- **WHEN** a user searches by full or short company name
- **THEN** the list MUST show matching companies

#### Scenario: View company info in a modal
- **WHEN** a user clicks “Info” for a company in the list
- **THEN** the system MUST display company details in a modal view

