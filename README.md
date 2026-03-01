# GrindKeeper 🔥

A calendar-based habit tracker with Duolingo-like streaks. Built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Two item types**: Habits (recurring) and Events (sporadic logs)
- **Calendar views**: Month heatmap, week overview, day detail with backfill
- **Flexible schedules**: Daily / X per week / Every N days / Specific days
- **Smart streaks**: Grace days, pause mode, backfill with "edited later" marker
- **Completion levels**: Normal / Light / Crisis mode per habit
- **Energy budget**: Difficulty 1–5 per habit, daily overload warning
- **Contextual notes**: Quick inline notes with per-habit templates
- **Command palette**: ⌘K for fast navigation and quick-complete
- **Statistics**: Streaks, heatmaps, completion rates, no-zero days, CSV/JSON export
- **Notifications**: In-app center + snooze + email reminders via Edge Functions
- **Auth**: Magic link + Google OAuth via Supabase

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (Postgres + Auth + RLS)
- **Deployment**: Vercel + Supabase Edge Functions

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create Supabase project

1. Create project at [supabase.com](https://supabase.com)
2. Run migrations in order via SQL Editor or `supabase db push`:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit with your Supabase URL + keys
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Load demo data (optional)

After signing up, run `supabase/seed/demo_data.sql` in Supabase SQL Editor.

## Deploy to Vercel

```bash
vercel deploy
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel dashboard.

## Reminders

```bash
supabase functions deploy send-reminders
supabase crons create "hourly" --schedule "0 * * * *" --function send-reminders
```

## Architecture

```
app/(auth)/              # Login, OAuth callback
app/(app)/
  today/                 # Daily checklist
  calendar/              # Month/week/day views + heatmap
  habits/                # CRUD habits
  events/                # Log sporadic events
  stats/                 # Analytics, export
  settings/              # Profile, reminders, grace days
app/api/                 # completions, notifications, export

components/
  habits/                # Checklist, habit form, events list
  calendar/              # Calendar + day detail panel
  stats/                 # Heatmap, stats view
  settings/              # Settings form
  layout/                # Sidebar, command palette
  ui/                    # Button, Input, Dialog, Badge

lib/streak/calculator.ts # Full streak engine (daily/weekly/n-day/specific)
supabase/migrations/     # SQL schema + RLS policies
supabase/functions/      # Edge function: send-reminders
```

## Streak Algorithm

The streak engine (`lib/streak/calculator.ts`) handles:
- **Daily** — completion each consecutive calendar day
- **X per week** — meets target completions in a Mon–Sun week
- **Every N days** — at least once in any rolling N-day window
- **Specific days** — only required days count; skipped days don't break the streak
- **Grace days** — per user config (default 2/month), uses one per missed period
- **Pauses** — pause periods skipped entirely (no gain/loss)
- **Backfill** — past completions are valid but flagged `is_backfill = true`
- **Timezone** — all dates stored as DATE in user's local timezone
