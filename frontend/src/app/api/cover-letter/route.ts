import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwner, authErrorResponse } from "@/lib/authorize";
import { generateCoverLetter, AiServiceError } from "@/lib/aiBackend";
import { z } from "zod";

const schema = z.object({ resumeId: z.string(), jobDescription: z.string().min(20), tone: z.string().optional() });

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = schema.parse(await req.json());

    const resume = await prisma.resume.findUnique({ where: { id: body.resumeId } });
    if (!resume) return Response.json({ error: "Resume not found" }, { status: 404 });
    requireOwner(session, resume.userId);

    const result = await generateCoverLetter(resume.content, body.jobDescription, body.tone);

    const letter = await prisma.coverLetter.create({
      data: {
        resumeId: resume.id,
        jobDescription: body.jobDescription,
        subjectLine: result.subject_line,
        body: result.body,
      },
    });

    return Response.json(letter, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid input" }, { status: 400 });
    if (err instanceof AiServiceError) return Response.json({ error: err.message }, { status: 502 });
    return authErrorResponse(err);
  }
}
