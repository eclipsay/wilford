"use client";

import { useState } from "react";

export function CaseAccessPanel({ caseId }) {
  const [accessKey, setAccessKey] = useState("");
  const [role, setRole] = useState("");
  const [statement, setStatement] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function authorize(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");

    const response = await fetch(`/supreme-court/${caseId}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "authorize", accessKey })
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.role) {
      setRole(data.role);
      setNotice("Access key accepted. Formal submission channel unlocked.");
    } else {
      setRole("");
      setNotice("Access denied. Verify the case access key issued by the Court.");
    }

    setBusy(false);
  }

  async function submitStatement(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");

    const response = await fetch(`/supreme-court/${caseId}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "submit", accessKey, statement })
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.submitted) {
      setStatement("");
      setNotice("Statement submitted to the official case record.");
    } else {
      setNotice("Submission rejected. Confirm access authority and statement text.");
    }

    setBusy(false);
  }

  return (
    <section className="panel court-access-panel" aria-labelledby="case-access-title">
      <div className="court-access-panel__seal" aria-hidden="true">
        ⚖
      </div>
      <div className="panel__header">
        <div>
          <p className="eyebrow">Restricted Participation</p>
          <h2 id="case-access-title">Enter Case Access Key</h2>
        </div>
        {role ? <span className="court-role-badge">{role}</span> : null}
      </div>

      <p className="court-warning">
        All statements submitted to the Supreme Court become part of the official case record.
      </p>

      <form className="public-application-form" onSubmit={authorize}>
        <label className="public-application-field">
          <span>Case Access Key</span>
          <input
            autoComplete="off"
            onChange={(event) => setAccessKey(event.target.value)}
            required
            type="password"
            value={accessKey}
          />
        </label>
        <button className="button button--solid-site" disabled={busy} type="submit">
          Authorize Participation
        </button>
      </form>

      {notice ? <p className="court-access-notice">{notice}</p> : null}

      {role ? (
        <form className="public-application-form court-statement-form" onSubmit={submitStatement}>
          <label className="public-application-field">
            <span>Submit Formal Statement</span>
            <textarea
              onChange={(event) => setStatement(event.target.value)}
              placeholder="Enter your statement for the court record..."
              required
              rows="7"
              value={statement}
            />
          </label>
          <button className="button button--solid-site" disabled={busy} type="submit">
            Submit to Court Record
          </button>
        </form>
      ) : (
        <div className="court-readonly">
          <strong>Read-only public view</strong>
          <span>Participation requires an active key issued for this matter.</span>
        </div>
      )}
    </section>
  );
}
