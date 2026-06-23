"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <p className="text-6xl font-black text-red-500">500</p>
      <h1 className="mt-2 text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 opacity-60">An unexpected error occurred.</p>
      <button onClick={reset} className="mt-6 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
        Try again
      </button>
    </div>
  );
}
