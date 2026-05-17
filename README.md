# AtomQuest
Goal Setting & Performance Tracking Portal

## Overview
AtomQuest is a web-based platform designed to digitize employee goal management, approvals, quarterly check-ins, and performance tracking.
The system replaces fragmented workflows such as spreadsheets, emails, and offline reviews with a centralized, role-based portal hosted on Vercel with Supabase as the backend.

---

## Features

### Employee
- Create and manage goals
- Submit quarterly updates
- Track progress and status
- View approval status in real time

### Manager
- Review and approve or reject goals
- Edit targets and weightages
- Conduct quarterly check-ins
- View team performance dashboard

### Admin
- Manage cycles and users
- Monitor completion status
- View audit logs and analytics
- Handle escalations

---

## Validation Rules
- Total goal weightage = 100%
- Minimum goal weightage = 10%
- Maximum 8 goals per employee
- Goals lock after approval

---

## Tech Stack

| Layer          | Technology                        |
| -------------- | --------------------------------- |
| Frontend       | React + Vite                      |
| Styling        | Tailwind CSS                      |
| Backend        | Supabase                          |
| Database       | PostgreSQL (via Supabase)         |
| Routing        | React Router v6                   |
| Auth           | Supabase Auth + Microsoft Azure Entra ID (SSO) |
| Hosting        | Vercel                            |
| Notifications  | Resend (Email) + Teams Webhook ⚠️ Pending |

---

## Authentication
- Microsoft Azure Entra ID (OAuth 2.0 SSO) — sign in with any Microsoft/college account
- Email + Password login for demo accounts
- Role is automatically derived from email on first login
- JWT session managed by Supabase Auth

---

## Project Structure
```bash
atomquest/
├── vercel.json
├── supabase/
│   └── schema.sql
├── src/
│   ├── assets/
│   │   └── logo.png
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   └── Logo.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── azure.js
│   │   └── notify.js
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── AuthCallback.jsx
│   │   ├── Dashboard.jsx
│   │   ├── employee/
│   │   ├── manager/
│   │   └── admin/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
```

---

## Setup

### Install dependencies
```bash
npm install
```

### Configure environment variables
Create `.env.local`
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run database schema
Execute `supabase/schema.sql` inside the Supabase SQL Editor.

### Start development server
```bash
npm run dev
```

---

## Deployment
- Hosted on **Vercel** at `https://atomquest-ten.vercel.app`
- `vercel.json` includes SPA rewrites so all routes serve `index.html`
- Environment variables set in Vercel dashboard
- Auto-deploys on every `git push` to main

---

## Demo Credentials

| Role     | Email              | Password |
| -------- | ------------------ | -------- |
| Employee | employee@demo.com  | demo1234 |
| Manager  | manager@demo.com   | demo1234 |
| Admin    | admin@demo.com     | demo1234 |

> Microsoft SSO is also available — click "Continue with Microsoft" to sign in with any Microsoft or college account.

---

## ⚠️ Pending Features

### Email Notifications (Resend)
The notification system is architected and the code exists in `src/lib/notify.js` but is pending full activation due to the following:
- Resend requires a **verified sending domain** to deliver emails to external recipients
- In the current demo, emails can only be sent to the account registered on Resend
- Once a custom domain is verified, the following triggers will be live:
  - Goal submitted → Manager gets email
  - Goal approved / rejected → Employee gets email
  - Quarterly check-in done → Manager gets email
  - Quarterly reminder → Employee gets email

### Microsoft Teams Notifications
- Teams Incoming Webhook is integrated in `src/lib/notify.js`
- Adaptive Cards with deep links are built and ready
- Pending activation as it requires access to a live Microsoft Teams channel with webhook permissions
- Once a webhook URL is configured, managers will receive real-time Teams cards on all goal events

> Both features are production-ready in code. They require environment configuration (`VITE_RESEND_API_KEY` and `VITE_TEAMS_WEBHOOK_URL`) to activate.

---

## Repository
Codebase is version controlled using Git and GitHub.
Auto-deployment is configured via Vercel's GitHub integration.
