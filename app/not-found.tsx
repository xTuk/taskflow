import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600 text-xl font-bold text-white">
        T
      </span>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/dashboard" className="btn-primary mt-2">
        Back to dashboard
      </Link>
    </main>
  );
}
