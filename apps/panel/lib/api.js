const baseUrl = process.env.API_URL || "http://127.0.0.1:4000";

export async function fetchAdmin(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": process.env.ADMIN_API_KEY || "",
      ...(options.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchPublic(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Public API request failed: ${response.status}`);
  }

  return response.json();
}
