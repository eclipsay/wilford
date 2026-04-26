import Link from "next/link";
import {
  applicationQuestions,
  publicBotCommands,
  staffApplicationCommands
} from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export default function CommandsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Command Archive"
        title="Discord Command Registry"
        description="Public reference for Wilford Industries Discord commands, moderation tools, and the application review pipeline."
      />

      <main className="content">
        <section className="grid grid--command">
          {publicBotCommands.map((command) => (
            <article className="panel panel--command" key={command.name}>
              <p className="eyebrow">{command.access}</p>
              <h2>{command.name}</h2>
              <p>{command.description}</p>
              <div className="public-command-usage">
                <span>Usage</span>
                <code>{command.usage}</code>
              </div>
            </article>
          ))}
        </section>

        <section className="panel list-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Application Process</p>
              <h2>DM Intake Workflow</h2>
            </div>
            <Link className="button" href="/information">
              Return To Records
            </Link>
          </div>

          <div className="public-record-list">
            <article className="public-record-item">
              <div>
                <h3>Step 1</h3>
                <p>
                  A recruit starts with <code>-apply</code> or <code>/apply</code>.
                  The bot opens a private DM session and begins the intake.
                </p>
              </div>
              <div className="public-record-meta">
                <strong>Private Intake</strong>
                <span>The application does not run in public channels.</span>
              </div>
            </article>

            <article className="public-record-item">
              <div>
                <h3>Step 2</h3>
                <p>
                  The applicant answers the official Wilford questions one at a time.
                  When finished, the bot creates a staff review thread and posts the full record.
                </p>
              </div>
              <div className="public-record-meta">
                <strong>Staff Thread</strong>
                <span>Review staff are pinged for follow-up and final decisions.</span>
              </div>
            </article>

            <article className="public-record-item">
              <div>
                <h3>Step 3</h3>
                <p>
                  Staff can reply from the review thread with <code>-r</code>, accept
                  with <code>-accept</code>, or deny with <code>-deny</code>.
                </p>
              </div>
              <div className="public-record-meta">
                <strong>Decision Flow</strong>
                <span>Accepted applicants can receive a Discord role after approval.</span>
              </div>
            </article>
          </div>
        </section>

        <section className="panel-grid-site list-panel">
          <section className="panel panel--list">
            <div className="panel__header">
              <div>
                <p className="eyebrow">DM Questions</p>
                <h2>Application Questionnaire</h2>
              </div>
            </div>
            <div className="simple-question-list">
              {applicationQuestions.map((question, index) => (
                <article key={question} className="simple-question-list__item">
                  <strong>Question {index + 1}</strong>
                  <p>{question}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel panel--list">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Review Commands</p>
                <h2>Staff Thread Tools</h2>
              </div>
            </div>
            <div className="simple-question-list">
              {staffApplicationCommands.map((command) => (
                <article key={command.name} className="simple-question-list__item">
                  <strong>{command.name}</strong>
                  <p>{command.description}</p>
                  <code>{command.usage}</code>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    </SiteLayout>
  );
}
