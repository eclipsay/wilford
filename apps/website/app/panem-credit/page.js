import {
  economyCrimeDefaults,
  economyGambleDefaults,
  economyJobDefaults,
  formatCredits,
  getJobAccess,
  investmentFundDefaults,
  normalizeEconomyDistrict,
  prestigeItemDefaults,
  taxLabel,
  titleForBalance
} from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getEconomyStore, getSecurityDashboard, getWallet } from "../../lib/panem-credit";
import { getCitizenState, getCurrentCitizen } from "../../lib/citizen-state";

export const metadata = {
  title: "Panem Credit"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sumTaxes(records) {
  return records.reduce((total, record) => total + Number(record.amount || 0), 0);
}

export default async function PanemCreditPage({ searchParams }) {
  const params = await searchParams;
  const citizen = await getCurrentCitizen();

  if (!citizen) {
    return (
      <SiteLayout>
        <PageHero
          eyebrow="Ministry of Credit & Records"
          title="Panem Credit"
          description="Secure citizen banking uses private portal credentials and public-safe transfer handles."
        />

        <main className="content content--wide finance-page panem-credit-page">
          {params?.error ? (
            <section className="application-notice application-notice--error">
              <strong>Account Access Required</strong>
              <p>Enter your citizen name and private login code before opening Panem Credit.</p>
            </section>
          ) : null}

          <section className="portal-intro scroll-fade">
            <div>
              <p className="eyebrow">Secure Banking Access</p>
              <h2>Private portal login required.</h2>
              <p>
                Panem Credit accounts are tied to citizen identity records, but
                transfers use Discord mentions, public handles, or search so
                internal IDs stay private.
              </p>
            </div>
            <form action="/citizen-portal/action" className="portal-status public-application-form citizen-login-form" method="post">
              <input name="intent" type="hidden" value="login" />
              <input name="returnTo" type="hidden" value="/panem-credit" />
              <label className="public-application-field">
                <span>Citizen name or username</span>
                <input autoComplete="username" name="citizenName" required />
              </label>
              <label className="public-application-field">
                <span>Private login code</span>
                <input autoComplete="off" name="unionSecurityId" placeholder="WPU-08-2026-0004" required />
              </label>
              <label className="public-application-field">
                <span>Portal password</span>
                <input autoComplete="current-password" name="portalPassword" type="password" />
              </label>
              <button className="button button--solid-site" type="submit">Open Panem Credit</button>
            </form>
          </section>
        </main>
      </SiteLayout>
    );
  }

  const [store, citizenState] = await Promise.all([getEconomyStore(), getCitizenState()]);
  const selectedWallet = getWallet(store, citizen.walletId || citizen.userId || citizen.discordId);

  if (!selectedWallet) {
    return (
      <SiteLayout>
        <PageHero
          eyebrow="Ministry of Credit & Records"
          title="Panem Credit"
          description="Secure citizen banking, taxation, and marketplace exchange."
        />

        <main className="content content--wide finance-page panem-credit-page">
          <section className="application-notice application-notice--error">
            <strong>No Wallet Linked</strong>
            <p>Your citizen identity is verified, but no Panem Credit wallet is linked to this record.</p>
          </section>
        </main>
      </SiteLayout>
    );
  }

  const walletTransactions = store.transactions
    .filter((transaction) => transaction.fromWalletId === selectedWallet.id || transaction.toWalletId === selectedWallet.id)
    .slice(0, 12);
  const walletTaxes = store.taxRecords.filter((record) => record.walletId === selectedWallet.id);
  const paidTax = sumTaxes(walletTaxes.filter((record) => record.status === "paid"));
  const outstandingTax = sumTaxes(walletTaxes.filter((record) => record.status !== "paid"));
  const activeEvent = store.events.find((event) => event.status === "active") || store.events[0];
  const activeEvents = store.events.filter((event) => event.status === "active").slice(0, 5);
  const security = getSecurityDashboard(store, selectedWallet);
  const currentDistrict = normalizeEconomyDistrict(citizen.district || selectedWallet.district || "The Capitol");
  const jobWallet = { ...selectedWallet, district: currentDistrict };
  const selectedJobCandidate = economyJobDefaults.find((job) => job.id === selectedWallet.selectedJobId);
  const selectedJob = selectedJobCandidate && getJobAccess(jobWallet, selectedJobCandidate, { district: currentDistrict }).allowed
    ? selectedJobCandidate
    : economyJobDefaults.find((job) => getJobAccess(jobWallet, job, { district: currentDistrict }).allowed) || economyJobDefaults[0];
  const jobView = params?.jobs === "my" ? "my" : "all";
  const availableJobs = [...economyJobDefaults].sort((a, b) => {
    const aAccess = getJobAccess(jobWallet, a, { district: currentDistrict });
    const bAccess = getJobAccess(jobWallet, b, { district: currentDistrict });
    return Number(bAccess.allowed) - Number(aAccess.allowed) || Number(bAccess.native) - Number(aAccess.native) || a.district.localeCompare(b.district) || a.name.localeCompare(b.name);
  }).filter((job) => jobView === "all" || getJobAccess(jobWallet, job, { district: currentDistrict }).allowed);
  const richest = [...store.wallets].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0)).slice(0, 6);
  const wanted = store.wallets.filter((wallet) => wallet.wanted || wallet.underReview || Number(wallet.bounty || 0) > 0).slice(0, 6);
  const districtChampions = store.districts.map((district) => {
    const champion = [...store.wallets]
      .filter((wallet) => wallet.district === district.name)
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
    return { district, champion };
  }).filter((entry) => entry.champion).slice(0, 6);
  const transferRecipients = citizenState.citizenRecords
    .filter((record) =>
      record.id !== citizen.id &&
      record.verificationStatus === "Verified" &&
      !record.lostOrStolen &&
      getWallet(store, record.walletId || record.userId || record.discordId)
    )
    .sort((a, b) => String(a.citizenHandle || a.name).localeCompare(String(b.citizenHandle || b.name)))
    .slice(0, 200);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Ministry of Credit & Records"
        title="Panem Credit"
        description="Official civic banking, marketplace exchange, taxation, and district production ledger."
      />

      <main className="content content--wide finance-page panem-credit-page">
        {params?.saved ? (
          <section className="application-notice">
            <strong>Ledger Updated</strong>
            <p>The Ministry of Credit & Records has recorded the transaction.</p>
          </section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>{params.error === "daily-limit" ? "Daily Salary Already Claimed" : "Transaction Rejected"}</strong>
            <p>
              {params.error === "daily-limit"
                ? "This wallet has already received its daily civic salary today."
                : params.error === "confirm-transfer"
                  ? "Large public-handle transfers require the confirmation checkbox before execution."
                : params.error === "work-permit-required"
                  ? "You cannot select this job outside your district without a work permit."
                : params.error === "restricted-job"
                  ? "This restricted role requires special government or MSS permission."
                : params.error === "session"
                  ? "Your citizen banking session has expired. Please identify yourself again."
                : "The wallet, balance, stock, or account status could not support that request."}
            </p>
          </section>
        ) : null}

        <section className="finance-portal scroll-fade">
          <article className="wallet-card panem-wallet-card">
            <div>
              <p>Citizen Wallet</p>
              <h2>{selectedWallet.displayName}</h2>
            </div>
            <div className="wallet-card__balance">{formatCredits(selectedWallet.balance)}</div>
            <span>{selectedWallet.title || titleForBalance(selectedWallet.balance)} / {selectedWallet.status.toUpperCase()}</span>
            <p>{citizen.name} / @{citizen.citizenHandle || citizen.portalUsername || citizen.userId}</p>
          </article>

          <article className="finance-panel panem-event-panel">
            <p className="eyebrow">Active State Event</p>
            <h2>{activeEvent?.title || "Standard Treasury Cycle"}</h2>
            <p>{activeEvent?.summary || "Normal payout, market, and taxation rules are in effect."}</p>
            <div className="metric-grid">
              <span><strong>x{Number(activeEvent?.rewardMultiplier || 1)}</strong> Daily rewards</span>
              <span><strong>x{Number(activeEvent?.workMultiplier || 1)}</strong> Labour payouts</span>
              <span><strong>x{Number(activeEvent?.marketMultiplier || 1)}</strong> Market pressure</span>
              <span><strong>{selectedWallet.streak || 0}</strong> Login streak</span>
            </div>
            <div className="panem-ledger">
              {activeEvents.map((event) => (
                <div key={`${event.id}-${event.startsAt}`}><dt>{event.title}</dt><dd>{(event.affectedDistricts || event.boostedDistricts || []).join(", ") || "Union-wide"}</dd></div>
              ))}
            </div>
          </article>

          <article className="finance-panel">
            <p className="eyebrow">Tax Status</p>
            <h2>Taxation sustains the Union.</h2>
            <div className="metric-grid">
              <span><strong>{formatCredits(paidTax)}</strong> Taxes paid</span>
              <span><strong>{formatCredits(outstandingTax)}</strong> Outstanding tax</span>
              <span><strong>{formatCredits(selectedWallet.salary ?? 125)}</strong> Daily salary</span>
              <span><strong>{selectedWallet.taxStatus}</strong> Current status</span>
              <span><strong>{selectedWallet.district || "Unassigned"}</strong> District affiliation</span>
              <span><strong>{formatCredits(selectedWallet.bounty || 0)}</strong> Posted bounty</span>
            </div>
          </article>

          <article className="finance-panel finance-panel--metrics">
            <p className="eyebrow">Citizen Actions</p>
            <div className="panem-action-grid">
              <form action="/panem-credit/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="send" />
                <label className="public-application-field">
                  <span>Recipient handle, transfer code, or Discord mention</span>
                  <input autoComplete="off" list="transfer-recipients" name="recipientQuery" placeholder="@citizen-handle" required />
                </label>
                <datalist id="transfer-recipients">
                  {transferRecipients.map((record) => (
                    <option key={record.id} value={`@${record.citizenHandle || record.portalUsername || record.userId}`}>
                      {record.name} / {record.district}
                    </option>
                  ))}
                </datalist>
                <label className="public-application-field">
                  <span>Amount</span>
                  <input min="1" name="amount" required type="number" />
                </label>
                <label className="public-application-field">
                  <span>Reason</span>
                  <input name="reason" placeholder="Civic payment" type="text" />
                </label>
                <label className="public-application-field public-application-field--checkbox">
                  <input name="confirmTransfer" type="checkbox" />
                  <span>Confirm if this payment is unusually large.</span>
                </label>
                <button className="button button--solid-site" type="submit">Send Credits</button>
              </form>
              <form action="/panem-credit/action" method="post">
                <input name="intent" type="hidden" value="daily" />
                <button className="button" type="submit">Claim Daily Civic Stipend</button>
              </form>
            </div>
          </article>
        </section>

        <section className="state-section scroll-fade" id="jobs-work">
          <p className="eyebrow">Civic Earnings</p>
          <h2>Job Desk</h2>
          <div className="application-notice">
            <strong>Current district: {currentDistrict}</strong>
            <p>Native district jobs are open at full payout. Foreign jobs are visible in All Jobs, but require a Work Permit before they can be selected.</p>
          </div>
          <div className="government-action-row">
            <Link className={`button ${jobView === "my" ? "button--solid-site" : ""}`} href="/panem-credit?jobs=my#jobs-work">My District Jobs</Link>
            <Link className={`button ${jobView === "all" ? "button--solid-site" : ""}`} href="/panem-credit?jobs=all#jobs-work">All Jobs</Link>
          </div>
          <article className="finance-panel">
            <p className="eyebrow">Selected Role</p>
            <h3>{selectedJob.name}</h3>
            <p>{selectedJob.description}</p>
            <div className="metric-grid">
              <span><strong>{selectedJob.district}</strong> District</span>
              <span><strong>{selectedJob.riskLevel}</strong> Risk</span>
              <span><strong>{formatCredits(selectedJob.minReward)}-{formatCredits(selectedJob.maxReward)}</strong> Payout</span>
              <span><strong>{selectedJob.cooldownHours}h</strong> Cooldown</span>
            </div>
            <form action="/panem-credit/action" method="post">
              <input name="intent" type="hidden" value="work" />
              <input name="jobId" type="hidden" value={selectedJob.id} />
              <button className="button button--solid-site" type="submit">Work Selected Job</button>
            </form>
          </article>
          <div className="panem-market-grid">
            {availableJobs.map((job) => {
              const jobAccess = getJobAccess(jobWallet, job, { district: currentDistrict });
              const nativeJob = jobAccess.native;
              return (
              <article className={`premium-card panem-market-card ${jobAccess.allowed ? "" : "panem-market-card--locked"}`} key={job.id}>
                <span className="court-role-badge">{jobAccess.allowed ? (nativeJob ? "Native" : "Permit") : jobAccess.label} / {job.district}</span>
                <h3>{job.name}</h3>
                <p>{job.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Payout</dt><dd>{formatCredits(job.minReward)} - {formatCredits(job.maxReward)}</dd></div>
                  <div><dt>Cooldown</dt><dd>{job.cooldownHours}h</dd></div>
                  <div><dt>Risk</dt><dd>{job.riskLevel} / {(Number(job.failureChance || 0) * 100).toFixed(0)}% failure</dd></div>
                  <div><dt>District rule</dt><dd>{nativeJob ? "100% reward" : jobAccess.allowed ? "Work permit active" : jobAccess.label}</dd></div>
                </dl>
                <form action="/panem-credit/action" method="post">
                  <input name="intent" type="hidden" value="set-job" />
                  <input name="jobId" type="hidden" value={job.id} />
                  <button className="button button--solid-site" disabled={!jobAccess.allowed} type="submit">{jobAccess.allowed ? selectedJob.id === job.id ? "Selected" : "Select Job" : jobAccess.label}</button>
                </form>
              </article>
            )})}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Risk Office</p>
          <h2>Fictional Crime and State Games</h2>
          <div className="application-notice">
            <strong>Strategic Loop</strong>
            <p>Daily pay, work, gather items, choose whether to hold for value or sell for safer taxed credits, then compete through games, markets, and leaderboards. Current lottery jackpot: {formatCredits(store.gamblingJackpot || 2500)}. MSS suspicion: {security.current?.status || "Clear"} ({security.current?.score || 0}).</p>
          </div>
          <div className="panem-ledger-layout">
            <form action="/panem-credit/action" className="panel public-application-form" method="post">
              <input name="intent" type="hidden" value="crime" />
              <h3>Risk Action</h3>
              <label className="public-application-field">
                <span>Action</span>
                <select name="crimeId">
                  {economyCrimeDefaults.map((crime) => (
                    <option key={crime.id} value={crime.id}>{crime.name} / {(crime.successChance * 100).toFixed(0)}% success</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Optional target handle</span>
                <input autoComplete="off" name="targetSecurityId" placeholder="@handle, Discord name, or citizen name" />
              </label>
              <button className="button button--danger-site" type="submit">Take Risk</button>
            </form>
            <form action="/panem-credit/action" className="panel public-application-form" method="post">
              <input name="intent" type="hidden" value="gamble" />
              <h3>Capitol Games</h3>
              <p>Winnings are taxed. Heavy wagering can raise MSS suspicion and trigger monitoring.</p>
              <label className="public-application-field">
                <span>Game</span>
                <select name="gameId">
                  {economyGambleDefaults.map((game) => (
                    <option key={game.id} value={game.id}>{game.name} / max {formatCredits(game.maxBet)}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field"><span>Bet amount</span><input defaultValue="50" min="1" name="amount" type="number" /></label>
              <button className="button button--solid-site" type="submit">Place Bet</button>
            </form>
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Investment and Prestige</p>
          <h2>Build Status</h2>
          <div className="panem-ledger-layout">
            <form action="/panem-credit/action" className="panel public-application-form" method="post">
              <input name="intent" type="hidden" value="invest" />
              <h3>Investment Fund</h3>
              <label className="public-application-field">
                <span>Fund</span>
                <select name="fundId">
                  {investmentFundDefaults.map((fund) => (
                    <option key={fund.id} value={fund.id}>{fund.name} / {fund.riskLevel}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field"><span>Amount</span><input defaultValue="100" min="25" name="amount" type="number" /></label>
              <button className="button button--solid-site" type="submit">Invest</button>
            </form>
            <form action="/panem-credit/action" className="panel public-application-form" method="post">
              <input name="intent" type="hidden" value="prestige" />
              <h3>Prestige Registry</h3>
              <label className="public-application-field">
                <span>Item</span>
                <select name="itemId">
                  {prestigeItemDefaults.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} / {formatCredits(item.price)}</option>
                  ))}
                </select>
              </label>
              <button className="button button--solid-site" type="submit">Purchase Status</button>
            </form>
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Marketplace</p>
          <h2>District Goods Exchange</h2>
          <div className="panem-market-grid">
            {store.marketItems.map((item) => (
              <article className="premium-card panem-market-card" key={item.id}>
                <span className="court-role-badge">{item.district}</span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Price</dt><dd>{formatCredits(item.currentPrice)}</dd></div>
                  <div><dt>Base</dt><dd>{formatCredits(item.basePrice)}</dd></div>
                  <div><dt>Stock</dt><dd>{item.stock}</dd></div>
                  <div><dt>Category</dt><dd>{item.category}</dd></div>
                </dl>
                <form action="/panem-credit/action" className="panem-inline-form" method="post">
                  <input name="intent" type="hidden" value="buy" />
                  <input name="itemId" type="hidden" value={item.id} />
                  <input defaultValue="1" min="1" name="quantity" type="number" />
                  <button className="button button--solid-site" type="submit">Buy</button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Sell Goods</p>
          <h2>Citizen Listing Desk</h2>
          <form action="/panem-credit/action" className="panel public-application-form" method="post">
            <input name="intent" type="hidden" value="sell" />
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Good</span>
                <select name="itemId">
                  {store.marketItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Quantity</span>
                <input defaultValue="1" min="1" name="quantity" type="number" />
              </label>
              <label className="public-application-field">
                <span>Unit price</span>
                <input min="1" name="price" required type="number" />
              </label>
            </div>
            <button className="button button--solid-site" type="submit">List Goods</button>
          </form>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">District Economy</p>
          <h2>Production Map</h2>
          <div className="panem-district-grid">
            {store.districts.map((district) => (
              <article className="finance-panel panem-district-card" key={district.id}>
                <p className="eyebrow">{district.developmentStatus}</p>
                <h3>{district.name}</h3>
                <p>{district.goodsProduced}</p>
                <div className="finance-bars">
                  {[
                    ["Supply", district.supplyLevel],
                    ["Demand", district.demandLevel],
                    ["Prosperity", district.prosperityRating],
                    ["Loyalty", district.loyaltyScore]
                  ].map(([label, value]) => (
                    <div className="finance-bar" key={label}>
                      <span>{label}</span>
                      <i style={{ "--value": `${Math.min(100, Number(value || 0))}%` }} />
                    </div>
                  ))}
                </div>
                <dl className="panem-ledger">
                  <div><dt>Trade volume</dt><dd>{formatCredits(district.tradeVolume)}</dd></div>
                  <div><dt>Tax contribution</dt><dd>{formatCredits(district.taxContribution)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="state-section scroll-fade" id="ledger">
          <p className="eyebrow">Ledger</p>
          <h2>Transactions, Taxes, Rankings, and MSS Watch</h2>
          <div className="panem-ledger-layout">
            <article className="panel">
              <h3>Recent Transactions</h3>
              <ul className="government-mini-list">
                {walletTransactions.map((transaction) => (
                  <li key={transaction.id}>
                    <span>{transaction.type} / {transaction.reason}</span>
                    <strong>{formatCredits(transaction.amount)} {transaction.taxAmount ? `+ ${formatCredits(transaction.taxAmount)} tax` : ""}</strong>
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>Tax History</h3>
              <ul className="government-mini-list">
                {walletTaxes.slice(0, 8).map((tax) => (
                  <li key={tax.id}>
                    <span>{taxLabel(tax.taxType)} / {tax.status}</span>
                    <strong>{formatCredits(tax.amount)}</strong>
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>Account Security</h3>
              <ul className="government-mini-list">
                <li><span>Public handle</span><strong>@{citizen.citizenHandle || citizen.portalUsername || citizen.userId}</strong></li>
                <li><span>District</span><strong>{citizen.district}</strong></li>
                <li><span>Verification</span><strong>{citizen.verificationStatus}</strong></li>
                <li><span>Security classification</span><strong>{citizen.securityClassification}</strong></li>
              </ul>
            </article>
            <article className="panel">
              <h3>Richest Citizens</h3>
              <ul className="government-mini-list">
                {richest.map((wallet, index) => (
                  <li key={wallet.id}><span>{index + 1}. {wallet.displayName}</span><strong>{formatCredits(wallet.balance)}</strong></li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>District Champions</h3>
              <ul className="government-mini-list">
                {districtChampions.map(({ district, champion }) => (
                  <li key={district.id}><span>{district.name}</span><strong>{champion.displayName}</strong></li>
                ))}
              </ul>
            </article>
            <article className="panel panem-wanted-panel">
              <h3>Most Wanted Financiers</h3>
              <ul className="government-mini-list">
                {wanted.length ? wanted.map((wallet) => (
                  <li key={wallet.id}>
                    <span>{wallet.displayName} / {wallet.taxStatus || "MSS review"}</span>
                    <strong>{formatCredits(wallet.bounty || 0)}</strong>
                  </li>
                )) : <li><span>No active public warrants.</span><strong>Clear</strong></li>}
              </ul>
            </article>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
