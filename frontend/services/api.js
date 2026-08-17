"use strict";

const BASE_URL = "";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const username = typeof window !== "undefined" ? localStorage.getItem("currentUser") || "" : "";

  const headers = {
    "Content-Type": "application/json",
    ...(username ? { "x-user-username": username } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    let data = {};
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const textVal = await response.text();
      data = { text: textVal, success: response.ok };
    }

    if (!response.ok) {
      throw new HttpError(response.status, data.error || `HTTP error ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Request Failure: [${options.method || "GET"}] ${url}`, error);
    throw error;
  }
};

export const api = {
  get: (endpoint, headers) => request(endpoint, { method: "GET", headers }),
  post: (endpoint, body, headers) => request(endpoint, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined, headers }),
  put: (endpoint, body, headers) => request(endpoint, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined, headers }),
  delete: (endpoint, body, headers) => request(endpoint, { method: "DELETE", body: body !== undefined ? JSON.stringify(body) : undefined, headers }),
};
