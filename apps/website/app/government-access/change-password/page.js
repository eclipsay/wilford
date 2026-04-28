import { redirect } from "next/navigation";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import {
  changeOwnPassword,
  assertTrustedPostOrigin,
  getCurrentGovernmentUser
} from "../../../lib/government-auth";

async function changePasswordAction(formData) {
  "use server";

  const user = await getCurrentGovernmentUser();
  const trusted = await assertTrustedPostOrigin();

  if (!user || !trusted) {
    redirect("/government-access/login");
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword !== confirmPassword || newPassword.length < 8) {
    redirect("/government-access/change-password?error=1");
  }

  const changed = await changeOwnPassword(user.username, currentPassword, newPassword);

  if (!changed) {
    redirect("/government-access/change-password?error=1");
  }

  redirect("/government-access?passwordChanged=1");
}

export const metadata = {
  title: "Change Government Password"
};

export default async function ChangeGovernmentPasswordPage({ searchParams }) {
  const user = await getCurrentGovernmentUser();

  if (!user) {
    redirect("/government-access/login");
  }

  const params = await searchParams;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Mandatory Credential Renewal"
        title="Change Government Password"
        description="Temporary passwords must be replaced before restricted tools can be used."
      />

      <main className="content content--wide government-auth-page">
        <section className="panel government-auth-panel">
          <p className="eyebrow">Logged In As {user.username}</p>
          <h2>Create New Password</h2>
          <p className="government-auth-warning">
            Your previous temporary password becomes invalid after this change.
          </p>

          {params?.error ? (
            <div className="application-notice application-notice--error">
              <strong>Password Change Failed</strong>
              <p>Confirm your temporary password and choose a new password of at least 8 characters.</p>
            </div>
          ) : null}

          <form action={changePasswordAction} className="public-application-form">
            <label className="public-application-field">
              <span>Current Temporary Password</span>
              <input autoComplete="current-password" name="currentPassword" required type="password" />
            </label>
            <label className="public-application-field">
              <span>New Password</span>
              <input autoComplete="new-password" minLength="8" name="newPassword" required type="password" />
            </label>
            <label className="public-application-field">
              <span>Confirm New Password</span>
              <input autoComplete="new-password" minLength="8" name="confirmPassword" required type="password" />
            </label>
            <button className="button button--solid-site" type="submit">
              Set New Password
            </button>
          </form>
        </section>
      </main>
    </SiteLayout>
  );
}
