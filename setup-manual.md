# Little Stars Kindergarten — Complete Setup Manual

The full-stack kindergarten website + School Management System. Static HTML/CSS/vanilla-JS frontend, Supabase backend (PostgreSQL, RLS, Storage, Edge Functions, pg_cron). Four roles: **admin → head_teacher → teacher → parent**.

This manual walks you from zero to a running, secure system — including the live project repair path, RLS security checks, and the escalation-workflow test.

---

## 1. Architecture Overview

```
Browser (index.html / login.html / dashboard.html + js/)
  │  vendored @supabase/supabase-js  (js/vendor/supabase.min.js)
  ▼
Supabase project
  ├─ PostgreSQL schema       supabase/migrations/001-019
  ├─ Row Level Security      enforced on every table
  ├─ Storage buckets         avatars · student-photos · gallery (public)
  │                          homework-documents · exam-papers (private)
  ├─ Edge Functions          check-escalations → rpc process_overdue_items()
  ├─ pg_cron                 nightly process-overdue-daily
  └─ Auth (email/password)   profiles linked to auth.users
```

Key decision updates enforced through the code:
- **No `supervisor` role.** The head teacher is the supervisor equivalent (`head_teachers` / `head_teacher_teachers`). The `supervisor` enum value exists only for legacy compatibility and is unused by the app, RLS, and escalation engine.
- **No student login.** Students are records; parents see them through `parent_students`.
- **Parents can only ever read PUBLISHED results** (RLS-enforced in 016).

---

## 2. Prerequisites

- A [Supabase](https://supabase.com) account
- Node.js 18+ (for the local dev server and optional CLI)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional — Dashboard SQL Editor works fine)

---

## 3. Create the Supabase Project

1. Sign in at supabase.com → **New Project**
2. Name: `little-stars-kindergarten`
3. Region close to your users; set a strong database password
4. Wait for provisioning

## 4. Get Credentials + Configure Auth

1. **Project Settings → API**
   - Copy the **Project URL** (`https://<id>.supabase.co`)
   - Copy the **Publishable key** — on new projects it is `sb_publishable_…`
     (older projects show an `eyJ…` anon key; **both are accepted**)
2. **Authentication → URL Configuration**
   - Site URL: `http://localhost:8080`
   - Redirect URLs: add `http://localhost:8080/reset-password.html`
     (and your production URL + `/reset-password.html` when deployed)
3. **Authentication → Providers → Email**: keep Enabled. Optionally enable "Confirm email".

> The app ships with the publishable key in `js/config.js`, which is public by design. **Never** put a service-role key there.

## 5. Configure the Frontend

Edit `js/config.js`:

```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_…';   // or eyJ… anon key
```

Regenerate the local vendored SDK if you rebuild from source:

```bash
npm run build        # runs scripts/vendor-supabase.mjs → js/vendor/supabase.min.js
```

## 6. Apply Database Migrations (ordered)

Open **Dashboard → SQL Editor** and run each file **in order**:

| # | File | Purpose |
|---|------|---------|
| 001 | `enable_extensions` | pgcrypto, pg_cron, http |
| 002 | `create_enums` | user_role, task_status, etc. |
| 003 | `create_profiles` | profiles linked to auth.users |
| 004 | `create_school_structure` | schools, years, classes, sections, subjects |
| 005 | `create_teachers_head_teachers` | teachers, head_teachers, assignments |
| 006 | `create_students_parents` | students, parents, parent_students |
| 007 | `create_academic_records` | attendance, homework, exams, results |
| 008 | `create_tasks_feedback` | tasks, feedback, feedback_responses |
| 009 | `create_workflow_escalations` | escalations |
| 010 | `create_notifications_audit` | notifications, audit_logs |
| 011 | `create_rls_policies` | Row Level Security policies |
| 012 | `create_functions_triggers` | handle_new_user trigger, helpers |
| 013 | `create_indexes` | performance indexes |
| 014 | `seed_data` | base data (school, classes, 20 students, settings) |
| 015 | `repair_rls_and_schema` | live-repair path (below) |
| 016 | `enhance_workflows` | results approval, announcements, task_comments, preference fix |
| 017 | `escalation_engine` | resolve_escalation_target, idempotent create_escalation, process_overdue_items v2 + cron job |
| 018 | `storage_setup` | buckets + storage policies |
| 019 | `seed_extended_demo` | **after** users exist (Step 8) |

### 6.1 Repairing an existing / older project

If your DB was created with the older `supervisors` schema, is missing
`head_teachers`, or `attendance`/`attendance_records` error with
`infinite recursion detected in policy for relation`, run `015_repair_rls_and_schema.sql`.

`015–018` are **idempotent** where they touch existing data and are safe to run
against a project that already has 001–014 applied.

## 7. Run the App Locally (before creating users)

```bash
npm run serve          # or python3 -m http.server 8080
```

Open http://localhost:8080. Without users the app runs in **demo mode** (any
password) — verify the pages/roles render before wiring live data.

## 8. Create Auth Users + Link Records

### 8.1 Create users

**Dashboard → Authentication → Users → Add user** for each:

| Email | Role (metadata) | full_name (metadata) |
|-------|-----------------|----------------------|
| admin@kindergarten.com | `admin` | Admin User |
| head_teacher@kindergarten.com | `head_teacher` | Jane Head Teacher |
| teacher1@kindergarten.com | `teacher` | Sarah Johnson |
| teacher2@kindergarten.com | `teacher` | Michael Chen |
| parent1@kindergarten.com | `parent` | John Smith |
| parent2@kindergarten.com | `parent` | Maria Garcia |

In the **User Metadata** JSON put:

```json
{ "full_name": "Sarah Johnson", "role": "teacher" }
```

The `handle_new_user` trigger (012) copies `full_name`/`role` into `profiles`.

### 8.2 Link the entity records (SQL Editor)

```sql
INSERT INTO teachers (profile_id)
SELECT id FROM profiles WHERE email = 'teacher1@kindergarten.com'
AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.profile_id = profiles.id);
INSERT INTO teachers (profile_id)
SELECT id FROM profiles WHERE email = 'teacher2@kindergarten.com'
AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.profile_id = profiles.id);

INSERT INTO head_teachers (profile_id, department)
SELECT id, 'Early Education' FROM profiles WHERE email = 'head_teacher@kindergarten.com'
AND NOT EXISTS (SELECT 1 FROM head_teachers ht WHERE ht.profile_id = profiles.id);

INSERT INTO parents (profile_id)
SELECT id FROM profiles WHERE email = 'parent1@kindergarten.com'
AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.profile_id = profiles.id);
INSERT INTO parents (profile_id)
SELECT id FROM profiles WHERE email = 'parent2@kindergarten.com'
AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.profile_id = profiles.id);
```

### 8.3 Extended demo/workflow data

Run `019_seed_extended_demo.sql`. It links head-teacher coverage, the teachers'
classes/subjects, parents→students, homework, **an exam with results already
"submitted for review"**, tasks (in_progress / submitted / assigned), feedback,
announcements, and notifications. Safe to re-run; prints a NOTICE and does
nothing if a demo user is missing.

### 8.4 Optional: teacher class assignments (also available in-app under Admin → Assignments)

```sql
INSERT INTO teacher_classes (teacher_id, class_id, section_id, academic_year_id)
SELECT (SELECT id FROM teachers WHERE profile_id = (SELECT id FROM profiles WHERE email='teacher1@kindergarten.com')),
       'c0000000-0000-0000-0000-000000000001',
       'd0000000-0000-0000-0000-000000000001',
       'b0000000-0000-0000-0000-000000000001';
```

## 9. Storage Buckets

`018_storage_setup.sql` creates and secures the buckets. Verify in
**Dashboard → Storage**:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | ✅ | user profile photos |
| `student-photos` | ✅ | student photos |
| `gallery` | ✅ | school gallery |
| `homework-documents` | ❌ | homework attachments |
| `exam-papers` | ❌ | exam papers |

Policies: public read on public buckets; avatar upload limited to
`avatars/<auth.uid()>/…`; staff read on private buckets; admins delete.

## 10. Edge Functions

```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase functions deploy check-escalations
supabase functions deploy send-notification
supabase functions deploy process-overdue
```

`check-escalations` simply runs `SELECT process_overdue_items()` via RPC — the
database is the single source of truth (idempotent, dedup safe).

## 11. Cron Job

Migration `017` registers `process-overdue-daily` automatically when pg_cron
is available. Verify in **Dashboard → Database → Cron jobs**.
To add it manually (or if you prefer the edge-function trigger), run:

```sql
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'process-overdue-daily';

SELECT cron.schedule(
  'process-overdue-daily',
  '0 0 * * *',
  $$SELECT process_overdue_items()$$
);
```

Optional: a second job hitting the edge function through `net.http_post` (see SETUP.md).

## 12. RLS — Security Verification

Run these in the SQL Editor **as the `postgres` role**. Each should return
`0 rows` / `false` — a non-empty result means a policy leak.

```sql
-- Teacher must NOT see other classes' attendance
SELECT count(*) FROM attendance WHERE NOT EXISTS (
  SELECT 1 FROM teacher_classes tc
  WHERE tc.teacher_id = get_teacher_id()
    AND tc.class_id = attendance.class_id
    AND tc.section_id = attendance.section_id
);

-- Parent must NOT see unpublished results
SELECT count(*) FROM results
WHERE status <> 'published'
  AND EXISTS (SELECT 1 FROM parent_students ps
              WHERE ps.parent_id = get_parent_id()
                AND ps.student_id = results.student_id);

-- Teacher must NOT read/update tasks not assigned to them
SELECT count(*) FROM tasks
WHERE assigned_to <> auth.uid()
  AND assigned_by <> auth.uid();

-- Non-admin must not read audit_logs
SELECT count(*) FROM audit_logs;   -- hard error for normal users expected

-- Head teacher must not be able to mutate another school's data (multi-school)
SELECT 1; -- sanity: every school_id column is RLS-filtered via get_role helpers
```

You can also verify at the **HTTP layer**: open the app in a private window,
log in as `parent1`, and confirm the Results page shows *only* published grades.

## 13. Run & Test Matrix

Log in as each role on http://localhost:8080 → login.html:

| Role | Verify |
|------|--------|
| admin | Users/Classes/Subjects/Academic Years CRUD; **Assignments** (assign class/subject, link coverage); **Announcements** CRUD; **Settings** upsert; Audit Log; bell → notifications; mark-all-read |
| head_teacher | Create/Edit tasks, approve/reject submitted tasks & submissions; **Monitor → Results Review** (approve & publish / reject); Resolve escalations; Feedback respond/resolve; task Comments |
| teacher | Create homework & exams; Attendance save; **Enter Results** + **Save & Submit for Review**; task Start/Submit; task Comments; Feedback respond/resolve |
| parent | child selector persists; **published-only** results; homework/attendance per child; announcements; notifications |

## 14. Escalation Workflow Test

1. As admin → Settings, set **Escalation Period** to `0`.
2. As head_teacher, create a task for `teacher1` with `due_date` = today.
3. Do **not** start it. Run the cron function manually in SQL Editor:
   ```sql
   SELECT process_overdue_items();
   ```
4. Sign in as `head_teacher` → **Escalations**: the overdue task is listed
   (`escalation_level` was raised to 1; duplicated escalations are blocked).
5. As head_teacher, **Resolve** it — the underlying task is closed too.
6. Re-run `process_overdue_items()` — confirm no duplicate notifications
   (dedup guard in `create_escalation` + daily reminder gate).

Trigger timing: `create_escalation` refuses duplicates while an open escalation
exists for the same task/feedback, so nightly runs never double-notify.

## 15. Password Reset

- **login.html → "Forgot password?"** sends `resetPasswordForEmail` with
  `redirectTo: /reset-password.html`.
- **reset-password.html** auto-detects the recovery session and lets the user
  set a new password (min 8 chars, confirmed).

Reminder: `reset-password.html` must be in the Auth **Redirect URLs** (Step 4).

## 16. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `infinite recursion detected … attendance` | Run `015_repair_rls_and_schema.sql` |
| Demo mode always | Check `js/config.js` URL/key; confirm SDK loaded (DevTools → console) |
| `No data found` tables | Demo auth users / 019 not run, or teacher_classes missing (Admin → Assignments) |
| Parent sees no results | RLS as designed — results must be **published** by head teacher (Monitor → Results Review) |
| `create_escalation` error | Ensure profiles exist and `escalation_days` is numeric in `system_settings` |
| Reset email not arriving | Check Email provider enabled + Redirect URL whitelisted |

## 17. Project Layout (dev reference)

```
index.html            marketing/home site
login.html            sign in + forgot-password
reset-password.html   password reset (recovery link)
dashboard.html        authenticated SPA shell (sidebar + bell + router)
js/config.js          Supabase URL/key, client factory
js/app.js             sidebar config, boot, bell wiring, badge refresh
js/pages/<role>/      per-role dashboards & modules
js/components/        table, form, modal, toast, calendar, notifications,
                      announcements, feedback, task-comments, child-selector
supabase/migrations/  001-019
supabase/functions/   check-escalations, send-notification, process-overdue
package.json          serve / build / check scripts
```