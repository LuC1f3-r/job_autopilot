import { getAnthropicClient, isAnthropicConfigured } from "@/lib/anthropic";
import { getOpenRouterClient, isOpenRouterConfigured } from "@/lib/openrouter";

export class NoAiProviderConfiguredError extends Error {
  constructor() {
    super("No AI provider is configured (set ANTHROPIC_API_KEY or OPENROUTER_API_KEY)");
    this.name = "NoAiProviderConfiguredError";
  }
}

// Matches the OpenAI/OpenRouter response_format.json_schema shape already
// used by lib/resume-extraction-schema.ts, since that's what most callers
// already have on hand — Anthropic's Tool.input_schema accepts the same
// plain JSON Schema object.
type NamedJsonSchema = {
  name: string;
  schema: Record<string, unknown>;
};

// Free-tier OpenRouter models that support structured_outputs
// (response_format: json_schema), used as the fallback path while an
// Anthropic key isn't funded. Free models share a rate-limited upstream
// pool, so a single model can return 429s under load — tried in order,
// falling through to the next on a rate limit. Ordered by observed
// reliability/latency, not just capability: z-ai/glm-5.2:free is frequently
// congested (its 429s alone can take 10+ seconds to arrive), which risks
// exhausting the request's time budget before a later model in the list
// ever gets a turn — so it's tried last, not first. Swap to a paid model
// (or make this configurable) once real usage volume needs it.
const OPENROUTER_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "dots-studio/dots-3-note-preview:free",
  "z-ai/glm-5.2:free",
];

const PER_MODEL_TIMEOUT_MS = 20_000;

// Provider-agnostic structured extraction: picks Anthropic (if configured)
// over OpenRouter (fallback), and returns the same parsed JSON shape either
// way. Callers don't need to know which provider actually ran.
//
// Anthropic has no response_format.json_schema equivalent — the reliable way
// to get guaranteed-shape JSON out of Claude is forced tool-use: define the
// schema as a single tool and force tool_choice so the model must call it,
// then read the JSON straight out of the tool_use block's `input`.
export async function extractStructuredData<T>(
  text: string,
  jsonSchema: NamedJsonSchema,
  systemPrompt: string
): Promise<T> {
  if (isAnthropicConfigured()) {
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
    if (!toolUse) {
      throw new Error("Anthropic response did not include the expected tool call");
    }
    return toolUse.input as T;
  }

  if (isOpenRouterConfigured()) {
    const client = getOpenRouterClient();

    let lastError: unknown;
    for (const model of OPENROUTER_MODELS) {
      try {
        const completion = await client.chat.completions.create(
          {
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: text },
            ],
            response_format: {
              type: "json_schema",
              json_schema: jsonSchema,
            },
          },
          // Caps how long a single congested free model can hold up the
          // whole retry chain — a slow model (observed: 10+ seconds just to
          // return a 429 under load) can otherwise burn through the route's
          // entire time budget before a later, working model gets a turn.
          // maxRetries: 0 because our own model-to-model loop is already
          // the retry strategy — letting the SDK also retry the same
          // congested model internally (default: 2 retries) would multiply
          // the worst-case wait instead of moving on to the next model.
          { timeout: PER_MODEL_TIMEOUT_MS, maxRetries: 0 }
        );

        // OpenRouter can return a 200-range response whose body doesn't
        // actually match the chat-completion shape (e.g. an error object
        // with no `choices` at all) — guard the whole chain with optional
        // chaining rather than assuming `completion.choices` exists, so a
        // malformed response throws our own clean "empty response" error
        // instead of an unhandled TypeError crashing the request.
        const raw = completion?.choices?.[0]?.message?.content;
        if (!raw) {
          throw new Error("Empty or malformed response from model");
        }
        return JSON.parse(raw) as T;
      } catch (error) {
        // Any failure on one free model — rate-limited, malformed response,
        // a JSON.parse failure, or a hung/slow request — falls through to
        // the next model in the list rather than aborting the whole chain.
        // Only the last model's failure actually propagates (below).
        lastError = error;
        continue;
      }
    }
    throw lastError;
  }

  throw new NoAiProviderConfiguredError();
}

// Type-only import kept at the bottom so the Anthropic namespace is
// available for the InputSchema cast above without adding an unused runtime
// import when Anthropic isn't configured at all.
import type Anthropic from "@anthropic-ai/sdk";
