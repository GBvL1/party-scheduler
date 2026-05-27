@AGENTS.md

# RSA INITIERING — Party Scheduler

Group availability app with a military/glitch aesthetic. Guests register via a single invite link and mark which dates they can attend. The host sees a dashboard with aggregated results sorted by popularity.

Deployed on Vercel, connected to GitHub (`GBvL1/party-scheduler`). Push to `main` triggers auto-deploy.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2.6 App Router, React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| Database | Supabase (Postgres) |
| Font | Stardos Stencil via `next/font/google` |
| Package manager | npm |
| Node | 20.x |

---

## Commands

```bash
npm run dev     # dev server on http://localhost:3000
npm run build   # production build
npm run lint    # ESLint
```

Always run `npm run build` before pushing if you touched types or API routes.

---

## Project layout

```
app/
  page.tsx                          # Landing — host creates the event
  layout.tsx                        # Root layout: font, overlays, crosshair HUD
  globals.css                       # All styles and animations (no tailwind.config)
  components/
    GlitchText.tsx                  # Character-scramble text on mount
  join/[hostToken]/
    page.tsx                        # Guest registers their name
  respond/[friendToken]/
    page.tsx                        # Guest marks available dates
  dashboard/[hostToken]/
    page.tsx                        # Host sees aggregated results
  api/
    events/route.ts                 # POST — create event + dates
    friends/route.ts                # POST — register guest by name
    availability/[friendToken]/
      route.ts                      # GET dates+selections / POST save selections
    dashboard/[hostToken]/
      route.ts                      # GET full dashboard data

lib/
  supabase.ts                       # Singleton Supabase client (lazy init)
  sound.ts                          # Web Audio API sound synthesis (playClick, playConfirm, playError, playToggle)

supabase/
  schema.sql                        # Full DB schema — run this to set up a fresh DB
```

---

## User flow

```
Host: / → clicks "INITIERA OPERATION"
  → POST /api/events (hardcoded 14 dates, name "RSA INITIERING")
  → redirect /dashboard/[hostToken]

Host shares: /join/[hostToken]

Guest: /join/[hostToken] → enters name
  → POST /api/friends { hostToken, name }
    → if name already exists (case-insensitive): returns existing friendToken
    → otherwise: creates new friend record
  → redirect /respond/[friendToken]

Guest: /respond/[friendToken] → marks dates
  → GET /api/availability/[friendToken]   (loads dates + existing picks)
  → POST /api/availability/[friendToken]  (saves full selection, replaces previous)

Host: /dashboard/[hostToken]
  → GET /api/dashboard/[hostToken]        (dates sorted by availability count)
```

---

## Database schema

```
events            id, name, host_token (unique), created_at
candidate_dates   id, event_id→events, date         (unique per event)
friends           id, event_id→events, name, token (unique), created_at
availabilities    id, friend_id→friends, candidate_date_id→candidate_dates (unique pair)
```

All tokens are UUIDs (v4). `host_token` unlocks the dashboard and the join link. `friend_token` unlocks the respond page.

---

## Environment variables

Both vars are needed to run locally. Add to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

They are already set in Vercel. Never commit `.env.local`.

---

## Styling conventions

- **No `tailwind.config.ts`** — Tailwind v4 is configured entirely in `app/globals.css` via `@theme inline`.
- Font is injected via CSS variable `--font-display` (set by Next.js font loader). Both `font-display` and `font-mono` utilities map to Stardos Stencil.
- `cursor: crosshair !important` on `*` — do not override this per-element.
- All colors are OKLCH. Never use raw `#000` or `#fff`.
- All text is `uppercase`. Swedish copy throughout.

### CSS classes to reuse

| Class | Purpose |
|---|---|
| `.logo-rsa` | RSA text with red/blue glitch pseudo-elements |
| `.crt-boot` | CRT power-on animation — add to `<main>` on page load |
| `.flicker` | Subtle ambient opacity flicker — add to main content div |
| `.page-glitch` | Full-screen glitch flash — trigger on form submit |
| `.page-glitch-hard` | More violent version — used on join/respond submits |
| `.glitch-burst` | Ambient content glitch — apply to wrapper div, triggers randomly |
| `.select-glitch` | Row-level glitch flash — trigger on date toggle |
| `.btn-rsa` | Military button style with violent `:active` glitch |
| `.cursor-blink` | Blinking underscore cursor for loading states |
| `.crosshair-hud` | Pulsing crosshair — used in layout, not per-page |

### Overlays (layout only — do not add to pages)

`scanlines`, `vignette`, `scanline-sweep`, `static-flash` are fixed-position divs in `layout.tsx`. The crosshair SVG is also there. Never duplicate these in page files.

---

## Component: GlitchText

```tsx
import { GlitchText } from "@/app/components/GlitchText";

<GlitchText text="INITIERING" delay={700} speed={30} />
```

Scrambles with random characters, then reveals left-to-right. Use on headings that should animate on page load. `delay` (ms) before starting, `speed` (ms per frame).

---

## Fixed dates

The 14 candidate dates are hardcoded in `app/page.tsx` as `FIXED_DATES`. If dates need changing, edit that array. Do not make dates configurable via UI unless explicitly asked.

---

## API patterns

- All routes use `import { supabase } from "@/lib/supabase"` — never instantiate a new client.
- Token lookups always use `.eq("..._token", token).single()` — 404 if not found.
- `POST /api/friends` does a case-insensitive name lookup first (`.ilike()`) — returns the existing `friendToken` if found, creates a new record otherwise.
- Availability save is **replace-all**: delete existing rows for the friend, then insert the new selection.
- API responses: `{ data }` on success, `{ error: string }` with appropriate status on failure.

---

## Git / deploy workflow

```bash
git checkout -b my-branch
# ... make changes ...
npm run build          # verify no type errors
git add <files>        # add specific files, not git add -A
git commit -m "..."
git push -u origin my-branch
gh pr create
gh pr merge <number> --merge --delete-branch
```

Merging to `main` triggers Vercel deploy automatically. Check Vercel dashboard or wait ~60s then visit the live URL.

---

## What lives where — quick lookup

| Question | Answer |
|---|---|
| Where are animations? | `app/globals.css` — all keyframes at the bottom |
| Where is the font set? | `app/layout.tsx` (loader) + `globals.css` (@theme inline) |
| Where are the dates? | `app/page.tsx` → `FIXED_DATES` array |
| Where is Supabase config? | `lib/supabase.ts` + `.env.local` |
| Where is DB schema? | `supabase/schema.sql` |
| Where is the invite link generated? | `app/dashboard/[hostToken]/page.tsx` (constructed from `window.location.origin`) |
| Where are Swedish strings? | In each page file inline — no i18n library |
