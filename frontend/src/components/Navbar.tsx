"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-bold text-brand">ResumeAI</Link>
        <nav className="flex items-center gap-4 text-sm font-semibold text-ink">
          {session ? (
            <>
              <Link href="/dashboard" className="hover:text-brand">Dashboard</Link>
              <Link href="/resumes/new" className="hover:text-brand">Add resume</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-outline !py-1.5 !px-3 text-xs">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand">Sign in</Link>
              <Link href="/register" className="btn-primary !py-1.5 !px-3 text-xs">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
