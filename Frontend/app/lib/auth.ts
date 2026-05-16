const apiBase = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function refreshAccessToken(): Promise<string> {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) throw new Error("no_refresh");

  const res = await fetch(`${apiBase()}/users/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) throw new Error("refresh_failed");

  const data = await res.json();
  localStorage.setItem("access", data.access);
  return data.access;
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function clearSession() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = localStorage.getItem("access") ?? "";

  const attempt = (t: string) =>
    fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${t}` },
    });

  let res = await attempt(token);

  if (res.status === 401) {
    try {
      token = await refreshAccessToken();
      res = await attempt(token);
    } catch {
      clearSession();
      window.location.replace("/login");
      throw new Error("session_expired");
    }
  }

  return res;
}
