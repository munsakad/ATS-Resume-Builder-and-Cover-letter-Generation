import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

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
