"use client";

import {
  Warp,
} from "@paper-design/shaders-react";


export default function FacultyWorkspaceWarp() {
  return (
    <div
      className="facultyWorkspaceWarp"
      aria-hidden="true"
    >
      <Warp
        style={{
          width: "100%",
          height: "100%",
        }}
        proportion={0.38}
        softness={1.05}
        distortion={0.16}
        swirl={0.72}
        swirlIterations={11}
        shape="checks"
        shapeScale={0.09}
        scale={1}
        rotation={0}
        speed={0.38}
        colors={[
          "hsl(218, 62%, 18%)",
          "hsl(210, 58%, 33%)",
          "hsl(185, 34%, 38%)",
          "hsl(40, 32%, 62%)",
        ]}
      />
    </div>
  );
}
