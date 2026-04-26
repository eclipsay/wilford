"use client";

import { useState } from "react";
import {
  decryptWilfordAes256,
  encryptWilfordAes256
} from "@wilford/shared";

function generatePassphrase() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .match(/.{1,8}/g)
    .join("-");
}

export function PublicDecrypter() {
  const [encryptMessage, setEncryptMessage] = useState("");
  const [encryptPassphrase, setEncryptPassphrase] = useState("");
  const [encryptedOutput, setEncryptedOutput] = useState("");
  const [payload, setPayload] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [message, setMessage] = useState("");
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

      setEncryptedOutput(result);
      setPayload(result);
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

  async function copyText(value) {
    if (value) {
      await navigator.clipboard.writeText(value);
    }
  }

  const nextGeneratedPassphrase = generatePassphrase();

  return (
    <section className="panel-grid-site list-panel">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">AES256</p>
            <h2>Encrypt Message</h2>
          </div>
        </div>
        <form className="public-crypto-form" onSubmit={handleEncrypt}>
          <label className="public-crypto-field">
            <span>Message</span>
            <textarea
              onChange={(event) => setEncryptMessage(event.target.value)}
              rows="8"
              value={encryptMessage}
            />
          </label>
          <label className="public-crypto-field">
            <span>Passphrase</span>
            <input
              onChange={(event) => setEncryptPassphrase(event.target.value)}
              type="text"
              value={encryptPassphrase}
            />
          </label>
          <div className="sort-row">
            <button className="button button--solid-site" disabled={isWorking} type="submit">
              Encrypt
            </button>
            <button
              className="button"
              onClick={() => {
                setEncryptPassphrase(nextGeneratedPassphrase);
                setPassphrase(nextGeneratedPassphrase);
              }}
              type="button"
            >
              Generate Passphrase
            </button>
          </div>
          <label className="public-crypto-field">
            <span>Encrypted Output</span>
            <textarea readOnly rows="8" value={encryptedOutput} />
          </label>
          <div className="sort-row">
            <button className="button" onClick={() => copyText(encryptedOutput)} type="button">
              Copy Output
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
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
              type="text"
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
    </section>
  );
}
