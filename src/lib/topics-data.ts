export interface CuratedTopic {
  name: string;
  category: string;
  description: string;
}

export const CATEGORIES = [
  "Science",
  "Technology",
  "History",
  "Space",
  "Health",
  "Art",
  "Philosophy",
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Curated seed topics. Used both to seed the database (`npm run db:seed`) and
 * as an instant, offline fallback for browsing when the DB isn't reachable.
 */
export const CURATED_TOPICS: CuratedTopic[] = [
  // Science
  { name: "Photosynthesis", category: "Science", description: "How plants turn sunlight into energy." },
  { name: "CRISPR Gene Editing", category: "Science", description: "Rewriting DNA with molecular scissors." },
  { name: "The Theory of Evolution", category: "Science", description: "How life adapts and diversifies over time." },
  { name: "Plate Tectonics", category: "Science", description: "Why continents drift and earthquakes happen." },

  // Technology
  { name: "How Neural Networks Learn", category: "Technology", description: "The math behind modern AI." },
  { name: "Quantum Computing", category: "Technology", description: "Computing with qubits and superposition." },
  { name: "How the Internet Works", category: "Technology", description: "From packets to the web you see." },
  { name: "Blockchain Explained", category: "Technology", description: "Trustless ledgers and distributed consensus." },

  // History
  { name: "The French Revolution", category: "History", description: "How France overthrew its monarchy." },
  { name: "The Silk Road", category: "History", description: "The trade routes that connected civilizations." },
  { name: "The Industrial Revolution", category: "History", description: "The machines that reshaped society." },
  { name: "Ancient Egypt", category: "History", description: "Pharaohs, pyramids, and the Nile." },

  // Space
  { name: "Black Holes", category: "Space", description: "Where gravity bends space and time." },
  { name: "The Big Bang", category: "Space", description: "How the universe began." },
  { name: "Life on Mars", category: "Space", description: "The search for life on the red planet." },
  { name: "How Rockets Work", category: "Space", description: "The physics of reaching orbit." },

  // Health
  { name: "How Vaccines Work", category: "Health", description: "Training your immune system safely." },
  { name: "The Gut Microbiome", category: "Health", description: "The trillions of microbes inside you." },
  { name: "How Sleep Affects the Brain", category: "Health", description: "Why rest is essential for memory." },
  { name: "Nutrition Basics", category: "Health", description: "What your body actually needs." },

  // Art
  { name: "Impressionism", category: "Art", description: "The movement that broke from realism." },
  { name: "The Renaissance", category: "Art", description: "Europe's rebirth of art and ideas." },
  { name: "Color Theory", category: "Art", description: "How colors work together." },
  { name: "Street Art & Graffiti", category: "Art", description: "Art that lives in public spaces." },

  // Philosophy
  { name: "The Trolley Problem", category: "Philosophy", description: "A classic ethics thought experiment." },
  { name: "Stoicism", category: "Philosophy", description: "Ancient wisdom for a calmer mind." },
  { name: "Free Will vs Determinism", category: "Philosophy", description: "Are our choices truly our own?" },
  { name: "The Meaning of Consciousness", category: "Philosophy", description: "What makes experience feel like something." },
];
