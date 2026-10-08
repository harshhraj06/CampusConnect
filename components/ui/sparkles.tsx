"use client";

import {
  useCallback,
  useId,
  useMemo,
} from "react";

import Particles, {
  ParticlesProvider,
} from "@tsparticles/react";

import type {
  Container,
  Engine,
  ISourceOptions,
} from "@tsparticles/engine";

import {
  loadSlim,
} from "@tsparticles/slim";


type SparklesProps = {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
};


export function SparklesCore({
  id,
  className = "",
  background = "transparent",
  minSize = 0.35,
  maxSize = 1.15,
  speed = 0.5,
  particleColor = "#ffffff",
  particleDensity = 90,
}: SparklesProps) {

  const generatedId =
    useId().replace(
      /:/g,
      ""
    );


  const initializeParticles =
    useCallback(
      async (
        engine: Engine
      ) => {
        await loadSlim(
          engine
        );
      },
      []
    );


  const particlesLoaded =
    useCallback(
      async (
        _container?:
          Container
      ) => {
        return;
      },
      []
    );


  const options =
    useMemo<
      ISourceOptions
    >(
      () => ({
        fullScreen: {
          enable:
            false,
        },

        fpsLimit:
          60,

        detectRetina:
          true,

        background: {
          color: {
            value:
              background,
          },
        },

        interactivity: {
          events: {
            onClick: {
              enable:
                false,
            },

            onHover: {
              enable:
                false,
            },

            resize:
              true,
          },
        },

        particles: {
          color: {
            value:
              particleColor,
          },

          number: {
            value:
              particleDensity,

            density: {
              enable:
                true,
            },
          },

          opacity: {
            value: {
              min:
                0.12,

              max:
                0.72,
            },

            animation: {
              enable:
                true,

              speed:
                0.65,

              sync:
                false,
            },
          },

          size: {
            value: {
              min:
                minSize,

              max:
                maxSize,
            },
          },

          shape: {
            type:
              "circle",
          },

          links: {
            enable:
              false,
          },

          collisions: {
            enable:
              false,
          },

          move: {
            enable:
              true,

            direction:
              "none",

            random:
              true,

            straight:
              false,

            speed: {
              min:
                0.08,

              max:
                speed,
            },

            outModes: {
              default:
                "out",
            },
          },
        },
      }),
      [
        background,
        minSize,
        maxSize,
        speed,
        particleColor,
        particleDensity,
      ]
    );


  return (
    <ParticlesProvider
      init={
        initializeParticles
      }
    >
      <div
        className={
          className
        }
      >
        <Particles
          id={
            id ||
            generatedId
          }
          className="facultySparklesCanvas"
          particlesLoaded={
            particlesLoaded
          }
          options={
            options
          }
        />
      </div>
    </ParticlesProvider>
  );
}
