## ADDED Requirements

### Requirement: UI language is Ukrainian
The system MUST present the user interface in Ukrainian, including page titles, field labels, buttons, and validation messages.

#### Scenario: Navigate main pages in Ukrainian
- **WHEN** an authenticated user navigates to Contracts, Invoices, Acceptance Acts, Companies, Users, and Profile pages
- **THEN** the system MUST display navigation and page content in Ukrainian

### Requirement: UI is responsive for mobile and desktop
The system MUST provide a responsive layout that works on mobile and desktop for all main pages and core workflows.

#### Scenario: Use contracts list on mobile
- **WHEN** a user opens the Contracts page on a mobile-sized viewport
- **THEN** the system MUST present a usable list and create/edit flow without requiring horizontal scrolling for core actions

### Requirement: UI uses the defined brand color palette
The system MUST incorporate the provided brand color palette in the application UI.

#### Scenario: Brand colors applied consistently
- **WHEN** a user navigates through main pages
- **THEN** the UI MUST use the provided palette for backgrounds, accents, and interactive states in a consistent way

