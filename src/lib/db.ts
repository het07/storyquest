import { getDb } from "@/lib/mongodb";
import type {
  ArenaMatchDoc,
  ArenaRatingDoc,
  QuestionPackDoc,
  QuizAttemptDoc,
  SearchQueryDoc,
  TopicDoc,
} from "@/types/db";

/** Typed accessors for the app's MongoDB collections. */
export async function collections() {
  const db = await getDb();
  return {
    searchQueries: db.collection<SearchQueryDoc>("searchQueries"),
    topics: db.collection<TopicDoc>("topics"),
    quizAttempts: db.collection<QuizAttemptDoc>("quizAttempts"),
    questionPacks: db.collection<QuestionPackDoc>("questionPacks"),
    arenaMatches: db.collection<ArenaMatchDoc>("arenaMatches"),
    arenaRatings: db.collection<ArenaRatingDoc>("arenaRatings"),
  };
}
