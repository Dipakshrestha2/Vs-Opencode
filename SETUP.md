# Little Stars Kindergarten - Setup Guide

## Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli)
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
   - **Anon Key** (public, safe for frontend)

## Step 3: Configure Frontend

Edit `js/config.js`:
```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
```

## Step 4: Apply Database Migrations

### Option A: Using Supabase Dashboard
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

### Option B: Using Supabase CLI
```bash
supabase init
supabase db push
```

## Step 5: Create Auth Users

In the Supabase Dashboard → Authentication → Users, create:

| Email | Password | Role |
|-------|----------|------|
| admin@kindergarten.com | admin123 | admin |
| head_teacher@kindergarten.com | super123 | head_teacher |
| teacher1@kindergarten.com | teach123 | teacher |
| teacher2@kindergarten.com | teach123 | teacher |
| parent1@kindergarten.com | parent123 | parent |
| parent2@kindergarten.com | parent123 | parent |

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
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8080
```

Open http://localhost:8080

## Demo Mode

If Supabase is not configured, the app runs in demo mode with simulated data. Use any of the demo emails to log in.

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kindergarten.com | admin123 |
| Head Teacher | head_teacher@kindergarten.com | super123 |
| Teacher | teacher1@kindergarten.com | teach123 |
| Parent | parent1@kindergarten.com | parent123 |
