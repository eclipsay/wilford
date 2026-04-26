"use client";

import { useState } from "react";
import {
  decryptWilfordAes256,
  encryptWilfordAes256
} from "@wilford/shared";

export function AesWorkspace() {
  const [encryptMessage, setEncryptMessage] = useState("");
  const [encryptPassphrase, setEncryptPassphrase] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [decryptPayload, setDecryptPayload] = useState("");
  const [decryptPassphrase, setDecryptPassphrase] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  async function handleEncrypt(event) {
    event.preventDefault();
    setError("");
    setIsWorking(true);

    try {
      const result = await encryptWilfordAes256({
        message: encryptMessage,
        passphrase: encryptPassphrase
      });

      setEncryptedText(result);
      setDecryptPayload(result);
      setDecryptedText("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Encryption failed.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDecrypt(event) {
    event.preventDefault();
    setError("");
    setIsWorking(true);

    try {
      const result = await decryptWilfordAes256({
        payload: decryptPayload,
        passphrase: decryptPassphrase
      });

      setDecryptedText(result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Decryption failed.");
    } finally {
      setIsWorking(false);
    }
  }

  async function copyText(value) {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
  }

  return (
    <section className="panel-grid">
      <form className="panel-card form-card" onSubmit={handleEncrypt}>
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Encrypt</p>
            <h2>AES256 Encrypter</h2>
          </div>
        </div>
        <label className="field">
          <span>Message</span>
          <textarea
            name="encryptMessage"
            onChange={(event) => setEncryptMessage(event.target.value)}
            rows="8"
            value={encryptMessage}
          />
        </label>
        <label className="field">
          <span>Passphrase</span>
          <input
            name="encryptPassphrase"
            onChange={(event) => setEncryptPassphrase(event.target.value)}
            type="password"
            value={encryptPassphrase}
          />
        </label>
        <button className="button button--solid" disabled={isWorking} type="submit">
          Encrypt Message
        </button>
        <label className="field">
          <span>Encrypted Output</span>
          <textarea readOnly rows="8" value={encryptedText} />
        </label>
        <div className="record-actions">
          <button
            className="button button--ghost"
            onClick={() => copyText(encryptedText)}
            type="button"
          >
            Copy Output
          </button>
          <button
            className="button button--ghost"
            onClick={() => setEncryptedText("")}
            type="button"
          >
            Clear Output
          </button>
        </div>
      </form>

      <form className="panel-card form-card" onSubmit={handleDecrypt}>
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Decrypt</p>
            <h2>AES256 Decrypter</h2>
          </div>
        </div>
        <label className="field">
          <span>Encrypted Text</span>
          <textarea
            name="decryptPayload"
            onChange={(event) => setDecryptPayload(event.target.value)}
            rows="8"
            value={decryptPayload}
          />
        </label>
        <label className="field">
          <span>Passphrase</span>
          <input
            name="decryptPassphrase"
            onChange={(event) => setDecryptPassphrase(event.target.value)}
            type="password"
            value={decryptPassphrase}
          />
        </label>
        <button className="button button--solid" disabled={isWorking} type="submit">
          Decrypt Message
        </button>
        <label className="field">
          <span>Decrypted Output</span>
          <textarea readOnly rows="8" value={decryptedText} />
        </label>
        <div className="record-actions">
          <button
            className="button button--ghost"
            onClick={() => copyText(decryptedText)}
            type="button"
          >
            Copy Output
          </button>
          <button
            className="button button--ghost"
            onClick={() => setDecryptedText("")}
            type="button"
          >
            Clear Output
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
    </section>
  );
}
