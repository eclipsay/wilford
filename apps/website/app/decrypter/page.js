import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export default function DecrypterPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Future Deployment"
        title="Decrypter"
        description="Prepared for future AES-256 encryptor and decrypter rollout information."
      />
    </SiteLayout>
  );
}
