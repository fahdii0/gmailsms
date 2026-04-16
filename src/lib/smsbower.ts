const API_KEY = process.env.SMSBOWER_API_KEY ?? "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
const BASE_URL = "https://smsbower.page/api/mail";

interface SMSBowerResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  raw?: string;
}

function parseJsonIfPossible(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function extractMailId(raw: string): string | undefined {
  const match = raw.match(/(?:mailId|id)\s*[:=]\s*([A-Za-z0-9_-]+)/i);
  return match?.[1];
}

function extractEmail(raw: string): string | undefined {
  const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0];
}

function extractCode(raw: string): string | undefined {
  const match = raw.match(/\b\d{4,8}\b/);
  return match?.[0];
}

async function callAPI(action: string, params: Record<string, string>): Promise<SMSBowerResponse> {
  if (!API_KEY) {
    return { success: false, error: "SMSBower API key not configured" };
  }

  const url = new URL(`${BASE_URL}/${action}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
    });

    const text = await response.text();

    if (!response.ok) {
      return { success: false, error: `API returned ${response.status}: ${text}` };
    }

    return { success: true, raw: text };
  } catch (error) {
    return { success: false, error: `API call failed: ${String(error)}` };
  }
}

export async function getActivation(service: string = "fb", domain: string = "gmail.com"): Promise<{
  success: boolean;
  mailId?: string;
  email?: string;
  error?: string;
}> {
  const result = await callAPI("getActivation", {
    service,
    domain,
    ref: "0",
    alias: "0",
  });

  if (!result.success || !result.raw) {
    return { success: false, error: result.error || "Unknown error" };
  }

  const raw = result.raw.trim();
  const parsedJson = parseJsonIfPossible(raw);

  if (parsedJson) {
    const mailId = String(parsedJson.mailId ?? parsedJson.id ?? "");
    const email = String(parsedJson.mail ?? parsedJson.email ?? "");

    if (mailId && email) {
      return { success: true, mailId, email };
    }

    if (String(parsedJson.status ?? "").toLowerCase() === "success") {
      return {
        success: true,
        mailId: mailId || extractMailId(raw),
        email: email || extractEmail(raw),
      };
    }
  }

  const colonParts = raw.split(":");
  if (colonParts.length >= 3) {
    const mailId = colonParts[1]?.trim();
    const email = colonParts.slice(2).join(":").trim();

    if (mailId && email) {
      return { success: true, mailId, email };
    }
  }

  const mailId = extractMailId(raw);
  const email = extractEmail(raw);

  if (mailId && email) {
    return { success: true, mailId, email };
  }

  return { success: false, error: raw || "SMSBower returned an empty response" };
}

export async function getCode(mailId: string): Promise<{
  success: boolean;
  code?: string;
  fullMessage?: string;
  error?: string;
}> {
  const result = await callAPI("getCode", {
    mailId,
  });

  if (!result.success || !result.raw) {
    return { success: false, error: result.error || "Unknown error" };
  }

  const raw = result.raw.trim();
  const parsedJson = parseJsonIfPossible(raw);

  if (parsedJson) {
    const code = String(parsedJson.code ?? parsedJson.otp ?? parsedJson.message ?? "").trim();
    if (code) {
      return { success: true, code, fullMessage: code };
    }

    const status = String(parsedJson.status ?? "").toLowerCase();
    if (status.includes("wait")) {
      return { success: false, error: "Waiting for code. Please try again in a few seconds." };
    }
  }

  if (/wait|pending|not\s+ready|try\s+again/i.test(raw)) {
    return { success: false, error: "Waiting for code. Please try again in a few seconds." };
  }

  if (raw.startsWith("FULL_SMS:")) {
    const parts = raw.split(":");
    if (parts.length >= 3) {
      const code = parts.slice(2).join(":").trim();
      if (code) {
        return { success: true, code, fullMessage: code };
      }
    }
  }

  const code = extractCode(raw);
  if (code) {
    return { success: true, code, fullMessage: raw };
  }

  if (!raw) {
    return { success: false, error: "Waiting for code. Please try again in a few seconds." };
  }

  return { success: false, error: raw };
}

export async function setStatus(
  mailId: string,
  status: "cancel" | "finish"
): Promise<{ success: boolean; error?: string }> {
  const statusMap = { cancel: "8", finish: "6" };

  const result = await callAPI("setMailStatus", {
    id: mailId,
    status: statusMap[status],
  });

  if (!result.success || !result.raw) {
    return { success: false, error: result.error || "Unknown error" };
  }

  const raw = result.raw.trim();
  if (raw.startsWith("ACCESS_")) {
    return { success: true };
  }

  return { success: false, error: raw };
}

export async function getPrices(service: string = "fb"): Promise<{
  success: boolean;
  prices?: Record<string, unknown>;
  error?: string;
}> {
  const result = await callAPI("getPrices", {
    service,
  });

  if (!result.success || !result.raw) {
    return { success: false, error: result.error || "Unknown error" };
  }

  const parsedJson = parseJsonIfPossible(result.raw);
  if (parsedJson) {
    return { success: true, prices: parsedJson };
  }

  return { success: true, prices: { raw: result.raw } };
}
