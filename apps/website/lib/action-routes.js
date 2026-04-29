import { NextResponse } from "next/server";

export function redirectWithStatus(request, basePath, params = {}) {
  const url = new URL(basePath, request.url);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return NextResponse.redirect(url);
}

export function safeAction(routeName, fallbackPath, handler) {
  return async function actionRoute(request) {
    try {
      return await handler(request);
    } catch (error) {
      if (String(error?.digest || "").startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      console.error(`[action:${routeName}]`, {
        message: error?.message || String(error),
        stack: error?.stack
      });
      return redirectWithStatus(request, fallbackPath, {
        error: "server",
        detail: "The action could not be completed. Please try again or contact an administrator."
      });
    }
  };
}
