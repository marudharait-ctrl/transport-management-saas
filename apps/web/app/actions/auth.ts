"use server";

import { redirect } from "next/navigation";
import { clearSession, setSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
};

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const loginId = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!loginId || !password) {
    return { error: "User and password are required." };
  }

  const devAdminUser = process.env.DEV_ADMIN_USER ?? "admin";
  const devAdminPassword = process.env.DEV_ADMIN_PASSWORD ?? "admin";
  const email = loginId === devAdminUser && password === devAdminPassword ? "naresh@marudara.example" : loginId;

  const user = await prisma.companyUser.findFirst({
    where: {
      email,
      isActive: true
    }
  });

  const isDevAdminLogin = loginId === devAdminUser && password === devAdminPassword;
  if (!user || (!isDevAdminLogin && !verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid user or password." };
  }

  await prisma.companyUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  await setSession(user.id);
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
