import type { SearchProvider, SearchResult } from "@/types";

/** A stored topic search, owned by a user id or a guest id. */
export interface SearchQueryDoc {
  ownerId: string;
  query: string;
  source: SearchProvider;
  results: SearchResult;
  createdAt: Date;
}

/** A curated / trending topic. */
export interface TopicDoc {
  name: string;
  category: string;
  description?: string;
  searchCount: number;
  createdAt: Date;
}
