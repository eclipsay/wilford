"use client";

import { useState } from "react";

export function TemporaryPasswordNotice({ password }) {
  const [visible, setVisible] = useState(Boolean(password));
  const [copied, setCopied] = useState(false);

  if (!password || !visible) {
    return null;
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="application-notice temporary-password-notice">
      <strong>Temporary Password Issued</strong>
      <p>
        Provide this password to the user now. It is shown once only and will not
        be displayed again after this message is closed.
      </p>
      <div className="court-issued-key-notice__copy">
        <label className="public-application-field">
          <span>Temporary Password</span>
          <input readOnly value={password} />
        </label>
        <button className="button button--solid-site" onClick={copyPassword} type="button">
          {copied ? "Copied" : "Copy Password"}
        </button>
        <button className="button" onClick={() => setVisible(false)} type="button">
          Close Notice
        </button>
      </div>
    </section>
  );
}
