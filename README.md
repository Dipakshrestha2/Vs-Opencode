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
- **Automatic escalation** of overdue items (configurable period)
- **Notifications system** for all user actions
- **Audit logging** for important changes
- **Calendar** for events and deadlines
- **Feedback system** between head_teachers, teachers, and parents

## Tech Stack
- HTML5, CSS3 (Flexbox + CSS Grid)
- Vanilla JavaScript (ES Modules)
- Supabase (Auth, PostgreSQL, RLS, Edge Functions, Storage, Cron)
- No frameworks — pure vanilla stack

## Project Structure
```
kindergarten/
├── index.html              # Public website
├── login.html              # Authentication page
├── dashboard.html          # Dashboard shell
├── css/                    # Stylesheets
├── js/                     # JavaScript modules
│   ├── components/         # Reusable UI components
│   ├── pages/              # Role-specific pages
│   │   ├── admin/
│   │   ├── head_teacher/
│   │   ├── teacher/
│   │   └── parent/
│   └── website/            # Public website scripts
├── assets/                 # Images and icons
├── supabase/               # Database migrations & edge functions
└── SETUP.md                # Setup instructions
```

## Quick Start

1. Follow [SETUP.md](SETUP.md) for full configuration
2. Or run in demo mode (no Supabase needed):
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
