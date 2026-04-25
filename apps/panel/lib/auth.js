import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "wilford_panel_session";

export async function isAuthenticated() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  return Boolean(session && session === process.env.PANEL_SESSION_SECRET);
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function setAuthenticatedSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, process.env.PANEL_SESSION_SECRET || "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function clearAuthenticatedSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
