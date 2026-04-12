import { apiGetMe, apiLogin, apiRefresh, apiRegister, type AuthPayload, type User } from "@/lib/api";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  setAccessToken,
  getStoredUser,
  setStoredUser,
  clearAuthStorage,
} from "@/lib/token-store";

export { getAccessToken, getRefreshToken } from "@/lib/token-store";

function setSession(payload: AuthPayload) {
  setTokens(payload.access_token, payload.refresh_token);
  setStoredUser(JSON.stringify(payload.user));
}

export function clearAuth() {
  clearAuthStorage();
}

export function getCurrentUser(): User | null {
  const raw = getStoredUser();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getCurrentUsername() {
  return getCurrentUser()?.username ?? null;
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
  } catch {
    return false;
  }
  return true;
}

export function isAdmin() {
  return getCurrentUser()?.role === "admin";
}

export async function login(username: string, password: string) {
  const payload = await apiLogin({ username, password });
  setSession(payload);
  return payload.user;
}

export async function register(username: string, email: string, password: string) {
  const payload = await apiRegister({ username, email, password });
  setSession(payload);
  return payload.user;
}

export function logout() {
  clearAuth();
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const refreshed = await apiRefresh({ refresh_token: refreshToken });
  setAccessToken(refreshed.access_token);
  return refreshed.access_token;
}

export async function syncCurrentUser() {
  const me = await apiGetMe();
  setStoredUser(JSON.stringify(me));
  return me;
}
