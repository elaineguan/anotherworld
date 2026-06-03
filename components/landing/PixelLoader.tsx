"use client";

import { useEffect, useRef } from "react";
import { drawPixLoader } from "@/lib/pixloader";

const LOADER_DRAW_SIZE = 48;
const LOADER_DISPLAY_SIZE = 118;

export function PixelLoader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scale = window.devicePixelRatio || 2;
    canvas.width = LOADER_DRAW_SIZE * scale;
    canvas.height = LOADER_DRAW_SIZE * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(scale, scale);

    const start = performance.now();
    let frame = 0;

    const loop = () => {
      drawPixLoader(
        ctx,
        LOADER_DRAW_SIZE,
        performance.now() - start,
        "#949494"
      );
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={LOADER_DRAW_SIZE}
      height={LOADER_DRAW_SIZE}
      aria-hidden
      className="shrink-0"
      style={{
        width: LOADER_DISPLAY_SIZE,
        height: LOADER_DISPLAY_SIZE,
        imageRendering: "pixelated",
      }}
    />
  );
}
