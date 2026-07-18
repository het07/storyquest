import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Trending } from "@/components/landing/trending";
import { CTA } from "@/components/landing/cta";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Trending />
      <CTA />
    </>
  );
}
