import Link from "next/link";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import {
  canAccess,
  getAuditLog,
  getGovernmentUsers,
  requireGovernmentUser
} from "../../lib/government-auth";

const systems = [
  {
    group: "Government",
    icon: "👥",
    title: "User Control Panel",
    text: "Manage government users, roles, status, temporary passwords, and account notes.",
    href: "/government-access/users",
    permission: "userControl"
  },
  {
    group: "Government",
    icon: "📢",
    title: "Bulletin Control",
    text: "Create and maintain public WPU News Bulletin directives.",
    href: "/government-access/bulletins",
    permission: "bulletinControl"
  },
  {
    group: "Government",
    icon: "📰",
    title: "Article Control",
    text: "Create, edit, publish, and withdraw official WPU News articles.",
    href: "/government-access/articles",
    permission: "articleControl"
  },
  {
    group: "Government",
    icon: "⚖",
    title: "Supreme Court Control",
    text: "Manage cases, rulings, evidence, access keys, and formal statements.",
    href: "/government-access/supreme-court",
    permission: "supremeCourtControl"
  },
  {
    group: "Citizen Services",
    icon: "AL",
    title: "Citizen Alerts",
    text: "Issue official notices, emergency taxation, fines, wallet freezes, grants, and appeal-enabled enforcement alerts.",
    href: "/government-access/citizen-alerts",
    permission: "citizenAlerts"
  },
  {
    group: "MSS",
    icon: "🚨",
    title: "MSS Console",
    text: "Ministry of State Security command tools and protected registries.",
    href: "/government-access/mss-console",
    permission: "mssTools"
  },
  {
    group: "Government",
    icon: "📡",
    title: "Broadcast Approvals",
    text: "Approve or decline server-wide Discord broadcasts and high-risk directives.",
    href: "/government-access/broadcast-approvals",
    permission: "broadcastApproval"
  },
  {
    group: "Citizen Services",
    icon: "🛂",
    title: "Citizen Applications",
    text: "Review citizenship applications and clerk intake material.",
    href: "/government-access/citizenship",
    permission: "citizenshipReview"
  },
  {
    group: "Citizen Services",
    icon: "🏛",
    title: "Citizen Requests Control",
    text: "Review support requests, petitions, district transfers, ministry assignments, and official responses.",
    href: "/government-access/citizen-requests",
    permission: "citizenRequestControl"
  },
  {
    group: "Citizen Services",
    icon: "WP",
    title: "Work Permit Requests",
    text: "Review governor-routed foreign work permit requests and approve temporary district labour access.",
    href: "/government-access/citizen-requests?category=Work%20Permit%20Request&status=Submitted",
    permission: "citizenRequestControl"
  },
  {
    group: "MSS",
    icon: "🛂",
    title: "Union Security Registry",
    text: "Manage citizen IDs, passport records, district affiliations, wallet links, and MSS classifications.",
    href: "/government-access/union-security-registry",
    permission: "identitySecurity"
  },
  {
    group: "Economy",
    icon: "💳",
    title: "Panem Credit Control",
    text: "Manage wallets, taxes, marketplace stock, district production, and MSS financial alerts.",
    href: "/government-access/panem-credit",
    permission: "economyView"
  },
  {
    group: "Economy",
    icon: "📈",
    title: "Stock Market Control",
    text: "Manage PSE companies, trading status, events, dividends, taxes, and citizen portfolios.",
    href: "/government-access/stock-market",
    permission: "economyView"
  },
  {
    group: "Security Logs",
    icon: "📜",
    title: "Audit Log",
    text: "View login attempts, access denials, user actions, and restricted edits.",
    href: "/government-access/audit",
    permission: "auditLog"
  }
];

export const metadata = {
  title: "Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GovernmentAccessPage({ searchParams }) {
  const user = await requireGovernmentUser("dashboard");
  const params = await searchParams;
  const users = await getGovernmentUsers();
  const auditLog = await getAuditLog();
  const recentLogins = users
    .filter((item) => item.lastLoginAt)
    .sort((a, b) => new Date(b.lastLoginAt) - new Date(a.lastLoginAt))
    .slice(0, 5);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Government System"
        title="Government Access"
        description="Secure WPU command dashboard for authorised personnel."
      />

      <main className="content content--wide portal-page portal-page--restricted government-command-page">
        <section className="restricted-banner government-secure-banner scroll-fade">
          <span>Restricted Government System</span>
          <strong>Unauthorised access is prohibited.</strong>
          <p>
            Access is logged. Credentials are role-bound. Do not share government accounts,
            temporary passwords, or restricted case keys.
          </p>
        </section>

        {params?.denied ? (
          <section className="application-notice application-notice--error">
            <strong>Access Denied</strong>
            <p>Your assigned role does not permit that restricted system.</p>
          </section>
        ) : null}

        {params?.passwordChanged ? (
          <section className="application-notice">
            <strong>Password Updated</strong>
            <p>Your temporary password has been replaced.</p>
          </section>
        ) : null}

        {user.forcePasswordChange ? (
          <section className="application-notice application-notice--error">
            <strong>Password Change Required</strong>
            <p>Replace your temporary password before using restricted tools.</p>
            <Link className="button button--solid-site" href="/government-access/change-password">
              Change Password
            </Link>
          </section>
        ) : null}

        <section className="government-dashboard-grid scroll-fade">
          <article className="government-status-panel">
            <p className="eyebrow">Access Status</p>
            <h2>Authenticated</h2>
            <dl>
              <div>
                <dt>Logged-in User</dt>
                <dd>{user.displayName || user.username}</dd>
              </div>
              <div>
                <dt>User Role</dt>
                <dd>{user.role}</dd>
              </div>
              <div>
                <dt>Account Status</dt>
                <dd>{user.active ? "Active" : "Inactive"}</dd>
              </div>
            </dl>
            <form action="/government-access/logout" method="post">
              <button className="button button--danger-site" type="submit">
                Logout
              </button>
            </form>
          </article>

          <article className="government-status-panel">
            <p className="eyebrow">Recent Logins</p>
            <h2>Credential Activity</h2>
            <ul className="government-mini-list">
              {recentLogins.map((item) => (
                <li key={item.username}>
                  <span>{item.displayName || item.username}</span>
                  <strong>{item.lastLoginAt}</strong>
                </li>
              ))}
            </ul>
          </article>

          <article className="government-status-panel">
            <p className="eyebrow">Security Notices</p>
            <h2>Standing Orders</h2>
            <ul className="government-mini-list">
              <li>
                <span>Password Policy</span>
                <strong>Password hidden for security.</strong>
              </li>
              <li>
                <span>Temporary Passwords</span>
                <strong>Shown once only after creation or reset.</strong>
              </li>
              <li>
                <span>Audit Events</span>
                <strong>{auditLog.length} entries recorded.</strong>
              </li>
            </ul>
          </article>
        </section>

        <section className="state-section scroll-fade" aria-labelledby="restricted-systems-title">
          <p className="eyebrow">Restricted Systems</p>
          <h2 id="restricted-systems-title">Command Modules</h2>
          <div className="portal-grid portal-grid--restricted government-system-grid">
            {systems.map((system) => {
              const allowed = canAccess(user, system.permission);
              const CardTag = allowed && !user.forcePasswordChange ? "a" : "article";

              return (
                <CardTag
                  className={`portal-card portal-card--restricted government-system-card ${
                    allowed && !user.forcePasswordChange ? "" : "government-system-card--locked"
                  }`}
                  href={allowed && !user.forcePasswordChange ? system.href : undefined}
                  key={system.title}
                >
                  <span>{system.icon} {system.title}</span>
                  <small className="system-group-badge">{system.group}</small>
                  <p>{system.text}</p>
                  <strong>{allowed ? "Authorised" : "Restricted"}</strong>
                </CardTag>
              );
            })}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
