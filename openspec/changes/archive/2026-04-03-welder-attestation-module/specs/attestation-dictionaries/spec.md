## ADDED Requirements

### Requirement: Manage commission members dictionary
The system MUST provide CRUD for commission members with soft-archive behavior via `is_active`.

#### Scenario: Create an active commission member
- **WHEN** a user creates a commission member with `full_name` and `role`
- **THEN** the member is created with `is_active = true`

#### Scenario: Archive a commission member
- **WHEN** a user archives a commission member
- **THEN** the system sets `is_active = false` and the record remains in the database

#### Scenario: Archived commission members are excluded from pickers
- **WHEN** a user opens a picker to select commission head or members for a group
- **THEN** the system MUST exclude commission members where `is_active = false`

### Requirement: Manage regulatory documents dictionary
The system MUST provide CRUD for regulatory documents with the required fields and soft-archive behavior.

#### Scenario: Create a regulatory document
- **WHEN** a user creates a regulatory document with `code`, `name`, and `admission_text`
- **THEN** the record is created and can be selected in attestation forms

#### Scenario: Regulatory document code uniqueness
- **WHEN** a user attempts to create or update a regulatory document with a `code` that already exists
- **THEN** the system MUST reject the change

#### Scenario: Archived regulatory documents excluded from selection
- **WHEN** a user selects regulatory documents for a welder attestation
- **THEN** the system MUST exclude regulatory documents where `is_active = false`

### Requirement: Manage sample materials dictionary
The system MUST provide CRUD for sample materials with group code and grade, with soft-archive behavior.

#### Scenario: Create a sample material
- **WHEN** a user creates a sample material with `group_code` and `steel_grade`
- **THEN** the material is available for selection in welder attestations

#### Scenario: Archive a sample material
- **WHEN** a user archives a sample material
- **THEN** `is_active` becomes false and the record remains stored

### Requirement: Manage welding consumables dictionary
The system MUST provide CRUD for welding consumables with coating type and soft-archive behavior.

#### Scenario: Create a welding consumable
- **WHEN** a user creates a welding consumable with `material_grade` and `coating_type`
- **THEN** the consumable is available for selection in welder attestations

#### Scenario: Archive a welding consumable
- **WHEN** a user archives a welding consumable
- **THEN** `is_active` becomes false and the record remains stored

### Requirement: Dictionaries are manageable from attestation settings
The system MUST expose dictionary management UI on `/attestation/settings`.

#### Scenario: Open settings and manage dictionaries
- **WHEN** a user navigates to `/attestation/settings`
- **THEN** the system presents UI for managing commission members, regulatory documents, sample materials, and welding consumables
