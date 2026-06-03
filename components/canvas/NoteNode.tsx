"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import type { MemoryNodeData } from "@/types";

type NoteFlowNode = Node<MemoryNodeData, "note">;
import { persistNote } from "@/hooks/useMemorySync";
import { useDebouncedCallback } from "@/hooks/useDebounce";

function NoteNodeComponent({ data, selected }: NodeProps<NoteFlowNode>) {
  const note = data.note!;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  const [content, setContent] = useState(note.content);

  const debouncedPersist = useDebouncedCallback((value: string) => {
    void persistNote(
      {
        ...noteRef.current,
        content: value,
        updatedAt: Date.now(),
      },
      false
    );
  }, 350);

  useEffect(() => {
    setContent(note.content);
  }, [note.id]);

  useEffect(() => {
    if (document.activeElement === textareaRef.current) return;
    setContent(note.content);
  }, [note.content]);

  const flushContent = useCallback(() => {
    debouncedPersist.cancel();
    void persistNote(
      {
        ...noteRef.current,
        content,
        updatedAt: Date.now(),
      },
      false
    );
  }, [content, debouncedPersist]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);
      debouncedPersist(value);
    },
    [debouncedPersist]
  );

  useEffect(() => {
    if (selected && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selected]);

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
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
          onBlur={flushContent}
          placeholder="A wandering thought..."
          className="nodrag nopan h-full w-full resize-none bg-transparent font-[family-name:var(--font-eb-garamond)] text-base leading-relaxed text-[#5A5A5A] outline-none placeholder:text-[#949494]"
        />
      </div>
    </>
  );
}

export const NoteNode = memo(NoteNodeComponent);
