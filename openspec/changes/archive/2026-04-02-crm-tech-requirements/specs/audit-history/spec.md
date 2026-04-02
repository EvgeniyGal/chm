## ADDED Requirements

### Requirement: System records an immutable audit history for core entities
The system MUST record a complete, immutable history of changes for Contracts, Invoices, Acceptance Acts, and Companies, including who made the change and when it occurred.

#### Scenario: Audit record on create
- **WHEN** a user creates a new contract/invoice/acceptance act/company
- **THEN** the system MUST write an audit entry capturing the actor, timestamp, entity, and created values

#### Scenario: Audit record on update
- **WHEN** a user updates any field on a contract/invoice/acceptance act/company
- **THEN** the system MUST write an audit entry capturing the actor, timestamp, and the changed fields (before/after)

#### Scenario: Audit record on delete
- **WHEN** a user deletes a contract/invoice/acceptance act/company
- **THEN** the system MUST write an audit entry capturing the actor, timestamp, and deletion action

### Requirement: Audit history is queryable by entity and time
The system MUST allow authorized users to view audit history for an entity ordered by time, including change details.

#### Scenario: View audit history for a contract
- **WHEN** a user opens the audit history for a specific contract
- **THEN** the system MUST display audit events ordered by timestamp with actor identity and change details

