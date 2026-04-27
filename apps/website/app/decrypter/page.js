import { PublicDecrypter } from "../../components/PublicDecrypter";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export default function DecrypterPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Secure Communications"
        title="Encrypted State Channel"
        description="Decrypt messages created with the Union AES256 tool using the correct passphrase."
      />

      <main className="content">
        <PublicDecrypter />
      </main>
    </SiteLayout>
  );
}
