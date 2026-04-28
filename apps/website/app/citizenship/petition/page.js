import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";

const baseUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/+$/, "");

async function submitPetitionAction(formData) {
  "use server";

  const payload = {
    applicantName: String(formData.get("applicantName") || "").trim(),
    age: String(formData.get("age") || "").trim(),
    timezone: String(formData.get("timezone") || "").trim(),
    motivation: String(formData.get("motivation") || "").trim(),
    experience: String(formData.get("experience") || "").trim(),
    discordHandle: String(formData.get("discordHandle") || "").trim(),
    discordUserId: String(formData.get("discordUserId") || "").trim(),
    email: String(formData.get("email") || "").trim()
  };

  try {
    const response = await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = encodeURIComponent(data?.error || "Petition submission failed.");
      redirect(`/citizenship/petition?error=${error}`);
    }
  } catch {
    redirect("/citizenship/petition?error=Unable%20to%20reach%20the%20petition%20service.");
  }

  redirect("/citizenship/petition?submitted=1");
}

export default async function PetitionPage({ searchParams }) {
  const params = await searchParams;
  const submitted = params?.submitted === "1";
  const error = String(params?.error || "").trim();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Citizenship Petition"
        title="Official Intake Form"
        description="Your path to citizenship begins with truth."
      />

      <main className="content content--wide">
        {submitted ? (
          <div className="application-notice">
            <strong>Petition Submitted</strong>
            <p>
              Your petition has been recorded and will be forwarded into the 
              Union review thread workflow for staff review.
            </p>
            <Link className="button" href="/citizenship">
              Return to Citizenship
            </Link>
          </div>
        ) : (
          <section className="panel application-panel scroll-fade">
            <div className="official-access-seal">
              <Image
                className="grand-seal-small grand-seal-small--access"
                src="/wpu-grand-seal.png"
                alt="Grand Seal of the Wilford Panem Union"
                width={128}
                height={128}
              />
            </div>
            <div className="panel__header">
              <div>
                <p className="eyebrow">Citizenship Petition</p>
                <h2>Petition for Union Citizenship</h2>
              </div>
              <Link className="button" href="/citizenship">
                Back to Overview
              </Link>
            </div>

            {error ? (
              <div className="application-notice application-notice--error">
                <strong>Submission Error</strong>
                <p>{decodeURIComponent(error)}</p>
              </div>
            ) : null}

            <form action={submitPetitionAction} className="public-application-form">
              <label className="public-application-field">
                <span>Full Name</span>
                <input name="applicantName" required type="text" />
              </label>

              <div className="public-application-grid">
                <label className="public-application-field">
                  <span>Age</span>
                  <input name="age" required type="text" />
                </label>

                <label className="public-application-field">
                  <span>Timezone</span>
                  <input name="timezone" required type="text" />
                </label>
              </div>

              <div className="public-application-grid">
                <label className="public-application-field">
                  <span>Discord Handle</span>
                  <input
                    name="discordHandle"
                    placeholder="Required, for example user or user#1234"
                    required
                    type="text"
                  />
                  <small className="public-application-help">
                    This is required so Union staff know who you are in Discord.
                  </small>
                </label>

                <label className="public-application-field">
                  <span>Discord User ID</span>
                  <input
                    name="discordUserId"
                    placeholder="Optional, helps with automatic role/DM handling"
                    type="text"
                  />
                  <small className="public-application-help">
                    Optional, but helpful for automatic Discord DMs and role assignment.
                  </small>
                </label>
              </div>

              <label className="public-application-field">
                <span>Email</span>
                <input
                  name="email"
                  placeholder="Optional contact fallback"
                  type="email"
                />
              </label>

              <label className="public-application-field">
                <span>Why do you wish to become a citizen of the Wilford Panem Union?</span>
                <textarea name="motivation" required rows="6" />
              </label>

              <label className="public-application-field">
                <span>What skills, experience, or service can you offer the Union?</span>
                <textarea name="experience" required rows="6" />
              </label>

              <div className="sort-row">
                <button className="button button--solid-site" type="submit">
                  Submit Petition
                </button>
              </div>
            </form>
          </section>
        )}
        <p className="service-line">One Union. One Future.</p>
      </main>
    </SiteLayout>
  );
}
