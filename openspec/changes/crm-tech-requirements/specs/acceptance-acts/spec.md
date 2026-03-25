## ADDED Requirements

### Requirement: Acceptance act numbers are generated as monthly sequences
The system MUST generate an Acceptance Act ID in format `{Sequence}/{MM}-{YYYY}`, where Sequence is a monthly auto-incrementing number that resets to 1 each month based on the act date.

#### Scenario: Generate acceptance act id for March 2026
- **WHEN** the 6th acceptance act dated in March 2026 is created
- **THEN** the system MUST assign Acceptance Act ID `6/03-2026`

#### Scenario: Monthly sequence resets
- **WHEN** the first acceptance act dated in April 2026 is created after March acts exist
- **THEN** the system MUST assign Acceptance Act ID `1/04-2026`

### Requirement: Acceptance act is created from an invoice and locks derived fields
The system MUST create an acceptance act based on an invoice. Type, customer, contractor, and line items MUST be derived from the invoice and MUST be non-editable in the acceptance act form.

#### Scenario: Create act from invoice
- **WHEN** a user selects “Створита Акт” from an invoice context
- **THEN** the system MUST create an acceptance act draft derived from the invoice

#### Scenario: Derived fields are not editable
- **WHEN** a user views an acceptance act created from an invoice
- **THEN** the system MUST prevent editing type/customer/contractor and line items

### Requirement: Acceptance act includes signing metadata and completion date
The system MUST capture required act fields including date, signing location, completion date, and signer full name/position in nominative and genitive cases.

#### Scenario: Save act with required signer fields
- **WHEN** a user saves an acceptance act with missing required signer fields
- **THEN** the system MUST reject the save with validation errors

### Requirement: Acceptance act list view provides CRUD actions and filtering/sorting
The system MUST provide an Acceptance Acts list view with actions Edit, Info, Delete; Info MUST be displayed in a modal; Edit MUST open the same form used for creation. The list MUST support sorting and filtering by contractor, customer, work/service items, and date.

#### Scenario: View act info in a modal
- **WHEN** a user clicks “Info” on an acceptance act row
- **THEN** the system MUST show act details in a modal

### Requirement: Unsaved changes warning is shown when navigating away
The system MUST warn users about unsaved changes when they attempt to navigate away from an acceptance act they are creating or editing.

#### Scenario: Prompt on navigation with dirty form
- **WHEN** a user has unsaved changes and attempts to leave the acceptance act page or switch to another entity page
- **THEN** the system MUST prompt to save or discard changes

