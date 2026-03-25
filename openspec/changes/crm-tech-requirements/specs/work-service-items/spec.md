## ADDED Requirements

### Requirement: Work/Service items store canonical fields and validation
The system MUST represent each work/service line item with title, unit, quantity, and price (without VAT). Quantity and price MUST be numeric and MUST be \(\ge 0\).

#### Scenario: Reject invalid quantity
- **WHEN** a user enters a non-numeric or negative quantity for an item
- **THEN** the system MUST show validation errors and prevent saving

#### Scenario: Reject invalid price
- **WHEN** a user enters a non-numeric or negative price for an item
- **THEN** the system MUST show validation errors and prevent saving

### Requirement: Totals are computed consistently across documents
For contracts, invoices, and acceptance acts, the system MUST compute:
- row_total = quantity × price
- total_without_vat = Σ row_total
- vat_20 = total_without_vat × 0.20
- grand_total = total_without_vat + vat_20

All displayed monetary values MUST be formatted to 2 decimal places.

#### Scenario: Totals match formulas
- **WHEN** a document has multiple items with quantities and prices
- **THEN** the displayed totals MUST match the defined formulas

#### Scenario: Calculated fields are not editable
- **WHEN** a user attempts to manually edit a calculated total field
- **THEN** the system MUST prevent editing and compute values automatically

