export type EvidenceClass = "conversational" | "navigation_required" | "db_required" | "tool_required";

export type GroundingGateResult = {
  allowed: boolean;
  blockedReason?: string;
};

const NAVIGATION_ROUTE_ALLOWLIST = new Set([
  "/app",
  "/app/treasury",
  "/app/transactions",
  "/app/dca",
  "/app/studio",
  "/app/yield",
  "/app/settings",
  "/app/atlas",
]);

export function isSimpleConversation(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(hi|hello|hey|greetings|gm|gn|thanks|thank you|ok|okay|cool|awesome|bye|goodbye)$/i.test(t);
}

export function classifyEvidenceNeed(userText: string): EvidenceClass {
  const t = userText.trim().toLowerCase();
  if (!t || isSimpleConversation(t)) return "conversational";
  if (/\b(navigate|open|go to|redirect)\b/.test(t)) return "navigation_required";
  if (/\b(database|db|saved|stored|link|url|appid|project id)\b/.test(t)) return "db_required";
  return "tool_required";
}

export function validateNavigationPath(path: string):
  | { success: true; pathname: string; query: Record<string, string> }
  | { success: false; code: "INVALID_ROUTE"; reason: string } {
  if (!path || typeof path !== "string") {
    return { success: false, code: "INVALID_ROUTE", reason: "Path must be a non-empty string." };
  }
  const raw = path.trim();
  if (!raw.startsWith("/")) {
    return { success: false, code: "INVALID_ROUTE", reason: "Path must be a relative path." };
  }
  let parsed: URL;
  try {
    parsed = new URL(raw, "https://keystone.local");
  } catch {
    return { success: false, code: "INVALID_ROUTE", reason: "Path is not a valid route." };
  }
  const pathname =
    parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname;
  if (!NAVIGATION_ROUTE_ALLOWLIST.has(pathname)) {
    return { success: false, code: "INVALID_ROUTE", reason: `Route not allowed: ${pathname}` };
  }
  const query: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  if (pathname !== "/app/studio" && Object.keys(query).length > 0) {
    return { success: false, code: "INVALID_ROUTE", reason: "Query params only allowed on /app/studio." };
  }
  if (pathname === "/app/studio") {
    const keys = Object.keys(query);
    if (keys.some((k) => k !== "appId")) {
      return { success: false, code: "INVALID_ROUTE", reason: "Only appId query is allowed on /app/studio." };
    }
    if ("appId" in query && !query.appId.trim()) {
      return { success: false, code: "INVALID_ROUTE", reason: "appId cannot be empty." };
    }
  }
  return { success: true, pathname, query };
}

export function estimateMessageChars(messages: any[]): number {
  try {
    return JSON.stringify(messages).length;
  } catch {
    return 0;
  }
}

export function buildBudgetedMessagesWithCap(formattedMessages: any[], maxChars: number): { messages: any[]; reduced: boolean } {
  if (!Array.isArray(formattedMessages)) return { messages: [], reduced: true };
  if (estimateMessageChars(formattedMessages) <= maxChars) {
    return { messages: formattedMessages, reduced: false };
  }
  const summary = {
    role: "system",
    content:
      "Conversation history condensed to fit model context limits. Prioritize latest user intent and recent verified tool outputs.",
  };
  const reduced = [summary, ...formattedMessages.slice(-10)];
  return { messages: reduced, reduced: true };
}

export function evaluateGroundingGate(
  evidenceClass: EvidenceClass,
  observed: { lookupSuccess: boolean; navigationSuccess: boolean },
): GroundingGateResult {
  if (evidenceClass === "db_required" && !observed.lookupSuccess) {
    return { allowed: false, blockedReason: "DB-backed lookup evidence missing." };
  }
  if (evidenceClass === "navigation_required" && !observed.navigationSuccess) {
    return { allowed: false, blockedReason: "Navigation verification missing." };
  }
  return { allowed: true };
}
