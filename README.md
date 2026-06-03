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

## Deploy on Vercel

1. Import the GitHub repo `elaineguan/anotherworld` in [Vercel](https://vercel.com/new).
2. **Framework Preset:** Next.js  
3. **Root Directory:** leave blank (repo root)  
4. **Output Directory:** leave blank — do not set `out`, `dist`, or `.next`  
5. **Node.js:** 20 (matches `.nvmrc`)

After deploy, open the URL from the green **Visit** button on the latest deployment — not an old preview link.

**Note:** `anotherworld.vercel.app` may already belong to a different Vercel project (unrelated site). Your app will get its own URL, e.g. `anotherworld-your-team.vercel.app` or a custom domain you assign.

If you still see `404: NOT_FOUND`:

- Confirm the latest deployment status is **Ready** (not Error or Canceled).
- In **Settings → General**, set Framework to **Next.js** and clear any custom Output Directory.
- **Redeploy** (Deployments → ⋯ → Redeploy) or delete the project and re-import the repo.

## Stack

- Next.js 15 · React · TypeScript · Tailwind
- [@xyflow/react](https://reactflow.dev) — infinite pan & zoom
- Zustand · Firebase Firestore & Storage
