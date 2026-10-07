# My Garage - Agent Guidelines

## Project Goal

My Garage is a portfolio project for mobility/frontend/backend engineering roles.

It is not a generic CRUD demo.

The product should demonstrate:

- professional frontend engineering
- mobility domain understanding
- authentication and authorization
- secure vehicle software update verification
- EV charging station search and reservation
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
    charging/
    reservation/
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
3. Charging Station Search
4. Reservation Authorization

The project must remain understandable enough to explain during an interview.