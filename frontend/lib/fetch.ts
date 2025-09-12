"use client";

import { getAuthToken } from "./utils";

interface BackendOptions {
  query?: Record<string, any>;
  requireAuth?: boolean;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
}

export const backend = async (
  pathname: string,
  { query = {}, requireAuth = true, method = "GET", body }: BackendOptions = {}
) => {
  const serverUrl = "http://localhost:8000";
  const url = new URL(`${serverUrl}/api/v1/${pathname}`.replaceAll("//", "/"));

  // Append query parameters
  Object.keys(query).forEach((key) => {
    if (query[key] !== undefined && query[key] !== null) {
      url.searchParams.append(key, String(query[key]));
    }
  });

  const headers: Record<string, string> = {};

  if (requireAuth) {
    const token = getAuthToken();
    if (!token) {
      console.warn("No authentication token found.");
      return;
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body
          ? JSON.stringify(body)
          : undefined,
    });

    if (response.status === 401 && requireAuth) {
      window.location.href = "/login";
      return {
        data: null,
        ok: false,
        status: null,
      };
    }

    return {
      data: await response.json().catch(() => response),
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    console.error("Backend request failed:", error);
    throw error;
  }
};
