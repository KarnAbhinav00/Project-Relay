const isProduction = process.env.NODE_ENV === "production";
const defaultApiUrl = "https://project-relay-backends-for-main.onrender.com";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (isProduction ? defaultApiUrl : "http://localhost:5000");

export async function api(path, options = {}, token) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}
