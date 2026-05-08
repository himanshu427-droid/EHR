# MediChain EHR

Full-stack electronic health record platform with:

- `client/`: React + Vite frontend
- `server/`: Express + TypeScript backend
- `shared/`: shared schema/types
- PostgreSQL via Drizzle ORM
- File uploads stored under `uploads/`
- Application audit logging for operational history

## Current Deployment

- Frontend: Vercel
- Backend: Render


## Core Features

- Patient registration and login
- Role-based dashboards for patients, doctors, labs, admins, insurers, and researchers
- Record creation and viewing
- Consent and access control workflows
- Lab report and insurance claim flows
- Admin audit activity view

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`.

3. Start the development server:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Type Check

```bash
npm run check
```

## Database

Useful Drizzle commands:

```bash
npm run db:generate
npm run db:push
npm run db:studio
```
