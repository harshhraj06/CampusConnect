"use client";

import {
  useEffect,
  useRef,
} from "react";


type FlickeringGridProps = {
  className?: string;
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  maxOpacity?: number;
};


function parseColor(
  color: string
) {

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 1;
  canvas.height = 1;

  const context =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );


  if (!context) {
    return [38, 76, 55];
  }


  context.fillStyle = color;

  context.fillRect(
    0,
    0,
    1,
    1
  );


  const data =
    context.getImageData(
      0,
      0,
      1,
      1
    ).data;


  return [
    data[0],
    data[1],
    data[2],
  ];
}


export function FlickeringGrid({
  className = "",
  squareSize = 3,
  gridGap = 7,
  flickerChance = 0.12,
  color = "#2c5940",
  maxOpacity = 0.2,
}: FlickeringGridProps) {

  const wrapperRef =
    useRef<HTMLDivElement>(
      null
    );

  const canvasRef =
    useRef<HTMLCanvasElement>(
      null
    );


  useEffect(
    () => {

      const wrapper =
        wrapperRef.current;

      const canvas =
        canvasRef.current;


      if (
        !wrapper ||
        !canvas
      ) {
        return;
      }


      const context =
        canvas.getContext(
          "2d"
        );


      if (!context) {
        return;
      }


      const [
        red,
        green,
        blue,
      ] =
        parseColor(
          color
        );


      const reducedMotionQuery =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        );


      let reducedMotion =
        reducedMotionQuery.matches;

      let visible = true;

      let animationFrame = 0;

      let lastTime =
        performance.now();

      let width = 0;
      let height = 0;
      let columns = 0;
      let rows = 0;

      let devicePixelRatio = 1;

      let opacityValues =
        new Float32Array(0);


      const draw =
        () => {

          context.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
          );


          context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
          );


          context.setTransform(
            devicePixelRatio,
            0,
            0,
            devicePixelRatio,
            0,
            0
          );


          for (
            let column = 0;
            column < columns;
            column += 1
          ) {

            for (
              let row = 0;
              row < rows;
              row += 1
            ) {

              const index =
                column * rows +
                row;


              const opacity =
                opacityValues[index] ??
                0;


              context.fillStyle =
                `rgba(${red}, ${green}, ${blue}, ${opacity})`;


              context.fillRect(
                column *
                  (
                    squareSize +
                    gridGap
                  ),

                row *
                  (
                    squareSize +
                    gridGap
                  ),

                squareSize,
                squareSize
              );
            }
          }
        };


      const setup =
        () => {

          width =
            Math.max(
              1,
              wrapper.clientWidth
            );


          height =
            Math.max(
              1,
              wrapper.clientHeight
            );


          devicePixelRatio =
            Math.min(
              window.devicePixelRatio ||
                1,
              2
            );


          canvas.width =
            Math.ceil(
              width *
                devicePixelRatio
            );


          canvas.height =
            Math.ceil(
              height *
                devicePixelRatio
            );


          canvas.style.width =
            `${width}px`;


          canvas.style.height =
            `${height}px`;


          columns =
            Math.ceil(
              width /
                (
                  squareSize +
                  gridGap
                )
            );


          rows =
            Math.ceil(
              height /
                (
                  squareSize +
                  gridGap
                )
            );


          opacityValues =
            new Float32Array(
              columns *
                rows
            );


          for (
            let index = 0;
            index <
              opacityValues.length;
            index += 1
          ) {

            const base =
              Math.random() *
                maxOpacity;


            opacityValues[
              index
            ] =
              Math.random() >
                0.72
                ? Math.max(
                    base,
                    maxOpacity * .55
                  )
                : base;
          }


          draw();
        };


      const stop =
        () => {

          if (
            animationFrame
          ) {

            cancelAnimationFrame(
              animationFrame
            );


            animationFrame = 0;
          }
        };


      const animate =
        (
          time: number
        ) => {

          if (
            reducedMotion ||
            !visible
          ) {

            animationFrame = 0;

            return;
          }


          const delta =
            Math.min(
              .12,
              (
                time -
                lastTime
              ) /
                1000
            );


          lastTime = time;


          for (
            let index = 0;
            index <
              opacityValues.length;
            index += 1
          ) {

            if (
              Math.random() <
              flickerChance *
                delta
            ) {

              opacityValues[
                index
              ] =
                Math.random() *
                  maxOpacity;
            }
          }


          draw();


          animationFrame =
            requestAnimationFrame(
              animate
            );
        };


      const start =
        () => {

          stop();


          if (
            reducedMotion ||
            !visible
          ) {

            draw();

            return;
          }


          lastTime =
            performance.now();


          animationFrame =
            requestAnimationFrame(
              animate
            );
        };


      const resizeObserver =
        new ResizeObserver(
          () => {

            setup();

            start();
          }
        );


      resizeObserver.observe(
        wrapper
      );


      const intersectionObserver =
        new IntersectionObserver(
          (
            entries
          ) => {

            visible =
              Boolean(
                entries[0]
                  ?.isIntersecting
              );


            if (visible) {
              start();
            } else {
              stop();
            }
          }
        );


      intersectionObserver.observe(
        wrapper
      );


      const handleMotion =
        (
          event:
            MediaQueryListEvent
        ) => {

          reducedMotion =
            event.matches;


          if (
            reducedMotion
          ) {

            stop();

            draw();

          } else {

            start();
          }
        };


      reducedMotionQuery
        .addEventListener(
          "change",
          handleMotion
        );


      setup();

      start();


      return () => {

        stop();

        resizeObserver.disconnect();

        intersectionObserver.disconnect();

        reducedMotionQuery
          .removeEventListener(
            "change",
            handleMotion
          );
      };

    },
    [
      squareSize,
      gridGap,
      flickerChance,
      color,
      maxOpacity,
    ]
  );


  return (
    <div
      ref={wrapperRef}
      className={className}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
      />
    </div>
  );
}
