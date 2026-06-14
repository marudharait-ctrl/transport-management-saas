import Link from "next/link";
import { setCompanyUserActive } from "@/app/actions/users";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "./CreateUserForm";

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.companyUser.findMany({
    where: { companyId: admin.companyId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <h1>User Management</h1>
            <p>{admin.company.name} authorized users.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/">
              Dashboard
            </Link>
          </div>
        </header>

        <div className="grid">
          <section className="panel">
            <h2>Authorized Users</h2>
            <div className="table-list">
              {users.map((user) => (
                <article className="table-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <p className="muted">
                      {user.email} - {user.role}
                    </p>
                    <p className="muted">
                      {user.lastLoginAt ? `Last login ${user.lastLoginAt.toLocaleString("en-IN")}` : "No login yet"}
                    </p>
                  </div>
                  <div className="row-actions">
                    <span className={user.isActive ? "status approved" : "status"}>{user.isActive ? "ACTIVE" : "DISABLED"}</span>
                    {user.id !== admin.id ? (
                      <form action={setCompanyUserActive}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="isActive" value={String(!user.isActive)} />
                        <button className="button" type="submit">
                          {user.isActive ? "Disable" : "Enable"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="panel">
            <h2>Add User</h2>
            <CreateUserForm />
          </aside>
        </div>
      </div>
    </main>
  );
}
