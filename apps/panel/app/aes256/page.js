import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";

export default async function Aes256Page() {
  await requireAuth();

  return (
    <PanelShell
      title="AES256"
      description="Reserved for future encryption and decryption tooling inside the Wilford panel."
    >
      <section className="panel-card form-card form-card--wide">
        <p className="card__kicker">Future Tooling</p>
        <h2>AES256 Encrypter</h2>
        <p>
          This control is a placeholder for the future AES-256 encryptor and
          decrypter workflow. It is intentionally inactive right now.
        </p>
        <button className="button button--solid" disabled type="button">
          AES256 Encrypter
        </button>
      </section>
    </PanelShell>
  );
}
