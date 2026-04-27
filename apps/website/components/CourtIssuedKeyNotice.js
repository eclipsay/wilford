"use client";

import { useState } from "react";

export function CourtIssuedKeyNotice({ accessKey }) {
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    await navigator.clipboard.writeText(accessKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="application-notice court-issued-key-notice">
      <strong>New Case Access Key Generated</strong>
      <p>
        Issue this key to the authorised defendant, witness, counsel, or court
        official. It is shown here only after generation.
      </p>
      <div className="court-issued-key-notice__copy">
        <label className="public-application-field">
          <span>Case Access Key</span>
          <input readOnly value={accessKey} />
        </label>
        <button className="button button--solid-site" onClick={copyKey} type="button">
          {copied ? "Copied" : "Copy Key"}
        </button>
      </div>
    </section>
  );
}
