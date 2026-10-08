"use client";

import {
  GoodMorningHandwriting,
} from "./good-morning-handwriting";

type Props = {
  greeting: string;
};

export function DashboardHeroGreetingHandwriting({
  greeting,
}: Props) {
  /*
   * Preserve the original hand-drawn Good morning paths.
   */
  if (greeting === "Good morning") {
    return <GoodMorningHandwriting />;
  }

  const viewBoxWidth =
    greeting === "Good afternoon"
      ? 760
      : 650;

  return (
    <svg
      key={greeting}
      className="
        goodMorningHandwriting
        timeGreetingHandwriting
      "
      viewBox={`0 0 ${viewBoxWidth} 124`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={greeting}
      preserveAspectRatio="xMinYMid meet"
    >
      <title>{greeting}</title>

      <text
        key={greeting}
        className="timeGreetingHandwritingText"
        x="10"
        y="92"
      >
        {greeting}
      </text>
    </svg>
  );
}
