"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import type { MemoryNodeData, ImageMemory } from "@/types";

type ImageFlowNode = Node<MemoryNodeData, "image">;
import { persistImage, saveImageToCloud } from "@/hooks/useMemorySync";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useCanvasStore } from "@/store/canvasStore";

function isImageOnCanvas(imageId: string): boolean {
  return useCanvasStore.getState().images.some((i) => i.id === imageId);
}

function ImageNodeComponent({ data, selected }: NodeProps<ImageFlowNode>) {
  const image = data.image!;
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef(image);
  imageRef.current = image;

  const [caption, setCaption] = useState(image.caption);

  const debouncedCloudSave = useDebouncedCallback((image: ImageMemory) => {
    if (!isImageOnCanvas(image.id)) return;
    void saveImageToCloud(image);
  }, 350);

  useEffect(() => {
    return () => debouncedCloudSave.cancel();
  }, [debouncedCloudSave]);

  useEffect(() => {
    setCaption(image.caption);
  }, [image.id]);

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setCaption(image.caption);
  }, [image.caption]);

  const flushCaption = useCallback(() => {
    debouncedCloudSave.cancel();
    const id = imageRef.current.id;
    if (!isImageOnCanvas(id)) return;
    void saveImageToCloud({
      ...imageRef.current,
      caption,
      updatedAt: Date.now(),
    });
  }, [caption, debouncedCloudSave]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCaption(value);
      const draft: ImageMemory = {
        ...imageRef.current,
        caption: value,
        updatedAt: Date.now(),
      };
      imageRef.current = draft;
      useCanvasStore.getState().upsertImage(draft);
      debouncedCloudSave(draft);
    },
    [debouncedCloudSave]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.stopPropagation();
      }
    },
    []
  );

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      if (!isImageOnCanvas(image.id)) return;
      void persistImage({
        ...image,
        width: params.width,
        height: params.height,
        updatedAt: Date.now(),
      });
    },
    [image]
  );

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
        style={{ width: image.width, height: image.height }}
      >
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {image.storageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.storageUrl}
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
          onKeyDown={handleKeyDown}
          onBlur={flushCaption}
          placeholder="Optional trace..."
          className="nodrag nopan h-8 shrink-0 border-t border-[#D8D4CC] bg-transparent px-2 font-[family-name:var(--font-dm-mono)] text-xs text-[#5A5A5A] outline-none placeholder:text-[#949494]"
        />
      </div>
    </>
  );
}

export const ImageNode = memo(ImageNodeComponent);
