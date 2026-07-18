import { MongoClient } from "mongodb";

import { CURATED_TOPICS } from "../src/lib/topics-data";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local before running the seed."
    );
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB || "storyquest");
    const topics = db.collection("topics");

    await topics.createIndex({ name: 1 }, { unique: true });
    await topics.createIndex({ category: 1 });
    await topics.createIndex({ searchCount: -1 });

    for (const topic of CURATED_TOPICS) {
      await topics.updateOne(
        { name: topic.name },
        {
          $set: {
            category: topic.category,
            description: topic.description,
          },
          $setOnInsert: {
            name: topic.name,
            searchCount: 0,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    const count = await topics.countDocuments();
    console.log(`✓ Seeded topics. Collection now has ${count} documents.`);

    // Helpful indexes for search history queries.
    await db.collection("searchQueries").createIndex({ ownerId: 1, createdAt: -1 });
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
