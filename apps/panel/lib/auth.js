import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_SECRET_COOKIE = "wilford_panel_session";
const SESSION_USER_COOKIE = "wilford_panel_user";
const SESSION_ROLE_COOKIE = "wilford_panel_role";

export async function isAuthenticated() {
  const store = await cookies();
  const session = store.get(SESSION_SECRET_COOKIE)?.value;
  const username = store.get(SESSION_USER_COOKIE)?.value;
  const role = store.get(SESSION_ROLE_COOKIE)?.value;

  return Boolean(
    session &&
      session === process.env.PANEL_SESSION_SECRET &&
      username &&
      role
  );
}

export async function getSession() {
  const store = await cookies();
  const secret = store.get(SESSION_SECRET_COOKIE)?.value;
  const username = store.get(SESSION_USER_COOKIE)?.value;
  const role = store.get(SESSION_ROLE_COOKIE)?.value;

  if (
    !secret ||
    secret !== process.env.PANEL_SESSION_SECRET ||
    !username ||
    !role
  ) {
    return null;
  }

  return { username, role };
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function requireOwner() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "owner") {
    redirect("/");
  }

  return session;
}

export async function setAuthenticatedSession(sessionData) {
  const store = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };

  store.set(
    SESSION_SECRET_COOKIE,
    process.env.PANEL_SESSION_SECRET || "",
    options
  );
  store.set(SESSION_USER_COOKIE, sessionData.username, options);
  store.set(SESSION_ROLE_COOKIE, sessionData.role, options);
}

export async function clearAuthenticatedSession() {
  const store = await cookies();
  store.delete(SESSION_SECRET_COOKIE);
  store.delete(SESSION_USER_COOKIE);
  store.delete(SESSION_ROLE_COOKIE);
}
