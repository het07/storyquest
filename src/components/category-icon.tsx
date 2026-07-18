import {
  Atom,
  Brain,
  Cpu,
  HeartPulse,
  Landmark,
  Palette,
  Rocket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_META: Record<string, { icon: LucideIcon }> = {
  Science: { icon: Atom },
  Technology: { icon: Cpu },
  History: { icon: Landmark },
  Space: { icon: Rocket },
  Health: { icon: HeartPulse },
  Art: { icon: Palette },
  Philosophy: { icon: Brain },
};

export function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = CATEGORY_META[category]?.icon ?? Sparkles;
  return <Icon className={className} />;
}
