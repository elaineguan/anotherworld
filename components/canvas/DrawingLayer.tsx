"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { useCanvasStore } from "@/store/canvasStore";
import { persistDrawing, removeDrawingMemory } from "@/hooks/useMemorySync";
import type { DrawingPath, Point } from "@/types";

const STROKE_COLOR = "#5A5A5A";
const STROKE_WIDTH = 2;
const ERASE_RADIUS_PX = 16;

function pathToSvg(points: Point[] | undefined): string {
  if (!points || points.length < 2) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(" ")}`;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(point, a);

  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq)
  );
  return dist(point, { x: a.x + t * dx, y: a.y + t * dy });
}

function pointNearPath(
  point: Point,
  path: DrawingPath,
  radius: number
): boolean {
  if (!Array.isArray(path.points) || path.points.length === 0) return false;

  if (path.points.some((p) => dist(point, p) < radius)) return true;

  for (let i = 0; i < path.points.length - 1; i++) {
    if (distToSegment(point, path.points[i], path.points[i + 1]) < radius) {
      return true;
    }
  }

  return false;
}

function findDrawingAtPoint(
  point: Point,
  radius: number
): DrawingPath | undefined {
  return useCanvasStore
    .getState()
    .drawings.find((d) => pointNearPath(point, d, radius));
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
  const { screenToFlowPosition } = useReactFlow();
  const viewport = useViewport();
  const drawingRef = useRef(false);
  const erasingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const isErasingRef = useRef(false);
  const erasedDuringStrokeRef = useRef(new Set<string>());

  const isDrawing = tool === "draw";
  const isErasing = tool === "erase";

  isDrawingRef.current = isDrawing;
  isErasingRef.current = isErasing;

  const eraseRadius = ERASE_RADIUS_PX / Math.max(viewport.zoom, 0.15);

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

  const eraseAtPoint = useCallback(
    (point: Point) => {
      const hit = findDrawingAtPoint(point, eraseRadius);
      if (!hit || erasedDuringStrokeRef.current.has(hit.id)) return;
      erasedDuringStrokeRef.current.add(hit.id);
      void removeDrawingMemory(hit.id);
    },
    [eraseRadius]
  );

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
    if (erasingRef.current) {
      erasingRef.current = false;
      erasedDuringStrokeRef.current.clear();
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    void finishStroke();
  }, [finishStroke]);

  const clearWindowListeners = useRef<(() => void) | null>(null);

  const attachWindowListeners = useCallback(() => {
    clearWindowListeners.current?.();

    const onMove = (e: PointerEvent) => {
      if (isErasingRef.current && e.buttons === 1) {
        eraseAtPoint(getFlowPoint(e.clientX, e.clientY));
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
  }, [getFlowPoint, viewport.zoom, updatePreview, endStroke, eraseAtPoint]);

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
        erasingRef.current = true;
        erasedDuringStrokeRef.current.clear();
        eraseAtPoint(point);
        attachWindowListeners();
        return;
      }

      if (!isDrawingRef.current) return;

      drawingRef.current = true;
      pointsRef.current = [point];
      updatePreview();
      attachWindowListeners();
    },
    [getFlowPoint, updatePreview, attachWindowListeners, eraseAtPoint]
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
