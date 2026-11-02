"use client";

import { useRef, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  type UseInViewOptions,
  type Variants,
} from "framer-motion";

type BlurFadeProps = {
  children: ReactNode;
  className?: string;
  variant?: Variants;
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?: UseInViewOptions["margin"];
  blur?: string;
};

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inViewResult = useInView(ref, {
    once: true,
    margin: inViewMargin,
  });
  const reducedMotion = useReducedMotion();
  const isVisible = Boolean(reducedMotion) || !inView || inViewResult;

  const defaultVariants: Variants = {
    hidden: {
      y: yOffset,
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
  };

  const accessibleVariants: Variants = {
    hidden: { y: 0, opacity: 1, filter: "none" },
    visible: { y: 0, opacity: 1, filter: "none" },
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        className={className}
        style={{ minWidth: 0 }}
        initial={reducedMotion ? false : "hidden"}
        animate={isVisible ? "visible" : "hidden"}
        exit="hidden"
        variants={
          reducedMotion
            ? accessibleVariants
            : variant || defaultVariants
        }
        transition={{
          delay: reducedMotion ? 0 : 0.04 + delay,
          duration: reducedMotion ? 0 : duration,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
