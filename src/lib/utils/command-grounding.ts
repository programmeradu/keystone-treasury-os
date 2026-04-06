export type EvidenceClass = "conversational" | "tool_required" | "navigation_required" | "db_required";

export type GroundingGateResult =
  | { allowed: true }
  | { allowed: false; reason: string; fallbackText: string };

const CONVERSATION_PATTERNS = [
  /^(hi|hello|hey|yo|greetings)/i,
  /^(thanks|thank you|ty|thx)/i,
  /^(yes|no|yep|nope|sure|ok|okay)/i,
  /^(how are you|hows it going)/i,
  /^(bye|goodbye|see ya)/i,
  /^(help|what can you do)/i,
  /^what is keystone/i,
];

export function isSimpleConversation(text: string): boolean {
  if (text.length > 100) return false;
  return CONVERSATION_PATTERNS.some((p) => p.test(text.trim()));
}

const NAVIGATION_ROUTE_ALLOWLIST = new Set([
  "/app",
  "/app/treasury",
  "/app/analytics",
  "/app/studio",
  "/app/marketplace",
  "/app/library",
  "/app/team",
  "/app/settings",
  "/app/atlas",
]);

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
  if (evidenceClass === "conversational") return { allowed: true };
  if (evidenceClass === "tool_required") return { allowed: true };

  if (evidenceClass === "navigation_required" && !observed.navigationSuccess) {
    return {
      allowed: false,
      reason: "Navigation path unverified",
      fallbackText: "I couldn't verify the exact route for that. Could you provide a bit more context?",
    };
  }

  if (evidenceClass === "db_required" && !observed.lookupSuccess) {
    return {
      allowed: false,
      reason: "DB context unverified",
      fallbackText: "I couldn't find a saved app or matching database record for that. Are you sure it's correct?",
    };
  }

  return { allowed: true };
}
