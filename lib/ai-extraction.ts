import { getAnthropicClient, isAnthropicConfigured } from "@/lib/anthropic";
import { getOpenRouterClient, isOpenRouterConfigured } from "@/lib/openrouter";
import { getTinyFishClient, isTinyFishConfigured } from "@/lib/tinyfish";

export class NoAiProviderConfiguredError extends Error {
  constructor() {
    super("No AI provider is configured (set ANTHROPIC_API_KEY, OPENROUTER_API_KEY, or TINYFISH_API_KEY)");
    this.name = "NoAiProviderConfiguredError";
  }
}

export function isAnyAiConfigured(): boolean {
  return isAnthropicConfigured() || isOpenRouterConfigured() || isTinyFishConfigured();
}

// Matches the OpenAI/OpenRouter response_format.json_schema shape already
// used by lib/resume-extraction-schema.ts, since that's what most callers
// already have on hand — Anthropic's Tool.input_schema accepts the same
// plain JSON Schema object.
type NamedJsonSchema = {
  name: string;
  schema: Record<string, unknown>;
};

// Recursively strips JSON schema fields unsupported by TinyFish agent output_schema
// (e.g. additionalProperties, $schema, strict)
function cleanSchemaForTinyFish(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(cleanSchemaForTinyFish);
  if (obj !== null && typeof obj === "object") {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k === "additionalProperties" || k === "$schema" || k === "strict") continue;
      res[k] = cleanSchemaForTinyFish(v);
    }
    return res;
  }
  return obj;
}

// Fallback extraction powered by TinyFish cloud agent automation
async function extractWithTinyFish<T>(
  text: string,
  jsonSchema: NamedJsonSchema,
  systemPrompt: string
): Promise<T> {
  const client = getTinyFishClient();
  const goal = `You are an AI data extractor. Follow these instructions:
${systemPrompt}

INPUT DATA TO PROCESS:
${text}

Extract and return structured JSON output strictly conforming to the requested schema.`;

  const cleanedSchema = cleanSchemaForTinyFish(jsonSchema.schema) as Record<string, unknown>;

  const response = await client.agent.run({
    goal,
    url: "https://example.com",
    output_schema: cleanedSchema,
  });

  if (response.status === "COMPLETED" && response.result) {
    return response.result as T;
  }

  throw new Error(
    response.error?.message || "TinyFish automation failed to extract structured data"
  );
}

// Free-tier OpenRouter models that support structured_outputs
// (response_format: json_schema), used as the fallback path while an
// Anthropic key isn't funded. Free models share a rate-limited upstream
// pool, so a single model can return 429s under load — tried in order,
// falling through to the next on a rate limit.
const OPENROUTER_MODELS = [
  "z-ai/glm-5.2",
  "openrouter/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "dots-studio/dots-3-note-preview:free",
];

const PER_MODEL_TIMEOUT_MS = 20_000;

// Provider-agnostic structured extraction with multi-tier fallback:
// 1. Anthropic Claude (if configured)
// 2. OpenRouter free/paid models (if configured)
// 3. TinyFish Agent (if configured, or when Anthropic & OpenRouter fail/rate limit)
export async function extractStructuredData<T>(
  text: string,
  jsonSchema: NamedJsonSchema,
  systemPrompt: string
): Promise<T> {
  let lastError: unknown;

  // Tier 1: Anthropic
  if (isAnthropicConfigured()) {
    try {
      const client = getAnthropicClient();
      const message = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: text }],
        tools: [
          {
            name: jsonSchema.name,
            input_schema: jsonSchema.schema as Anthropic.Messages.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: jsonSchema.name },
      });

      const toolUse = message.content.find(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use"
      );
      if (toolUse) {
        return toolUse.input as T;
      }
      throw new Error("Anthropic response did not include the expected tool call");
    } catch (error) {
      console.warn("[ai-extraction] Anthropic failed, attempting fallback:", error);
      lastError = error;
    }
  }

  // Tier 2: OpenRouter
  if (isOpenRouterConfigured()) {
    const client = getOpenRouterClient();

    for (const model of OPENROUTER_MODELS) {
      try {
        const completion = await client.chat.completions.create(
          {
            model,
            max_tokens: 2048,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: text },
            ],
            response_format: {
              type: "json_schema",
              json_schema: jsonSchema,
            },
          },
          { timeout: PER_MODEL_TIMEOUT_MS, maxRetries: 0 }
        );

        const raw = completion?.choices?.[0]?.message?.content;
        if (!raw) {
          throw new Error("Empty or malformed response from model");
        }
        const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        return JSON.parse(cleaned) as T;
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    console.warn("[ai-extraction] All OpenRouter models failed, attempting fallback:", lastError);
  }

  // Tier 3: TinyFish AI Agent Fallback
  if (isTinyFishConfigured()) {
    try {
      return await extractWithTinyFish<T>(text, jsonSchema, systemPrompt);
    } catch (tinyFishError) {
      console.error("[ai-extraction] TinyFish fallback failed:", tinyFishError);
      lastError = tinyFishError;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new NoAiProviderConfiguredError();
}

// Type-only import kept at the bottom so the Anthropic namespace is
// available for the InputSchema cast above without adding an unused runtime
// import when Anthropic isn't configured at all.
import type Anthropic from "@anthropic-ai/sdk";
