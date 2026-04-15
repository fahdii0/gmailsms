const API_KEY = process.env.SMSBOWER_API_KEY;
const BASE_URL = "https://smsbower.com/stubs/handler_api.php";

interface SMSBowerResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  raw?: string;
}

async function callAPI(params: Record<string, string>): Promise<SMSBowerResponse> {
  if (!API_KEY) {
    return { success: false, error: "SMSBower API key not configured" };
  }

  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const text = await response.text();

    if (!response.ok) {
      return { success: false, error: `API returned ${response.status}: ${text}` };
    }

    // SMSBower returns different formats depending on the action
    // For getMailActivation: MAIL_ACTIVATION:<mailId>:<email>
    // For getMailCode: FULL_SMS:<mailId>:<code>
    // For errors: plain text error messages
    return { success: true, raw: text };
  } catch (error) {
    return { success: false, error: `API call failed: ${String(error)}` };
  }
}

export async function getActivation(service: string = "google"): Promise<{
  success: boolean;
  mailId?: string;
  email?: string;
  error?: string;
}> {
  const result = await callAPI({
    action: "getMailActivation",
    service,
  });

  if (!result.success || !result.raw) {
    return { success: false, error: result.error || "Unknown error" };
  }

  const raw = result.raw.trim();

  // Parse response: MAIL_ACTIVATION:<mailId>:<email>
  if (raw.startsWith("MAIL_ACTIVATION:")) {
    const parts = raw.split(":");
    if (parts.length >= 3) {
      return {
        success: true,
        mailId: parts[1],
        email: parts.slice(2).join(":"),
      };
    }
  }

  return { success: false, error: raw };
}

export async function getCode(mailId: string): Promise<{
  success: boolean;
  code?: string;
  fullMessage?: string;
  error?: string;
}> {
  const result = await callAPI({
    action: "getMailCode",
    id: mailId,
  });

  if (!result.success || !result.raw) {
    return { success: false, error: result.error || "Unknown error" };
  }

  const raw = result.raw.trim();

  // Parse response: FULL_SMS:<mailId>:<message>
  if (raw.startsWith("FULL_SMS:")) {
    const parts = raw.split(":");
    if (parts.length >= 3) {
      return {
        success: true,
        code: parts.slice(2).join(":"),
        fullMessage: parts.slice(2).join(":"),
      };
    }
  }

  // Could be STATUS_WAIT_CODE meaning no code yet
  if (raw === "STATUS_WAIT_CODE") {
    return { success: false, error: "Waiting for code. Please try again in a few seconds." };
  }

  return { success: false, error: raw };
}

export async function setStatus(
  mailId: string,
  status: "cancel" | "finish"
): Promise<{ success: boolean; error?: string }> {
  const statusMap = { cancel: "8", finish: "6" };

  const result = await callAPI({
    action: "setMailStatus",
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

export async function getPrices(service: string = "google"): Promise<{
  success: boolean;
  prices?: Record<string, unknown>;
  error?: string;
}> {
  const result = await callAPI({
    action: "getMailPrices",
    service,
  });

  if (!result.success || !result.raw) {
    return { success: false, error: result.error || "Unknown error" };
  }

  try {
    const prices = JSON.parse(result.raw);
    return { success: true, prices };
  } catch {
    return { success: true, prices: { raw: result.raw } };
  }
}
