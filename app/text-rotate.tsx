"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";


type TextRotateProps = {
  texts: string[];
  rotationInterval?: number;
  staggerDuration?: number;
  className?: string;
};


export function TextRotate({
  texts,
  rotationInterval = 2600,
  staggerDuration = 34,
  className = "",
}: TextRotateProps) {

  const [
    index,
    setIndex,
  ] =
    useState(0);


  const [
    reduceMotion,
    setReduceMotion,
  ] =
    useState(false);


  useEffect(
    () => {

      const query =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        );


      const update =
        () =>
          setReduceMotion(
            query.matches
          );


      update();


      query.addEventListener(
        "change",
        update
      );


      return () =>
        query.removeEventListener(
          "change",
          update
        );

    },
    []
  );


  useEffect(
    () => {

      if (
        reduceMotion ||
        texts.length <= 1
      ) {
        return;
      }


      const interval =
        window.setInterval(
          () => {

            setIndex(
              current =>
                (
                  current +
                  1
                ) %
                texts.length
            );

          },
          rotationInterval
        );


      return () =>
        window.clearInterval(
          interval
        );

    },
    [
      reduceMotion,
      rotationInterval,
      texts.length,
    ]
  );


  const currentText =
    texts[index] ??
    texts[0] ??
    "";


  const characters =
    useMemo(
      () =>
        Array.from(
          currentText
        ),
      [
        currentText,
      ]
    );


  return (
    <span
      className={`ccTextRotate ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >

      <span className="ccTextRotateSrOnly">
        {currentText}
      </span>


      <span
        key={
          reduceMotion
            ? "reduced"
            : index
        }
        className="ccTextRotateTrack"
        aria-hidden="true"
      >

        {characters.map(
          (
            character,
            characterIndex
          ) => {

            const style =
              {
                "--cc-character-index":
                  characterIndex,

                "--cc-stagger-duration":
                  `${staggerDuration}ms`,
              } as CSSProperties;


            if (
              character === " "
            ) {
              return (
                <span
                  key={`${index}-${characterIndex}-space`}
                  className="ccTextRotateSpace"
                  style={
                    style
                  }
                >
                  {"\u00a0"}
                </span>
              );
            }


            return (
              <span
                key={`${index}-${characterIndex}-${character}`}
                className="ccTextRotateCharacter"
                style={
                  style
                }
              >
                {character}
              </span>
            );

          }
        )}

      </span>

    </span>
  );
}
