## ADDED Requirements

### Requirement: Upload document templates by type
The system MUST allow users to upload `.docx` templates for attestation document generation for each template type: `protocol`, `certificate`, `report_protocol`.

#### Scenario: Upload a new template (inactive by default)
- **WHEN** a user uploads a `.docx` file with a name and selects a template type
- **THEN** the system stores the file, creates a template record, and sets `is_active = false`

### Requirement: Activate exactly one template per type
The system MUST enforce that only one template per template type is active at any time.

#### Scenario: Activate a template and deactivate previous one
- **WHEN** a user activates a template for a given template type
- **THEN** the system marks the selected template `is_active = true` and marks any other template of that type `is_active = false` atomically

#### Scenario: Prevent multiple active templates in concurrent requests
- **WHEN** multiple activation requests race for the same type
- **THEN** the system MUST ensure the end state still has at most one active template for that type

### Requirement: Rename a template without re-upload
The system MUST allow renaming a template by updating its `name` metadata without changing the stored file.

#### Scenario: Rename a template
- **WHEN** a user edits a template name
- **THEN** the system updates only the template name field

### Requirement: Prevent deletion of the active template
The system MUST prevent deleting the currently active template for a given type.

#### Scenario: Attempt to delete active template
- **WHEN** a user tries to delete an active template
- **THEN** the system MUST reject the request

#### Scenario: Delete inactive template
- **WHEN** a user deletes a template that is not active
- **THEN** the system deletes the template record and removes the stored file reference

### Requirement: Templates management UI is in attestation settings
The system MUST expose templates management UI on `/attestation/settings`.

#### Scenario: Manage templates from settings
- **WHEN** a user navigates to `/attestation/settings`
- **THEN** the system shows template lists per type with actions to upload, activate, rename, and delete
