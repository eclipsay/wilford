"use client";

import { useState } from "react";
import { decryptWilfordAes256 } from "@wilford/shared";

export function PublicDecrypter() {
  const [payload, setPayload] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  async function handleDecrypt(event) {
    event.preventDefault();
    setError("");
    setIsWorking(true);

    try {
      const result = await decryptWilfordAes256({
        payload,
        passphrase
      });

      setMessage(result);
    } catch (nextError) {
      setMessage("");
      setError(nextError instanceof Error ? nextError.message : "Decryption failed.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="panel list-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">AES256</p>
          <h2>Decrypt Message</h2>
        </div>
      </div>
      <form className="public-crypto-form" onSubmit={handleDecrypt}>
        <label className="public-crypto-field">
          <span>Encrypted Text</span>
          <textarea
            onChange={(event) => setPayload(event.target.value)}
            rows="8"
            value={payload}
          />
        </label>
        <label className="public-crypto-field">
          <span>Passphrase</span>
          <input
            onChange={(event) => setPassphrase(event.target.value)}
            type="password"
            value={passphrase}
          />
        </label>
        <div className="sort-row">
          <button className="button button--solid-site" disabled={isWorking} type="submit">
            Decrypt
          </button>
        </div>
        {error ? <p className="public-crypto-error">{error}</p> : null}
        <label className="public-crypto-field">
          <span>Output</span>
          <textarea readOnly rows="8" value={message} />
        </label>
      </form>
    </section>
  );
}
