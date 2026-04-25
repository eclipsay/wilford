import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export default function ExcommunicationPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Discipline Register"
        title="Excommunication List"
        description="A formal register of those removed from standing."
      />
    </SiteLayout>
  );
}
