## ADDED Requirements

### Requirement: Contract numbers are generated as monthly sequences
The system MUST generate a Contract ID in format `{Sequence}/{MM}-{YYYY}`, where Sequence is a monthly auto-incrementing number that resets to 1 each month based on the contract date.

#### Scenario: Generate contract id for March 2026
- **WHEN** the 6th contract dated in March 2026 is created
- **THEN** the system MUST assign Contract ID `6/03-2026`

#### Scenario: Monthly sequence resets
- **WHEN** the first contract dated in April 2026 is created after March contracts exist
- **THEN** the system MUST assign Contract ID `1/04-2026`

### Requirement: Contract form captures required fields and validates inputs
The system MUST provide a contract form capturing required fields (date, signing location, type Роботи/Послуги, customer, contractor, timelines, duration, signer fields) and MUST validate required fields before saving.

#### Scenario: Save is rejected when required fields missing
- **WHEN** a user attempts to save a contract with missing required fields
- **THEN** the system MUST reject the save and show validation errors

### Requirement: Contract includes a work/service line item table with automatic totals and VAT
The system MUST provide a line items table with at least one row, auto-incremented row numbers, row deletion prevented when it would remove the last row, and automatic computation of row totals, totals without VAT, VAT at 20%, and grand total. Quantity and price MUST be non-negative and amounts MUST be formatted to 2 decimal places.

#### Scenario: Prevent deleting the last row
- **WHEN** a user attempts to delete the only remaining line item row
- **THEN** the system MUST prevent the deletion

#### Scenario: Automatic recalculation on input change
- **WHEN** a user changes quantity or price for any row
- **THEN** the system MUST automatically update row totals and the totals section

#### Scenario: Reject negative quantity or price
- **WHEN** a user enters a negative quantity or price
- **THEN** the system MUST reject the input and prevent saving

### Requirement: Contract list view provides CRUD actions and filtering/sorting
The system MUST provide a Contracts list view with actions Edit, Info, Delete; Info MUST be displayed in a modal; Edit MUST open the same form used for creation. The list MUST support sorting and filtering by contractor, customer, work/service items, and date.

#### Scenario: View contract info in a modal
- **WHEN** a user clicks “Info” on a contract row
- **THEN** the system MUST show contract details in a modal without navigating away

#### Scenario: Filter by customer
- **WHEN** a user filters contracts by a selected customer company
- **THEN** the system MUST show only contracts for that customer

### Requirement: Unsaved changes warning is shown when navigating away
The system MUST warn users about unsaved changes when they attempt to navigate away from a contract they are creating or editing.

#### Scenario: Prompt on navigation with dirty form
- **WHEN** a user has unsaved changes and attempts to leave the contract page or switch to another entity page
- **THEN** the system MUST prompt to save or discard changes

### Requirement: Contract can initiate creation of invoice or acceptance act
The system MUST allow creating an invoice or acceptance act from a contract, prompting the user to apply 100% of items or select custom items/quantities, and prefill derived fields from the contract.

#### Scenario: Create invoice using 100% of contract items
- **WHEN** a user selects “Створити Рахунок” and chooses 100% items
- **THEN** the system MUST create a new invoice draft prefilled from the contract and include all items with their quantities

#### Scenario: Create acceptance act with custom selection
- **WHEN** a user selects “Створита Акт” and chooses custom items and quantities
- **THEN** the system MUST create a new acceptance act draft prefilled from the contract and include only selected items and quantities

