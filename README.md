# 🌟 Little Stars Kindergarten

A complete Kindergarten One-Page Website and School Management System built with HTML5, CSS3, Vanilla JavaScript, and Supabase.

## Features

### Public Website
- Responsive one-page kindergarten website
- Rainbow playful design theme
- Hero, About, Programs, Teachers, Activities, Gallery, Contact sections
- Mobile-friendly with smooth animations
- Parent login portal

### School Management System
- **4 Role-Based Dashboards**: Admin, Head Teacher, Teacher, Parent
- **No Student Login** — students are database records linked to parents
- **Full CRUD** for users, classes, subjects, assignments
- **Attendance tracking** with daily recording
- **Homework management** with submissions
- **Exam results** entry and viewing
- **Task workflow**: Assigned → In Progress → Submitted → Under Review → Approved/Rejected → Completed
- **Automatic escalation** of overdue items (configurable period) — teacher items escalate to the assigned head teacher, head-teacher items to an admin
- **Result approval workflow**: draft → submitted → under review → approved → published (or rejected); parents only ever see **published** results
- **Task comments** between head teachers and teachers
- **Announcements** (admin-published, visible to everyone)
- **Notification center** (bell dropdown + per-role page, mark-all-read)
- **Notifications system** for all user actions
- **Audit logging** for important changes
- **Calendar** for events and deadlines
- **Feedback system** between head_teachers, teachers, and parents
- **Password reset** (forgot-password flow → recovery link → set new password)
- **Multi-child parent view** with a persisted child selector
- **Storage**: public avatars/student-photos/gallery, private homework-documents/exam-papers

## Tech Stack
- HTML5, CSS3 (Flexbox + CSS Grid)
- Vanilla JavaScript (ES Modules)
- Supabase (Auth, PostgreSQL, RLS, Edge Functions, Storage, Cron)
- No frameworks — pure vanilla stack

## Project Structure
```
kindergarten/
├── index.html              # Public website
├── login.html              # Authentication page (+ forgot password)
├── reset-password.html     # Password reset (recovery link)
├── dashboard.html          # Dashboard shell
├── css/                    # Stylesheets
├── js/                     # JavaScript modules
│   ├── vendor/             # Bundled supabase-js (offline-safe SDK)
│   ├── components/         # Reusable UI components
│   ├── pages/              # Role-specific pages
│   │   ├── admin/
│   │   ├── head_teacher/
│   │   ├── teacher/
│   │   └── parent/
│   └── website/            # Public website scripts
├── scripts/                # Dev helpers (vendor SDK bundling)
├── assets/                 # Images and icons
├── supabase/               # Database migrations & edge functions
├── setup-manual.md         # Complete setup manual (recommended)
└── SETUP.md                # Quick setup instructions
```

## Quick Start

1. Follow [setup-manual.md](setup-manual.md) for the complete walkthrough
2. Or use the quick [SETUP.md](SETUP.md)
3. Or run in demo mode (no Supabase needed):
   ```bash
   python -m http.server 8080
   ```
3. Open http://localhost:8080
4. Click "Parent Login" and use demo credentials

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kindergarten.com | any |
| Head Teacher | head_teacher@kindergarten.com | any |
| Teacher | teacher1@kindergarten.com | any |
| Parent | parent1@kindergarten.com | any |

> **Note**: Demo mode works without Supabase configuration.

## Database
- 28 normalized PostgreSQL tables
- Full Row Level Security (RLS) policies
- Automated triggers for profiles, notifications, and audit logs
- Configurable escalation rules

## License
MIT
