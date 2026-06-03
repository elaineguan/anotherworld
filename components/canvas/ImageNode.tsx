"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import type { MemoryNodeData, ImageMemory } from "@/types";
import { persistImage, saveImageToCloud } from "@/hooks/useMemorySync";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useCanvasStore } from "@/store/canvasStore";
import { isImageEditing, setImageEditing } from "@/lib/editing-registry";

type ImageFlowNode = Node<MemoryNodeData, "image">;

function isImageOnCanvas(imageId: string): boolean {
  return useCanvasStore.getState().images.some((i) => i.id === imageId);
}

function ImageNodeComponent({ data, selected }: NodeProps<ImageFlowNode>) {
  const imageId = data.imageId ?? data.image?.id;
  const inputRef = useRef<HTMLInputElement>(null);

  const storageUrl = useCanvasStore(
    (s) => s.images.find((i) => i.id === imageId)?.storageUrl ?? ""
  );
  const imageWidth = useCanvasStore(
    (s) => s.images.find((i) => i.id === imageId)?.width ?? 0
  );
  const imageHeight = useCanvasStore(
    (s) => s.images.find((i) => i.id === imageId)?.height ?? 0
  );
  const hasImage = useCanvasStore((s) =>
    s.images.some((i) => i.id === imageId)
  );

  const syncedCaption = useCanvasStore((s) => {
    const img = s.images.find((i) => i.id === imageId);
    return img?.caption ?? "";
  });

  const [caption, setCaption] = useState(() => syncedCaption);

  const debouncedPersist = useDebouncedCallback((value: string) => {
    if (!imageId || !isImageOnCanvas(imageId)) return;
    const base = useCanvasStore.getState().images.find((i) => i.id === imageId);
    if (!base) return;

    const draft: ImageMemory = {
      ...base,
      caption: value,
      updatedAt: Date.now(),
    };
    useCanvasStore.getState().upsertImage(draft);
    void saveImageToCloud(draft);
  }, 350);

  useEffect(() => {
    return () => {
      debouncedPersist.cancel();
      if (imageId) setImageEditing(imageId, false);
    };
  }, [debouncedPersist, imageId]);

  useEffect(() => {
    if (!imageId) return;
    if (isImageEditing(imageId)) return;
    if (document.activeElement === inputRef.current) return;
    setCaption(syncedCaption);
  }, [imageId, syncedCaption]);

  const flushCaption = useCallback(() => {
    if (!imageId) return;
    debouncedPersist.cancel();
    if (!isImageOnCanvas(imageId)) return;

    const base = useCanvasStore.getState().images.find((i) => i.id === imageId);
    if (!base) return;

    const draft: ImageMemory = {
      ...base,
      caption,
      updatedAt: Date.now(),
    };
    useCanvasStore.getState().upsertImage(draft);
    void saveImageToCloud(draft);
  }, [caption, debouncedPersist, imageId]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCaption(e.target.value);
      debouncedPersist(e.target.value);
    },
    [debouncedPersist]
  );

  const handleFocus = useCallback(() => {
    if (imageId) setImageEditing(imageId, true);
  }, [imageId]);

  const handleBlur = useCallback(() => {
    if (imageId) setImageEditing(imageId, false);
    flushCaption();
  }, [imageId, flushCaption]);

  const stopDeleteShortcut = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.stopPropagation();
      }
    },
    []
  );

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      if (!imageId || !isImageOnCanvas(imageId)) return;
      const base = useCanvasStore.getState().images.find((i) => i.id === imageId);
      if (!base) return;
      void persistImage({
        ...base,
        width: params.width,
        height: params.height,
        updatedAt: Date.now(),
      });
    },
    [imageId]
  );

  if (!imageId || !hasImage || imageWidth <= 0 || imageHeight <= 0) {
    return null;
  }

  return (
    <>
      <NodeResizer
        minWidth={120}
        minHeight={120}
        isVisible={selected}
        lineClassName="!border-[#D8D4CC]"
        handleClassName="!h-2 !w-2 !rounded-full !border !border-[#D8D4CC] !bg-[#F8F6F2]"
        onResizeEnd={handleResize}
      />
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-sm border border-[#D8D4CC] bg-[#F8F6F2]"
        style={{ width: imageWidth, height: imageHeight }}
      >
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {storageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storageUrl}
              alt={caption || "Memory fragment"}
              draggable={false}
              className="max-h-full max-w-full object-contain"
            />
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={caption}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={stopDeleteShortcut}
          onKeyDownCapture={stopDeleteShortcut}
          placeholder="Optional trace..."
          className="nodrag nopan h-8 shrink-0 border-t border-[#D8D4CC] bg-transparent px-2 font-[family-name:var(--font-dm-mono)] text-xs text-[#5A5A5A] outline-none placeholder:text-[#949494]"
        />
      </div>
    </>
  );
}

export const ImageNode = memo(ImageNodeComponent);
