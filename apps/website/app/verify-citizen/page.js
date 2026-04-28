import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getCitizenState } from "../../lib/citizen-state";

export const metadata = {
  title: "Citizen Verification"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VerifyCitizenPage({ searchParams }) {
  const params = await searchParams;
  const code = String(params?.code || "").trim();
  const state = await getCitizenState();
  const record = code
    ? state.citizenRecords.find((citizen) => citizen.verificationCode.toLowerCase() === code.toLowerCase())
    : null;
  const verified = record && record.verificationStatus === "Verified" && !["Revoked", "Lost/Stolen"].includes(record.verificationStatus);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Official Verification"
        title="Union Security Verification"
        description="Confirm a WPU citizen verification code without exposing private registry details."
      />

      <main className="content content--wide portal-page citizen-dashboard-page">
        <section className="panel public-application-form">
          <p className="eyebrow">Verification Code</p>
          <h2>Enter Citizen Code</h2>
          <form action="/verify-citizen" className="panem-inline-form" method="get">
            <label className="public-application-field">
              <span>Code</span>
              <input defaultValue={code} name="code" placeholder="WPU-CR-2048-7XQ9" />
            </label>
            <button className="button button--solid-site" type="submit">Verify</button>
          </form>
        </section>

        {code ? (
          <section className={`identity-verification-result ${verified ? "" : "identity-verification-result--failed"}`}>
            {verified ? (
              <>
                <p className="eyebrow">Verified</p>
                <h2>Verified Citizen of the Wilford Panem Union</h2>
                <dl className="panem-ledger">
                  <div><dt>District</dt><dd>{record.district}</dd></div>
                  <div><dt>Status</dt><dd>{record.citizenStatus}</dd></div>
                  <div><dt>Issue Date</dt><dd>{record.issueDate}</dd></div>
                </dl>
              </>
            ) : (
              <>
                <p className="eyebrow">Not Verified</p>
                <h2>Verification could not be confirmed.</h2>
                <p>The code is invalid, suspended, revoked, or reported lost/stolen.</p>
              </>
            )}
          </section>
        ) : null}
      </main>
    </SiteLayout>
  );
}
