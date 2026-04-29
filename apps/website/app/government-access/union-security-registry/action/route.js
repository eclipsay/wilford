import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
import { assertTrustedPostOrigin, canAccess, requireGovernmentUser } from "../../../../lib/government-auth";
import { createCitizenRecord, updateCitizenRecord, updateDistrictProfile } from "../../../../lib/citizen-state";
import { createWallet, getEconomyStore, getWallet, saveEconomyStore } from "../../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

async function syncLinkedWallet(record, fields, actorName) {
  let walletId = String(fields.walletId || record.walletId || "").trim();

  if (!walletId && fields.createWallet === "on") {
    const store = await createWallet({
      userId: record.userId || record.id,
      discordId: record.discordId,
      displayName: record.name,
      balance: fields.openingBalance || 500,
      salary: fields.salary || 125,
      district: record.district,
      taxStatus: "compliant"
    }, actorName);
    const wallet = getWallet(store, record.userId || record.discordId) || store.wallets[0];
    walletId = wallet?.id || "";
    if (walletId) {
      await updateCitizenRecord(record.id, { walletId });
    }
  }

  if (!walletId) return;

  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  if (!wallet) return;

  wallet.userId = record.userId || record.id;
  wallet.discordId = record.discordId || wallet.discordId || "";
  wallet.displayName = record.name || wallet.displayName;
  wallet.district = record.district || wallet.district || "";
  wallet.updatedAt = new Date().toISOString();
  await saveEconomyStore(store);
}

export const POST = safeAction("government-access/union-security-registry/action", "/government-access/union-security-registry", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const actor = await requireGovernmentUser("identitySecurity");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const identityAccess = canAccess(actor, "identityRegistry");

  if (intent === "district") {
    if (!identityAccess) return redirectTo(request, "/government-access?denied=1");
    await updateDistrictProfile(String(formData.get("districtId") || "").trim(), Object.fromEntries(formData.entries()));
    return redirectTo(request, "/government-access/union-security-registry?saved=district");
  }

  if (intent === "create") {
    if (!identityAccess) return redirectTo(request, "/government-access?denied=1");
    const fields = Object.fromEntries(formData.entries());
    const record = await createCitizenRecord(fields);
    await syncLinkedWallet(record, fields, actor.username);
    return redirectTo(request, `/government-access/union-security-registry?saved=create&citizen=${encodeURIComponent(record.id)}`);
  }

  const id = String(formData.get("citizenId") || "").trim();
  const fields = Object.fromEntries(formData.entries());
  if (["suspend", "revoke", "lost"].includes(intent)) {
    fields.verificationStatus = intent === "suspend" ? "Suspended" : intent === "revoke" ? "Revoked" : "Lost/Stolen";
    fields.lostOrStolen = intent === "lost";
  }
  fields.regenerateVerificationCode = intent === "regenerate-code";
  fields.regenerateSecurityId = intent === "regenerate-id";
  const state = await updateCitizenRecord(id, fields);
  const record = state.citizenRecords.find((citizen) => citizen.id === id);
  if (record) {
    await syncLinkedWallet(record, fields, actor.username);
  }
  return redirectTo(request, `/government-access/union-security-registry?saved=record&citizen=${encodeURIComponent(id)}`);
});
