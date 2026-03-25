I am going to create a web application. It's something like a CRM for a company, which helps manage contracts, invoices, customers, acceptance act, companies, crm users. 
I need to create a technical requirement document for this CRM. 
Here is a Tack Stack that I'm going to use when I will be creating the application.

## Frontend

**Framework**

- Next.js/latest
- App Router
- Server Components by default
- Server Actions
- Route Handlers
- TypeScript (strict mode)

**UI & UX**

- Tailwind CSS
- shadcn/ui
- Radix UI
- lucide-react (icons)
- TanStack Table - for flexibility in creating and visualize lists and cards

**Forms & Validation**

- React Hook Form
- Zod

**State Management**

- React Server Components (default)
- React Context (light client state)
- TanStack Query (optional, client-heavy flows)

**Notifications**

- Sonner (toaster / user feedback)

## Backend

**Authentication**

- NextAuth.js (Credentials Provider, OAuth Providers (Google, GitHub, etc.), JWT or Database sessions, Secure cookies)
- Email + Password
- Email confirmation
- Password reset
- Session management via cookies
- docxtemplater - for filling documents and prepare for user uploading

**File Storage**

- Vercel Storage ecosystem (Fully managed, scalable, and integrated with deployment)

**API Layer**

- Next.js Server Actions
- Route Handlers (/app/api) where needed

## Database Layer

**Database**

- PostgreSQL 16+
- Managed Neon

**ORM**

- Drizzle ORM
- Type-safe queries
- Schema-first design
- Relation management

**Migrations**

- Drizzle ORM Migrate
- Versioned migrations
- Safe schema evolution
- Enforced in CI/CD

That application creates based on a Next.js framework. 
This application uses NextAuth lib library for authentication system and this system should provide login, sign in, reset password, delete account, and change email.
The CRM purpose is to manage Contracts, Invoices, Acceptance Act, Companies, Users.
This application is created for the Ukrainian company and all the things that include this system will create for Ukrainian legislation.
The main purpose of this CRM is to manage contracts, invoices, acceptance acts, companies, and generate text documents in DOCX format and save signed documents to database and storage.
User interface should be responsive for mobile and desktop.
This application design should use brand colors, here is their hex codes: #FFF7E5, #FFEECC, #FFDD99, #FFCC66, #FFBB33, #FFAA00, #CC8800, #996600, #664400, #332200, #241800
The interface should be Ukrainian. 

The main pages should be Contracts, Invoices, Acceptance Act, Companies, Users, Profile.

The main entities are: Contracts, Invoices, Acceptance Act, Companies, Users.

Basic fields for Contracts entity:
- ID (UUID)
- Contract ID ({Sequence}/{MM}-{YYYY}.
Logic: Monthly auto-incrementing number (resets to 1 each month) based on the contract date.
Example: 6th contract in March 2026 → 6/03-2026)
- Date
- Signing Location (text)
- Type (work/service)(in Ukrainian Роботи/Послуги)
- Customer (customer company)
- Contractor (contractor company)
- List of Work/service ids
- Project timeline (text)
- Contract duration (text)
- Contract signer full name (Nominative case)
- Contract signer full name (Genitive case)
- Contract signer position (Nominative case)
- Contract signer position (Genitive case)
- Contract signer acting under
- Created_at
- Updated_at

Basic fields for Invoices entity:
- ID (UUID)
- Invoice ID ({Sequence}/{MM}-{YYYY}.
Logic: Monthly auto-incrementing number (resets to 1 each month) based on the invoice date.
Example: 6th contract in March 2026 → 6/03-2026)
- Date
- Customer (customer company)
- Contractor (contractor company)
- Contract ID 
- External contract number
- External contract date 
- List of Work/service ids
- Invoice signer full name (Nominative case)
- Invoice signer position (Nominative case)
- Created_at
- Updated_at

Basic fields for Acceptance Act:
- ID (UUID)
- Acceptance Act ID ({Sequence}/{MM}-{YYYY}.
Logic: Monthly auto-incrementing number (resets to 1 each month) based on the invoice date.
Example: 6th contract in March 2026 → 6/03-2026)
- Date 
- Customer (customer company)
- Contractor (contractor company)
- Contract ID 
- Invoice ID 
- List of Works/services
- Completion Date 
- Act signer full name (Nominative case)
- Act signer full name (Genitive case)
- Act signer position (Nominative case)
- Act signer position (Genitive case)
- Created_at
- Updated_at

Basic fields for Companies:
- id (UUID)
- Full Company Name
- Short Company Name
- Address
- Contacts (tel, email, etc.)
- EDRPOU code
- VAT ID/TIN
- Tax Status
- IBAN
- Bank
- Contract signer full name (Nominative case)
- Contract signer full name (Genitive case)
- Contract signer position (Nominative case)
- Contract signer position (Genitive case)
- Contract signer acting under
- Act signer full name (Nominative case)
- Act signer full name (Genitive case)
- Act signer position (Nominative case)
- Act signer position (Genitive case)
- Invoice signer full name (Nominative case)
- Invoice signer position (Nominative case)
- Created_at
- Updated_at

Basic fields for Work/Service items:
- ID
- Contract ID 
- Invoice ID 
- Acceptance Act ID
- Title
- Unit
- Quantity
- Price
- Created_at
- Updated_at

Basic fields for Users:
- ID
- First Name
- Last Name
- email
- Role
- Created_at
- Updated_at
- …(other fields for auth)

In App should be three roles:
Owner - full access
Admin - full access but analytics doesn't available
Manager - Can only edit existing orders, add signed(scaned) docs 

There should be full history what has been changed in Contracts, Invoices, Acceptance Act, Companies and who and when made this changes
User should be allowed to add only jpg files and all files should be converted to webp for space saving.

-----------------------------------------------

Pages functionalities, fields and logic.

-- Contract page.

Fields:
- Номер (auto calculated)
- Дата
- Місце складання (text)
- Тип: Роботи/Послуги (radio buttons, one possible value)
- Замовник (dropdown with a list of companies (short company name), with searching by company name, sorted)
- Виконавець (dropdown with a list of companies (short company name), with searching by company name, sorted)
- Section Перелік робот/Перелік послуг (depends on type): 
Table: Work / Service List
| # | Service / Work Name | Unit | Quantity | Price (without VAT) | Row Total |
| - | ------------------- | ---- | -------- | ------------------- | --------- |
| 1 |                     |      |          |                     |           |
| 2 |                     |      |          |                     |           |
| … |                     |      |          |                     |           |
Column logic
# — auto-increment (1, 2, 3…)
Service / Work Name — text
Unit — e.g. pcs, hours, m²
Quantity — numeric
Price (without VAT) — numeric
Row Total = Quantity × Price

Below the table
Add items
Button: “+ Add row”
At least 1 row must always exist and fully filled
Allow row deletion (but prevent deleting last row)

Totals section (footer)
| Description         | Amount       |
| ------------------- | ------------ |
| Total (without VAT) | Σ Row Totals |
| VAT 20%             | Total × 0.20 |
| Total with VAT      | Total + VAT  |

Formulas
Row Total
row_total = quantity * price
Total without VAT
total = sum(row_total)
VAT (20%)
vat = total * 0.2
Grand Total
grand_total = total + vat

Auto-calculate values on input change
Format numbers (2 decimal places)
Currency symbol (e.g. ₴, $, €)
Disable manual editing of calculated fields
Add validation:
quantity ≥ 0
price ≥ 0

- Терміни виконання робіт (text)
- Термін дії договору (text)
- Підписант (називний відмінок)(text)(this data comes from Company but user can change and save here)
- Підписант (родовий відмінок)(text)(this data comes from Company but user can change and save here)
- Посада підписанта (називний відмінок)(text)(this data comes from Company but user can change and save here)
- Посада підписанта (родовий відмінок)(text)(this data comes from Company but user can change and save here)
- Підписант діє на підставі (text)(this data comes from Company but user can change and save here)

Buttons:
- Згенерувати текстовий документ (should save changes and generate .docx document, future implementation)
- Очистити (clean form, with confirmation)
- Створити Рахунок (create new invoice, system should ask 100% work/service items or custom choosing, set items and quantity, all other data for invoice come from Contract)
- Створита Акт (create new act, system should ask 100% work/service items or custom choosing, set items and quantity, all other data for act come from Contract)
- Зберегти (system checks all fields and save contract)
- Додати підписаний договір (user add scanned signed doc and it stores in web storage)

!!If user edit existing Contract or create new and try to jump to other page or leave it system should ask user whether they need to save changes

When user enter to the page, there should be a list of Contracts and button add contract.
In a list there should be buttons Edit, Info, Delete.
Info about contract should be as modal window.
Edit contract also should appear in a page (like add Contract). 
Also there should be sorting, filtering by contractor, by customer, by works/services, by date.

-- Invoice page.

Fields:
- Номер (auto calculated)
- Дата
- Тип: Роботи/Послуги (when create as primary instance: radio buttons, one possible value
if create base on Contract type not editable should come from Contract)
- Замовник (when create as primary instance: dropdown with a list of companies (short company name), with searching by company name, sorted
if create base on Contract  not editable should come from Contract)
- Виконавець (when create as primary instance: dropdown with a list of companies (short company name), with searching by company name, sorted
if create base on Contract  not editable should come from Contract)
- Section Перелік робот/Перелік послуг (depends on type)(when create as primary instance: should be editable from scratch
if create base on Contract user should have ability to choose items and quantity, the available items and quantity based on existing invoices to this Contract (Contract - Invoices)): 
Table: Work / Service List
| # | Service / Work Name | Unit | Quantity | Price (without VAT) | Row Total |
| - | ------------------- | ---- | -------- | ------------------- | --------- |
| 1 |                     |      |          |                     |           |
| 2 |                     |      |          |                     |           |
| … |                     |      |          |                     |           |
Column logic
# — auto-increment (1, 2, 3…)
Service / Work Name — text
Unit — e.g. pcs, hours, m²
Quantity — numeric
Price (without VAT) — numeric
Row Total = Quantity × Price

Below the table
Add items
Button: “+ Add row”
At least 1 row must always exist and fully filled
Allow row deletion (but prevent deleting last row)

Totals section (footer)
| Description         | Amount       |
| ------------------- | ------------ |
| Total (without VAT) | Σ Row Totals |
| VAT 20%             | Total × 0.20 |
| Total with VAT      | Total + VAT  |

Formulas
Row Total
row_total = quantity * price
Total without VAT
total = sum(row_total)
VAT (20%)
vat = total * 0.2
Grand Total
grand_total = total + vat

Auto-calculate values on input change
Format numbers (2 decimal places)
Currency symbol (e.g. ₴, $, €)
Disable manual editing of calculated fields
Add validation:
quantity ≥ 0
price ≥ 0

- Зовнішній договвір (check box, data for external Contract will use in Acceptance act)
- Номер договору (зовнішній)
- Дата договору (зовнішній) 
- Підписант (називний відмінок)(text)(this data comes from Company but user can change and save here)
- Посада підписанта (називний відмінок)(text)(this data comes from Company but user can change and save here)

Buttons:
- Згенерувати текстовий документ (should save changes and generate .docx document, future implementation)
- Очистити (clean form, with confirmation)
- Створита Акт (create new act, system should ask 100% work/service items or custom choosing, set items and quantity, all other data for act come from Contract)
- Зберегти (system checks all fields and save contract)
- Додати підписаний рахунок (user add scanned signed doc and it stores in web storage)

!!If user edit existing Invoice or create new and try to jump to other page or leave it system should ask user whether they need to save changes

When user enter to the page, there should be a list of Invoices and button add Invoice.
In a list there should be buttons Edit, Info, Delete (there should be a sign whether invoice separate, based on External Contract or base on internal Contract).
Info about Invoice should be as modal window.
Edit Invoice also should appear in a page (like add Invoice). 
Also there should be sorting, filtering by contractor, by customer, by works/services, by date.

-- Acceptance act page.

Fields:
- Номер (auto calculated)
- Дата
- Місце складання (text)
- Тип: Роботи/Послуги (not editable, comes from Invoice)
- Замовник (dropdown with a list of companies (short company name), with searching by company name, sorted)(not editable, comes from Invoice)
- Виконавець (dropdown with a list of companies (short company name), with searching by company name, sorted)(not editable, comes from Invoice)
- Section Перелік робот/Перелік послуг (depends on type) (not editable, comes from Invoice): 
Table: Work / Service List
| # | Service / Work Name | Unit | Quantity | Price (without VAT) | Row Total |
| - | ------------------- | ---- | -------- | ------------------- | --------- |
| 1 |                     |      |          |                     |           |
| 2 |                     |      |          |                     |           |
| … |                     |      |          |                     |           |
Column logic
# — auto-increment (1, 2, 3…)
Service / Work Name — text
Unit — e.g. pcs, hours, m²
Quantity — numeric
Price (without VAT) — numeric
Row Total = Quantity × Price

Below the table
Add items
Button: “+ Add row”
At least 1 row must always exist and fully filled
Allow row deletion (but prevent deleting last row)

Totals section (footer)
| Description         | Amount       |
| ------------------- | ------------ |
| Total (without VAT) | Σ Row Totals |
| VAT 20%             | Total × 0.20 |
| Total with VAT      | Total + VAT  |

Formulas
Row Total
row_total = quantity * price
Total without VAT
total = sum(row_total)
VAT (20%)
vat = total * 0.2
Grand Total
grand_total = total + vat

Auto-calculate values on input change
Format numbers (2 decimal places)
Currency symbol (e.g. ₴, $, €)
Disable manual editing of calculated fields
Add validation:
quantity ≥ 0
price ≥ 0

- Підписант (називний відмінок)(text)(this data comes from Company but user can change and save here)
- Підписант (родовий відмінок)(text)(this data comes from Company but user can change and save here)
- Посада підписанта (називний відмінок)(text)(this data comes from Company but user can change and save here)
- Посада підписанта (родовий відмінок)(text)(this data comes from Company but user can change and save here)

Buttons:
- Згенерувати текстовий документ (should save changes and generate .docx document, future implementation)
- Очистити (clean form, with confirmation)
- Зберегти (system checks all fields and save contract)
- Додати підписаний договір (user add scanned signed doc and it stores in web storage)

!!If user edit existing Contract or create new and try to jump to other page or leave it system should ask user whether they need to save changes

When user enter to the page, there should be a list of Acceptance Acts and button add Acceptance Act.
In a list there should be buttons Edit, Info, Delete.
Info about Invoice should be as modal window.
Edit Invoice also should appear in a page (like add Invoice). 
Also there should be sorting, filtering by contractor, by customer, by works/services, by date.

-- Companies page.

Fields:
- Повна назва
- Скорочена назва
- Адреса
- Контакти (convinient logic to add tel, email. etc.)
- ЄДРПОУ
- ІПН
- Статус платника податку
- IBAN
- Банк
- Підписант договору (Називний відмінок)
- Підписант договору (Родовий відмінок)
- Посада підписанта договору (Називний відмінок)
- Посада підписанта договору (Родовий відмінок)
- CПідписант договору діє на підставі
- Підписант акту (Називний відмінок)
- Підписант акту  (Родовий відмінок)
- Посада підписанту акту  (Називний відмінок)
- Посада підписанту акту (Родовий відмінок)
- Підписант рахунку  (Називний відмінок)
- Посада підписанту рахунку (Називний відмінок)

Buttons:
- Очистити (clean form, with confirmation)
- Зберегти (system checks all fields and save contract)

!!If user edit existing Company or create new and try to jump to other page or leave it system should ask user whether they need to save changes

When user enter to the page, there should be a list of Companies and button add Company.
In a list there should be buttons Edit, Info, Delete.
Info about Company should be as modal window.
Edit Invoice also should appear in a page (like add Company). 
Also there should be sorting and  filtering.


!!You can add editional field for keeping logic
!!During CRUD should be safe data intagrity 




