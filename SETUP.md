# Little Stars Kindergarten - Setup Guide

This project targets a **live Supabase project** configured in `js/config.js`.
If the key is missing/offline, the app falls back to **demo mode**.

## Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local dev / migrations)
- A [Supabase](https://supabase.com) account
- Node.js (for local dev server)

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Name: `little-stars-kindergarten`
4. Set a strong database password
5. Choose a region close to you
6. Click "Create new project"

## Step 2: Get Project Credentials

1. Go to Project Settings → API
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **Publishable Key** — modern Supabase projects expose a `sb_publishable_...` key
     (older projects show an `eyJ...` anon key; both formats are accepted by the app)

## Step 3: Configure Frontend

Edit `js/config.js`:
```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_....';
```

Do not add secrets here — this file is public (it ships to browsers).

## Step 4: Apply Database Migrations

### Option A: Using Supabase Dashboard (recommended)
1. Go to SQL Editor in Supabase Dashboard
2. Run each migration file in order:
   - `001_enable_extensions.sql`
   - `002_create_enums.sql`
   - `003_create_profiles.sql`
   - `004_create_school_structure.sql`
   - `005_create_teachers_head_teachers.sql`
   - `006_create_students_parents.sql`
   - `007_create_academic_records.sql`
   - `008_create_tasks_feedback.sql`
   - `009_create_workflow_escalations.sql`
   - `010_create_notifications_audit.sql`
   - `011_create_rls_policies.sql`
   - `012_create_functions_triggers.sql`
   - `013_create_indexes.sql`
   - `014_seed_data.sql`
   - `015_repair_rls_and_schema.sql` (fixes legacy/`supervisors` databases)
   - `016_enhance_workflows.sql` (results approval, announcements, task comments)
   - `017_escalation_engine.sql` (reminders + escalation automation + pg_cron job)
   - `018_storage_setup.sql` (storage buckets + policies)
   - `019_seed_extended_demo.sql` (**after Step 5** - see below) — seeds the demo
     teachers/head teacher/parents, class & subject assignments, homework, exams,
     results-in-review, tasks and feedback once the auth users exist.

### Repairing an existing project (IMPORTANT)
If your database was created with the older `supervisors` schema, is missing
`head_teachers`, or the `attendance`/`attendance_records` tables return
`infinite recursion detected in policy` errors, run:
   - `015_repair_rls_and_schema.sql`

It is idempotent (safe to re-run) and fixes:
- missing `head_teacher` role value,
- missing `head_teachers` / `head_teacher_teachers` tables,
- attendance RLS recursive policies,
- the `process_overdue_items()` function.

`016`, `017` and `018` are also idempotent where they touch existing data, so
they are safe to run against an existing project too.

### Option B: Using Supabase CLI
```bash
supabase db push
```

## Step 5: Create Auth Users

In the Supabase Dashboard → Authentication → Users, create:

| Email | Password | Role |
|-------|----------|------|
| admin@kindergarten.com | (choose one) | admin |
| head_teacher@kindergarten.com | (choose one) | head_teacher |
| teacher1@kindergarten.com | (choose one) | teacher |
| teacher2@kindergarten.com | (choose one) | teacher |
| parent1@kindergarten.com | (choose one) | parent |
| parent2@kindergarten.com | (choose one) | parent |

**Important:** When creating users, add this JSON in the "User Metadata" field:
```json
{"full_name": "Admin User", "role": "admin"}
```

For each user type:
- Admin: `{"full_name": "Admin User", "role": "admin"}`
- Head Teacher: `{"full_name": "Jane Head Teacher", "role": "head_teacher"}`
- Teacher 1: `{"full_name": "Sarah Johnson", "role": "teacher"}`
- Teacher 2: `{"full_name": "Michael Chen", "role": "teacher"}`
- Parent 1: `{"full_name": "John Smith", "role": "parent"}`
- Parent 2: `{"full_name": "Maria Garcia", "role": "parent"}`

The `handle_new_user` trigger copies `full_name`/`role` into `profiles`.
Then in the SQL Editor, link the records (edit the emails to match the users you created):

```sql
-- Teachers
INSERT INTO teachers (profile_id)
SELECT id FROM profiles WHERE email = 'teacher1@kindergarten.com' AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.profile_id = profiles.id);

-- Head teacher
INSERT INTO head_teachers (profile_id)
SELECT id FROM profiles WHERE email = 'head_teacher@kindergarten.com' AND NOT EXISTS (SELECT 1 FROM head_teachers ht WHERE ht.profile_id = profiles.id);

-- Parent
INSERT INTO parents (profile_id)
SELECT id FROM profiles WHERE email = 'parent1@kindergarten.com' AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.profile_id = profiles.id);

-- Link head teacher -> teachers
INSERT INTO head_teacher_teachers (head_teacher_id, teacher_id)
SELECT (SELECT id FROM head_teachers WHERE profile_id = (SELECT id FROM profiles WHERE email='head_teacher@kindergarten.com')),
       (SELECT id FROM teachers WHERE profile_id = (SELECT id FROM profiles WHERE email='teacher1@kindergarten.com'))
WHERE NOT EXISTS (SELECT 1 FROM head_teacher_teachers);
```

Then run `019_seed_extended_demo.sql` in the SQL Editor. It resolves the demo
users by email and inserts their class/subject/head-teacher links, homework,
an exam with results waiting for review, tasks, feedback and announcements.
It is safe to re-run and does nothing (prints a NOTICE) if the demo users do
not exist yet.

## Step 6: Deploy Edge Functions

```bash
supabase functions deploy check-escalations
supabase functions deploy send-notification
supabase functions deploy process-overdue
```

## Step 7: Set Up Cron Jobs

In Supabase Dashboard → SQL Editor, run:

```sql
-- Process overdue items daily at midnight
SELECT cron.schedule(
  'process-overdue-daily',
  '0 0 * * *',
  $$SELECT process_overdue_items()$$
);

-- Check escalations daily
SELECT cron.schedule(
  'check-escalations-daily',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-escalations',
    headers := jsonb_build_object(
      'Authorization', current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

## Step 8: Create Storage Buckets

In Supabase Dashboard → Storage, create:
- `avatars` (public)
- `student-photos` (public)
- `gallery` (public)
- `homework-documents` (private)
- `exam-papers` (private)

## Step 9: Run Locally

```bash
npm run serve   # or: python3 -m http.server 8080
```

Open http://localhost:8080

The page loads Supabase from `js/vendor/supabase.min.js` and falls back to the
CDN if the local copy is missing.

## Demo Mode

If Supabase is not configured (or offline), the app runs in demo mode with
simulated data. Use any of the demo emails with any password.

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kindergarten.com | any |
| Head Teacher | head_teacher@kindergarten.com | any |
| Teacher | teacher1@kindergarten.com | any |
| Parent | parent1@kindergarten.com | any |