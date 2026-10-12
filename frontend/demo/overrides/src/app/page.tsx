"use client";
// Static GitHub Pages build: client-side version of src/app/page.tsx
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <div className="bg-brand-light">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold text-ink sm:text-5xl">Know your ATS score before you hit apply.</h1>
        <p className="mt-4 text-lg text-gray-600">
          Upload your resume, paste a job description, and get a keyword-level match score,
          concrete edits, and a tailored cover letter — all in a few seconds.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn-primary">Get started</Link>
          <Link href="/login" className="btn-outline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
