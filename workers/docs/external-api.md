# External API and Webhooks (P0)

The external API is server-to-server only. Never embed a long-lived key in a browser or mobile application. Existing SSO browser endpoints are unchanged.

## Provisioning and deployment

1. Create a queue named `yourself-email-webhooks` in the target Cloudflare account before deployment (or change both producer and consumer queue names in `wrangler.jsonc`). The Worker remains a single fetch/email/scheduled/queue deployment.
2. Generate a 32-byte base64 encryption key: `openssl rand -base64 32`. Set it as Worker Secret `WEBHOOK_MASTER_KEY`; set the same value in the GitHub production environment secret for CI deployments. For local development add it to ignored `workers/.dev.vars`. Never commit it or change it without re-encrypting existing endpoint secrets. Losing it prevents delivery to existing endpoints.
3. Back up D1, then apply migrations 0003–0005 using `pnpm db:migrate:remote` from `workers/`. These migrations add tables and do not replace existing mail data. Remote migration and deployment must target the same account/configuration.
4. Run `pnpm typecheck`, `pnpm test`, `pnpm deploy:check`; then deploy through the normal release process. Dry-run does not create the queue, set secrets, apply remote migrations, or verify actual network egress.
5. Verify a controlled public HTTPS receiver, actual email ingestion, DNS rebinding rejection, and original SSO flows in staging before production. Local HTTP receivers are deliberately unsupported; tests use mocked network I/O.

The per-minute cron recovers due deliveries and expired consumer leases. Existing attachment/session housekeeping runs hourly. D1 is the source of truth; Queues is only a wakeup channel. Missing/broken queue bindings leave durable deliveries pending until the binding is repaired. Monitor pending delivery age and `webhook_enqueue_deferred` / `webhook_consumer_failed` / `api_audit_failed` logs.

## Keys and authorization

SSO administrators manage keys at **API 密钥**. Each key is displayed once and stored as a SHA-256 digest of a 256-bit secret. Revocation is permanent; replacement keys can be created manually. Editing grants, disabling or expiry takes effect on subsequent requests, with another permission check immediately before sending.

Each key/mailbox grant has `mail:send`, `mail:read`, and/or `attachment:read`. Attachment permission requires mail read permission. A read-only detail response omits `attachments`. All external mailbox references are normalized email addresses; no internal mailbox UUID is returned.

Defaults: **60 requests/minute, 10,000 requests/day**, UTC fixed windows. Every authenticated external request that passes quota admission counts, including validation errors, unknown API routes and idempotent retries. Invalid keys and quota-rejected requests do not increment counters. Minute/day checks and increments happen together in a single D1 conditional update. 429 includes `Retry-After` in seconds. Requests already admitted may complete while another request revokes the key; sends recheck permission before provider invocation.

API logs retain 30 days of metadata; administrator audit records retain 90 days. Callback response bodies, request bodies, secrets and template variable values are never logged. Webhook delivery/attempt history is retained until a future retention policy is introduced.

## External endpoints

All endpoints use `Authorization: Bearer <key>` under `/api/open/v1`. They do not require Origin and do not enable cross-origin browser access. Responses use `{ "data": ... }` or `{ "error": { "code": "...", "message": "..." } }`; `X-Request-Id` correlates authenticated calls with administrator logs.

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/mailboxes` | Lists granted readable/sendable addresses and scopes |
| GET | `/mailboxes/{email}` | Any readable/sendable grant |
| POST | `/messages/send` | `mail:send` for `from` |
| GET | `/messages/send/{requestId}` | Same originating key and current `mail:send` |
| GET | `/mailboxes/{email}/messages` | `mail:read` |
| GET | `/mailboxes/{email}/messages/{messageId}` | `mail:read` |
| GET | `/mailboxes/{email}/messages/{messageId}/attachments` | `mail:read` + `attachment:read` |
| GET | `/mailboxes/{email}/messages/{messageId}/attachments/{attachmentId}` | `mail:read` + `attachment:read` |

URL-encode email path segments with `encodeURIComponent(email)`. Missing and unauthorized resources return 404; an authorized disabled sender mailbox or domain returns 409. Historical read access remains available when a mailbox/domain is disabled.

### Sending

```sh
curl "$BASE_URL/api/open/v1/messages/send" \
  -H "Authorization: Bearer $API_KEY" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $REQUEST_UUID" \
  --data '{"from":"support@example.com","to":[{"email":"user@example.com","name":"User"}],"subject":"Hello","text":"Hello!","html":"<p>Hello!</p>"}'
```

`to`, `cc`, `bcc` use address objects; combined maximum 50 recipients. Plain sending requires `subject` and `text`; `html` is optional. Template mode is mutually exclusive:

```json
{"from":"support@example.com","to":[{"email":"user@example.com"}],"templateCode":"verify","variables":{"username":"张三","code":"123456"}}
```

Idempotency-Key must be a UUID and is scoped to the key. Equivalent normalized JSON input returns the original request; changed input returns 409. Recipient array order is significant. First creation snapshots the template version and rendered message. Later publishing or disabling the template does not change a previously created request. Revoked permissions still prevent retrieving that request. Keep sending idempotency records for the full retry lifetime; P0 does not expire them automatically.

States are `pending`, `accepted`, `failed`, `unknown`. `accepted` means accepted by Cloudflare Email Service, not delivered. Ambiguous provider/runtime failures and interrupted pending requests become `unknown` and are never resent automatically. A definitive failure also returns its saved result for the same key; a deliberate new send requires a new UUID.

### Reading

```sh
curl "$BASE_URL/api/open/v1/mailboxes/support%40example.com/messages?unread=true&limit=30" \
  -H "Authorization: Bearer $API_KEY"
```

List filters: `q` (subject/snippet), `unread=true|false` (unread/read), `from` (exact normalized address), inclusive ISO-8601 `since` / `until`, `folder=inbox|archive|trash`, `limit=1..30`, and `cursor`. Defaults are inbox and 30 records. Results contain `items` and `nextCursor`; preserve the filters on subsequent pages. Ordering uses the existing mail `date` field, then resource ID, descending. Every folder and detail endpoint excludes outbound mail. Reads never mark mail as read. Lists do not load R2 bodies; details return sanitized HTML, text and authorized attachment metadata. A missing body returns 503, and a missing attachment object returns 404.

## Templates

The administrator editor accepts subject, text, HTML source and variable definitions:

```json
[{"name":"username","required":true,"maxLength":100,"mock":"张三"},{"name":"minutes","required":false,"default":5,"maxLength":3}]
```

Only `{{name}}` placeholders are supported. Unknown supplied variables, undeclared placeholders, expressions, missing required variables and excessive lengths are rejected. HTML variable substitutions are escaped; subject/text values remain text. Values can be strings, finite numbers or booleans. Optional values without defaults become empty strings. Previews/test sends can use mock values; external sends never use mock values.

Saving always creates an immutable draft version. Publishing uses the saved draft version ID; unsaved editor content is not published. Published content stays independent from later draft saves. Mailbox restrictions are template metadata and take effect when changed. Preview is sanitized and sandboxed. Test sends use the saved draft and the original SSO sender flow. No locale selection, rollback, external uploads, or external reply-thread API is included in P0.

## Webhook receiver

Endpoints subscribe to explicit mailbox addresses and `email.received`. A message, its attachment metadata, event and initial endpoint targets commit together in D1 after deterministic R2 writes. Re-delivery of the same incoming message does not create a second event or add endpoints subscribed later. Tests carry `test: true` and `data.messageId: null`.

Every POST sends the exact saved lightweight JSON payload, without body/attachments/internal mailbox UUIDs. Headers:

- `X-Yourself-Event-Id`: stable across retries and manual replays.
- `X-Yourself-Delivery-Id`: stable for an event/endpoint pair.
- `X-Yourself-Attempt`: monotonically increasing attempt number, including replays.
- `X-Yourself-Timestamp`: current Unix seconds for this attempt.
- `X-Yourself-Signature`: `v1=` plus lower-case hex HMAC-SHA256 of `timestamp + "." + eventId + "." + rawBody`.

Node receiver verification (use the raw body, before parsing/re-serializing JSON):

```js
import { createHmac, timingSafeEqual } from 'node:crypto';
function verify(secret, headers, rawBody) {
  const timestamp = headers['x-yourself-timestamp'];
  const eventId = headers['x-yourself-event-id'];
  const signature = headers['x-yourself-signature'];
  if (!/^\d{10,}$/.test(timestamp || '') || Math.abs(Date.now()/1000 - Number(timestamp)) > 300) return false;
  if (!/^v1=[a-f0-9]{64}$/.test(signature || '') || !eventId) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${eventId}.`).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(3), 'hex'));
}
```

After verification, atomically deduplicate `eventId` in durable storage and commit the business operation before returning 2xx. Retries/replays of completed events should return 2xx without repeating side effects. Five-minute timestamp checking alone is not event deduplication.

Timeout: 10 seconds. Any 2xx succeeds. Network errors, 408, 429 and 5xx retry after 1 minute, 5 minutes, 30 minutes, 2 hours, 12 hours (up to six automatic attempts). Other statuses, including redirects, terminate. Cron schedules at minute granularity; these are minimum delays, not delivery deadlines. Disabling endpoints cancels pending work; failed/cancelled deliveries can be replayed after re-enabling. History and event IDs remain intact. Callback success followed by a database failure can cause another delivery; exactly-once HTTP side effects are not promised.

URLs require public HTTPS/443, no credentials or fragments. Public-IP validation includes A/AAAA answers on configuration and dispatch. Redirects are never followed. Production global fetch explicitly uses `global_fetch_strictly_public`; no origin, VPC or service binding is used for callbacks. DNS preflight alone is not a rebinding defense: public-only production egress is an essential part of this design. Local workerd mocks validate application policy, not Cloudflare's production network boundary. Do not permit HTTP/private destinations for local convenience.

## Validation record (2026-11-12, Asia/Singapore)

- `pnpm typecheck`: passed.
- `pnpm test`: 6 files, 111 tests passed (53 original tests retained).
- `pnpm deploy:check`: Vite production build and Wrangler dry-run passed. The existing main-client chunk-size warning remains; the new admin feature is loaded as a separate chunk.
- Hono CLI `/health` in workerd: 200.
- Ego Browser against local Vite/workerd: key creation, one-time secret hiding, actual Bearer mailbox query, template save/publish/sandbox preview, private callback rejection, disabled endpoint creation, API log rendering, and original mailbox administration/inbox verified. Desktop 1280×900 and mobile 390×844 checked; mobile document width equals viewport width after fixing navigation overflow. No Vite error overlay or relevant browser exception was observed.
- Browser QA used a local-only seeded administrator session. That session was deleted afterward; its QA key was revoked and QA template/endpoint disabled. No real email or callback was sent by browser QA.
- Production queue creation, remote migrations, secret configuration, real SSO/provider delivery, and Cloudflare production egress/rebinding verification were not performed. Mocked DNS tests cover dispatch-time revalidation and mixed private/public answers, not a production network penetration test.

Common error codes: `INVALID_API_KEY` (401), `VALIDATION_ERROR` / `INVALID_JSON` / `INVALID_CURSOR` (400), `NOT_FOUND` (404), `MAILBOX_DISABLED` / `IDEMPOTENCY_CONFLICT` (409), `REQUEST_TOO_LARGE` / `MESSAGE_TOO_LARGE` (413), `RATE_LIMITED` (429), `BODY_UNAVAILABLE` (503). Template errors include `MISSING_VARIABLE`, `UNDEFINED_VARIABLE`, `VARIABLE_TOO_LONG`, `INVALID_TEMPLATE`. Management Webhook validation can return `UNSAFE_WEBHOOK_URL`, `DNS_UNAVAILABLE`, or `WEBHOOK_CONFIGURATION`.

## Production prerequisites configured (2026-11-12, Asia/Singapore)

The existing `yourself-email-v2` account/database was configured without publishing the P0 source:

- Queue `yourself-email-webhooks` created. Producer/consumer bindings and per-minute cron take effect when the P0 Worker is deployed.
- `WEBHOOK_MASTER_KEY` generated once and installed on the current Worker; the existing `SSO_CLIENT_SECRET` was retained. The same new key was stored in GitHub environment `production` for `hocgin/yourself-email`.
- GitHub `production` environment created; existing repository deployment variables and secrets remain inherited. No protection rules were changed on an existing environment.
- Production D1 migrations 0003, 0004 and 0005 applied after exporting the existing database. SQL backup and a protected master-key recovery copy are under the ignored root `backups/` directory, with directory mode 0700 and files mode 0600. Keep these out of Git and retain the key recovery copy securely.
- P0 application deployment and actual callback/provider verification remain separate release steps; resource creation alone does not activate new endpoints or consumers.

## P0 deployed (2026-11-12, Asia/Singapore)

- Worker version: `58895c19-99e6-45a3-b2ae-6dadcf94e7df`; previous version with configured secrets: `979f956f-c0e8-46cc-a9e1-bb31aedf5332`.
- URL: https://yourself-email-v2.hocgin.workers.dev . Deployed from the reviewed local working tree; no Git commit/push was performed by this release.
- Wrangler confirmed the per-minute cron, producer and consumer triggers. Queue inspection confirmed one producer and one consumer, both `yourself-email-v2`. Both `SSO_CLIENT_SECRET` and `WEBHOOK_MASTER_KEY` remain installed; no D1 migrations remain pending.
- Post-deploy curl checks: `/health` 200, unauthenticated external mailbox GET and send POST both 401 `INVALID_API_KEY`, original `/api/me` 401 `UNAUTHENTICATED`, homepage and external-admin JavaScript chunk 200 with the new build identifiers.
- Python urllib probes were blocked by Cloudflare browser-integrity filtering (1010); standard curl probes succeeded. No security policy was changed.
- No real email, callback POST, or authenticated production mailbox read was performed. Real provider delivery and receiver-side integration remain to be verified with a controlled recipient/receiver.

## Canonical domain updated (2026-11-12, Asia/Singapore)

- Current application origin and external API base: `https://mail.hocg.in`.
- Custom domain was already attached to `yourself-email-v2`; preserved it and declared it in Wrangler routes so future deployments retain the binding.
- Updated Wrangler `APP_URL`, README link and GitHub repository `APP_URL` variable. The existing Dove SSO client already allowed `https://mail.hocg.in/api/auth/callback`; no client secret rotation or SSO permission changes were needed.
- Deployed version `c440b962-f74f-4d97-ac99-adc936ecabac`. Queue producer/consumer and per-minute cron remain enabled. Workers.dev and preview URLs follow Wrangler's disabled defaults when the custom-domain route is configured; use the canonical domain.
- Typecheck and deploy dry-run passed. HTTPS homepage and health returned 200, unauthenticated external API returned the expected 401. Browser completed real SSO login on `mail.hocg.in`; authenticated `/api/me` returned 200 and the application rendered without an error overlay.
