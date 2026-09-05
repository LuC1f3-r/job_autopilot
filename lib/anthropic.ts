import Anthropic from "@anthropic-ai/sdk";

// Server-side Anthropic client. The key is not required at import time —
// callers should call getAnthropicClient() inside a try/catch (or check
// isAnthropicConfigured() first) so a missing key fails gracefully instead
// of crashing the module.

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
    this.name = "AnthropicNotConfiguredError";
  }
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AnthropicNotConfiguredError();
  }

  // Anthropic() also reads ANTHROPIC_API_KEY itself if apiKey is omitted,
  // but passing it explicitly keeps this in sync with isAnthropicConfigured().
  return new Anthropic({ apiKey });
}
