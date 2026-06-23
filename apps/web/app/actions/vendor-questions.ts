"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function required(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

export async function answerVendorQuestion(formData: FormData) {
  const user = await requireUser();
  const quoteRequestId = required(formData, "quoteRequestId");
  const answer = required(formData, "answer");

  if (!quoteRequestId || !answer) {
    return;
  }

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: {
      id: quoteRequestId,
      companyId: user.companyId
    },
    include: {
      transporter: true
    }
  });

  if (!quoteRequest || !quoteRequest.question) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteRequest.update({
      where: { id: quoteRequest.id },
      data: {
        questionAnswer: answer,
        questionAnsweredAt: new Date(),
        questionAnsweredByName: user.name
      }
    });

    await tx.auditEvent.create({
      data: {
        companyId: user.companyId,
        requestId: quoteRequest.requestId,
        actorType: "company_user",
        actorName: user.name,
        action: "quote_request.question_answered",
        details: {
          transporter: quoteRequest.transporter.name,
          question: quoteRequest.question,
          answer
        }
      }
    });
  });

  revalidatePath("/requests");
  revalidatePath("/quotes");
  revalidatePath(`/vendor/quote/${quoteRequest.accessToken}`);
}
