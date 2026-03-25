## ADDED Requirements

### Requirement: Invoice numbers are generated as monthly sequences
The system MUST generate an Invoice ID in format `{Sequence}/{MM}-{YYYY}`, where Sequence is a monthly auto-incrementing number that resets to 1 each month based on the invoice date.

#### Scenario: Generate invoice id for March 2026
- **WHEN** the 6th invoice dated in March 2026 is created
- **THEN** the system MUST assign Invoice ID `6/03-2026`

#### Scenario: Monthly sequence resets
- **WHEN** the first invoice dated in April 2026 is created after March invoices exist
- **THEN** the system MUST assign Invoice ID `1/04-2026`

### Requirement: Invoice can be created standalone or from a contract with derived fields
The system MUST support creating an invoice as a primary instance (standalone) or based on an existing contract. When created from a contract, type/customer/contractor MUST be non-editable and MUST come from the contract.

#### Scenario: Standalone invoice allows selecting type and parties
- **WHEN** a user creates an invoice without selecting a contract
- **THEN** the system MUST allow editing type (Роботи/Послуги), customer, and contractor

#### Scenario: Invoice from contract locks derived fields
- **WHEN** a user creates an invoice from a selected contract
- **THEN** the system MUST set type, customer, and contractor from the contract and MUST prevent editing those fields

### Requirement: Invoice line items table computes totals and validates inputs
The system MUST provide a line items table with automatic row totals, totals without VAT, VAT at 20%, and grand total. Quantity and price MUST be non-negative and values MUST be formatted to 2 decimal places.

#### Scenario: Automatic recalculation on input change
- **WHEN** a user changes quantity or price
- **THEN** the system MUST recalculate totals immediately

#### Scenario: Reject negative values
- **WHEN** a user enters a negative quantity or price
- **THEN** the system MUST prevent saving and show validation errors

### Requirement: Invoice from contract supports selecting items and quantities with remaining-quantity constraints
When creating an invoice from a contract, the system MUST allow selecting items and quantities, and MUST restrict available quantities based on quantities already invoiced for that contract.

#### Scenario: Prevent invoicing more than contracted quantity
- **WHEN** a user attempts to invoice a quantity that exceeds remaining available quantity for a contract item
- **THEN** the system MUST reject the selection and prevent saving

### Requirement: Invoice supports external contract metadata
The system MUST support marking an invoice as based on an external contract and capturing external contract number and date, which MUST be used later in acceptance act generation.

#### Scenario: Enable external contract fields
- **WHEN** a user checks “Зовнішній договвір”
- **THEN** the system MUST require external contract number and date fields

### Requirement: Invoice list view provides CRUD actions and indicates origin
The system MUST provide an Invoices list view with actions Edit, Info, Delete, and MUST indicate whether an invoice is standalone, based on an external contract, or based on an internal contract.

#### Scenario: Display origin indicator in list
- **WHEN** the invoices list is shown
- **THEN** each invoice row MUST show an indicator of its origin type

### Requirement: Unsaved changes warning is shown when navigating away
The system MUST warn users about unsaved changes when they attempt to navigate away from an invoice they are creating or editing.

#### Scenario: Prompt on navigation with dirty form
- **WHEN** a user has unsaved changes and attempts to leave the invoice page or switch to another entity page
- **THEN** the system MUST prompt to save or discard changes

