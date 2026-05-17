# AtomQuest — Goal Setting & Performance Portal

A web-based platform to digitize employee goal management, approvals, quarterly check-ins, and performance tracking. Replaces spreadsheets and emails with a centralized, role-based portal.

🔗 **Live:** https://atomquest-ten.vercel.app

---

## Demo Credentials

| Role     | Email             | Password |
|----------|-------------------|----------|
| Employee | employee@demo.com | demo1234 |
| Manager  | manager@demo.com  | demo1234 |
| Admin    | admin@demo.com    | demo1234 |

> Or click **"Continue with Microsoft"** to sign in with any Microsoft or college account via Azure Entra ID SSO.

---

## Features

### Employee
- Create goals with thrust area, UoM, target, and weightage
- Weightage must total exactly 100% before submission
- Submit goals to manager for approval
- Log quarterly achievements (Q1–Q4)
- Real-time bell notifications for approvals and rejections

### Manager
- Review, edit, approve or return employee goals
- Inline editing of target and weightage before approval
- Conduct quarterly check-ins with comments
- Team performance dashboard with weighted scores
- Real-time bell notifications when employees submit goals

### Admin
- User management and role assignment
- Cycle manager — configure Q1–Q4 date windows
- Analytics dashboard — 5 tabbed views:
  - Overview (thrust area, status, UoM distribution)
  - Employee performance table with rankings
  - Department heatmap
  - Manager effectiveness dashboard
  - Quarter-on-Quarter trend charts
- Escalation module — configurable rules, incident tracking, CSV export
- Full audit trail with CSV export

---

## Validation Rules
- Total goal weightage = 100%
- Minimum per goal = 10%
- Maximum 8 goals per employee
- Goals lock automatically after manager approval

---

## Tech Stack

| Layer         | Technology                                      |
|---------------|-------------------------------------------------|
| Frontend      | React 18 + Vite                                 |
| Styling       | Tailwind CSS                                    |
| Routing       | React Router v6                                 |
| Backend       | Supabase (PostgreSQL + Auth + Realtime)         |
| Auth          | Supabase Auth + Microsoft Azure Entra ID (SSO) |
| Notifications | In-app bell (Supabase Realtime) + Resend Email + Teams Webhook |
| Hosting       | Vercel (auto-deploy from GitHub)                |

---

## Setup

```bash
npm install
npm run dev
```

Create `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run `supabase/schema.sql` in Supabase SQL Editor.

---

## Project Structure
atomquest/
├── supabase/
│   └── schema.sql
├── src/
│   ├── components/       # Layout, Sidebar, Navbar, GoalCard, NotificationBell
│   ├── context/          # AuthContext (session management)
│   ├── lib/              # supabase.js, azure.js, notify.js, utils.js
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── AuthCallback.jsx
│   │   ├── Dashboard.jsx
│   │   ├── employee/     # MyGoals, CreateGoal, QuarterlyUpdate
│   │   ├── manager/      # TeamDashboard, ApproveGoals, CheckIn
│   │   └── admin/        # AdminDashboard, Analytics, Escalations, AuditTrail, CycleManager, UserManager
│   ├── App.jsx
│   └── main.jsx

---

## Notification System

| Channel | Status | Trigger |
|---------|--------|---------|
| In-app Bell | ✅ Live | Goal submitted, approved, rejected, check-in done |
| Email (Resend) | ⚙️ Ready | Requires verified sending domain |
| Teams Webhook | ⚙️ Ready | Requires Teams channel webhook URL |

---

## Deployment

Hosted on Vercel. `vercel.json` includes SPA rewrites.
Auto-deploys on every `git push` to `main`.
Environment variables configured in Vercel dashboard.
