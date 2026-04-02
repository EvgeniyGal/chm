## ADDED Requirements

### Requirement: Entity list pages provide consistent actions and an info modal
For Contracts, Invoices, Acceptance Acts, and Companies, the system MUST provide list views with actions Edit, Info, Delete. “Info” MUST be shown as a modal, and “Edit” MUST open the same form used for creation.

#### Scenario: Open info modal from list
- **WHEN** a user clicks “Info” for any entity row
- **THEN** the system MUST show a modal with entity details without leaving the list context

#### Scenario: Edit uses the same form as create
- **WHEN** a user clicks “Edit” for an existing entity
- **THEN** the system MUST render the create/edit form prefilled with entity data

### Requirement: Lists support sorting and filtering per entity requirements
The system MUST support sorting and filtering in list views as defined per entity:
- Contracts: filter by contractor, customer, works/services, date.
- Invoices: filter by contractor, customer, works/services, date; indicate origin (standalone/internal contract/external contract).
- Acceptance Acts: filter by contractor, customer, works/services, date.
- Companies: sorting and filtering, plus search by name.

#### Scenario: Sort list by date
- **WHEN** a user sorts a contracts/invoices/acts list by date
- **THEN** the system MUST reorder results accordingly

#### Scenario: Filter by contractor
- **WHEN** a user filters a list by a selected contractor company
- **THEN** the system MUST show only matching records

