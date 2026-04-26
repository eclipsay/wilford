const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const VERSION = "wilford-aes256-v1";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 250000;

function ensureCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is not available in this environment.");
  }
}

function toBase64Url(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveKey(passphrase, salt) {
  ensureCrypto();

  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWilfordAes256({ message, passphrase }) {
  if (!message?.trim() || !passphrase?.trim()) {
    throw new Error("Message and passphrase are required.");
  }

  ensureCrypto();

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    textEncoder.encode(message)
  );

  return [
    VERSION,
    toBase64Url(salt),
    toBase64Url(iv),
    toBase64Url(new Uint8Array(encrypted))
  ].join(".");
}

export async function decryptWilfordAes256({ payload, passphrase }) {
  if (!payload?.trim() || !passphrase?.trim()) {
    throw new Error("Encrypted text and passphrase are required.");
  }

  ensureCrypto();

  const [version, saltValue, ivValue, cipherValue] = payload.trim().split(".");

  if (version !== VERSION || !saltValue || !ivValue || !cipherValue) {
    throw new Error("Encrypted text format is invalid.");
  }

  const salt = fromBase64Url(saltValue);
  const iv = fromBase64Url(ivValue);
  const ciphertext = fromBase64Url(cipherValue);
  const key = await deriveKey(passphrase, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      ciphertext
    );

    return textDecoder.decode(decrypted);
  } catch {
    throw new Error("Unable to decrypt. Check the passphrase and encrypted text.");
  }
}
