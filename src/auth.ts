import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";

import clientPromise, { isMongoConfigured } from "@/lib/mongodb";

const dbName = process.env.MONGODB_DB || "storyquest";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: isMongoConfigured()
    ? MongoDBAdapter(clientPromise, { databaseName: dbName })
    : undefined,
  providers: [Google],
  trustHost: true,
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
