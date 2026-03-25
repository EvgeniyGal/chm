# Tack stack

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
