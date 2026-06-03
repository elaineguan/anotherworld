# Isekai x Experiment

A shared memory archive — an infinite collaborative canvas where sixteen travelers inhabit one consciousness. Built with Next.js 15, React Flow, Zustand, and Firebase.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Firebase (shared world)

Copy `.env.example` to `.env.local` and add your Firebase project credentials. Without Firebase, memories persist in the browser via `localStorage` for local exploration.

Firestore collections:

- `notes` — text fragments
- `images` — memento metadata (files in Storage)
- `drawings` — vector traces

Enable Firestore and Storage in the Firebase console. Use open security rules only for private experiments; lock down rules for production.

## Structure

```
/app          — routes and global styles
/components   — UI (landing, intro, canvas)
/hooks        — typewriter, memory sync
/lib          — Firebase, persistence helpers
/store        — Zustand (UI phase, canvas state)
/types        — shared TypeScript types
```

## Stack

- Next.js 15 · React · TypeScript · Tailwind
- [@xyflow/react](https://reactflow.dev) — infinite pan & zoom
- Zustand · Firebase Firestore & Storage
