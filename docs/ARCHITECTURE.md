# Architecture

How this app is put together, and where your code should go. Read this once
before your first ticket — it'll save you guessing.

> **This is Next.js 16.** It differs from most tutorials and from what AI
> assistants tend to suggest. When something doesn't behave the way you expect,
> the authoritative docs are bundled in `node_modules/next/dist/docs/`. Search
> there before trusting a blog post.

---

## The shape of it

One Next.js app is the whole system — frontend, backend, and database access.
There is no separate API server.

```
Browser
  │
  ├── page.tsx (server)      reads the database directly, passes props down
  │     └── view.tsx (client)  everything interactive
  │
  └── /api/* route handlers   called by client components via fetch
        └── SQLite file on disk
```

---

## The one pattern to learn

**Every page is a server component. Each renders a single client "view"
component and hands it plain data as props.**

```tsx
// src/app/(app)/candidates/page.tsx  — server
export default async function CandidatesPage() {
  const user = (await getCurrentUser())!;
  const candidates = getCandidateSummaries();   // reads SQLite synchronously
  return <CandidatesView candidates={candidates} currentUserId={user.id} />;
}
```

```tsx
// src/components/candidates/candidates-view.tsx  — client
"use client";
export function CandidatesView({ candidates, currentUserId }) {
  const [query, setQuery] = useState("");
  // …all the interactive bits
}
```

Why it's worth knowing: **your tickets almost always live in the client view
component**, not the page. The page just fetches. And because views take plain
props, they're straightforward to test — that's how every ticket test works.

Never import anything from `src/lib/db.ts`, `queries.ts`, `pipeline.ts` or
`report.ts` into a client component. They pull in `better-sqlite3`, which can't
run in a browser, and the error you get won't be obvious.

---

## Changing data

Client components call the API through the `api()` helper in
`src/lib/client.ts`. It sets the JSON headers, parses the response, and throws a
real `Error` with the server's message when something fails.

The standard mutation looks like this — copy it:

```tsx
const [loading, setLoading] = useState(false);

async function save() {
  setLoading(true);
  try {
    await api(`/api/candidates/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "selected" }),
    });
    toast.success("Saved");
    router.refresh();          // re-runs the server page so props update
  } catch (err) {
    toast.error((err as Error).message);
  } finally {
    setLoading(false);
  }
}
```

`router.refresh()` is how server-rendered data gets updated after a change.
Without it the page still shows the old props.

**Optimistic updates**: the interview console updates local state immediately and
saves in the background, because during a live interview you can't wait for a
round-trip. If you do that, you **must** roll back when the save fails — see
`changeStatus` in `candidate-detail.tsx` for the correct shape.

---

## Where things live

```
src/
  app/
    (app)/            signed-in pages — dashboard, candidates, question-bank, settings
    login/            sign in / register
    report/[token]/   public single-candidate report (no auth)
    batch/[token]/    public multi-candidate report (no auth)
    api/              route handlers — the backend
  components/
    ui/               shadcn primitives — check here before building anything
    candidates/       candidate list, detail, dialogs
    console/          the interview console (the richest part of the app)
    bank/             question bank management
    report/           shared report rendering
    settings/         settings and user management
    badges.tsx        StatusBadge, ScoreChip, DifficultyBadge… reuse these
    app-shell.tsx     header, nav, theme menu, profile menu
  lib/
    client.ts         api(), copyToClipboard(), fmtDate() — safe in the browser
    types.ts          every domain type and its label constants
    session.ts        role helpers — canInterview(), isAdmin()…
    themes.ts         the six themes
    db.ts             SQLite connection, schema, migrations   ← server only
    queries.ts        typed read queries                       ← server only
    pipeline.ts       dashboard/list aggregates                ← server only
tests/
  tickets/            one test file per ticket — your specification
```

---

## Theming — read this before writing any CSS

Six themes: two light (`daylight`, `latte`), four dark (`graphite`, `midnight`,
`forest`, `amoled`). The active one is a `data-theme` attribute on `<html>`,
resolved on the server from a cookie so there's no flash on load.

Every colour is a CSS custom property, so **you never write a colour value**:

| Use | Not |
|---|---|
| `bg-background`, `bg-card`, `bg-muted` | `bg-white`, `bg-gray-900` |
| `text-foreground`, `text-muted-foreground` | `text-black`, `text-gray-500` |
| `border` | `border-gray-200` |
| `text-destructive`, `text-success`, `text-warning` | `text-red-500`, `text-green-500` |
| `bg-primary text-primary-foreground` | `bg-blue-600 text-white` |

`success` and `warning` are additions to the standard shadcn set — they're what
the score colours use.

`--chart-1` … `--chart-5` are defined in all six themes for data visualisation.

Tailwind v4 here is **CSS-first** — there is no `tailwind.config.js`. Tokens are
defined in `src/app/globals.css`.

---

## Testing

Vitest + React Testing Library, in jsdom.

```powershell
npm test            # everything, once
npm run test:watch  # re-runs as you save
```

Because views are plain components taking props, a test just renders one:

```tsx
render(<CandidatesView candidates={fakeCandidates} currentUserId={1} />);
expect(screen.getByText("Nadia Fernandes")).toBeInTheDocument();
```

`tests/setup.ts` already handles the fiddly parts — `next/navigation` is mocked,
and the browser APIs Radix needs are stubbed. You shouldn't need to touch it.

Query the way a user would find things: `getByRole`, `getByLabelText`,
`getByText`. Reach for `getByTestId` only when a ticket specifies a `data-testid`.

---

## Roles

Three roles in the database — `admin`, `interviewer`, `hr` — shown in the admin UI
as **Access** (Admin / User) plus **Type** (Developer / HR / Product).

| | Admin | Interviewer | HR |
|---|---|---|---|
| Conduct interviews & score | ✅ | ✅ (own rounds) | ❌ |
| Add candidates, assign rounds | ✅ | ✅ | ✅ |
| Edit the question bank | ✅ | ✅ | ❌ |
| Manage users & settings | ✅ | ❌ | ❌ |

Use the helpers in `src/lib/session.ts` (`canInterview`, `canEditQuestionBank`,
`isAdmin`) — don't compare role strings yourself.

Permissions are enforced **server-side** in the route handlers. Hiding a button
is a UX nicety, not security.

---

## Gotchas

- `params` and `searchParams` are **Promises** in this Next version — `await` them.
- Middleware is `src/proxy.ts`, not `middleware.ts` (renamed in Next 16). It runs
  on the Edge runtime, so it must never import anything touching SQLite.
- The database is a file. Deleting `data/` deletes everything locally — harmless
  in development, re-seed with `npm run seed:demo`.
- Public routes (`/report/*`, `/batch/*`) render with no session. Never surface
  anything private there — no emails, no phone numbers.
