import {
  TinyFish,
  type SearchQueryParams,
  type SearchQueryResponse,
  type FetchGetContentsParams,
  type FetchResponse,
} from "@tiny-fish/sdk";

// Server-side TinyFish client for web search, content fetch, and web agent automation.
// The key is not required at import time — callers should call getTinyFishClient()
// inside a try/catch (or check isTinyFishConfigured() first) so a missing key fails gracefully.

export class TinyFishNotConfiguredError extends Error {
  constructor() {
    super("TINYFISH_API_KEY is not set");
    this.name = "TinyFishNotConfiguredError";
  }
}

export function isTinyFishConfigured(): boolean {
  return Boolean(process.env.TINYFISH_API_KEY);
}

export function getTinyFishClient(): TinyFish {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    throw new TinyFishNotConfiguredError();
  }

  return new TinyFish({
    apiKey,
  });
}

/**
 * Perform a web search using TinyFish Search API.
 */
export async function searchWeb(
  params: SearchQueryParams
): Promise<SearchQueryResponse> {
  const client = getTinyFishClient();
  return client.search.query(params);
}

/**
 * Fetch and extract clean structured content from web pages using TinyFish Fetch API.
 */
export async function fetchContents(
  params: FetchGetContentsParams
): Promise<FetchResponse> {
  const client = getTinyFishClient();
  return client.fetch.getContents(params);
}
