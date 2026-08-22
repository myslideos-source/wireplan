# WIREPLAN

**Plan your home. We calculate the wiring.**
by Musotto Labs

WIREPLAN turns an uploaded floor plan into a digital building model, then
walks the user through electrical planning, Loxone smart-home setup, cable
routing, and a material list — without requiring any CAD knowledge.

## Status: Phase 1 — Foundation, App Shell & Dashboard

This build implements the app shell (top navigation, sidebar, status bar),
the dashboard, the projects list, and the domain/data architecture that
later phases plug into. Everything beyond Phase 1 (AI plan analysis,
geometry/electrical editor, cable routing, Loxone, materials, billing) is
gated behind feature flags and rendered as an honest "coming soon" state —
see `src/lib/feature-flags.ts`.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`.

The app runs entirely on local mock data (`src/lib/mock-data.ts`) until a
Supabase project is connected. Copy `.env.example` to `.env.local` and fill
in `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` to switch to
a live project — no code changes required.

## Project structure

```
src/
  app/(app)/        Route group sharing the AppShell layout (dashboard, projects, editor, ...)
  components/ui/     Design-system primitives (Button, Card, Badge, Stepper, Modal, ...)
  components/shell/   TopNav, Sidebar, StatusBar, AppShell, ComingSoon
  domain/             Shared TypeScript interfaces (Point, Wall, Room, Project, SmartHomeSystem, ...)
  features/           Domain-scoped feature code (projects, plan-upload, ...)
  lib/                Supabase clients, feature flags, mock data, utils
supabase/migrations/  SQL schema draft (not yet applied to a live project)
```

## Design system

Dark-only UI (`#071019` background, `#16D8C4` cyan primary) matching the
WIREPLAN visual spec — see the color tokens in `src/app/globals.css`.

## Feature flags

All flags default to `false`. Enable one via `.env.local`:

```
NEXT_PUBLIC_FEATURE_AI_PLAN_ANALYSIS=true
```

See `src/lib/feature-flags.ts` for the full list and which build phase each
one unlocks.
