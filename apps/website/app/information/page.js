import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export default function InformationPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Information Archive"
        title="Doctrine, Lore, and Records"
        description="The Information division preserves the official narrative of Wilford Industries."
      />
    </SiteLayout>
  );
}
