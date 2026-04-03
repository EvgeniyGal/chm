## ADDED Requirements

### Requirement: Manage certification groups lifecycle
The system MUST provide CRUD for certification groups and track group status with at least: `draft`, `active`, `completed`, `archived`.

#### Scenario: Create a new certification group
- **WHEN** a user submits a new group with `group_number`, `protocol_date`, `inspection_date`, `certificate_issue_date`, `certificate_issue_location`, `head_id`, and up to 5 member ids
- **THEN** the system creates the group with `status = draft`

#### Scenario: Edit group before completion
- **WHEN** a user edits a group whose status is not `completed`
- **THEN** the system persists changes

#### Scenario: Prevent editing after completion
- **WHEN** a user attempts to edit a group with status `completed`
- **THEN** the system MUST reject the change

#### Scenario: Archive a group
- **WHEN** a user archives a group
- **THEN** the system sets status to `archived`

### Requirement: Validate group dates and commission membership limits
The system MUST validate constraints for groups as defined by requirements.

#### Scenario: Inspection date cannot be after protocol date
- **WHEN** `inspection_date` is later than `protocol_date`
- **THEN** the system MUST reject the group with a validation error

#### Scenario: Limit number of non-head commission members
- **WHEN** a user assigns more than 5 commission members to a group (excluding the head)
- **THEN** the system MUST reject the group with a validation error

### Requirement: Manage welder attestation records per group
The system MUST provide CRUD for welder attestation records associated to a certification group.

#### Scenario: Create a welder attestation within a group
- **WHEN** a user submits a new welder attestation with required fields and `group_id`
- **THEN** the system creates the record and assigns it an `order_in_group`

#### Scenario: View group contains welder attestations
- **WHEN** a user views a certification group
- **THEN** the system shows the list of welder attestations within that group with links to each record

### Requirement: Maintain deterministic order in group and certificate numbering inputs
The system MUST maintain a stable `order_in_group` per attestation record within a group, used as an input to certificate number generation.

#### Scenario: Sequential numbering on insert
- **WHEN** the group contains N welder attestation records and a new one is created
- **THEN** the new record gets `order_in_group = N + 1`

#### Scenario: Resequence on deletion
- **WHEN** a welder attestation record is deleted from a group
- **THEN** the system MUST resequence remaining records to keep `order_in_group` contiguous starting at 1

### Requirement: Enforce conditional validation for combined welding
The system MUST enforce validation rules for combined welding fields.

#### Scenario: Combined welding requires second method and consumable
- **WHEN** `is_combined = true`
- **THEN** `welding_method_2` and `consumable_2_id` MUST be present

#### Scenario: Non-combined welding clears second method and consumable
- **WHEN** `is_combined = false`
- **THEN** `welding_method_2` and `consumable_2_id` MUST be null/empty and MUST NOT be used in document output

### Requirement: Enforce conditional validation for pipe vs plate sample dimensions
The system MUST enforce dimension field rules based on welded parts type.

#### Scenario: Plate disables pipe diameters
- **WHEN** `welded_parts_type = plate`
- **THEN** pipe diameter fields MUST be empty and the UI MUST prevent input

#### Scenario: Pipe requires at least one diameter
- **WHEN** `welded_parts_type = pipe`
- **THEN** `pipe_diameter_1` MUST be present

#### Scenario: At least one thickness is required
- **WHEN** a welder attestation is created or updated
- **THEN** `thickness_1` MUST be present

### Requirement: Store and validate inspection methods and results
The system MUST allow selecting quality control methods and capturing pass/fail outcomes per selected method.

#### Scenario: Default inspection methods set
- **WHEN** a welder attestation is created
- **THEN** `insp_visual` and `insp_radiographic` default to true and other methods default to false

#### Scenario: Results captured for selected methods
- **WHEN** an inspection method is selected for the attestation
- **THEN** the corresponding result field MUST accept `passed` or `failed`

### Requirement: Manage regulatory documents per attestation
The system MUST allow associating regulatory documents to a welder attestation record.

#### Scenario: Assign multiple regulatory documents
- **WHEN** a user selects regulatory documents for a welder attestation
- **THEN** the system persists the associations

#### Scenario: Limit regulatory documents count
- **WHEN** a user attempts to assign more than 10 regulatory documents to a welder attestation
- **THEN** the system MUST reject the change with a validation error

### Requirement: Compute derived certificate dates
The system MUST compute certificate validity and next certification date from group protocol date.

#### Scenario: Compute validity dates as +730 days
- **WHEN** a welder attestation is viewed or documents are generated
- **THEN** `certificate_valid_until` and `next_certification_date` are treated as `protocol_date + 730 days`

### Requirement: Compute certificate number for display and documents
The system MUST compute a certificate number based on group and order.

#### Scenario: Compute certificate number format
- **WHEN** a welder attestation is viewed or documents are generated
- **THEN** the certificate number is formatted as `{group_number}.{order_in_group}-{yy}` where `yy` is the last two digits of the group `protocol_date` year

### Requirement: Compute quality control protocol numbers per method
The system MUST compute a QC protocol number for each selected inspection method.

#### Scenario: Derive method-specific protocol numbers
- **WHEN** an inspection method with code (VT, RT, UT, MT, MGT, IT) is selected
- **THEN** its protocol number is `{group_number}/{code}` and its date is the group `inspection_date`
