const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export function getToken() {
  return localStorage.getItem("ionomed_token");
}

export function setSession({ token, user, institution }) {
  localStorage.setItem("ionomed_token", token);
  localStorage.setItem("ionomed_user", JSON.stringify(user));
  localStorage.setItem("ionomed_institution", JSON.stringify(institution));
}

export function clearSession() {
  localStorage.removeItem("ionomed_token");
  localStorage.removeItem("ionomed_user");
  localStorage.removeItem("ionomed_institution");
}

export function readSession() {
  const token = getToken();
  const user = JSON.parse(localStorage.getItem("ionomed_user") || "null");
  const institution = JSON.parse(localStorage.getItem("ionomed_institution") || "null");
  return { token, user, institution };
}

export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Error de comunicación");
  return data;
}
