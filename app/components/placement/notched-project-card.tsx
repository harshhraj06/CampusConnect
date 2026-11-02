/* Reusable notched project card, adapted for the existing Placement toolkit. */
"use client"

import * as React from "react"

export interface NotchedProjectCardProps {
  href: string
  title: string
  description?: string
  image: string
  imageAlt?: string
  badge?: string
  tags?: string[]
  screen?: { src: string; alt: string; className?: string }
  dim?: number
  monochrome?: boolean
  surface?: string
  accent?: string
  accentForeground?: string
  className?: string
  details?: string
  platforms?: string
  saved?: boolean
  onToggleSaved?: () => void
}

const DISC = 64
const BLOCK = 80
const FILLET = 28

export function NotchedProjectCard({
  href,
  title,
  description,
  image,
  imageAlt = "",
  badge,
  tags = [],
  screen,
  dim = screen ? 0.4 : 0,
  monochrome = false,
  surface = "var(--pt-bg-base)",
  accent = "#d9b775",
  accentForeground = "#2a1916",
  className = "",
  details,
  platforms,
  saved = false,
  onToggleSaved,
}: NotchedProjectCardProps) {
  const style = {
    "--pt-notched-surface": surface,
    "--pt-notched-accent": accent,
    "--pt-notched-accent-fg": accentForeground,
    "--pt-notched-disc": `${DISC}px`,
    "--pt-notched-block": `${BLOCK}px`,
    "--pt-notched-fillet": `${FILLET}px`,
  } as React.CSSProperties

  return (
    <article className={`ptNotchedProjectCard ${className}`} style={style}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="ptNotchedProjectLink"
        aria-label={`Open the official website for ${title}`}
      >
        <div className="ptNotchedProjectCover">
          <img
            src={image}
            alt={screen ? "" : imageAlt}
            className={`ptNotchedProjectImage ${monochrome ? "is-monochrome" : ""}`}
          />

          {dim > 0 && (
            <div
              aria-hidden="true"
              className="ptNotchedProjectDim"
              style={{ backgroundColor: `rgb(0 0 0 / ${dim})` }}
            />
          )}

          {screen && (
            <img
              src={screen.src}
              alt={screen.alt}
              className={`ptNotchedProjectScreen ${screen.className || ""}`}
            />
          )}

          {badge && (
            <span className="ptNotchedProjectBadge">
              {badge}
            </span>
          )}

          <span className="ptNotchedCornerBlock" aria-hidden="true" />
          <span className="ptNotchedCornerFillet ptNotchedCornerFillet--edge-bottom" aria-hidden="true" />
          <span className="ptNotchedCornerFillet ptNotchedCornerFillet--edge-right" aria-hidden="true" />

          <span className="ptNotchedArrowDisc" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
              <path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        <div className="ptNotchedProjectBody">
          <h4>{title}</h4>
          {description && <p className="ptNotchedDescription">{description}</p>}

          {details && (
            <div className="ptNotchedDetails">
              <span>BEST FOR</span>
              <p>{details}</p>
            </div>
          )}

          {platforms && (
            <p className="ptNotchedPlatforms">
              <span aria-hidden="true">↗</span> {platforms}
            </p>
          )}

          {tags.length > 0 && (
            <ul className="ptNotchedTags">
              {tags.map((tag, index) => (
                <li key={`${tag}-${index}`}>{tag}</li>
              ))}
            </ul>
          )}

          <span className="ptNotchedTextLink">
            Visit official website <span aria-hidden="true">↗</span>
          </span>
        </div>
      </a>

      {onToggleSaved && (
        <button
          type="button"
          className={`ptNotchedSaveButton ${saved ? "is-saved" : ""}`}
          onClick={onToggleSaved}
          aria-label={saved ? `Remove ${title} from saved tools` : `Save ${title}`}
          aria-pressed={saved}
          title={saved ? "Remove saved tool" : "Save tool"}
        >
          {saved ? "★" : "☆"}
        </button>
      )}
    </article>
  )
}

export default NotchedProjectCard
