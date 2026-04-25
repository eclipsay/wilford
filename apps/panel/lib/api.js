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
  return fetchPublicWithOptions(path);
}

export async function fetchPublicWithOptions(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Public API request failed: ${response.status}`);
  }

  return response.json();
}
