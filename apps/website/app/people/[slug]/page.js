import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { getCitizenState } from "../../../lib/citizen-state";
import { getPeopleProfiles } from "../../../lib/people";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const state = await getCitizenState();
  const person = getPeopleProfiles(state.districtProfiles).find((profile) => profile.href === `/people/${slug}`);

  return {
    title: person ? person.name : "Profile"
  };
}

export default async function PersonProfilePage({ params }) {
  const { slug } = await params;
  const state = await getCitizenState();
  const person = getPeopleProfiles(state.districtProfiles).find((profile) => profile.href === `/people/${slug}`);

  if (!person) notFound();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Official Biography"
        title={person.name}
        description={person.title}
      />

      <main className="content person-profile-page">
        <section className="person-profile scroll-fade">
          <div className="person-profile__portrait">
            <Image
              src={person.portrait}
              alt={`${person.portrait.includes("wpu-grand-seal") ? "Official seal" : "Official portrait"} of ${person.name}`}
              width={620}
              height={760}
              priority
            />
          </div>
          <div className="person-profile__body">
            <p className="eyebrow">{person.title}</p>
            <h2>{person.name}</h2>
            <p>{person.bio}</p>
            <dl className="panem-ledger">
              <div><dt>Official role</dt><dd>{person.officialRole}</dd></div>
              <div><dt>District / territory</dt><dd>{person.district}</dd></div>
              <div><dt>State motto</dt><dd>{person.motto}</dd></div>
            </dl>
            <Link className="button" href={person.districtHref}>Related District</Link>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}

