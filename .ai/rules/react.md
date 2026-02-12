# React Rules

## Components

- Server Components by default.
- `"use client"` only when required: hooks, browser APIs, event handlers, antd interactive components.
- Use Ant Design (`antd`) as the UI component library. Don't reinvent primitives (inputs, modals, tables, drawers, selects).
- Use React Hook Form + Zod for form handling and validation.
- Keep components small and focused (~250 LOC limit applies).

## Next.js file conventions in `app/`

- **`layout.tsx`** — Always a Server Component. Never `"use client"`.
- **`page.tsx`** — Always a Server Component. Never `"use client"`. Extract interactive parts into `_components/`.
- **`template.tsx`** — Use alongside `layout.tsx` when client-side behavior is genuinely required at the layout level (e.g. mount transitions, layout-scoped client state). This is the escape hatch — not `layout.tsx`.

## Styling

- **Antd tokens first.** All component customization goes through Ant Design's token system (global tokens, component tokens, `theme.useToken()`). Leverage antd's built-in props/APIs before reaching for CSS.
- **Tailwind for light styling.** Layout utilities, spacing, responsive tweaks — things antd doesn't own.
- **`globals.css`** for heavier overrides that can't be expressed via tokens.
- **Inline `style` prop** for very specific, one-off cases only.

## Hooks discipline

- Minimize `useEffect`. Prefer alternatives:
  - **Data fetching** → Server-side fetch or React Query (`useQuery`).
  - **Derived values** → Compute inline or `useMemo`.
  - **State synced to props** → Restructure the component, use `key` to reset.
  - **Event-driven logic** → Handle in event handlers, not effects.
- Acceptable `useEffect` uses: subscriptions, imperative DOM APIs, cleanup-dependent side effects.

## State

- Minimal client state. Derive when possible.
- Server state via React Query. Form state via React Hook Form.
- Avoid redundant state that mirrors props or server data.
