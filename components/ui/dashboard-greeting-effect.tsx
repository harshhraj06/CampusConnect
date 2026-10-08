"use client";

import {
  motion,
  type Variants,
} from "motion/react";

type Props = {
  text: string;
  className?: string;
};

const container: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.025,
      delayChildren: 0.02,
    },
  },
};

const letter: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    filter: "blur(4px)",
  },

  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",

    transition: {
      duration: 0.18,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function DashboardGreetingEffect({
  text,
  className = "",
}: Props) {
  return (
    <motion.span
      key={text}
      className={`dashboardGreetingAnimatedText ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
      aria-label={text}
    >
      {Array.from(text).map((character, index) => (
        <motion.span
          key={`${character}-${index}`}
          variants={letter}
          aria-hidden="true"
          className={
            character === " "
              ? "dashboardGreetingSpace"
              : "dashboardGreetingLetter"
          }
        >
          {character === " " ? "\u00A0" : character}
        </motion.span>
      ))}
    </motion.span>
  );
}
