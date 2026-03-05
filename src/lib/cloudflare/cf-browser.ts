/**
 * Cloudflare Browser Rendering — Shared Client Library.
 *
 * Wraps all CF Browser Rendering REST API endpoints:
 * - screenshot: URL/HTML → PNG/JPEG
 * - pdf: URL/HTML → PDF buffer
 * - json: URL + prompt → structured JSON (AI-powered)
 * - markdown: URL → clean markdown text
 * - snapshot: URL → full rendered HTML snapshot
 * - content: URL → raw HTML
 * - scrape: URL + selectors → extracted elements
 * - links: URL → all links on the page
 *
 * Auth: reuses CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN env vars.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface CFBrowserConfig {
    accountId: string;
    apiToken: string;
}

export interface ScreenshotOptions {
    /** URL to screenshot (provide url OR html, not both) */
    url?: string;
    /** Raw HTML to render and screenshot */
    html?: string;
    /** Viewport width (default: 1920) */
    viewportWidth?: number;
    /** Viewport height (default: 1080) */
    viewportHeight?: number;
    /** Screenshot options */
    screenshotOptions?: {
        type?: "png" | "jpeg" | "webp";
        quality?: number;
        fullPage?: boolean;
        omitBackground?: boolean;
        clip?: { x: number; y: number; width: number; height: number };
    };
    /** CSS selector to screenshot a specific element */
    selector?: string;
    /** Wait for selector before capturing */
    waitForSelector?: string;
    /** Custom CSS to inject */
    addStyleTag?: { content: string }[];
    /** Wait time in ms after page load */
    waitForTimeout?: number;
}

export interface PdfOptions {
    url?: string;
    html?: string;
    viewportWidth?: number;
    viewportHeight?: number;
    pdfOptions?: {
        format?: "A4" | "Letter" | "Legal" | "Tabloid" | "A3" | "A5";
        landscape?: boolean;
        printBackground?: boolean;
        margin?: { top?: string; bottom?: string; left?: string; right?: string };
        headerTemplate?: string;
        footerTemplate?: string;
        displayHeaderFooter?: boolean;
        scale?: number;
    };
    waitForSelector?: string;
    waitForTimeout?: number;
    addStyleTag?: { content: string }[];
}

export interface JsonExtractOptions {
    url?: string;
    html?: string;
    /** Natural language prompt for AI extraction */
    prompt: string;
    /** JSON schema defining expected output structure */
    response_format?: {
        type: "json_schema";
        schema: Record<string, any>;
    };
    waitForSelector?: string;
    waitForTimeout?: number;
}

export interface MarkdownOptions {
    url: string;
    waitForSelector?: string;
    waitForTimeout?: number;
}

export interface SnapshotOptions {
    url: string;
    waitForSelector?: string;
    waitForTimeout?: number;
}

export interface ScrapeOptions {
    url?: string;
    html?: string;
    /** CSS selectors to extract elements */
    elements: { selector: string }[];
    waitForSelector?: string;
    waitForTimeout?: number;
}

export interface LinksOptions {
    url: string;
    waitForSelector?: string;
    waitForTimeout?: number;
}

// ─── Client ─────────────────────────────────────────────────────────

function getConfig(): CFBrowserConfig {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_AI_TOKEN;

    if (!accountId || !apiToken) {
        throw new Error(
            "Cloudflare Browser Rendering not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN."
        );
    }

    return { accountId, apiToken };
}

function baseUrl(config: CFBrowserConfig): string {
    return `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/browser-rendering`;
}

function headers(config: CFBrowserConfig): Record<string, string> {
    return {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
    };
}

async function cfFetch(
    endpoint: string,
    body: Record<string, any>,
    expectBinary = false
): Promise<any> {
    const config = getConfig();
    const url = `${baseUrl(config)}/${endpoint}`;

    const res = await fetch(url, {
        method: "POST",
        headers: headers(config),
        body: JSON.stringify({
            ...body,
            // Set default viewport if not provided
            viewport: body.viewport || {
                width: body.viewportWidth || 1920,
                height: body.viewportHeight || 1080,
            },
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`CF Browser Rendering /${endpoint} error (${res.status}): ${errText.slice(0, 300)}`);
    }

    if (expectBinary) {
        return res.arrayBuffer();
    }

    // Try JSON first, fall back to text
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return res.json();
    }
    return res.text();
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Capture a screenshot of a URL or rendered HTML.
 * Returns raw image binary (ArrayBuffer).
 */
export async function screenshot(opts: ScreenshotOptions): Promise<ArrayBuffer> {
    const body: Record<string, any> = {};

    if (opts.url) body.url = opts.url;
    if (opts.html) body.html = opts.html;
    if (opts.screenshotOptions) body.screenshotOptions = opts.screenshotOptions;
    if (opts.selector) body.selector = opts.selector;
    if (opts.waitForSelector) body.gotoOptions = { ...body.gotoOptions, waitUntil: "networkidle0" };
    if (opts.waitForTimeout) body.waitForTimeout = opts.waitForTimeout;
    if (opts.addStyleTag) body.addStyleTag = opts.addStyleTag;
    if (opts.viewportWidth || opts.viewportHeight) {
        body.viewport = { width: opts.viewportWidth || 1920, height: opts.viewportHeight || 1080 };
    }

    return cfFetch("screenshot", body, true);
}

/**
 * Generate a PDF from a URL or rendered HTML.
 * Returns raw PDF binary (ArrayBuffer).
 */
export async function pdf(opts: PdfOptions): Promise<ArrayBuffer> {
    const body: Record<string, any> = {};

    if (opts.url) body.url = opts.url;
    if (opts.html) body.html = opts.html;
    if (opts.pdfOptions) body.pdfOptions = opts.pdfOptions;
    if (opts.waitForSelector) body.gotoOptions = { ...body.gotoOptions, waitUntil: "networkidle0" };
    if (opts.waitForTimeout) body.waitForTimeout = opts.waitForTimeout;
    if (opts.addStyleTag) body.addStyleTag = opts.addStyleTag;

    return cfFetch("pdf", body, true);
}

/**
 * Extract structured data from a webpage using AI.
 * Returns parsed JSON matching the provided schema.
 */
export async function jsonExtract(opts: JsonExtractOptions): Promise<{ success: boolean; result: any }> {
    const body: Record<string, any> = {
        prompt: opts.prompt,
    };

    if (opts.url) body.url = opts.url;
    if (opts.html) body.html = opts.html;

    // CF /json requires a response_format — provide a sensible default
    body.response_format = opts.response_format || {
        type: "json_schema",
        schema: {
            type: "object",
            properties: {
                title: { type: "string", description: "Title or name of the page/entity" },
                description: { type: "string", description: "Brief description or summary" },
                data: { type: "object", description: "Extracted structured data", additionalProperties: true },
            },
        },
    };

    if (opts.waitForSelector) body.waitForSelector = opts.waitForSelector;
    if (opts.waitForTimeout) body.waitForTimeout = opts.waitForTimeout;

    return cfFetch("json", body);
}

/**
 * Convert a webpage to clean markdown.
 */
export async function markdown(opts: MarkdownOptions): Promise<string> {
    const body: Record<string, any> = { url: opts.url };
    if (opts.waitForSelector) body.waitForSelector = opts.waitForSelector;
    if (opts.waitForTimeout) body.waitForTimeout = opts.waitForTimeout;

    return cfFetch("markdown", body);
}

/**
 * Capture a full DOM snapshot of a rendered page.
 */
export async function snapshot(opts: SnapshotOptions): Promise<string> {
    const body: Record<string, any> = { url: opts.url };
    if (opts.waitForSelector) body.waitForSelector = opts.waitForSelector;
    if (opts.waitForTimeout) body.waitForTimeout = opts.waitForTimeout;

    return cfFetch("snapshot", body);
}

/**
 * Scrape specific elements from a page using CSS selectors.
 */
export async function scrape(opts: ScrapeOptions): Promise<any> {
    const body: Record<string, any> = { elements: opts.elements };
    if (opts.url) body.url = opts.url;
    if (opts.html) body.html = opts.html;
    if (opts.waitForSelector) body.waitForSelector = opts.waitForSelector;
    if (opts.waitForTimeout) body.waitForTimeout = opts.waitForTimeout;

    return cfFetch("scrape", body);
}

/**
 * Extract all links from a webpage.
 */
export async function links(opts: LinksOptions): Promise<any> {
    const body: Record<string, any> = { url: opts.url };
    if (opts.waitForSelector) body.waitForSelector = opts.waitForSelector;
    if (opts.waitForTimeout) body.waitForTimeout = opts.waitForTimeout;

    return cfFetch("links", body);
}
