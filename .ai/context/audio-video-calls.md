# Audio/Video Calls & Meetings

## Overview

Direct audio/video calls between organization members, group meetings, and external guest meetings, powered by LiveKit Cloud. Media streams browser-to-LiveKit only; Hono issues short-lived room-scoped tokens and processes signed webhooks.

## Provider

- LiveKit Cloud free tier (Build plan): 5,000 participant-minutes/month, 100 concurrent connections, 50 GB downstream. Hard cap, resets monthly.
- SDKs: `livekit-server-sdk` (server token minting + webhook verification), `livekit-client` + `@livekit/components-react` + `@livekit/components-styles` (browser). All React 19 compatible.
- Wrapped behind `http/services/livekit.service.ts` so self-hosted LiveKit or another compatible SFU can replace Cloud later without app rewrites (only `LIVEKIT_URL` + keys change).

## Data model

- `db/schema/call.ts`: `calls`, `call_participants` (+ `call_type`, `call_status`, `call_participant_status` enums).
- `db/schema/meeting.ts`: `meetings`, `meeting_invitations`, `meeting_participants`, `livekit_webhook_events` (+ `meeting_status`, `meeting_invitation_type` enums).
- Notification enums extended with `CALL_INVITE`, `MEETING_INVITE` types and `CALL`, `MEETING` entity types.
- No media/recordings in PostgreSQL.

## API (Hono)

Public (mounted before `authMiddleware`):

- `POST /api/webhooks/livekit` — verified LiveKit webhooks (`WebhookReceiver`, raw body). Idempotent via unique event-id table + conditional updates.

Authenticated:

- `POST /api/calls` — start call (type, calleeId; same-org check, duplicate/ringing guards, rate-limited).
- `GET /api/calls` — history. `GET /api/calls/active` — ringing/active for me (expires stale rings lazily). `GET /api/calls/:id`.
- `POST /api/calls/:id/accept|reject|cancel|leave|token`.
- `POST /api/meetings` — create (title, scheduledAt?, guestAccess), rate-limited.
- `GET /api/meetings`, `GET /api/meetings/:id`.
- `POST /api/meetings/:id/invitations` — invite members. `DELETE /api/meetings/:id/invitations/:invitationId` — revoke.
- `POST /api/meetings/:id/guest-link` — mint/rotate hashed guest token (raw returned once).
- `POST /api/meetings/:id/join` — member join → LiveKit token.
- `POST /api/meetings/:id/leave`, `POST /api/meetings/:id/end`.
- `POST /api/meetings/public/:token/join` — guest join (name entry; validates hash, expiry, revocation, guest access).

Tokens: TTL 15 min, grants scoped to a single room (`roomJoin`, publish/subscribe, no admin). Identity `user_<uuid>` / `guest_<uuid>`. Credentials stay server-side.

## Call lifecycle

`RINGING → ACTIVE → ENDED`, with `REJECTED`, `CANCELLED`, `MISSED` (45 s ring timeout, expired lazily on read). Duplicate prevention: one non-terminal call per user (checked transactionally). Webhook `participant_left`/`room_finished` end calls/meetings idempotently.

## Real-time notifications

No WebSocket infra exists in CollaBill; incoming calls use React Query polling of `/api/calls/active` (5 s) in a layout-mounted `CallManager`, plus a DB notification for the bell. Call/meeting invites reuse `createNotification`.

## UI

- `app/(private)/meetings/` — list, create modal, detail drawer (invite, share link, revoke, history).
- `app/(private)/meetings/[id]/` — member meeting room (`LiveKitRoom`, screen share).
- `app/meet/[token]/` — public guest join page (name → room; no app access).
- `app/(private)/_components/calls/` — `CallManager` (poll + incoming modal + active call overlay), mounted in private layout; call buttons in team member list.
- Nav: Meetings item; history via meetings page + call history table.

## Security

- Org context from session only; every query filtered by `organizationId`; cross-org targets rejected (403/404).
- Guests: hashed single-purpose tokens (SHA-256), expiry + revocation checks, room-scoped grants, no org/session access.
- Webhook signature verification; in-memory rate limits on call/meeting creation, token issuance, guest join; no tokens/secrets logged.
- Env: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (optional in schema so the app boots unconfigured; calling/meetings return 503 until set).

## Known limitations

- In-memory rate limiting is per-instance (no Redis by design).
- Ring detection latency up to the 5 s poll interval.
- No recording/transcription (paid features, out of scope).
