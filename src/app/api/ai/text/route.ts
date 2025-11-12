import { NextRequest } from "next/server";
import OpenAI from "openai";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string | undefined = body?.prompt;
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Missing 'prompt' string in body" }, { status: 400 });
    }
    const provider = (String(body?.provider || "puter").toLowerCase()) as "puter" | "pollinations" | "nlpcloud" | "github" | "groq";
    const temperature = Number.isFinite(body?.temperature) ? Math.max(0, Math.min(2, Number(body.temperature))) : 0.9;
    const seed = Number.isFinite(body?.seed) ? Math.floor(Number(body.seed)) : Math.floor(Math.random() * 1e9);
    const model = typeof body?.model === "string" ? body.model : undefined;
    const stream = body?.stream === true;
    const maxTokens = Number.isFinite(body?.max_completion_tokens)
      ? Math.max(1, Math.min(8192, Number(body.max_completion_tokens)))
      : (Number.isFinite(body?.max_tokens) ? Math.max(1, Math.min(8192, Number(body.max_tokens))) : 1000);

    // Explicit provider handling (no implicit fallbacks)
    if (provider === "puter") {
      const configuredPuterUrl = process.env.PUTER_BASE_URL || ""; // optional override
      const puterUrl = configuredPuterUrl || "https://api.puter.com/ai/text";
      const apiKey = process.env.PUTER_API_KEY || process.env.NEXT_PUBLIC_PUTER_API_KEY || ""; // optional
      const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "ChainFlow/AI Text API" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const payload: Record<string, any> = { prompt, input: prompt, temperature, seed };
      if (model) payload.model = model;

      const puterRes = await fetch(puterUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!puterRes.ok) {
        const t = await puterRes.text().catch(() => "");
        return Response.json({ error: "Puter error", status: puterRes.status, details: t || puterRes.statusText }, { status: puterRes.status });
      }

      // Handle various response shapes safely (JSON or text)
      const ct = puterRes.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data: any = await puterRes.json().catch(() => ({}));
        const text =
          typeof data === "string"
            ? data
            : data.text ||
              data.output ||
              data.response ||
              (Array.isArray(data?.choices) && (data.choices[0]?.text || data.choices[0]?.message?.content)) ||
              JSON.stringify(data);
        return Response.json({ provider: "puter", text });
      } else {
        const raw = await puterRes.text().catch(() => "");
        return Response.json({ provider: "puter", text: raw });
      }
    }

    if (provider === "pollinations") {
      const base = "https://text.pollinations.ai";
      const qs = new URLSearchParams({ seed: String(seed), temperature: String(temperature) });
      if (model) qs.set("model", model);
      const url = `${base}/${encodeURIComponent(prompt)}?${qs.toString()}`;
      const pollRes = await fetch(url, { cache: "no-store", headers: { Accept: "text/plain", "User-Agent": "ChainFlow/AI Text API" } });
      if (!pollRes.ok) {
        const t = await pollRes.text().catch(() => "");
        return Response.json({ error: "Pollinations error", status: pollRes.status, details: t || pollRes.statusText }, { status: pollRes.status });
      }
      let text = await pollRes.text();
      // Some Pollinations endpoints return a JSON-encoded string; normalize it
      try {
        const maybe = JSON.parse(text);
        if (typeof maybe === "string") text = maybe;
      } catch {}
      // Trim surrounding quotes if present
      text = text.replace(/^"|"$/g, "");
      return Response.json({ provider: "pollinations", text });
    }

    // NEW: NLP Cloud
    if (provider === "nlpcloud") {
      const key = process.env.NLPCLOUD_API_KEY || "";
      if (!key) {
        return Response.json({ error: "Missing NLPCLOUD_API_KEY on server" }, { status: 500 });
      }
      // Allow model override from body or env; pick a sensible default
      const mdl = model || process.env.NLPCLOUD_MODEL || "chatdolphin"; // generic text generation
      // Determine GPU need: respect body/env, else infer from model name (llama/dolphin/mixtral/chatdolphin are GPU-only on NLP Cloud)
      const providedGpu = typeof body?.useGpu === "boolean" ? body.useGpu : undefined;
      const envGpu = process.env.NLPCLOUD_USE_GPU === "true" ? true : (process.env.NLPCLOUD_USE_GPU === "false" ? false : undefined);
      const inferGpu = /llama|dolphin|mixtral|chatdolphin/i.test(mdl);
      const useGpu = (providedGpu ?? envGpu ?? inferGpu);
      const base = useGpu ? "https://api.nlpcloud.io/v1/gpu" : "https://api.nlpcloud.io/v1";
      const url = `${base}/${encodeURIComponent(mdl)}/generation`;
      const payload: Record<string, any> = {
        text: prompt,
        temperature,
      };
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${key}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return Response.json(
          { error: "NLP Cloud error", status: res.status, details: t || res.statusText, model: mdl, gpu: useGpu },
          { status: res.status }
        );
      }
      const data: any = await res.json().catch(() => ({}));
      const text =
        data?.generated_text ||
        (Array.isArray(data?.generated_text) ? data.generated_text[0] : undefined) ||
        data?.text ||
        (Array.isArray(data?.choices) && (data.choices[0]?.text || data.choices[0]?.message?.content)) ||
        JSON.stringify(data);
      return Response.json({ provider: "nlpcloud", model: mdl, gpu: useGpu, text });
    }

    // NEW: GitHub Models via OpenAI SDK
    if (provider === "github") {
      const token = process.env.GITHUB_TOKEN || "";
      if (!token) {
        return Response.json({ error: "Missing GITHUB_TOKEN on server" }, { status: 500 });
      }
      const mdl = model || "gpt-4";
      try {
        // Use the official GitHub Models Azure Inference base URL
        const client = new OpenAI({ baseURL: "https://models.inference.ai.azure.com", apiKey: token });
        if (stream) {
          const chat = await client.chat.completions.create({
            model: mdl,
            temperature,
            max_tokens: maxTokens,
            stream: true,
            messages: [
              { role: "system", content: "You are a helpful assistant for ChainFlow Oracle." },
              { role: "user", content: prompt },
            ],
          });

          const rs = new ReadableStream<Uint8Array>({
            async start(controller) {
              const encoder = new TextEncoder();
              try {
                for await (const chunk of chat as any) {
                  const delta = chunk?.choices?.[0]?.delta?.content || "";
                  if (delta) controller.enqueue(encoder.encode(delta));
                }
              } catch (e) {
                controller.error(e);
                return;
              }
              controller.close();
            },
          });

          return new Response(rs, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
            },
          });
        }

        const resp = await client.chat.completions.create({
          model: mdl,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: "You are a helpful assistant for ChainFlow Oracle." },
            { role: "user", content: prompt },
          ],
        });
        const text = resp?.choices?.[0]?.message?.content || "";
        return Response.json({ provider: "github", model: mdl, text });
      } catch (e: any) {
        return Response.json({ error: "GitHub Models error", details: String(e?.message || e) }, { status: 500 });
      }
    }

    // NEW: Groq
    if (provider === "groq") {
      const key = process.env.GROQ_API_KEY || "";
      if (!key) {
        return Response.json({ error: "Missing GROQ_API_KEY on server" }, { status: 500 });
      }
      const mdl = model || "openai/gpt-oss-20b";
      try {
        const groq = new Groq({ apiKey: key });
        if (stream) {
          const chat = await groq.chat.completions.create({
            model: mdl,
            temperature,
            max_completion_tokens: maxTokens,
            top_p: Number.isFinite(body?.top_p) ? Number(body.top_p) : 1,
            reasoning_effort: typeof body?.reasoning_effort === "string" ? body.reasoning_effort : undefined,
            stop: body?.stop ?? null,
            stream: true,
            messages: [
              { role: "system", content: "You are a helpful assistant for ChainFlow Oracle." },
              { role: "user", content: prompt },
            ],
          });

          const rs = new ReadableStream<Uint8Array>({
            async start(controller) {
              const encoder = new TextEncoder();
              try {
                for await (const chunk of chat as any) {
                  const delta = chunk?.choices?.[0]?.delta?.content || "";
                  if (delta) controller.enqueue(encoder.encode(delta));
                }
              } catch (e) {
                controller.error(e);
                return;
              }
              controller.close();
            },
          });

          return new Response(rs, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
            },
          });
        }

        const resp = await groq.chat.completions.create({
          model: mdl,
          temperature,
          max_completion_tokens: maxTokens,
          top_p: Number.isFinite(body?.top_p) ? Number(body.top_p) : 1,
          reasoning_effort: typeof body?.reasoning_effort === "string" ? body.reasoning_effort : undefined,
          stop: body?.stop ?? null,
          messages: [
            { role: "system", content: "You are a helpful assistant for ChainFlow Oracle." },
            { role: "user", content: prompt },
          ],
        });
        const text = resp?.choices?.[0]?.message?.content || "";
        return Response.json({ provider: "groq", model: mdl, text });
      } catch (e: any) {
        return Response.json({ error: "Groq error", details: String(e?.message || e) }, { status: 500 });
      }
    }

    // Unsupported provider
    return Response.json({ error: `Unsupported provider '${provider}'` }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: "AI service failed", details: String(err?.message || err) }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    message: "POST { prompt, provider: 'puter'|'pollinations'|'nlpcloud'|'github'|'groq', temperature?, seed?, model?, useGpu?, stream?, max_completion_tokens?, top_p?, reasoning_effort?, stop? }",
  });
}