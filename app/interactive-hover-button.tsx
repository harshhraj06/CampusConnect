"use client";

import {
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import "./interactive-hover-button.css";


type Props =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: ReactNode;
    text?: string;
    wide?: boolean;
  };


export function InteractiveHoverButton({
  children,
  text = "Button",
  wide = false,
  className = "",
  type = "button",
  ...props
}: Props) {

  const content =
    children ??
    text;


  return (
    <button
      type={type}
      className={[
        "ccInteractiveHoverButton",
        wide
          ? "ccInteractiveHoverButtonWide"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >

      <span
        className="ccInteractiveHoverDot"
        aria-hidden="true"
      />


      <span
        className="ccInteractiveHoverText"
      >
        {content}
      </span>


      <span
        className="ccInteractiveHoverArrow"
        aria-hidden="true"
      >
        →
      </span>

    </button>
  );
}
