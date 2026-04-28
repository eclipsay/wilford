import { redirect } from "next/navigation";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import {
  developmentPasswordNotice,
  assertTrustedPostOrigin,
  getCurrentGovernmentUser,
  loginGovernmentUser
} from "../../../lib/government-auth";

async function loginAction(formData) {
  "use server";

  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const trusted = await assertTrustedPostOrigin();

  if (!trusted) {
    redirect("/government-access/login?error=1");
  }

  const result = await loginGovernmentUser(username, password);

  if (!result.ok) {
    redirect("/government-access/login?error=1");
  }

  if (result.forcePasswordChange) {
    redirect("/government-access/change-password");
  }

  redirect("/government-access");
}

export const metadata = {
  title: "Government Access Login"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GovernmentAccessLoginPage({ searchParams }) {
  const user = await getCurrentGovernmentUser();

  if (user && !user.forcePasswordChange) {
    redirect("/government-access");
  }

  const params = await searchParams;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Government System"
        title="Government Access Login"
        description="Credentials required before restricted tools are displayed."
      />

      <main className="content content--wide government-auth-page">
        <section className="panel government-auth-panel">
          <p className="eyebrow">Identity Verification</p>
          <h2>Authorised Personnel Only</h2>
          <p className="government-auth-warning">
            Restricted Government System — Unauthorised access is prohibited.
          </p>
          <p className="public-application-help">{developmentPasswordNotice}</p>

          {params?.error ? (
            <div className="application-notice application-notice--error">
              <strong>Login Failed</strong>
              <p>Username or password was not accepted.</p>
            </div>
          ) : null}

          <form action={loginAction} className="public-application-form">
            <label className="public-application-field">
              <span>Username</span>
              <input autoComplete="username" name="username" required type="text" />
            </label>
            <label className="public-application-field">
              <span>Password</span>
              <input autoComplete="current-password" name="password" required type="password" />
            </label>
            <button className="button button--solid-site" type="submit">
              Enter Government Access
            </button>
          </form>
        </section>
      </main>
    </SiteLayout>
  );
}
