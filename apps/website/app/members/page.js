import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export default function MembersPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Roster"
        title="Members List"
        description="A public-facing index for recognized members and current standing."
      />
    </SiteLayout>
  );
}
