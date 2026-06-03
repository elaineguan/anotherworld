# Isekai x Experiment

A shared memory archive — an infinite collaborative canvas where sixteen travelers inhabit one consciousness. Built with Next.js 15, React Flow, Zustand, and Firebase.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Firebase (shared world — required for multi-user)

Without Firebase, notes only save in **this browser** (`localStorage`). Other people will not see them.

1. Create a Firebase project and enable **Firestore** and **Storage**.
2. Copy `.env.example` to `.env.local` and fill in all `NEXT_PUBLIC_FIREBASE_*` values.
3. Deploy security rules from this repo:
   - `firestore.rules` → Firestore → Rules → Publish
   - `storage.rules` → Storage → Rules → Publish
4. On **Vercel**, add the same env vars under Project → Settings → Environment Variables, then redeploy.

The canvas footer shows **shared canvas · live sync** when Firebase is connected. If it says **this device only**, sharing is not enabled.

Firestore collections:

- `notes` — text fragments
- `images` — memento metadata (image files in Storage)
- `drawings` — vector traces

Use open rules only for trusted collaborators; tighten rules before a public launch.

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
