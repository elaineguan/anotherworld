"use client";

import { useCallback, useRef } from "react";
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
  const drawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const captureTargetRef = useRef<Element | null>(null);
  const captureIdRef = useRef<number | null>(null);
  const previewPathRef = useRef<SVGPathElement | null>(null);

  const isDrawing = tool === "draw";
  const isErasing = tool === "erase";
  const isDrawMode = isDrawing || isErasing;

  const getFlowPoint = useCallback(
    (clientX: number, clientY: number): Point =>
      screenToFlowPosition({ x: clientX, y: clientY }),
    [screenToFlowPosition]
  );

  const updatePreview = useCallback(() => {
    const el = previewPathRef.current;
    if (!el) return;
    const pts = pointsRef.current;
    if (pts.length > 1) {
      el.setAttribute("d", pathToSvg(pts));
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  }, []);

  const releaseCapture = useCallback(() => {
    if (
      captureTargetRef.current &&
      captureIdRef.current !== null &&
      captureTargetRef.current.hasPointerCapture(captureIdRef.current)
    ) {
      captureTargetRef.current.releasePointerCapture(captureIdRef.current);
    }
    captureTargetRef.current = null;
    captureIdRef.current = null;
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawMode) return;
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget as Element;
      target.setPointerCapture(e.pointerId);
      captureTargetRef.current = target;
      captureIdRef.current = e.pointerId;

      const point = getFlowPoint(e.clientX, e.clientY);

      if (isErasing) {
        const hit = drawings.find((d) => pointNearPath(point, d, ERASE_RADIUS));
        if (hit) void removeDrawingMemory(hit.id);
        return;
      }

      drawingRef.current = true;
      pointsRef.current = [point];
      updatePreview();
    },
    [isDrawMode, isErasing, getFlowPoint, drawings, updatePreview]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isErasing && e.buttons === 1) {
        const point = getFlowPoint(e.clientX, e.clientY);
        const hit = drawings.find((d) =>
          pointNearPath(point, d, ERASE_RADIUS)
        );
        if (hit) void removeDrawingMemory(hit.id);
        return;
      }

      if (!drawingRef.current || !isDrawing) return;

      const point = getFlowPoint(e.clientX, e.clientY);
      const prev = pointsRef.current;
      const last = prev[prev.length - 1];
      if (last && dist(last, point) < 2) return;

      pointsRef.current = [...prev, point];
      updatePreview();
    },
    [isDrawing, isErasing, getFlowPoint, drawings, updatePreview]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      releaseCapture();
      if (!drawingRef.current) return;
      drawingRef.current = false;
      void finishStroke();
    },
    [finishStroke, releaseCapture]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      releaseCapture();
      drawingRef.current = false;
      pointsRef.current = [];
      updatePreview();
    },
    [releaseCapture, updatePreview]
  );

  return (
    <svg
      ref={svgRef}
      className={`absolute inset-0 h-full w-full touch-none ${
        isDrawMode ? "z-[5] cursor-crosshair" : "pointer-events-none z-[1]"
      }`}
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: "0 0",
        cursor: isErasing ? "cell" : isDrawing ? "crosshair" : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
        ref={previewPathRef}
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
