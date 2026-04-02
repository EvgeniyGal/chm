## ADDED Requirements

### Requirement: Users can authenticate and manage their account lifecycle
The system MUST provide authentication and account lifecycle flows for CRM users, including sign up/sign in, email confirmation, password reset, change email, and delete account.

#### Scenario: Sign up with email and password
- **WHEN** an unauthenticated user submits a valid email and password for registration
- **THEN** the system creates a new user account in a pending-confirmation state

#### Scenario: Email confirmation required before access
- **WHEN** a pending-confirmation user attempts to sign in
- **THEN** the system MUST deny access until the email is confirmed

#### Scenario: Password reset flow
- **WHEN** a user requests a password reset for an existing email
- **THEN** the system MUST issue a time-limited reset mechanism and allow setting a new password

#### Scenario: Change email requires confirmation
- **WHEN** an authenticated user requests to change their email to a new value
- **THEN** the system MUST require confirmation of the new email before the change becomes effective

#### Scenario: Delete account
- **WHEN** an authenticated user requests account deletion and confirms the action
- **THEN** the system MUST delete or deactivate the user account according to data retention rules, and revoke active sessions

### Requirement: Role-based access control is enforced server-side
The system MUST enforce role-based permissions for all protected operations at the server boundary (Server Actions and/or Route Handlers), not only in the UI.

#### Scenario: Owner has full access
- **WHEN** a user with role Owner performs any CRM operation
- **THEN** the system MUST allow the operation (subject to general validation constraints)

#### Scenario: Admin has full access excluding analytics
- **WHEN** a user with role Admin attempts to access analytics functionality
- **THEN** the system MUST deny access

#### Scenario: Manager has restricted access
- **WHEN** a user with role Manager attempts to delete entities or create new entities outside allowed scope
- **THEN** the system MUST deny access

#### Scenario: Manager can upload signed documents
- **WHEN** a user with role Manager uploads a signed scanned document for an existing contract/invoice/act
- **THEN** the system MUST allow the upload if file constraints are satisfied

