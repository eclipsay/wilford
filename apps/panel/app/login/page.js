import { redirect } from "next/navigation";
import { clearAuthenticatedSession, isAuthenticated, setAuthenticatedSession } from "../../lib/auth";
import { fetchPublicWithOptions } from "../../lib/api";

async function loginAction(formData) {
  "use server";

  try {
    const response = await fetchPublicWithOptions("/api/panel/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: String(formData.get("username") || ""),
        password: String(formData.get("password") || "")
      })
    });

    await setAuthenticatedSession(response.user);
  } catch {
    redirect("/login?error=1");
  }

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
          Sign in with your panel username and password to access Wilford
          control tools, records, and administrative actions.
        </p>

        <form action={loginAction} className="auth-form">
          <label className="field">
            <span>Username</span>
            <input defaultValue="eclip" name="username" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" required />
          </label>

          {hasError ? (
            <p className="form-error">The username or password was not accepted.</p>
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
