const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export function getToken() {
  return localStorage.getItem("token");
}

// Espaces publics : un client (souvent dans la webview galimo.tech) ne doit
// jamais être envoyé vers l'écran de connexion pharmacie.
const PUBLIC_PATHS = ["/", "/shop", "/espaces", "/login"];

// Jeton expiré ou invalide : on l'efface et on renvoie le personnel (pharmacien,
// admin) vers la connexion, avec retour sur la page où il était.
function handleExpiredSession() {
  const path = window.location.pathname;
  if (PUBLIC_PATHS.includes(path)) return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.assign(`/login?expired=1&redirect=${encodeURIComponent(path)}`);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && token && !path.startsWith("/auth/login")) {
    handleExpiredSession();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.toString() ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
