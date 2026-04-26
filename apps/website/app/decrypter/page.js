import { PublicDecrypter } from "../../components/PublicDecrypter";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export default function DecrypterPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="AES256"
        title="Decrypter"
        description="Decrypt messages created with the Wilford AES256 tool using the correct passphrase."
      />

      <main className="content">
        <PublicDecrypter />
      </main>
    </SiteLayout>
  );
}
