"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import type { MemoryNodeData, NoteMemory } from "@/types";
import { persistNote, saveNoteToCloud } from "@/hooks/useMemorySync";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useCanvasStore } from "@/store/canvasStore";
import { isNoteEditing, setNoteEditing } from "@/lib/editing-registry";
import { isNoteDeleted } from "@/lib/deletion-registry";

type NoteFlowNode = Node<MemoryNodeData, "note">;

function isNoteOnCanvas(noteId: string): boolean {
  return useCanvasStore.getState().notes.some((n) => n.id === noteId);
}

function NoteNodeComponent({ data, selected }: NodeProps<NoteFlowNode>) {
  const noteId = data.noteId ?? data.note?.id;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevSelectedRef = useRef(false);

  const noteWidth = useCanvasStore(
    (s) => s.notes.find((note) => note.id === noteId)?.width ?? 220
  );
  const noteHeight = useCanvasStore(
    (s) => s.notes.find((note) => note.id === noteId)?.height ?? 140
  );

  const syncedContent = useCanvasStore((s) => {
    const n = s.notes.find((note) => note.id === noteId);
    return n?.content ?? "";
  });

  const [content, setContent] = useState(() => syncedContent);

  const debouncedPersist = useDebouncedCallback((value: string) => {
    if (!noteId || isNoteDeleted(noteId) || !isNoteOnCanvas(noteId)) return;
    const base = useCanvasStore.getState().notes.find((n) => n.id === noteId);
    if (!base) return;

    const draft: NoteMemory = {
      ...base,
      content: value,
      updatedAt: Date.now(),
    };
    useCanvasStore.getState().upsertNote(draft);
    void saveNoteToCloud(draft);
  }, 350);

  useEffect(() => {
    return () => {
      debouncedPersist.cancel();
      if (noteId) setNoteEditing(noteId, false);
    };
  }, [debouncedPersist, noteId]);

  useEffect(() => {
    if (!noteId) return;
    if (isNoteEditing(noteId)) return;
    if (document.activeElement === textareaRef.current) return;
    setContent(syncedContent);
  }, [noteId, syncedContent]);

  const flushContent = useCallback(() => {
    if (!noteId || isNoteDeleted(noteId)) return;
    debouncedPersist.cancel();
    if (!isNoteOnCanvas(noteId)) return;

    const base = useCanvasStore.getState().notes.find((n) => n.id === noteId);
    if (!base) return;

    const draft: NoteMemory = {
      ...base,
      content,
      updatedAt: Date.now(),
    };
    useCanvasStore.getState().upsertNote(draft);
    void saveNoteToCloud(draft);
  }, [content, debouncedPersist, noteId]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      debouncedPersist(e.target.value);
    },
    [debouncedPersist]
  );

  const handleFocus = useCallback(() => {
    if (noteId) setNoteEditing(noteId, true);
  }, [noteId]);

  const handleBlur = useCallback(() => {
    if (noteId) setNoteEditing(noteId, false);
    flushContent();
  }, [noteId, flushContent]);

  const stopDeleteShortcut = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.stopPropagation();
      }
    },
    []
  );

  useEffect(() => {
    if (selected && !prevSelectedRef.current) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
    prevSelectedRef.current = selected;
  }, [selected]);

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      if (!noteId || !isNoteOnCanvas(noteId)) return;
      const base = useCanvasStore.getState().notes.find((n) => n.id === noteId);
      if (!base) return;
      void persistNote({
        ...base,
        width: params.width,
        height: params.height,
        updatedAt: Date.now(),
      });
    },
    [noteId]
  );

  if (!noteId) return null;

  return (
    <>
      <NodeResizer
        minWidth={160}
        minHeight={100}
        isVisible={selected}
        lineClassName="!border-[#D8D4CC]"
        handleClassName="!h-2 !w-2 !rounded-full !border !border-[#D8D4CC] !bg-[#F8F6F2]"
        onResizeEnd={handleResize}
      />
      <div
        className="h-full w-full rounded-sm border border-[#D8D4CC] bg-[#F8F6F2] p-3 shadow-none"
        style={{ minWidth: noteWidth, minHeight: noteHeight }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={stopDeleteShortcut}
          onKeyDownCapture={stopDeleteShortcut}
          placeholder="A wandering thought..."
          className="nodrag nopan h-full w-full resize-none bg-transparent font-[family-name:var(--font-eb-garamond)] text-base leading-relaxed text-[#5A5A5A] outline-none placeholder:text-[#949494]"
        />
      </div>
    </>
  );
}

export const NoteNode = memo(NoteNodeComponent);
