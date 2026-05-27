# Party Scheduler

A party availability scheduler — create an event, share personal links with friends, and instantly see which date works best for everyone.

## How It Works

1. **Host** visits the home page, names the event, and picks candidate dates.
2. Host gets a **dashboard link** to bookmark and a unique **shareable link per friend**.
3. **Friends** open their personal link (no login needed), click to mark which dates they're free, and hit Save.
4. The **dashboard** shows all candidate dates ranked by how many friends are available, with names listed under each date.

---

## Tech Stack

- **Next.js 15** (App Router)
- **Supabase** (Postgres via `@supabase/supabase-js`)
- **Tailwind CSS v4**

---

## Local Development

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd party-scheduler
npm install
```

### 2. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, go to **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key**

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel + Supabase

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-username/party-scheduler.git
git push -u origin main
```

### 2. Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo.
2. Vercel auto-detects Next.js — no framework config needed.

### 3. Add Environment Variables in Vercel

In the Vercel project settings under **Environment Variables**, add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

### 4. Deploy

Click **Deploy**. Vercel builds and deploys automatically on every push to `main`.

---

## Database Schema

```sql
events            -- one row per party event
candidate_dates   -- the dates the host selected
friends           -- each invited friend (has a unique token)
availabilities    -- which friends are free on which dates
```

See [`supabase/schema.sql`](supabase/schema.sql) for the full schema.

---

## URL Structure

| Route | Description |
|---|---|
| `/` | Create a new event |
| `/dashboard/[hostToken]` | Host dashboard — add friends, view results |
| `/respond/[friendToken]` | Friend response page — mark availability |

---

## Supabase Row Level Security (RLS)

The app uses the `anon` key and does not enable RLS by default (all reads/writes go through the server-side API routes). For a production deployment, consider enabling RLS policies to restrict access:

- `events`: anyone with the host token can read/write
- `friends`: anyone with the matching event's host token can insert
- `availabilities`: anyone with the friend token can read/write their own rows

This keeps the app login-free while still preventing cross-user data access.
