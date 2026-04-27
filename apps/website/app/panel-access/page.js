import Image from "next/image";
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
      <main className="content">
        <section className="panel official-access-panel">
          <div className="official-access-seal">
            <Image
              className="grand-seal-small grand-seal-small--access"
              src="/wpu-grand-seal.png"
              alt="Grand Seal of the Wilford Panem Union"
              width={128}
              height={128}
              priority
            />
          </div>
          <p className="eyebrow">Administrative Authority</p>
          <h2>Official Admin Portal</h2>
          <p>
            Access is reserved for authorized Union officers and internal state
            operations.
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
