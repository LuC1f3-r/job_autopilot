import OpenAI from "openai";

// Server-side OpenRouter client using the OpenAI SDK's OpenAI-compatible
// interface. Per AGENTS.md, AI integrations call OpenRouter directly with
// baseURL: https://openrouter.ai/api/v1 and a server-side OPENROUTER_API_KEY.
//
// The key is not required at import time — callers should call
// getOpenRouterClient() inside a try/catch (or check isOpenRouterConfigured())
// so a missing key fails gracefully instead of crashing the module.

export class OpenRouterNotConfiguredError extends Error {
  constructor() {
    super("OPENROUTER_API_KEY is not set");
    this.name = "OpenRouterNotConfiguredError";
  }
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function getOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterNotConfiguredError();
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}
