import Image from "next/image";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export const metadata = {
  title: "Panem Credit"
};

export default function PanemCreditPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Treasury Access"
        title="Panem Credit"
        description="Official financial access of the Wilford Panem Union."
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
          <p className="eyebrow">State Treasury</p>
          <h2>Credit Authority</h2>
          <p>
            Panem Credit is administered as an official state instrument under
            the authority of the Wilford Panem Union.
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
