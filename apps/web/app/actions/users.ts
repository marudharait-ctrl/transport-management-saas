"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export type UserFormState = {
  error?: string;
  success?: string;
};

export async function createCompanyUser(_state: UserFormState, formData: FormData): Promise<UserFormState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "REQUESTER");
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Name, email, and temporary password are required." };
  }

  if (password.length < 10) {
    return { error: "Temporary password must be at least 10 characters." };
  }

  const validRoles = ["ADMIN", "REQUESTER", "APPROVER", "ACCOUNTS", "SUPPORT"];
  if (!validRoles.includes(role)) {
    return { error: "Invalid role." };
  }

  try {
    await prisma.companyUser.create({
      data: {
        companyId: admin.companyId,
        name,
        email,
        role: role as "ADMIN" | "REQUESTER" | "APPROVER" | "ACCOUNTS" | "SUPPORT",
        passwordHash: hashPassword(password)
      }
    });
  } catch {
    return { error: "A user with this email already exists for this company." };
  }

  revalidatePath("/admin/users");
  return { success: "User created." };
}

export async function setCompanyUserActive(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";

  if (!userId || userId === admin.id) {
    return;
  }

  await prisma.companyUser.updateMany({
    where: {
      id: userId,
      companyId: admin.companyId
    },
    data: { isActive }
  });

  revalidatePath("/admin/users");
}
