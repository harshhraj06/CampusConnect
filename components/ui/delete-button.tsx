"use client";

import {
  AnimatePresence,
  motion,
  MotionConfig,
} from "framer-motion";

import {
  Check,
  Trash2,
  X,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  Button,
} from "./button";

import {
  cn,
} from "@/lib/utils";


export interface NativeDeleteProps {

  /**
   * Runs when confirmation mode opens.
   */
  onConfirm?: () => void;

  /**
   * Runs only after the user confirms deletion.
   */
  onDelete: () => void | Promise<void>;

  buttonText?: string;

  confirmText?: string;

  size?: "sm" | "md" | "lg";

  showIcon?: boolean;

  className?: string;

  disabled?: boolean;

  /**
   * Allows the consumer to show a loading state while
   * an asynchronous delete operation completes.
   */
  loading?: boolean;
}


const sizeVariants = {
  sm:
    "h-8 text-xs px-3",

  md:
    "h-10 text-sm px-4",

  lg:
    "h-12 text-base px-6",
};


const iconSizeVariants = {
  sm:
    "h-3 w-3",

  md:
    "h-4 w-4",

  lg:
    "h-5 w-5",
};


const cancelButtonSizes = {
  sm:
    "h-8 w-8",

  md:
    "h-10 w-10",

  lg:
    "h-12 w-12",
};


const smoothSpring = {
  type:
    "spring" as const,

  bounce:
    0,

  duration:
    0.35,
};


export function NativeDelete({
  onConfirm,
  onDelete,
  buttonText = "Delete",
  confirmText = "Confirm",
  size = "md",
  showIcon = true,
  className,
  disabled = false,
  loading = false,
}: NativeDeleteProps) {

  const [
    isExpanded,
    setIsExpanded,
  ] = useState(false);


  const isDisabled =
    disabled ||
    loading;


  const handleDeleteClick = () => {

    if (isDisabled) {
      return;
    }

    setIsExpanded(true);

    onConfirm?.();
  };


  const handleConfirm =
    async () => {

      if (isDisabled) {
        return;
      }

      try {

        await onDelete();

        setIsExpanded(false);

      } catch {

        /*
         * Keep confirmation open on failure so the calling
         * feature can show its existing error feedback.
         */

      }

    };


  const handleCancel = () => {

    if (loading) {
      return;
    }

    setIsExpanded(false);
  };


  return (
    <MotionConfig
      transition={
        smoothSpring
      }
    >
      <motion.div
        layout
        className={cn(
          "relative inline-flex items-center gap-2",
          className
        )}
      >

        <motion.div
          layout
          whileHover={
            !isDisabled
              ? {
                  scale:
                    1.02,
                }
              : undefined
          }
          whileTap={
            !isDisabled
              ? {
                  scale:
                    0.98,
                }
              : undefined
          }
        >

          <Button
            type="button"
            variant="destructive"
            size="default"
            className={cn(
              sizeVariants[size],
              "cursor-pointer text-white transition-shadow",
              "shadow-sm hover:shadow-md",
              isDisabled &&
                "cursor-not-allowed opacity-50"
            )}
            onClick={
              isExpanded
                ? () =>
                    void handleConfirm()
                : handleDeleteClick
            }
            disabled={
              isDisabled
            }
            aria-label={
              loading
                ? "Deleting"
                : isExpanded
                  ? confirmText
                  : buttonText
            }
            aria-expanded={
              isExpanded
            }
          >

            <AnimatePresence
              mode="wait"
              initial={false}
            >

              {showIcon && (
                <motion.span
                  key={
                    loading
                      ? "loading"
                      : isExpanded
                        ? "check-icon"
                        : "trash-icon"
                  }
                  initial={{
                    opacity:
                      0,
                    scale:
                      0.8,
                  }}
                  animate={{
                    opacity:
                      1,
                    scale:
                      1,
                  }}
                  exit={{
                    opacity:
                      0,
                    scale:
                      0.8,
                  }}
                  transition={{
                    duration:
                      0.15,
                  }}
                  className="mr-2 flex items-center"
                  aria-hidden="true"
                >

                  {isExpanded ? (
                    <Check
                      className={
                        iconSizeVariants[
                          size
                        ]
                      }
                    />
                  ) : (
                    <Trash2
                      className={
                        iconSizeVariants[
                          size
                        ]
                      }
                    />
                  )}

                </motion.span>
              )}

            </AnimatePresence>


            <AnimatePresence
              mode="wait"
              initial={false}
            >

              <motion.span
                key={
                  loading
                    ? "deleting"
                    : isExpanded
                      ? "confirm"
                      : "delete"
                }
                initial={{
                  opacity:
                    0,
                  y:
                    4,
                }}
                animate={{
                  opacity:
                    1,
                  y:
                    0,
                }}
                exit={{
                  opacity:
                    0,
                  y:
                    -4,
                }}
                transition={{
                  duration:
                    0.15,
                }}
              >
                {
                  loading
                    ? "Deleting…"
                    : isExpanded
                      ? confirmText
                      : buttonText
                }
              </motion.span>

            </AnimatePresence>

          </Button>

        </motion.div>


        <AnimatePresence
          mode="popLayout"
        >

          {isExpanded && (
            <motion.div
              key="cancel-button"
              layout
              initial={{
                opacity:
                  0,
                scale:
                  0.8,
                x:
                  -8,
              }}
              animate={{
                opacity:
                  1,
                scale:
                  1,
                x:
                  0,
              }}
              exit={{
                opacity:
                  0,
                scale:
                  0.8,
                x:
                  -8,
              }}
              whileHover={{
                scale:
                  loading
                    ? 1
                    : 1.05,
              }}
              whileTap={{
                scale:
                  loading
                    ? 1
                    : 0.95,
              }}
            >

              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  cancelButtonSizes[
                    size
                  ],
                  "cursor-pointer transition-shadow",
                  "shadow-sm hover:shadow-md"
                )}
                onClick={
                  handleCancel
                }
                disabled={
                  loading
                }
                aria-label="Cancel delete"
              >
                <X
                  className={
                    iconSizeVariants[
                      size
                    ]
                  }
                />
              </Button>

            </motion.div>
          )}

        </AnimatePresence>

      </motion.div>
    </MotionConfig>
  );
}
