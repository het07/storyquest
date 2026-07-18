import { MongoClient, ServerApiVersion, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "storyquest";

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
};

export function isMongoConfigured() {
  return !!uri;
}

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  // Not configured: create a rejected promise but swallow the unhandled
  // rejection so the app can still build/run (auth & DB features degrade).
  clientPromise = Promise.reject(
    new Error("MONGODB_URI is not set. Add it to .env.local to enable the database.")
  );
  clientPromise.catch(() => {});
} else if (process.env.NODE_ENV === "development") {
  // Reuse the connection across HMR reloads in development.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export default clientPromise;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
