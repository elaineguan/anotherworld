"use client";

import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvasStore";
import { useUiStore } from "@/store/uiStore";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  createNoteAt,
  createImageMemory,
  persistNote,
  persistImage,
  saveAllMemories,
} from "@/hooks/useMemorySync";
import { uploadMemoryImage } from "@/lib/storage";
import { ensureFirebaseInitialized } from "@/lib/firebase";
import type { CanvasTool } from "@/types";

const TOOLS: { id: CanvasTool; label: string }[] = [
  { id: "select", label: "Wander" },
  { id: "note", label: "Leave a Thought" },
  { id: "image", label: "Add a Memento" },
  { id: "draw", label: "Trace" },
];

function isToolActive(tool: CanvasTool, id: CanvasTool): boolean {
  if (id === "draw") return tool === "draw" || tool === "erase";
  if (id === "select") return tool === "select";
  return tool === id;
}

function toolButtonClass(active: boolean): string {
  return active
    ? "bg-[#E4E0D8] text-[#0A0A0A]"
    : "text-[#5A5A5A] hover:bg-[#EDE9E1] hover:text-[#1A1A1A]";
}

export function Toolbar() {
  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const showSaveToast = useUiStore((s) => s.showSaveToast);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      setTool("select");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setTool]);

  const handleSave = async () => {
    await saveAllMemories();
    showSaveToast();
  };

  const centerFlow = () => {
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    return center;
  };

  const handleNote = async () => {
    setTool("select");
    const { x, y } = centerFlow();
    const note = createNoteAt(x - 110, y - 70);
    await persistNote(note);
  };

  const handleImageClick = () => {
    setTool("select");
    fileInputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const { x, y } = centerFlow();
    let url: string | null = null;

    const firebaseOk = await ensureFirebaseInitialized();
    if (firebaseOk) {
      url = await uploadMemoryImage(file);
      if (!url) {
        console.error(
          "Image upload failed. Check Firebase Storage rules and bucket config."
        );
        return;
      }
    } else {
      url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const img = new window.Image();
    img.onload = async () => {
      const maxImageSize = 280;
      const captionHeight = 32;
      const ratio = img.width / img.height;
      let imageWidth = Math.min(maxImageSize, img.width);
      let imageHeight = imageWidth / ratio;
      if (imageHeight > maxImageSize) {
        imageHeight = maxImageSize;
        imageWidth = imageHeight * ratio;
      }
      const memory = createImageMemory(
        url!,
        x - imageWidth / 2,
        y - (imageHeight + captionHeight) / 2,
        imageWidth,
        imageHeight + captionHeight
      );
      await persistImage(memory);
    };
    img.src = url;
  };

  const handleToolClick = (id: CanvasTool) => {
    if (id === "note") {
      void handleNote();
      return;
    }
    if (id === "image") {
      handleImageClick();
      return;
    }
    if (id === "draw") {
      if (tool === "draw" || tool === "erase") {
        setTool("select");
      } else {
        setTool("draw");
      }
      return;
    }
    setTool("select");
  };

  return (
    <div className="canvas-toolbar pointer-events-auto z-50 m-5 flex gap-3">
      <div className="flex flex-col gap-0.5 rounded-sm border border-[#D8D4CC] bg-[#F8F6F2]/95 px-1 py-1.5 font-[family-name:var(--font-dm-mono)] text-[18px] backdrop-blur-sm">
        {TOOLS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleToolClick(id)}
            className={`rounded-sm px-3 py-1 text-left transition-colors duration-200 ${toolButtonClass(isToolActive(tool, id))}`}
          >
            {label}
          </button>
        ))}
        {(tool === "draw" || tool === "erase") && (
          <div className="mt-0.5 flex flex-col gap-0.5 border-t border-[#D8D4CC] pt-0.5">
            <button
              type="button"
              onClick={() => setTool("draw")}
              className={`rounded-sm px-3 py-0.5 text-left transition-colors duration-200 ${toolButtonClass(tool === "draw")}`}
            >
              pen
            </button>
            <button
              type="button"
              onClick={() => setTool("erase")}
              className={`rounded-sm px-3 py-0.5 text-left transition-colors duration-200 ${toolButtonClass(tool === "erase")}`}
            >
              erase
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div className="flex flex-col gap-0.5 rounded-sm border border-[#D8D4CC] bg-[#F8F6F2]/95 px-1 py-1.5 font-[family-name:var(--font-dm-mono)] text-[18px] backdrop-blur-sm">
        <button
          type="button"
          onClick={() => void undo()}
          disabled={!canUndo}
          className={`rounded-sm px-3 py-1 text-left transition-colors duration-200 ${
            canUndo
              ? "text-[#5A5A5A] hover:bg-[#EDE9E1] hover:text-[#1A1A1A]"
              : "cursor-not-allowed text-[#B8B8B8]"
          }`}
        >
          undo
        </button>
        <button
          type="button"
          onClick={() => void redo()}
          disabled={!canRedo}
          className={`rounded-sm px-3 py-1 text-left transition-colors duration-200 ${
            canRedo
              ? "text-[#5A5A5A] hover:bg-[#EDE9E1] hover:text-[#1A1A1A]"
              : "cursor-not-allowed text-[#B8B8B8]"
          }`}
        >
          redo
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          className="rounded-sm px-3 py-1 text-left text-[#5A5A5A] transition-colors duration-200 hover:bg-[#EDE9E1] hover:text-[#1A1A1A]"
        >
          save
        </button>
      </div>
    </div>
  );
}
