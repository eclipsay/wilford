import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";

function resolvePetitionApiBaseUrl() {
  const configured = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "").trim();
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(configured);

  if (configured && !(process.env.NODE_ENV === "production" && isLocalhost)) {
    return configured.replace(/\/+$/, "");
  }

  return (
    process.env.NODE_ENV === "production"
      ? "https://api.wilfordindustries.org"
      : "http://localhost:4000"
  );
}

const baseUrl = resolvePetitionApiBaseUrl();

function normalizeDiscordUserId(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function isValidDiscordUserId(value) {
  return /^\d{17,20}$/.test(normalizeDiscordUserId(value));
}

async function submitPetitionAction(formData) {
  "use server";

  const payload = {
    applicantName: String(formData.get("applicantName") || "").trim(),
    age: String(formData.get("age") || "").trim(),
    timezone: String(formData.get("timezone") || "").trim(),
    motivation: String(formData.get("motivation") || "").trim(),
    experience: String(formData.get("experience") || "").trim(),
    discordHandle: String(formData.get("discordHandle") || "").trim(),
    discordUserId: normalizeDiscordUserId(formData.get("discordUserId")),
    email: String(formData.get("email") || "").trim()
  };

  if (!isValidDiscordUserId(payload.discordUserId)) {
    redirect("/citizenship/petition?error=Valid%20Discord%20User%20ID%20is%20required%20to%20apply%20for%20citizenship.");
  }

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
              Ministry of Credit and Records review workflow.
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
                    This is required so the Ministry of Credit and Records can identify you in Discord.
                  </small>
                </label>

                <label className="public-application-field">
                  <span>Discord User ID</span>
                  <input
                    inputMode="numeric"
                    maxLength={20}
                    minLength={17}
                    name="discordUserId"
                    pattern="\d{17,20}"
                    placeholder="Required, for example 123456789012345678"
                    required
                    type="text"
                  />
                  <small className="public-application-help">
                    Enable Developer Mode in Discord, right-click your name, and click ‘Copy User ID’.
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
