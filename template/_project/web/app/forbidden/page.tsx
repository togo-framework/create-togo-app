import Link from "next/link";

// 403 page — redirect here from middleware/guards when access is denied.
export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <p className="text-6xl font-black text-amber-500">403</p>
      <h1 className="mt-2 text-xl font-semibold">Forbidden</h1>
      <p className="mt-2 opacity-60">You don’t have permission to access this page.</p>
      <Link href="/login" className="mt-6 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
        Sign in
      </Link>
    </div>
  );
}
