import { SiteLayout } from "../../components/SiteLayout";
import { UnionCinematicPage } from "../../components/UnionCinematicPage";

export const metadata = {
  title: "The Union"
};

export default function InformationPage() {
  return (
    <SiteLayout>
      <UnionCinematicPage />
    </SiteLayout>
  );
}
