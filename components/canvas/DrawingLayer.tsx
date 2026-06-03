"use client";

import { useCallback, useRef, useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { useCanvasStore } from "@/store/canvasStore";
import { persistDrawing, removeDrawingMemory } from "@/hooks/useMemorySync";
import type { DrawingPath, Point } from "@/types";

const STROKE_COLOR = "#5A5A5A";
const STROKE_WIDTH = 2;
const ERASE_RADIUS = 14;

function pathToSvg(points: Point[] | undefined): string {
  if (!points || points.length < 2) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(" ")}`;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointNearPath(point: Point, path: DrawingPath, radius: number): boolean {
  if (!Array.isArray(path.points) || path.points.length === 0) return false;
  for (let i = 0; i < path.points.length - 1; i++) {
    const a = path.points[i];
    const b = path.points[i + 1];
    const d = dist(point, a) + dist(point, b);
    if (d < radius * 2 + dist(a, b)) return true;
    for (let t = 0; t <= 1; t += 0.2) {
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      if (dist(point, { x: px, y: py }) < radius) return true;
    }
  }
  return path.points.some((p) => dist(point, p) < radius);
}

export function DrawingLayer() {
  const tool = useCanvasStore((s) => s.tool);
  const drawings = useCanvasStore((s) => s.drawings);
  const { screenToFlowPosition } = useReactFlow();
  const viewport = useViewport();
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const drawingRef = useRef(false);

  const isDrawing = tool === "draw";
  const isErasing = tool === "erase";

  const getFlowPoint = useCallback(
    (clientX: number, clientY: number): Point =>
      screenToFlowPosition({ x: clientX, y: clientY }),
    [screenToFlowPosition]
  );

  const finishStroke = useCallback(async () => {
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      return;
    }
    const path: DrawingPath = {
      id: uuidv4(),
      points: currentPoints,
      color: STROKE_COLOR,
      strokeWidth: STROKE_WIDTH,
      createdAt: Date.now(),
    };
    setCurrentPoints([]);
    await persistDrawing(path);
  }, [currentPoints]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing && !isErasing) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);

      const point = getFlowPoint(e.clientX, e.clientY);

      if (isErasing) {
        const hit = drawings.find((d) => pointNearPath(point, d, ERASE_RADIUS));
        if (hit) void removeDrawingMemory(hit.id);
        return;
      }

      drawingRef.current = true;
      setCurrentPoints([point]);
    },
    [isDrawing, isErasing, getFlowPoint, drawings]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawingRef.current || !isDrawing) {
        if (isErasing && e.buttons === 1) {
          const point = getFlowPoint(e.clientX, e.clientY);
          const hit = drawings.find((d) =>
            pointNearPath(point, d, ERASE_RADIUS)
          );
          if (hit) void removeDrawingMemory(hit.id);
        }
        return;
      }
      const point = getFlowPoint(e.clientX, e.clientY);
      setCurrentPoints((prev) => {
        const last = prev[prev.length - 1];
        if (last && dist(last, point) < 2) return prev;
        return [...prev, point];
      });
    },
    [isDrawing, isErasing, getFlowPoint, drawings]
  );

  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    void finishStroke();
  }, [finishStroke]);

  if (tool !== "draw" && tool !== "erase") {
    return (
      <svg
        ref={svgRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {drawings.map((path) => (
          <path
            key={path.id}
            d={pathToSvg(path.points)}
            fill="none"
            stroke={path.color}
            strokeWidth={path.strokeWidth / viewport.zoom}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    );
  }

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-10 h-full w-full touch-none"
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: "0 0",
        cursor: isErasing ? "cell" : "crosshair",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {drawings.map((path) => (
        <path
          key={path.id}
          d={pathToSvg(path.points)}
          fill="none"
          stroke={path.color}
          strokeWidth={path.strokeWidth / viewport.zoom}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {currentPoints.length > 1 && (
        <path
          d={pathToSvg(currentPoints)}
          fill="none"
          stroke={STROKE_COLOR}
          strokeWidth={STROKE_WIDTH / viewport.zoom}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
