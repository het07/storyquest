"use client";

import { motion } from "motion/react";
import { Check, ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function KeyTakeaways({ items }: { items: string[] }) {
  if (!items.length) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-4 text-primary" />
          Key takeaways
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gradient text-white">
                <Check className="size-3" />
              </span>
              <span className="text-sm leading-relaxed">{item}</span>
            </motion.li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
