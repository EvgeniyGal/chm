# attestation-document-generation Specification

## Purpose
TBD - created by archiving change welder-attestation-module. Update Purpose after archive.
## Requirements
### Requirement: Generate protocol document per welder attestation
The system MUST generate an attestation commission protocol document for a single welder attestation using the active `protocol` template.

#### Scenario: Generate protocol when active template exists
- **WHEN** a user requests protocol generation for a welder attestation and an active `protocol` template exists
- **THEN** the system returns a generated document for download

#### Scenario: Block protocol generation when no active template
- **WHEN** a user requests protocol generation but no active `protocol` template exists
- **THEN** the system MUST show a warning and MUST NOT generate a document

### Requirement: Generate certificate document per welder attestation
The system MUST generate a welder certificate document using the active `certificate` template.

#### Scenario: Generate certificate when active template exists
- **WHEN** a user requests certificate generation for a welder attestation and an active `certificate` template exists
- **THEN** the system returns a generated document for download

#### Scenario: Block certificate generation when no active template
- **WHEN** a user requests certificate generation but no active `certificate` template exists
- **THEN** the system MUST show a warning and MUST NOT generate a document

### Requirement: Generate report protocol document per certification group
The system MUST generate a group report protocol document using the active `report_protocol` template.

#### Scenario: Generate group report when active template exists
- **WHEN** a user requests report protocol generation for a certification group and an active `report_protocol` template exists
- **THEN** the system returns a generated document for download

#### Scenario: Block report generation when no active template
- **WHEN** a user requests report protocol generation but no active `report_protocol` template exists
- **THEN** the system MUST show a warning and MUST NOT generate a document

### Requirement: Output formats for generated documents
The system MUST support downloading generated documents as `.docx` and MAY additionally provide `.pdf` if configured.

#### Scenario: Always provide docx download
- **WHEN** a document is successfully generated
- **THEN** the system provides a `.docx` file for download

#### Scenario: Provide pdf only when enabled
- **WHEN** `.pdf` generation is enabled in the deployment environment
- **THEN** the system provides a `.pdf` download option

