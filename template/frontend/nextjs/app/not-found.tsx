import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <p className="text-6xl font-black text-[var(--brand)]">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 opacity-60">The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="mt-6 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
        ← Back home
      </Link>
    </div>
  );
}
