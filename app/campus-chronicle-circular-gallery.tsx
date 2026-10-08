"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import "./campus-chronicle-circular-gallery.css";


export type ChronicleGalleryItem = {
  id: string;
  image: string;
  text: string;
};


type Props = {
  items: ChronicleGalleryItem[];
};


const CARD_SPACING =
  326;


export function CampusChronicleCircularGallery({
  items,
}: Props) {

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const cardRefs =
    useRef<
      Array<
        HTMLButtonElement | null
      >
    >([]);


  const targetRef =
    useRef(0);


  const currentRef =
    useRef(0);


  const animationFrameRef =
    useRef<number | null>(
      null
    );


  const draggingRef =
    useRef(false);


  const movedRef =
    useRef(false);


  const dragStartXRef =
    useRef(0);


  const dragStartTargetRef =
    useRef(0);


  const [
    selectedIndex,
    setSelectedIndex,
  ] =
    useState<number | null>(
      null
    );


  const [
    reducedMotion,
    setReducedMotion,
  ] =
    useState(false);


  const safeItems =
    useMemo(
      () =>
        items.filter(
          item =>
            Boolean(
              item.image
            )
        ),
      [
        items,
      ]
    );


  useEffect(
    () => {

      const media =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        );


      const update =
        () =>
          setReducedMotion(
            media.matches
          );


      update();


      media.addEventListener(
        "change",
        update
      );


      return () =>
        media.removeEventListener(
          "change",
          update
        );

    },
    []
  );


  useEffect(
    () => {

      if (
        !safeItems.length
      ) {
        return;
      }


      const render =
        () => {

          const viewport =
            containerRef
              .current;


          if (!viewport) {
            return;
          }


          const width =
            Math.max(
              320,
              viewport.clientWidth
            );


          const halfWidth =
            width /
            2;


          const totalWidth =
            safeItems.length *
            CARD_SPACING;


          const current =
            currentRef.current;


          cardRefs.current
            .forEach(
              (
                card,
                index
              ) => {

                if (!card) {
                  return;
                }


                let x =
                  index *
                    CARD_SPACING -
                  current;


                if (
                  totalWidth >
                  0
                ) {

                  x =
                    (
                      (
                        x +
                        totalWidth /
                          2
                      ) %
                        totalWidth +
                      totalWidth
                    ) %
                      totalWidth -
                    totalWidth /
                      2;
                }


                const normalized =
                  Math.max(
                    -1.45,
                    Math.min(
                      1.45,
                      x /
                        Math.max(
                          1,
                          halfWidth
                        )
                    )
                  );


                const distance =
                  Math.min(
                    1,
                    Math.abs(
                      normalized
                    )
                  );


                const curve =
                  Math.pow(
                    distance,
                    1.65
                  ) *
                  116;


                const rotation =
                  normalized *
                  -10.5;


                const scale =
                  1 -
                  distance *
                    0.13;


                const depth =
                  -distance *
                  115;


                const opacity =
                  1 -
                  distance *
                    0.28;


                card.style.transform =
                  `translate3d(calc(-50% + ${x}px), ${curve}px, ${depth}px) rotateZ(${rotation}deg) scale(${scale})`;


                card.style.opacity =
                  String(
                    opacity
                  );


                card.style.zIndex =
                  String(
                    Math.round(
                      100 -
                      distance *
                        60
                    )
                  );

              }
            );

        };


      if (
        reducedMotion
      ) {

        currentRef.current =
          targetRef.current;


        render();


        return;
      }


      const animate =
        () => {

          currentRef.current +=
            (
              targetRef.current -
              currentRef.current
            ) *
            0.075;


          render();


          animationFrameRef.current =
            window.requestAnimationFrame(
              animate
            );
        };


      animate();


      return () => {

        if (
          animationFrameRef.current !==
          null
        ) {

          window.cancelAnimationFrame(
            animationFrameRef.current
          );
        }

      };

    },
    [
      safeItems,
      reducedMotion,
    ]
  );


  useEffect(
    () => {

      const container =
        containerRef.current;


      if (!container) {
        return;
      }


      const handleWheel =
        (
          event: WheelEvent
        ) => {

          if (
            safeItems.length <
            2
          ) {
            return;
          }


          targetRef.current +=
            (
              Math.abs(
                event.deltaX
              ) >
              Math.abs(
                event.deltaY
              )
                ? event.deltaX
                : event.deltaY
            ) *
            0.62;


          if (
            reducedMotion
          ) {
            currentRef.current =
              targetRef.current;
          }
        };


      container.addEventListener(
        "wheel",
        handleWheel,
        {
          passive:
            true,
        }
      );


      return () =>
        container.removeEventListener(
          "wheel",
          handleWheel
        );

    },
    [
      safeItems.length,
      reducedMotion,
    ]
  );


  const snapToNearest =
    () => {

      targetRef.current =
        Math.round(
          targetRef.current /
          CARD_SPACING
        ) *
        CARD_SPACING;
    };


  const onPointerDown =
    (
      event:
        React.PointerEvent<HTMLDivElement>
    ) => {

      draggingRef.current =
        true;


      movedRef.current =
        false;


      dragStartXRef.current =
        event.clientX;


      dragStartTargetRef.current =
        targetRef.current;


      event.currentTarget
        .setPointerCapture(
          event.pointerId
        );

      event.currentTarget
        .classList
        .add(
          "isDragging"
        );

    };


  const onPointerMove =
    (
      event:
        React.PointerEvent<HTMLDivElement>
    ) => {

      if (
        !draggingRef.current
      ) {
        return;
      }


      const distance =
        event.clientX -
        dragStartXRef.current;


      if (
        Math.abs(
          distance
        ) >
        5
      ) {
        movedRef.current =
          true;
      }


      targetRef.current =
        dragStartTargetRef.current -
        distance *
          1.05;

    };


  const finishDrag =
    (
      event:
        React.PointerEvent<HTMLDivElement>
    ) => {

      draggingRef.current =
        false;


      event.currentTarget
        .classList
        .remove(
          "isDragging"
        );


      snapToNearest();

    };


  const previousPhoto =
    () => {

      if (
        selectedIndex ===
          null ||
        !safeItems.length
      ) {
        return;
      }


      setSelectedIndex(
        (
          selectedIndex -
            1 +
          safeItems.length
        ) %
          safeItems.length
      );
    };


  const nextPhoto =
    () => {

      if (
        selectedIndex ===
          null ||
        !safeItems.length
      ) {
        return;
      }


      setSelectedIndex(
        (
          selectedIndex +
          1
        ) %
          safeItems.length
      );
    };


  useEffect(
    () => {

      if (
        selectedIndex ===
        null
      ) {
        return;
      }


      const previousOverflow =
        document.body.style
          .overflow;


      document.body.style
        .overflow =
        "hidden";


      const handleKeyDown =
        (
          event:
            KeyboardEvent
        ) => {

          if (
            event.key ===
            "Escape"
          ) {

            setSelectedIndex(
              null
            );

            return;
          }


          if (
            event.key ===
            "ArrowLeft"
          ) {

            previousPhoto();

            return;
          }


          if (
            event.key ===
            "ArrowRight"
          ) {
            nextPhoto();
          }

        };


      window.addEventListener(
        "keydown",
        handleKeyDown
      );


      return () => {

        document.body.style
          .overflow =
          previousOverflow;


        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };

    },
    [
      selectedIndex,
      safeItems.length,
    ]
  );


  if (
    !safeItems.length
  ) {
    return null;
  }


  const selected =
    selectedIndex ===
      null
      ? null
      : safeItems[
          selectedIndex
        ];


  return (
    <>

      <section
        className="chronicleCircularSection"
      >

        <header
          className="chronicleCircularHeader"
        >

          <div>
            <span>
              VISUAL CHRONICLE
            </span>

            <h3>
              Campus photographs
            </h3>

            <p>
              Drag or scroll through the photographs. Select any image to open it.
            </p>
          </div>


          <small>
            {safeItems.length}{" "}
            {safeItems.length ===
            1
              ? "photograph"
              : "photographs"}
          </small>

        </header>


        <div
          ref={
            containerRef
          }
          className="chronicleCircularViewport"
          onPointerDown={
            onPointerDown
          }
          onPointerMove={
            onPointerMove
          }
          onPointerUp={
            finishDrag
          }
          onPointerCancel={
            finishDrag
          }
        >

          <div
            className="chronicleCircularGuide"
            aria-hidden="true"
          />


          {safeItems.map(
            (
              item,
              index
            ) => (

              <button
                type="button"
                key={
                  item.id
                }
                ref={
                  element => {
                    cardRefs
                      .current[
                        index
                      ] =
                      element;
                  }
                }
                className="chronicleCircularCard"
                onClick={() => {

                  if (
                    movedRef.current
                  ) {

                    movedRef.current =
                      false;

                    return;
                  }


                  setSelectedIndex(
                    index
                  );

                }}
                onDoubleClick={() =>
                  setSelectedIndex(
                    index
                  )
                }
                aria-label={`Open photograph ${index + 1}${item.text ? `: ${item.text}` : ""}`}
              >

                <img
                  src={
                    item.image
                  }
                  alt={
                    item.text ||
                    `Campus Chronicle photograph ${index + 1}`
                  }
                  draggable={
                    false
                  }
                />


                <span
                  className="chronicleCircularShade"
                />


                <span
                  className="chronicleCircularIndex"
                >
                  {String(
                    index +
                    1
                  ).padStart(
                    2,
                    "0"
                  )}
                </span>


                {item.text && (

                  <span
                    className="chronicleCircularCaption"
                  >
                    {item.text}
                  </span>

                )}


                <span
                  className="chronicleCircularOpen"
                >
                  View
                </span>

              </button>

            )
          )}

        </div>


        <footer
          className="chronicleCircularHint"
        >
          <span>
            DRAG
          </span>

          <i />

          <span>
            SCROLL
          </span>

          <i />

          <span>
            CLICK TO EXPAND
          </span>
        </footer>

      </section>


      {selected &&
        typeof document !== "undefined" &&
        createPortal(

          <div
            className="chroniclePhotoViewer"
            role="dialog"
            aria-modal="true"
            aria-label="Campus Chronicle photograph viewer"
            onClick={
              event => {

                if (
                  event.target ===
                  event.currentTarget
                ) {
                  setSelectedIndex(
                    null
                  );
                }

              }
            }
          >

            <button
              type="button"
              className="chronicleViewerClose"
              onClick={() =>
                setSelectedIndex(
                  null
                )
              }
              aria-label="Close photograph"
            >
              ×
            </button>


            {safeItems.length > 1 && (

              <button
                type="button"
                className="chronicleViewerArrow chronicleViewerPrevious"
                onClick={
                  previousPhoto
                }
                aria-label="Previous photograph"
              >
                ‹
              </button>

            )}


            <figure
              className="chronicleViewerFigure"
              onClick={
                event =>
                  event.stopPropagation()
              }
            >

              <div
                className="chronicleViewerImage"
              >

                <img
                  src={
                    selected.image
                  }
                  alt={
                    selected.text ||
                    "Campus Chronicle photograph"
                  }
                />

              </div>


              <figcaption>

                <span>
                  CAMPUS CHRONICLE
                </span>


                <div>

                  <strong>
                    {selected.text ||
                      "Campus photograph"}
                  </strong>

                  <small>
                    {String(
                      (
                        selectedIndex ||
                        0
                      ) + 1
                    ).padStart(
                      2,
                      "0"
                    )}

                    {" / "}

                    {String(
                      safeItems.length
                    ).padStart(
                      2,
                      "0"
                    )}
                  </small>

                </div>

              </figcaption>

            </figure>


            {safeItems.length > 1 && (

              <button
                type="button"
                className="chronicleViewerArrow chronicleViewerNext"
                onClick={
                  nextPhoto
                }
                aria-label="Next photograph"
              >
                ›
              </button>

            )}

          </div>,

          document.body

        )}

    </>
  );
}
