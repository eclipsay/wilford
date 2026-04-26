import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";
import { AesWorkspace } from "../../components/AesWorkspace";

export default async function Aes256Page() {
  await requireAuth();

  return (
    <PanelShell
      title="AES256"
      description="Encrypt and decrypt operational text inside the panel with a single clean workspace."
    >
      <section className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Crypto Tools</p>
            <h2>Encryption Workspace</h2>
          </div>
        </div>
        <p>
          This tool uses AES-256 in the browser with your passphrase. Keep the
          passphrase private because the encrypted text cannot be recovered
          without it.
        </p>
      </section>

      <AesWorkspace />
    </PanelShell>
  );
}
