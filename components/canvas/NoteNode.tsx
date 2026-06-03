"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import type { MemoryNodeData, NoteMemory } from "@/types";

type NoteFlowNode = Node<MemoryNodeData, "note">;
import { persistNote, saveNoteToCloud } from "@/hooks/useMemorySync";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useCanvasStore } from "@/store/canvasStore";

function isNoteOnCanvas(noteId: string): boolean {
  return useCanvasStore.getState().notes.some((n) => n.id === noteId);
}

function NoteNodeComponent({ data, selected }: NodeProps<NoteFlowNode>) {
  const note = data.note!;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  const [content, setContent] = useState(note.content);

  const debouncedCloudSave = useDebouncedCallback((note: NoteMemory) => {
    if (!isNoteOnCanvas(note.id)) return;
    void saveNoteToCloud(note);
  }, 350);

  useEffect(() => {
    return () => debouncedCloudSave.cancel();
  }, [debouncedCloudSave]);

  useEffect(() => {
    setContent(note.content);
  }, [note.id]);

  useEffect(() => {
    if (document.activeElement === textareaRef.current) return;
    setContent(note.content);
  }, [note.content]);

  const flushContent = useCallback(() => {
    debouncedCloudSave.cancel();
    const id = noteRef.current.id;
    if (!isNoteOnCanvas(id)) return;
    void saveNoteToCloud({
      ...noteRef.current,
      content,
      updatedAt: Date.now(),
    });
  }, [content, debouncedCloudSave]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);
      const draft: NoteMemory = {
        ...noteRef.current,
        content: value,
        updatedAt: Date.now(),
      };
      noteRef.current = draft;
      useCanvasStore.getState().upsertNote(draft);
      debouncedCloudSave(draft);
    },
    [debouncedCloudSave]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.stopPropagation();
      }
    },
    []
  );

  useEffect(() => {
    if (selected && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selected]);

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      if (!isNoteOnCanvas(note.id)) return;
      void persistNote({
        ...note,
        width: params.width,
        height: params.height,
        updatedAt: Date.now(),
      });
    },
    [note]
  );

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
        style={{ minWidth: note.width, minHeight: note.height }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={flushContent}
          placeholder="A wandering thought..."
          className="nodrag nopan h-full w-full resize-none bg-transparent font-[family-name:var(--font-eb-garamond)] text-base leading-relaxed text-[#5A5A5A] outline-none placeholder:text-[#949494]"
        />
      </div>
    </>
  );
}

export const NoteNode = memo(NoteNodeComponent);
