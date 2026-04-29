import { NextResponse } from "next/server";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";
import { getCurrentCitizen, recordCitizenActivity } from "../../../lib/citizen-state";
import { craftInventoryItem, getEconomyStore, getWallet } from "../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/crafting?error=origin");
  }

  const formData = await request.formData();
  const citizen = await getCurrentCitizen();
  if (!citizen) return redirectTo(request, "/crafting?error=session");

  const store = await getEconomyStore();
  const wallet = getWallet(store, citizen.walletId || citizen.userId || citizen.discordId);
  if (!wallet) return redirectTo(request, "/crafting?error=wallet");

  const result = await craftInventoryItem({
    walletId: wallet.id,
    recipeId: String(formData.get("recipeId") || "").trim(),
    actor: citizen.unionSecurityId
  });

  if (result.ok) {
    await recordCitizenActivity(
      citizen.id,
      "crafting",
      `${result.recipe.name}: ${result.success ? result.quality?.label || "Standard" : "failed"}`
    );
  }

  return redirectTo(request, `/crafting?${result.ok ? "saved=craft" : `error=${result.reason || "craft"}`}`);
}
