// Server-side Browserbase/Stagehand config. Feature 13 (Company Research
// Agent) is the only caller — Stagehand drives a single Browserbase
// session per research request (homepage + up to 3 sub-pages).
//
// The key is not required at import time — callers should check
// isBrowserbaseConfigured() first so a missing key fails gracefully instead
// of crashing the module.

import type OpenAI from "openai";
import type { ClientLLM } from "@browserbasehq/stagehand";
import { getOpenRouterClient, isOpenRouterConfigured } from "@/lib/openrouter";

export function isBrowserbaseConfigured(): boolean {
  return Boolean(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID);
}

// Stagehand v4's own act()/extract() calls need an LLM binding distinct from
// our synthesis step (lib/ai-extraction.ts). Stagehand 4.x's `model.modelName`
// is a closed union of provider/model strings (openai/*, anthropic/*,
// google/*, ...), each resolved by that provider's own key — there's no
// baseURL/custom-client override to point the built-in `model` config at
// OpenRouter, and no ANTHROPIC_API_KEY is actually configured in this app
// (isAnthropicConfigured() only gracefully skips Tier 1 in
// extractStructuredData(); it doesn't mean a key exists to hand Stagehand).
//
// Stagehand 4.x's `model` field also accepts a `ClientLLM` — a plain
// `generate(params) => Promise<LLMGenerateResult>` function — as an escape
// hatch for exactly this case. This adapter implements that contract on top
// of the existing OpenRouter client, so Stagehand's browser actions reuse
// the same provider (and free-tier model rotation) as every other AI call
// in this app instead of requiring a new key.
const STAGEHAND_OPENROUTER_MODELS = [
  "z-ai/glm-5.2",
  "openrouter/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "dots-studio/dots-3-note-preview:free",
];

// Params/result types come straight from Stagehand's own ClientLLM contract
// rather than a hand-rolled guess, so this adapter is checked against the
// real schema (its content blocks can also be image/tool_use/tool_result,
// which this adapter never needs to produce — Stagehand only ever asks us
// to reason over text for act()/extract()). flattenContent defensively
// picks out text blocks at runtime.
type LLMGenerateParams = Parameters<ClientLLM["generate"]>[0];
type LLMGenerateResult = Awaited<ReturnType<ClientLLM["generate"]>>;

function flattenContent(content: unknown): string {
  const blocks = Array.isArray(content) ? content : [content];
  return blocks
    .filter(
      (block): block is { type: "text"; text: string } =>
        Boolean(block) && typeof block === "object" && (block as { type?: unknown }).type === "text"
    )
    .map((block) => block.text)
    .join("\n");
}

async function openRouterGenerate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
  const client: OpenAI = getOpenRouterClient();
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...(params.systemPrompt ? [{ role: "system" as const, content: params.systemPrompt }] : []),
    ...params.messages.map((message) => ({
      role: message.role,
      content: flattenContent(message.content),
    })),
  ];

  const jsonSchemaFormat =
    params.responseFormat?.type === "json_schema" ? params.responseFormat : undefined;

  let lastError: unknown;
  for (const model of STAGEHAND_OPENROUTER_MODELS) {
    try {
      const completion = await client.chat.completions.create(
        {
          model,
          max_tokens: 2048,
          temperature: params.temperature,
          messages,
          ...(jsonSchemaFormat
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: jsonSchemaFormat.name,
                    schema: jsonSchemaFormat.schema as Record<string, unknown>,
                  },
                },
              }
            : {}),
        },
        { timeout: 20_000, maxRetries: 0 }
      );

      const raw = completion?.choices?.[0]?.message?.content;
      if (!raw) throw new Error("Empty or malformed response from model");

      if (jsonSchemaFormat) {
        const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        let parsed: unknown;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Failed to parse JSON from LLM response");
          }
        }

        // Stagehand's worker validates structuredContent against an object schema;
        // if an LLM returns null, an array, or a primitive, throw to try the next model.
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("LLM response for json_schema is not a valid JSON object");
        }

        type StructuredResult = Extract<LLMGenerateResult, { outputFormat: "json_schema" }>;
        return {
          role: "assistant",
          content: { type: "text", text: raw },
          outputFormat: "json_schema",
          structuredContent: parsed as unknown as StructuredResult["structuredContent"],
        };
      }

      return {
        role: "assistant",
        content: { type: "text", text: raw },
        outputFormat: "text",
      };
    } catch (error) {
      lastError = error;
      continue;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All OpenRouter models failed for Stagehand");
}

export function isStagehandModelConfigured(): boolean {
  return isOpenRouterConfigured();
}

export function getStagehandModelConfig(): ClientLLM {
  return { generate: openRouterGenerate };
}
