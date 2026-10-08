import type { CSSProperties } from "react";

// Original monoline letter strokes, drawn in writing order.
const strokes = [
  { x: 0, d: "M64 30 C57 9 24 15 14 44 C3 74 18 94 41 87 C57 82 66 62 59 54 C55 48 44 51 37 58 M39 59 C52 54 66 53 74 55" },
  { x: 70, d: "M36 57 C29 43 9 51 6 70 C2 89 19 94 31 78 C41 64 37 50 29 51 C28 65 39 72 48 61" },
  { x: 114, d: "M36 57 C29 43 9 51 6 70 C2 89 19 94 31 78 C41 64 37 50 29 51 C28 65 39 72 48 61" },
  { x: 158, d: "M35 58 C24 44 8 54 6 73 C4 91 20 92 30 77 C43 56 52 19 45 17 C37 15 30 57 30 76 C29 93 43 86 51 75" },
  { x: 234, d: "M3 83 L11 53 L5 79 C17 44 34 47 25 76 L23 84 C36 46 54 47 45 77 C40 95 56 87 63 75" },
  { x: 295, d: "M36 57 C29 43 9 51 6 70 C2 89 19 94 31 78 C41 64 37 50 29 51 C28 65 39 72 48 61" },
  { x: 339, d: "M3 83 C10 65 17 51 13 50 C7 49 8 64 19 59 C33 47 35 54 29 64 C23 78 30 91 43 77" },
  { x: 380, d: "M3 83 L11 53 L5 79 C21 43 40 48 29 76 C22 94 40 87 47 75" },
  { x: 425, d: "M13 54 C7 71 4 90 17 86 C23 84 28 79 31 74" },
  { x: 425, d: "M17 35 L18 33" },
  { x: 454, d: "M3 83 L11 53 L5 79 C21 43 40 48 29 76 C22 94 40 87 47 75" },
  { x: 499, d: "M35 58 C25 44 8 54 6 73 C3 93 23 89 33 69 L39 53 C35 78 30 111 14 116 C0 119 4 99 23 93 C36 88 47 82 55 74" },
];

export function GoodMorningHandwriting() {
  return (
    <svg
      className="goodMorningHandwriting"
      viewBox="0 0 565 124"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Good morning"
    >
      <title>Good morning</title>
      {strokes.map(({ x, d }, index) => (
        <path
          key={index}
          d={d}
          transform={`translate(${x} 0)`}
          pathLength={1}
          style={{
            "--writing-delay": `${index * 0.085}s`,
          } as CSSProperties}
        />
      ))}
    </svg>
  );
}
