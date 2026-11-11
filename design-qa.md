# 管理后台六页改版 — Design QA

final result: passed

## Target, scope, and evidence

- Target: first displayed concept in the latest administration ideation set, explicitly selected by the user: `output/admin-redesign/selected-design.png`.
- Scope: 邮箱域名、邮箱管理、账号授权、API 密钥、Webhook、API 调用日志. Preserve the completed template workspace.
- Implementation: `http://127.0.0.1:5174/admin/mailboxes?preview=design` and the corresponding six admin routes.
- Reference: 1487 × 1058 pixels. Desktop implementation: 1488 × 1058 CSS pixels, deviceScaleFactor 1. Reference padded by one white pixel on the outer right edge without stretching.
- Matching state: light theme, five synthetic mailboxes, support@example.com selected, mailbox inspector open. List order follows the backend's address sorting, so the selected row position intentionally differs from the concept.
- Initial desktop: `output/admin-redesign/mailboxes-initial.png`.
- Final desktop: `output/admin-redesign/new-mailboxes.png`.
- Initial source/build comparison: `output/admin-redesign/comparison-initial.png`.
- Final source/build comparison: `output/admin-redesign/comparison-final.png`.
- Focused table/form comparison: `output/admin-redesign/comparison-detail.png`.
- Six-screen overview: `output/admin-redesign/new-admin-overview.png`; individual captures: `new-domains.png`, `new-mailboxes.png`, `new-accounts.png`, `new-api-keys.png`, `new-webhooks.png`, `new-api-call-logs.png` in the same folder.
- Responsive captures for each route: `390-{route}-final.png` and `834-{route}-final.png` in the same folder. Full-page captures use 390 × 844 and 834 × 1024 CSS viewports at density 1.
- Source and implementation were opened in the same comparison image, then reviewed at both full-view and focused control level. The full six-page overview and representative full-size mobile/tablet images were opened as well.
- Previous template-specific report retained at `output/template-design/design-qa.md`.

## Findings and comparison history

### Initial pass: blocked

- [P2] Inspector too narrow at the desktop comparison width.
  - Evidence: initial implementation used 360px versus approximately 440px in the selected image, changing both table and form proportions.
  - Fix: standard desktop inspector 440px; permission/detail inspectors 480px. Keep narrower intermediate breakpoints and stacked mobile layouts.
- [P2] Table text and row density do not match the selected hierarchy.
  - Evidence: initial table body at 13px and 16px cell padding made labels smaller and rows taller than the concept.
  - Fix: body 14px, headers 13px, 12px vertical cell padding, 21px inspector heading, 40px form controls and footer buttons.
- [P2] Stacked inspectors shrink to their content width.
  - Evidence: first responsive audit measured varying inspector widths (e.g. 344px for mailbox and about 227px for log details on a 390px page).
  - Fix: below 900px set inspector width to 100% and align-self to stretch.
- [P2] Editing a row at narrow widths leaves the table panned to its action column.
  - Evidence: initial mobile capture hid identifying mailbox/name columns after the browser scrolled the edit action into view.
  - Fix: restore the table's horizontal position when focus enters the inspector; keep the table itself independently scrollable and keyboard-focusable.

### Final pass: passed

- Re-captured the mailbox screen after desktop fixes, regenerated side-by-side comparisons, and compared the selected design to the final implementation.
- Repeated the full twelve-screen responsive audit after the width fix. Every 390px document measured 390px wide, and every 834px document measured 834px wide. Inspectors and lists measured 390px and 644px respectively (tablet retains the existing 190px global navigation).
- Re-captured all six mobile screens after the scroll-context correction. Every table measured scrollLeft 0 after opening an editor.
- Final desktop/body comparison retains the selected layout: slim global header, existing left navigation, page title and primary action, flat searchable table, highlighted selection, inline right inspector with independent body and footer.
- No actionable P0/P1/P2 findings remain.

## Required fidelity surfaces

- Fonts/typography: retain the product's system sans-serif and Chinese fallbacks. Main titles 25px/650; body/table 14px; table headers 13px; inspector heading 21px; control labels 13px; helper text 12px. Readability, wrapping, field alignment, focus outlines, and sidebar/primary-action hierarchy checked in focused and mobile captures.
- Spacing/layout: preserve the existing 208px desktop navigation and 56px header. Main heading 118px; 24px main padding; subtle table row separators; 440px/480px inspectors. On tablet/mobile inspectors stack above the list. Long lists scroll inside their table rather than widening the document. Footer actions remain reachable.
- Colors/tokens: use the established indigo accent and pale selected tint, warm white surfaces, light gray separators, semantic green enabled/success states, muted stopped states, and restrained red error/revocation controls. No dashboard-card grid or decorative gradients were introduced.
- Assets/image quality: existing sharp `/logo.webp` and the established thin-stroke Lucide icons. No new raster artwork is needed. No screenshot is embedded as UI, and no custom CSS/SVG art substitutes for assets.
- Copy/content: business enabled state remains separate from Cloudflare verification. Preserve domain onboarding instructions, automatic mailbox creation explanation, independent read/send permissions, key limits and scope dependencies, one-time secret disclosure, webhook deduplication and replay implications, and log retention limits. The mock's clock widget and fabricated required display-name marker are intentionally omitted. Real mailbox names remain optional, and ordering remains driven by existing backend behavior.

## Functional verification in the local browser

All mutations below used explicit in-memory DEV fixtures; no production data or credentials were changed.

- Mailboxes: edit and save a name; create a mailbox; search to a no-results state; domain filter present; selecting rows highlights them and populates the inspector.
- Domains: edit the business enabled state, save, and refresh the list. Read-only existing domain names and onboarding guidance remain present.
- Accounts: open an existing account, edit the read/send matrix, and save. Existing SSO address is read-only; new/preallocated account workflow uses the existing grants endpoint.
- Keys: create a mock key; verify attachment permission automatically enables reading; show one-time returned secret; explicitly hide it; confirm and execute mock revocation. Revoked keys cannot be edited. Native field constraints and shared schema validate limits/expiration/scopes.
- Webhooks: confirm a mock test event, verify it appears in delivery history, inspect delivery attempts, confirm replay, and observe pending status. Create a new endpoint with a selected mailbox; show and hide its mock signing secret. New endpoint creation returns to the endpoint view; replay closes stale detail state.
- Logs: open a request detail inspector; filter 4xx to the single 429 record; filter by archive key to four records. Status/search/key changes close stale details. Search/filter scope is explicitly limited to the returned recent records.
- Dirty state: closing a modified editor prompts before discarding; cancelling preserves the edit; navigating through the admin sidebar prompts before leaving unsaved changes. Browser unload protection remains active for dirty editor state.
- Responsive: all six routes checked at 390px and 834px; form actions remain visible/reachable; permission tables retain independent controls; horizontally scrollable data lists are keyboard-focusable.
- Browser console error-level entries: none on the final rendered routes.

## Validation

- TypeScript: `pnpm exec tsc --noEmit` passed.
- Existing tests: `pnpm test` passed, 6 files / 114 tests.
- Production build: `pnpm run build` passed.
- `git diff --check` passed.
- Searched production assets for fixture-only identifiers (`ym_preview_only_`, `createAdminPreview`, `demo-request-`): none found.
- Existing large-main-chunk build advisory and dependency sourcemap notices remain; no new dependency was added to package.json.
- Real production mutations, real API-key creation, real authorization changes, real public Webhook delivery and deployment were not performed.

## Implementation checklist

- [x] Apply selected table/inspector system to six pages.
- [x] Keep existing backend endpoints and permission rules.
- [x] Preserve template workspace.
- [x] Wire searchable lists, editing, saving, confirmations, details and empty/loading/error states.
- [x] Verify critical flows with local fixtures and existing backend tests.
- [x] Resolve desktop proportions and responsive/context defects through visual comparison.
- [x] Leave local preview running and open for review.

## Follow-up polish

- [P3] Exact browser typography and disabled button treatment naturally differ from the raster concept. Disabled save buttons indicate an unchanged object rather than suggesting an unnecessary write.
- [P3] Existing shared HeroUI controls can emit development PressResponder warnings, without observed interaction failures. No error-level browser logs were present at final inspection.

## Production deployment verification (2026-11-12, Asia/Singapore)

The user subsequently authorized deployment to the existing production Worker.

- Worker: `yourself-email-v2`; version `0dcf820d-6e22-40be-bae1-91a99debc752`.
- URL: https://mail.hocg.in/admin/mailboxes .
- `pnpm run deploy:check` and `wrangler deploy --strict` passed. Existing custom domain, per-minute cron and Webhook queue producer/consumer were retained.
- HTTPS `/health` returned 200 with `status: ok`. Homepage returned the new index-DArsNgMK.js and index-QbdVgZdc.css asset references; the template stylesheet returned 200.
- Verified the authenticated production template workspace and all six redesigned admin routes in the browser. Each loaded the new UI; the six list routes displayed no error alerts after loading.
- Opened an existing production mailbox inspector as a read-only check; no field was changed or saved.
- Production screenshot: `output/admin-redesign/production-deployed.png`.
- Real key/permission changes, Webhook transmissions, mail sending and database migrations were not used for production validation.
