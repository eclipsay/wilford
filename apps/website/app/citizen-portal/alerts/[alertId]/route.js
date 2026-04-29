import { NextResponse } from "next/server";
import { getCurrentCitizen } from "../../../../lib/citizen-state";
import { markCitizenAlertRead } from "../../../../lib/citizen-alerts";

export async function GET(request, { params }) {
  const citizen = await getCurrentCitizen();
  const { alertId } = await params;

  if (citizen && alertId) {
    await markCitizenAlertRead({
      citizenId: citizen.id,
      alertId
    });
  }

  return NextResponse.redirect(new URL(`/citizen-portal?alert=${encodeURIComponent(alertId || "")}#citizen-alert-${encodeURIComponent(alertId || "")}`, request.url));
}
