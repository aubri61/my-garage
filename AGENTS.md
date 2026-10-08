# My Garage - Agent Guidelines

## Project Goal

My Garage is a portfolio project for mobility/frontend/backend engineering roles.

It is not a generic CRUD demo.

The product should demonstrate:

- professional frontend engineering
- mobility domain understanding
- authentication and authorization
- secure vehicle software update verification
- P2P vehicle sharing, rental agreements and digital access grants
- owner-approved simulated remote unlocking and optional offline X.509 verification
- backend concurrency and performance considerations

The frontend is the primary portfolio focus.
The backend is the secondary focus.

## Tech Stack

Frontend:

- Next.js
- TypeScript
- Axios
- TanStack Query
- Zustand only when global client state is genuinely required

Backend:

- Java
- Spring Boot
- Spring Security
- Spring Data JPA
- PostgreSQL

## Frontend Engineering Rules

Use TypeScript strictly.

Prefer:

- Server Components where appropriate
- Client Components only when interaction/state requires them
- reusable domain-oriented components
- semantic HTML
- accessible interactions
- responsive layouts

Avoid:

- unnecessary global state
- huge page components
- duplicated UI
- excessive abstractions
- premature optimization

Do not use Zustand for server state.

Use:

- Axios for HTTP requests
- TanStack Query for server state
- Zustand only for cross-page client state when needed

## Folder Structure

Prefer domain-oriented organization.

Example:

src/
  app/
  components/
  features/
    garage/
    vehicle/
    updates/
    sharing/
  lib/
  services/
  types/
  mocks/

Do not create abstractions without an actual use case.

## Design Direction

The product should feel like a real automotive digital service,
not a SaaS landing page.

Keywords:

- premium
- technical
- calm
- automotive
- trustworthy
- data-oriented

Avoid:

- excessive gradients
- excessive glassmorphism
- huge marketing headlines
- playful startup visuals
- unnecessary animations
- generic admin dashboard appearance

Favor:

- dark neutral surfaces
- clear hierarchy
- strong typography
- restrained accent colors
- vehicle-centric imagery
- status visualization
- precise spacing

## UX Principles

Every important asynchronous UI should consider:

- loading
- error
- empty
- success
- disabled states

Security-related operations must clearly communicate:

- verification progress
- verification result
- failure reason
- whether installation is allowed

## Code Quality

Before creating a new component:

1. Check whether an existing component can be reused.
2. Keep components focused.
3. Keep domain logic out of presentation components.
4. Use meaningful names.
5. Avoid mock implementation leaking into production interfaces.

## Portfolio Priority

When choosing between adding another feature and polishing an existing
critical flow, prefer polishing the critical flow.

Critical flows:

1. Garage Dashboard
2. Secure Software Update
3. Vehicle Sharing and Rental Agreements
4. Digital Access and Owner Authorization

The project must remain understandable enough to explain during an interview.

## My Garage 2.0 Scope

- Preserve existing session authentication, CSRF, vehicle ownership and OTA verification.
- OWNER/RENTER are UI modes, not permanent account roles. Enforce ownership/active grants on the backend.
- Reuse existing components and extend models with additive compatible fields. Never reset existing data.
- Remote LOCKED/UNLOCKED values are DB simulation; never claim real vehicle commands or telemetry.
- No payment, legal e-signatures, insurance, license checks or commercial KMS.
- Serialize conflicting vehicle operations with DB locks; emit SSE hints after commit and restore via REST.
- Keep test CA/device private keys out of Git and HTTP APIs. Browser key use is non-extractable in-memory simulation.
- Run relevant regression, frontend type/lint/build and backend tests; report actual results and limits.
- Do not commit, push, merge or deploy unless the user explicitly changes this request's restriction.
- Document current implementation and incomplete work in docs/IMPLEMENTATION_PLAN.md.
