"use client";

import { useCallback, useEffect, useRef } from "react";
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

function DrawingDisplay() {
  const drawings = useCanvasStore((s) => s.drawings);
  const viewport = useViewport();
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[38] h-full w-full overflow-visible"
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
      <path
        id="drawing-preview"
        fill="none"
        stroke={STROKE_COLOR}
        strokeWidth={STROKE_WIDTH / viewport.zoom}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: "none" }}
      />
    </svg>
  );
}

function DrawingCapture() {
  const tool = useCanvasStore((s) => s.tool);
  const drawings = useCanvasStore((s) => s.drawings);
  const { screenToFlowPosition } = useReactFlow();
  const viewport = useViewport();
  const drawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const isErasingRef = useRef(false);

  const isDrawing = tool === "draw";
  const isErasing = tool === "erase";

  isDrawingRef.current = isDrawing;
  isErasingRef.current = isErasing;

  const getFlowPoint = useCallback(
    (clientX: number, clientY: number): Point =>
      screenToFlowPosition({ x: clientX, y: clientY }),
    [screenToFlowPosition]
  );

  const updatePreview = useCallback(() => {
    const el = document.getElementById("drawing-preview");
    if (!el) return;
    const pts = pointsRef.current;
    if (pts.length > 1) {
      el.setAttribute("d", pathToSvg(pts));
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  }, []);

  const finishStroke = useCallback(async () => {
    const points = pointsRef.current;
    pointsRef.current = [];
    updatePreview();

    if (points.length < 2) return;

    const path: DrawingPath = {
      id: uuidv4(),
      points,
      color: STROKE_COLOR,
      strokeWidth: STROKE_WIDTH,
      createdAt: Date.now(),
    };
    await persistDrawing(path);
  }, [updatePreview]);

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    void finishStroke();
  }, [finishStroke]);

  const clearWindowListeners = useRef<(() => void) | null>(null);

  const attachWindowListeners = useCallback(() => {
    clearWindowListeners.current?.();

    const onMove = (e: PointerEvent) => {
      if (isErasingRef.current && e.buttons === 1) {
        const point = getFlowPoint(e.clientX, e.clientY);
        const hit = useCanvasStore
          .getState()
          .drawings.find((d) => pointNearPath(point, d, ERASE_RADIUS));
        if (hit) void removeDrawingMemory(hit.id);
        return;
      }

      if (!drawingRef.current || !isDrawingRef.current) return;

      const point = getFlowPoint(e.clientX, e.clientY);
      const prev = pointsRef.current;
      const last = prev[prev.length - 1];
      const minDist = 1.5 / Math.max(viewport.zoom, 0.15);
      if (last && dist(last, point) < minDist) return;

      pointsRef.current = [...prev, point];
      updatePreview();
    };

    const onUp = () => {
      clearWindowListeners.current?.();
      clearWindowListeners.current = null;
      endStroke();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    clearWindowListeners.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [getFlowPoint, viewport.zoom, updatePreview, endStroke]);

  useEffect(() => {
    return () => clearWindowListeners.current?.();
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const point = getFlowPoint(e.clientX, e.clientY);

      if (isErasingRef.current) {
        const hit = drawings.find((d) => pointNearPath(point, d, ERASE_RADIUS));
        if (hit) void removeDrawingMemory(hit.id);
        attachWindowListeners();
        return;
      }

      if (!isDrawingRef.current) return;

      drawingRef.current = true;
      pointsRef.current = [point];
      updatePreview();
      attachWindowListeners();
    },
    [getFlowPoint, drawings, updatePreview, attachWindowListeners]
  );

  return (
    <div
      className={`absolute inset-0 z-[39] touch-none ${
        isErasing ? "cursor-cell" : "cursor-crosshair"
      }`}
      onPointerDown={handlePointerDown}
    />
  );
}

export function DrawingLayer() {
  const tool = useCanvasStore((s) => s.tool);
  const isDrawMode = tool === "draw" || tool === "erase";

  return (
    <>
      <DrawingDisplay />
      {isDrawMode && <DrawingCapture />}
    </>
  );
}
