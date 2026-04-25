import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export default function PanelAccessPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Systems"
        title="Panel Access"
        description="Reserved for secure internal controls and future administrative workflows."
      />
    </SiteLayout>
  );
}
