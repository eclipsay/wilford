import { redirect } from "next/navigation";
import { clearAuthenticatedSession, isAuthenticated, setAuthenticatedSession } from "../../lib/auth";

async function loginAction(formData) {
  "use server";

  const password = formData.get("password");

  if (!process.env.PANEL_ADMIN_PASSWORD) {
    throw new Error("PANEL_ADMIN_PASSWORD is not configured.");
  }

  if (password !== process.env.PANEL_ADMIN_PASSWORD) {
    redirect("/login?error=1");
  }

  await setAuthenticatedSession();
  redirect("/");
}

async function logoutAction() {
  "use server";
  await clearAuthenticatedSession();
  redirect("/login");
}

export default async function LoginPage({ searchParams }) {
  if (await isAuthenticated()) {
    redirect("/");
  }

  const params = await searchParams;
  const hasError = params?.error === "1";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="auth-kicker">Restricted Access</p>
        <h1>Wilford Panel</h1>
        <p className="auth-copy">
          Enter the administrative password to access content management,
          records, and site controls.
        </p>

        <form action={loginAction} className="auth-form">
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" required />
          </label>

          {hasError ? (
            <p className="form-error">The password was not accepted.</p>
          ) : null}

          <button className="button button--solid" type="submit">
            Enter Panel
          </button>
        </form>

        <form action={logoutAction}>
          <button className="button button--ghost" type="submit">
            Clear Session
          </button>
        </form>
      </section>
    </main>
  );
}
