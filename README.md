# TaskFlow

TaskFlow is a lightweight, Trello-style project management app: sign up, create boards for your projects, organize work into columns, and drag tasks across them as they progress. It's a full-stack case study in a modern, production-shaped Next.js stack — JWT authentication with hashed passwords, a relational Postgres schema managed with Prisma, and direct-to-S3 file uploads via short-lived presigned URLs — built to be read, deployed, and extended, not just demoed.

**Live demo:** _add your deployed Vercel URL here once deployed_

## Features

- **Accounts** — email/password signup and login, passwords hashed with bcrypt, sessions handled with signed JWTs in an HTTP-only cookie
- **Boards** — create, rename, and delete boards; each board starts with To Do / In Progress / Done columns
- **Columns** — add, rename, and delete columns per board
- **Tasks** — create, edit, and delete tasks with a title, description, and due date
- **Drag-and-drop** — move tasks between columns with `@dnd-kit/core`, with a live drop-target highlight and a drag preview
- **File attachments** — attach one file per task, uploaded directly from the browser to an S3 bucket via a presigned URL (the app never proxies the file through the server); gracefully degrades to a clear "not configured" message when AWS credentials aren't set
- **Dashboard** — a home page listing all of your boards with task counts and last-updated times
- **Responsive, polished UI** — built with Tailwind CSS, works down to mobile widths

## Tech stack

| Layer          | Choice                                                          |
| -------------- | ---------------------------------------------------------------- |
| Framework      | Next.js 14 (App Router) + TypeScript                             |
| Styling        | Tailwind CSS                                                     |
| Database / ORM | PostgreSQL + Prisma                                              |
| Auth           | Custom JWT auth (`jose`) with `bcryptjs` password hashing        |
| File storage   | AWS S3, via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` |
| Drag-and-drop  | `@dnd-kit/core`                                                  |
| Validation     | `zod`                                                             |

### Why these choices

- **`jose` instead of `jsonwebtoken`** — `jose` works in both the Node.js runtime (API routes) and the Edge runtime (middleware), so the same signing/verification code protects routes in `middleware.ts` without a second JWT library.
- **`bcryptjs` instead of `bcrypt`** — a pure-JS implementation with no native build step, which keeps `npm install` and serverless deploys (Vercel) simple and fast.
- **Presigned S3 uploads** — the browser uploads the file straight to S3; the Next.js server only ever issues a short-lived signed URL, so large files never pass through (or count against) a serverless function's execution time or memory.

## Project structure

```
taskflow/
├─ app/
│  ├─ api/               # Route handlers (auth, boards, columns, tasks, uploads)
│  ├─ boards/[boardId]/  # Board detail page (server component)
│  ├─ dashboard/         # Boards list page (server component)
│  ├─ login/ signup/     # Auth pages (client components)
│  ├─ layout.tsx, page.tsx, globals.css
├─ components/           # Client components (board UI, modals, forms)
├─ lib/                  # db (Prisma client), auth, session, s3, validators, utils
├─ prisma/schema.prisma  # Data model
├─ types/                # Shared TypeScript DTOs
└─ middleware.ts         # Route protection (redirects based on session cookie)
```

## Local development

### Prerequisites

- Node.js 18.18+ (Node 20 LTS recommended)
- A PostgreSQL database — any of these work:
  - **Docker (fastest):** `docker run --name taskflow-db -e POSTGRES_USER=taskflow -e POSTGRES_PASSWORD=taskflow -e POSTGRES_DB=taskflow -p 5432:5432 -d postgres:16`
  - A Postgres install on your machine
  - A hosted instance, e.g. a free [Neon](https://neon.tech) project (this is what the app is meant to run against in production)

### Setup

1. **Install dependencies** (this also runs `prisma generate` via the `postinstall` script):

   ```bash
   npm install
   ```

2. **Configure environment variables.** Copy the example file and fill in real values:

   ```bash
   cp .env.example .env
   ```

   At minimum, set `DATABASE_URL` (pointing at the Postgres instance above) and `JWT_SECRET` (any long random string — `openssl rand -base64 32` works well). The `AWS_*` variables are optional for local dev; leaving them blank disables file attachments without breaking anything else.

3. **Run the database migrations** to create the schema:

   ```bash
   npx prisma migrate dev
   ```

   This applies the migrations in `prisma/migrations` and keeps `@prisma/client` in sync. (If you'd rather not manage migration files while prototyping, `npx prisma db push` also works.)

4. **Start the dev server:**

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000), sign up for an account, and create your first board.

### Other useful scripts

```bash
npm run build          # Production build
npm run start           # Run the production build locally
npm run lint             # ESLint
npm run db:studio      # Prisma Studio — browse/edit data in the browser
```

### Enabling file attachments locally

To test the upload flow, you need an S3 bucket and an IAM user/role with `s3:PutObject` on it:

1. Create an S3 bucket (any region).
2. Add a CORS configuration to the bucket so the browser can `PUT` to it directly, for example:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT"],
       "AllowedOrigins": ["http://localhost:3000", "https://your-vercel-domain.vercel.app"],
       "ExposeHeaders": []
     }
   ]
   ```
3. Create an IAM user (or role) with a policy scoped to `s3:PutObject` on `arn:aws:s3:::your-bucket-name/*`, and generate an access key.
4. Set `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `S3_BUCKET_NAME` in `.env`.

Without these set, the app still builds and runs fine — the attachment picker on a task simply shows a "file uploads are not configured" message instead of erroring.

## Deploying to Vercel

1. **Push this repository to GitHub** (see the note at the bottom of this file — the project already has an initial commit, so you just need to add a remote and push):

   ```bash
   git remote add origin https://github.com/<your-username>/taskflow.git
   git push -u origin main
   ```

2. **Import the repo into Vercel** at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js — no build command changes are needed.

3. **Set environment variables** in the Vercel project's **Settings → Environment Variables**: `DATABASE_URL`, `JWT_SECRET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`. Use a production Postgres connection string here — a [Neon](https://neon.tech) database is a good free option and works out of the box with Prisma.

4. **Prisma Client is generated automatically.** `package.json` includes:

   ```json
   "postinstall": "prisma generate"
   ```

   Vercel runs `npm install` on every deploy, which triggers this automatically — no extra configuration needed.

5. **Apply database migrations to production.** Vercel's build step does *not* run migrations for you (this is intentional — you don't want a bad deploy to auto-migrate a live database). Do it as a one-off, deliberate step instead:

   - **Simplest — run it from your machine, pointed at production:**
     ```bash
     DATABASE_URL="<your production connection string>" npx prisma migrate deploy
     ```
   - **Or automate it with a GitHub Action** that runs on pushes to `main`, using `DATABASE_URL` stored as a repository secret:
     ```yaml
     # .github/workflows/migrate.yml
     name: Deploy DB migrations
     on:
       push:
         branches: [main]
     jobs:
       migrate:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - uses: actions/setup-node@v4
             with:
               node-version: 20
           - run: npm ci
           - run: npx prisma migrate deploy
             env:
               DATABASE_URL: ${{ secrets.DATABASE_URL }}
     ```

   Run migrations *before* the first deploy that depends on the new schema (and any time you add a new migration afterward).

6. Redeploy (or trigger the first deploy) once the environment variables are set and migrations have run.

## Known simplifications

This is a portfolio piece, so a few scope decisions were made deliberately:

- **Attachments are one-per-task**, not a list of files.
- **Drag-and-drop moves tasks between columns**; it doesn't yet support reordering within a column by drag (tasks are appended to the end of the destination column). Reordering within a column is a natural next step (`@dnd-kit/sortable` was left out to keep the drag logic small and easy to verify — a bad drag experience is worse than a slightly-simpler one).
- **Boards are single-owner**, not shared between multiple accounts — real teams would need a `BoardMember` join table, which the schema is structured to make an easy addition.

## License

MIT — use this as a starting point for your own projects.
