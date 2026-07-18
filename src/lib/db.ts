import { getDb } from "@/lib/mongodb";
import type { SearchQueryDoc, TopicDoc } from "@/types/db";

/** Typed accessors for the app's MongoDB collections. */
export async function collections() {
  const db = await getDb();
  return {
    searchQueries: db.collection<SearchQueryDoc>("searchQueries"),
    topics: db.collection<TopicDoc>("topics"),
  };
}
