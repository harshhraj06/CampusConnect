"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import "./campus-greeting-reveal.css";

export default function CampusGreetingReveal({
  greeting,
  name,
  as = "h1",
}: {
  greeting: string;
  name: string;
  as?: "h1" | "h2";
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.25 });
  const reducedMotion = useReducedMotion();
  const Heading = as === "h1" ? motion.h1 : motion.h2;
  const displayName = name.trim();

  const hidden = { opacity: 0, y: 10, filter: "blur(8px)" };
  const shown = { opacity: 1, y: 0, filter: "blur(0px)" };
  const animate = reducedMotion || visible ? shown : hidden;

  return (
    <Heading
      ref={ref}
      className={`ccGreetingReveal ccGreetingReveal--${as}`}
      aria-label={`${greeting}${displayName ? `, ${displayName}` : ""}`}
      data-student-dashboard-greeting={as === "h1" ? "true" : undefined}
    >
      <motion.span
        className="ccGreetingRevealLead"
        aria-hidden="true"
        initial={reducedMotion ? false : hidden}
        animate={animate}
        transition={{
          duration: reducedMotion ? 0 : 0.6,
          delay: reducedMotion ? 0 : 0.12,
          ease: "easeOut",
        }}
      >
        {greeting}{displayName ? "," : ""}
      </motion.span>

      {displayName && (
        <motion.strong
          className="ccGreetingRevealName"
          aria-hidden="true"
          initial={reducedMotion ? false : hidden}
          animate={animate}
          transition={{
            duration: reducedMotion ? 0 : 0.7,
            delay: reducedMotion ? 0 : 0.38,
            ease: "easeOut",
          }}
        >
          {displayName}
        </motion.strong>
      )}
    </Heading>
  );
}
