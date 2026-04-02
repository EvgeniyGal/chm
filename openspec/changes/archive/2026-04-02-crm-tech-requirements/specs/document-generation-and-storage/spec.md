## ADDED Requirements

### Requirement: System can generate DOCX documents for core entities
The system MUST support generating a DOCX document for Contracts, Invoices, and Acceptance Acts based on the current saved data for the entity.

#### Scenario: Generate contract DOCX
- **WHEN** a user clicks “Згенерувати текстовий документ” on a saved contract
- **THEN** the system MUST generate a DOCX document reflecting the saved contract data

#### Scenario: Prevent generation for unsaved changes
- **WHEN** a user has unsaved changes and clicks “Згенерувати текстовий документ”
- **THEN** the system MUST first persist the changes or require the user to save before generation

### Requirement: Users can upload signed scanned documents with strict file constraints
The system MUST allow uploading signed scanned documents for Contracts, Invoices, and Acceptance Acts with the following constraints:
- Only JPG files are accepted as input.
- The system MUST convert uploaded JPG files to WebP for storage.

#### Scenario: Reject non-JPG upload
- **WHEN** a user attempts to upload a PNG/PDF/other file type as a signed document
- **THEN** the system MUST reject the upload

#### Scenario: Convert JPG to WebP
- **WHEN** a user uploads a valid JPG file
- **THEN** the system MUST convert it to WebP and store the WebP version

### Requirement: Stored documents are linked to entities and retrievable
The system MUST store metadata for each generated or uploaded document and link it to the associated entity (contract/invoice/act), enabling later retrieval and display.

#### Scenario: Retrieve previously uploaded signed document
- **WHEN** a user opens the entity detail view for a contract/invoice/act with an uploaded signed document
- **THEN** the system MUST allow the user to view or download the stored document (subject to permissions)

