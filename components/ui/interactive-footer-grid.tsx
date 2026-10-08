"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type InteractiveFooterGridProps = {
  className?: string;
  width?: number;
  height?: number;
  squares?: [number, number];
};

type Cell = {
  column: number;
  row: number;
} | null;

export function InteractiveFooterGrid({
  className = "",
  width = 44,
  height = 44,
  squares = [40, 18],
}: InteractiveFooterGridProps) {
  const patternId =
    useId().replace(
      /:/g,
      ""
    );

  const rootRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [activeCell, setActiveCell] =
    useState<Cell>(
      null
    );

  const [
    pointer,
    setPointer,
  ] = useState({
    x: -500,
    y: -500,
  });

  const [
    columns,
    rows,
  ] = squares;

  useEffect(() => {
    const root =
      rootRef.current;

    const footer =
      root?.closest(
        ".ccSiteFooter"
      );

    if (
      !root ||
      !footer
    ) {
      return;
    }

    const handleMove = (
      event: Event
    ) => {
      const pointerEvent =
        event as PointerEvent;

      const rect =
        root.getBoundingClientRect();

      const x =
        pointerEvent.clientX -
        rect.left;

      const y =
        pointerEvent.clientY -
        rect.top;

      setPointer({
        x,
        y,
      });

      const column =
        Math.floor(
          x /
            width
        );

      const row =
        Math.floor(
          y /
            height
        );

      if (
        column < 0 ||
        row < 0 ||
        column >=
          columns ||
        row >=
          rows
      ) {
        setActiveCell(
          null
        );

        return;
      }

      setActiveCell({
        column,
        row,
      });
    };

    const handleLeave =
      () => {
        setActiveCell(
          null
        );

        setPointer({
          x: -500,
          y: -500,
        });
      };

    footer.addEventListener(
      "pointermove",
      handleMove
    );

    footer.addEventListener(
      "pointerleave",
      handleLeave
    );

    return () => {
      footer.removeEventListener(
        "pointermove",
        handleMove
      );

      footer.removeEventListener(
        "pointerleave",
        handleLeave
      );
    };
  }, [
    columns,
    rows,
    width,
    height,
  ]);

  return (
    <div
      ref={rootRef}
      className={`ccFooterInteractiveGrid ${className}`}
      aria-hidden="true"
    >
      <svg
        className="ccFooterInteractiveGridSvg"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={patternId}
            width={width}
            height={height}
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="0"
              y="0"
              width={width}
              height={height}
              className="ccFooterGridCellBase"
            />
          </pattern>

          <radialGradient
            id={`${patternId}-spotlight`}
            gradientUnits="userSpaceOnUse"
            cx={pointer.x}
            cy={pointer.y}
            r="170"
          >
            <stop
              offset="0%"
              stopColor="#e8b44d"
              stopOpacity="0.24"
            />

            <stop
              offset="45%"
              stopColor="#e8b44d"
              stopOpacity="0.09"
            />

            <stop
              offset="100%"
              stopColor="#e8b44d"
              stopOpacity="0"
            />
          </radialGradient>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
        />

        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId}-spotlight)`}
          className="ccFooterGridSpotlight"
        />

        {activeCell && (
          <rect
            x={
              activeCell.column *
              width
            }
            y={
              activeCell.row *
              height
            }
            width={width}
            height={height}
            rx="3"
            className="ccFooterGridActiveCell"
          />
        )}
      </svg>

      <div className="ccFooterInteractiveGridMask" />
    </div>
  );
}
