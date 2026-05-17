# AtomQuest

Goal Setting & Performance Tracking Portal

## Overview

AtomQuest is a web-based platform designed to digitize employee goal management, approvals, quarterly check-ins, and performance tracking.

The system replaces fragmented workflows such as spreadsheets, emails, and offline reviews with a centralized, role-based portal.

---

## Features

### Employee

* Create and manage goals
* Submit quarterly updates
* Track progress and status

### Manager

* Review and approve goals
* Edit targets and weightages
* Conduct quarterly check-ins

### Admin

* Manage cycles and users
* Monitor completion status
* View audit logs and analytics

---

## Validation Rules

* Total goal weightage = 100%
* Minimum goal weightage = 10%
* Maximum 8 goals per employee
* Goals lock after approval

---

## Tech Stack

| Layer    | Technology   |
| -------- | ------------ |
| Frontend | React + Vite |
| Styling  | Tailwind CSS |
| Backend  | Supabase     |
| Database | PostgreSQL   |
| Routing  | React Router |

---

## Project Structure

```bash id="jlwmb0"
atomquest/
├── supabase/
│   └── schema.sql
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── pages/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
```

---

## Setup

### Install dependencies

```bash id="jlwmy4"
npm install
```

### Configure environment variables

Create `.env.local`

```env id="jlwml9"
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run database schema

Execute:

```txt id="jlwmt5"
supabase/schema.sql
```

inside the Supabase SQL Editor.

### Start development server

```bash id="jlwma6"
npm run dev
```

---

## Demo Credentials

| Role     | Email                                         | Password |
| -------- | --------------------------------------------- | -------- |
| Employee | [employee@demo.com](mailto:employee@demo.com) | demo1234 |
| Manager  | [manager@demo.com](mailto:manager@demo.com)   | demo1234 |
| Admin    | [admin@demo.com](mailto:admin@demo.com)       | demo1234 |

---

## Repository

Codebase is version controlled using Git and GitHub.
