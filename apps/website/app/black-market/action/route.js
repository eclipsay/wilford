import { NextResponse } from "next/server";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";
import { getCurrentCitizen, recordCitizenActivity } from "../../../lib/citizen-state";
import {
  buyBlackMarketGood,
  getEconomyStore,
  getWallet,
  runSmugglingDeal
} from "../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/black-market?error=origin");
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const citizen = await getCurrentCitizen();
  if (!citizen) return redirectTo(request, "/black-market?error=session");

  const store = await getEconomyStore();
  const wallet = getWallet(store, citizen.walletId || citizen.userId || citizen.discordId);
  if (!wallet) return redirectTo(request, "/black-market?error=wallet");

  if (intent === "buy") {
    const result = await buyBlackMarketGood({
      walletId: wallet.id,
      goodId: String(formData.get("goodId") || "").trim(),
      quantity: formData.get("quantity"),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "black market purchase", `${result.quantity} x ${result.good.name}`);
    }
    return redirectTo(request, `/black-market?${result.ok ? "saved=buy" : "error=buy"}`);
  }

  if (intent === "smuggle") {
    const result = await runSmugglingDeal({
      walletId: wallet.id,
      itemId: String(formData.get("itemId") || "").trim(),
      quantity: formData.get("quantity"),
      destinationDistrict: String(formData.get("destinationDistrict") || "").trim(),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "smuggling run", `${result.item.name} / ${result.success ? "delivered" : "intercepted"}`);
    }
    return redirectTo(request, `/black-market?${result.ok ? "saved=smuggle" : "error=smuggle"}`);
  }

  return redirectTo(request, "/black-market");
}
