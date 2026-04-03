## ADDED Requirements

### Requirement: Provide attestation navigation group in side menu
The system MUST include an “Attestation (Атестація)” section in the application side navigation.

#### Scenario: Side menu contains Attestation group
- **WHEN** an authorized user views the application navigation
- **THEN** the side menu includes an “Attestation” group item

### Requirement: Provide attestation module routes
The system MUST provide routes for groups, welders, and settings pages.

#### Scenario: Navigate to groups list
- **WHEN** a user navigates to `/attestation/groups`
- **THEN** the system renders the certification groups list page

#### Scenario: Navigate to welders list
- **WHEN** a user navigates to `/attestation/welders`
- **THEN** the system renders the global welder attestations list page

#### Scenario: Navigate to module settings
- **WHEN** a user navigates to `/attestation/settings`
- **THEN** the system renders the attestation settings page
