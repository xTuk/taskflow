import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-white to-slate-50">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
            T
          </span>
          TaskFlow
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Sign up free
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-4 pb-20 pt-12 text-center sm:px-6 lg:px-8">
        <span className="mb-4 inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
          Boards, columns, and tasks — nothing you don&apos;t need
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Organize your team&apos;s work with{" "}
          <span className="text-brand-600">TaskFlow</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          A fast, focused Kanban board for small teams. Create boards for your
          projects, drag tasks between columns, attach files, and keep due
          dates in view — without the bloat of larger project tools.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Get started — it&apos;s free
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            I already have an account
          </Link>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <FeatureCard
            title="Drag-and-drop boards"
            description="Move tasks between To Do, In Progress, and Done with smooth, reliable drag-and-drop."
          />
          <FeatureCard
            title="File attachments"
            description="Attach a file to any task, uploaded securely and directly to your own S3 bucket."
          />
          <FeatureCard
            title="Built for teams"
            description="Secure email/password accounts with your data scoped to you, ready to extend to teams."
          />
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        Built with Next.js, Prisma, PostgreSQL, and AWS S3.
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600">{description}</p>
    </div>
  );
}
