"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  type Node,
  type OnNodesChange,
  applyNodeChanges,
  BackgroundVariant,
  Background,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NoteNode } from "./NoteNode";
import { ImageNode } from "./ImageNode";
import { WelcomeNode } from "./WelcomeNode";
import { DrawingLayer } from "./DrawingLayer";
import { Toolbar } from "./Toolbar";
import { SaveToast } from "./SaveToast";
import { SyncIndicator } from "./SyncIndicator";
import { useCanvasStore } from "@/store/canvasStore";
import {
  useMemorySync,
  persistNote,
  persistImage,
  removeNoteMemory,
  removeImageMemory,
} from "@/hooks/useMemorySync";
import type { MemoryNodeData } from "@/types";

const WELCOME_NODE_ID = "welcome-message";
const WELCOME_WIDTH = 448;
const WELCOME_HEIGHT = 420;

const nodeTypes = {
  note: NoteNode,
  image: ImageNode,
  welcome: WelcomeNode,
};

function getWelcomePosition() {
  if (typeof window === "undefined") {
    return { x: -WELCOME_WIDTH / 2, y: -WELCOME_HEIGHT / 2 };
  }

  return {
    x: window.innerWidth / 2 - WELCOME_WIDTH / 2,
    y: window.innerHeight / 2 - WELCOME_HEIGHT / 2 - 60,
  };
}

function notesToNodes(
  notes: ReturnType<typeof useCanvasStore.getState>["notes"],
  images: ReturnType<typeof useCanvasStore.getState>["images"],
  welcomePosition: { x: number; y: number }
): Node[] {
  const welcomeNode: Node = {
    id: WELCOME_NODE_ID,
    type: "welcome",
    position: welcomePosition,
    data: {},
    draggable: false,
    selectable: false,
    focusable: false,
    deletable: false,
    zIndex: 0,
  };

  const noteNodes: Node<MemoryNodeData>[] = notes.map((note) => ({
    id: note.id,
    type: "note",
    position: { x: note.x, y: note.y },
    data: { memoryType: "note", note },
    style: { width: note.width, height: note.height },
    draggable: true,
    selectable: true,
  }));

  const imageNodes: Node<MemoryNodeData>[] = images.map((image) => ({
    id: image.id,
    type: "image",
    position: { x: image.x, y: image.y },
    data: { memoryType: "image", image },
    style: { width: image.width, height: image.height },
    draggable: true,
    selectable: true,
  }));

  return [welcomeNode, ...noteNodes, ...imageNodes];
}

function CanvasInner() {
  useMemorySync();
  const notes = useCanvasStore((s) => s.notes);
  const images = useCanvasStore((s) => s.images);
  const tool = useCanvasStore((s) => s.tool);
  const [welcomePosition, setWelcomePosition] = useState(getWelcomePosition);

  useEffect(() => {
    const onResize = () => setWelcomePosition(getWelcomePosition());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const merged = useMemo(
    () => notesToNodes(notes, images, welcomePosition),
    [notes, images, welcomePosition]
  );

  const [nodes, setNodes] = useNodesState(merged);

  useEffect(() => {
    setNodes((prev) => {
      if (prev.length === 0) return merged;
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return merged.map((next) => {
        const cur = prevById.get(next.id);
        if (!cur) return next;
        return {
          ...next,
          selected: cur.selected,
          dragging: cur.dragging,
        };
      });
    });
  }, [merged, setNodes]);

  const handleNodesDelete = useCallback((deleted: Node[]) => {
    for (const node of deleted) {
      if (node.id === WELCOME_NODE_ID) continue;
      if (node.type === "note") void removeNoteMemory(node.id);
      else if (node.type === "image") void removeImageMemory(node.id);
    }
  }, []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const filtered = changes.filter(
          (c) => !("id" in c) || c.id !== WELCOME_NODE_ID
        );
        if (filtered.length === 0) return nds;

        const updated = applyNodeChanges(filtered, nds) as Node<MemoryNodeData>[];
        for (const change of filtered) {
          if (change.type === "remove") {
            const node = nds.find((n) => n.id === change.id);
            if (!node) continue;
            if (node.type === "note") {
              void removeNoteMemory(node.id);
            } else if (node.type === "image") {
              void removeImageMemory(node.id);
            }
            continue;
          }

          if (
            change.type === "position" &&
            change.position &&
            !change.dragging
          ) {
            const node = updated.find((n) => n.id === change.id);
            if (!node) continue;
            const data = node.data as MemoryNodeData;
            if (data.memoryType === "note" && data.note) {
              void persistNote({
                ...data.note,
                x: change.position.x,
                y: change.position.y,
                updatedAt: Date.now(),
              });
            }
            if (data.memoryType === "image" && data.image) {
              void persistImage({
                ...data.image,
                x: change.position.x,
                y: change.position.y,
                updatedAt: Date.now(),
              });
            }
          }
        }
        return updated;
      });
    },
    [setNodes]
  );

  const isWandering = tool === "select";

  return (
    <div className="relative h-full min-h-0 w-full">
      <SaveToast />
      <ReactFlow
        className={`memory-flow ${tool === "draw" || tool === "erase" ? "memory-flow--draw" : ""}`}
        nodes={nodes}
        onNodesChange={onNodesChange}
        onNodesDelete={handleNodesDelete}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.15}
        maxZoom={3}
        panOnDrag={isWandering}
        panOnScroll={false}
        zoomOnScroll
        zoomOnPinch
        selectionOnDrag={false}
        nodesDraggable={isWandering}
        nodesConnectable={false}
        elementsSelectable={isWandering}
        deleteKeyCode={isWandering ? ["Backspace", "Delete"] : null}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={24}
          size={1}
          color="rgba(216, 212, 204, 0.45)"
          lineWidth={1}
        />
        <DrawingLayer />
        <Panel position="top-left" className="canvas-panel !m-0 !p-0">
          <Toolbar />
          <SyncIndicator />
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function MemoryCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
