# Re-Mmogo WebApp

A full-stack Motshelo group management system built with React, Node.js, Express, JWT authentication, and SQLite.

## Main Features

- Register and login users securely
- Register Motshelo groups
- Enroll members into groups
- Mark members as signatories/approvers
- Record monthly contributions of P1000
- Submit contribution payments with optional proof of payment
- Approve contributions using signatories
- Record member loan requests
- Enforce member-only borrowing
- Require two signatory approvals before loan disbursement
- Apply 20% monthly interest on loan balances
- Record loan repayments with optional proof of payment
- Approve repayments before they reflect
- Track member balances
- Produce year-end reports showing contributions, loans, interest, and estimated payout

## Tech Stack

Frontend:
- React
- Vite
- React Router
- Lucide React
- Modern CSS Grid/Flexbox

Backend:
- Node.js
- Express
- JWT authentication
- bcrypt password hashing
- SQLite database
- RESTful APIs

## Folder Structure

```txt
re-mmogo-complete/
  backend/
  frontend/
  README.md
```

## Local Setup

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend runs on:

```txt
http://localhost:5000
```

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```txt
http://localhost:5173
```

## Environment Variables

Backend `.env`:

```env
PORT=5000
JWT_SECRET=change_this_secret_before_deployment
FRONTEND_URL=http://localhost:5173
DB_FILE=./database.sqlite
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:5000
```

## Deployment Notes

For deployment, deploy the backend and frontend separately.

Suggested platforms:

- Frontend: Vercel or Netlify
- Backend: Render or Railway

After deploying the backend, set this frontend environment variable:

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

Also set the backend `FRONTEND_URL` to your deployed frontend URL.

## Important Note About Database

The project brief mentions SQL Server, but this version uses SQLite because it is simpler to run locally and easier to submit/deploy quickly. The database still has proper tables, relationships, and secure password storage.
