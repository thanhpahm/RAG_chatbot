import { getAccessToken, getRefreshToken, setAccessToken, clearAuthStorage } from "@/lib/token-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    clearAuthStorage();
    return null;
  }
  const body = (await res.json()) as { access_token: string };
  setAccessToken(body.access_token);
  return body.access_token;
}

async function apiFetch<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const hasFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!hasFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, init, false);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  doc_count: number;
}

export interface Document {
  id: string;
  knowledge_base_id: string;
  filename: string;
  file_type: string | null;
  file_url: string | null;
  upload_status: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string | null;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  content: string;
  rating: number | null;
  feedback_text: string | null;
  created_at: string;
}

export interface Citation {
  id: string;
  message_id: string;
  chunk_id: string;
  relevance_score: number | null;
  chunk_content: string | null;
  document_name: string | null;
}

export interface Stats {
  total_users: number;
  total_knowledge_bases: number;
  total_documents: number;
  total_conversations: number;
  total_messages: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
}

export interface AuthPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export function listKnowledgeBases() {
  return apiFetch<KnowledgeBase[]>("/knowledge-bases");
}

export function getKnowledgeBase(id: string) {
  return apiFetch<KnowledgeBase>(`/knowledge-bases/${id}`);
}

export function createKnowledgeBase(data: { name: string; description?: string }) {
  return apiFetch<KnowledgeBase>("/knowledge-bases", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteKnowledgeBase(id: string) {
  return apiFetch<void>(`/knowledge-bases/${id}`, { method: "DELETE" });
}

export function listDocuments(kbId: string) {
  return apiFetch<Document[]>(`/knowledge-bases/${kbId}/documents`);
}

export function getDocument(id: string) {
  return apiFetch<Document>(`/documents/${id}`);
}

export function uploadDocument(kbId: string, file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<Document>(`/knowledge-bases/${kbId}/documents`, {
    method: "POST",
    body: formData,
  });
}

export function deleteDocument(id: string) {
  return apiFetch<void>(`/documents/${id}`, { method: "DELETE" });
}

export function listConversations() {
  return apiFetch<Conversation[]>("/conversations");
}

export function listAllConversations() {
  return apiFetch<Conversation[]>("/conversations?include_all=true");
}

export function createConversation(title?: string) {
  return apiFetch<Conversation>("/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function deleteConversation(id: string) {
  return apiFetch<void>(`/conversations/${id}`, { method: "DELETE" });
}

export function listMessages(conversationId: string) {
  return apiFetch<Message[]>(`/conversations/${conversationId}/messages`);
}

export function getCitations(messageId: string) {
  return apiFetch<Citation[]>(`/messages/${messageId}/citations`);
}

export function submitFeedback(messageId: string, data: { rating?: number; feedback_text?: string }) {
  return apiFetch<{ ok: boolean }>(`/messages/${messageId}/feedback`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
}

export async function sendMessageSSE(
  conversationId: string,
  data: { content: string; knowledge_base_id?: string },
  callbacks: StreamCallbacks,
): Promise<void> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    await res.body?.cancel();
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return sendMessageSSE(conversationId, data, callbacks);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Stream failed ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
        if (currentEvent === "done") {
          callbacks.onDone();
          return;
        }
        continue;
      }
      if (line.startsWith("data: ")) {
        const valueLine = line.slice(6);
        if (valueLine === "[DONE]") {
          callbacks.onDone();
          return;
        }
        if (currentEvent === "error") {
          callbacks.onError?.(valueLine);
          currentEvent = "";
          return;
        }
        callbacks.onToken(valueLine);
        currentEvent = "";
      }
    }
  }
  callbacks.onDone();
}

export function getStats() {
  return apiFetch<Stats>("/stats");
}

export function apiLogin(data: { username: string; password: string }) {
  return apiFetch<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function apiRegister(data: { username: string; email: string; password: string }) {
  return apiFetch<AuthPayload>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function apiRefresh(data: { refresh_token: string }) {
  return apiFetch<{ access_token: string; token_type: string }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function apiGetMe() {
  return apiFetch<User>("/auth/me");
}

export function apiChangePassword(data: { current_password: string; new_password: string }) {
  return apiFetch<{ ok: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listUsers(params?: { search?: string; role?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.role) searchParams.set("role", params.role);
  const query = searchParams.toString();
  return apiFetch<User[]>(`/users${query ? `?${query}` : ""}`);
}

export function createUser(data: {
  username: string;
  email: string;
  password: string;
  role: "admin" | "user";
  is_active?: boolean;
}) {
  return apiFetch<User>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(
  userId: string,
  data: Partial<Pick<User, "username" | "email" | "role" | "is_active">>,
) {
  return apiFetch<User>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteUser(userId: string) {
  return apiFetch<void>(`/users/${userId}`, { method: "DELETE" });
}

export function resetUserPassword(userId: string, data: { new_password: string }) {
  return apiFetch<{ ok: boolean }>(`/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
