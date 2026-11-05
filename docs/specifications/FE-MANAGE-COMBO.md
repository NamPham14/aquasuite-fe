# FE — Manage Combo (UC-13)

## Sources and agreed scope
SRS v1.2 (29/09/2026), UC-13, PDF pages 61–62. Verified against sibling backend `docs/specifications/UC-13-product-combos.md`, `BundleAdminController`, Create/UpdateBundleRequest and BundleResponse. User chose implementation against existing backend on 03/11/2026. Local backend source does not establish the deployed API version.

## Architecture
Route `/app/combos` uses the existing protected ManagementLayout. `pages/management/CombosPage.tsx` composes the screen exported by `features/catalog`. Bundle API, DTOs, validation, list state, SKU picker, form and dialogs belong to catalog. Reuse shared Management components and catalog pagination/mobile list. No auth changes or new dependencies. Owner approved Combo-only backend alignment through the system COMBO category; Product and unrelated code remain unchanged.

## Behavior and contract
- GET `/catalog/bundle/admin`: page (zero-based), size, keyword, productStatus, publicationStatus only. Fixed server ordering; do not send catalog sortBy/direction.
- GET `/catalog/bundle/admin/{id}` loads a fresh version before opening detail/actions.
- POST creates ACTIVE/DRAFT; PUT replaces the definition with immutable productCode and expectedVersion. Published content must be unpublished before editing.
- PATCH `/{id}/publication-status` sends PUBLISHED/UNPUBLISHED and expectedVersion. PATCH `/{id}/status` sends ACTIVE/INACTIVE and expectedVersion. DELETE sends expectedVersion in query.
- GET `/catalog/bundle/admin/skus` searches eligible SKU pages. Select by UUID; reject duplicates, nesting via backend lookup, 1–100 lines, integer quantities 1–10000.
- Combo has no category/brand fields, option requests or validation; FE create/update payloads and DTOs omit both fields; see the backend compatibility limitation below. Code/name/description limits 100/255/10000. Price positive, at most 13 integer/2 fractional digits and no greater than current retail total. Client shows an indicative total; server validates and returns authoritative totals/savings.
- Dates optional as a pair for draft, start < end. Browser local date inputs convert to UTC ISO. Publishing requires a schedule with end in the future and ACTIVE product; server validates final eligibility.
- Confirm lifecycle/destructive actions, disable duplicate submissions, never optimistically report success. Conflict requires an explicit fresh reload, preserving input until reload. Network write uncertainty blocks resubmission until reloading server state; do not blindly retry create.
- 403 hides cached combo data and controls with a retry action. Session changes clear existing API cache through existing infrastructure. No role-based authorization assumptions.

## Reference UI revision — 04/11/2026
User supplied three screenshots: list (100234), create (100256), edit (100344), then clarified that the existing frontend design is authoritative. Screenshots define content and workflow, not a wireframe theme. Combo uses the same shared header, labeled filter bar, rounded white table surface, icon action buttons, status badge, pagination and form styles as Categories/Brands. Published rows show `Sửa (khóa)` disabled. No custom Combo stylesheet, plain header, text-action variant or compact pagination remains.

Create/edit use four sections in order: Thông tin combo, Sản phẩm thành phần, Giá combo, Hiệu lực. Information fields use the existing two-column form grid; description spans the form. Selected items reuse ManagementTable with SKU, name/variant, editable quantity, retail unit price, indicative line total and remove action. SKU lookup uses the shared search field plus paged candidate selector and Add button; selected UUIDs cannot be added twice. Price fields show read-only retail total and savings around editable package price. Edit code is read-only; actions use the standard Hủy and blue save button. Create/edit use shared `ManagementDialog size="wide"` (960px max/94vw) for table readability; other dialogs keep 640px default and all existing presentation/behavior.

Per the latest owner instruction, category and brand controls are removed completely, not hidden or replaced by default IDs. Information consists of code, name and description. The project shell and authentication remain unchanged. The selected-item table scrolls within the modal on narrow screens. Shared components retain their existing design; only dialog width has a backward-compatible size option.

## Backend alignment: system Combo category
Latest owner-approved approach: keep Product and its required categoryId unchanged. BE assigns the ACTIVE root category with stable code COMBO and name Combo on creation, and stores a null brand. FE sends neither categoryId nor brandId. BE accepts optional legacy fields but ignores them; updates preserve existing classification. Response metadata remains backward compatible and is unused by this FE. New V7 seeds/protects the system category; there is no nullable-category migration. Changes are confined to Combo-owned source/tests and a new migration/spec, preserving unrelated code. Backend deployment with Flyway is required; no live migration or restart has been performed.

## SRS gaps explicitly excluded
Backend does not expose combo media/banner/thumbnail or Cloudinary upload; no fabricated imagery/upload control. SKU options/substitutions, preorder and configurable reservation policy are absent; backend only checks fixed components. Storefront/guest browsing, cart, POS and quotation integration are outside this management screen. Publication does not claim downstream Sales integration or stock reservation. No evaluation for drafts: existing evaluation API accepts effective published bundles only.

## Verification
Verified on 03/11/2026: lint clean, production build succeeds, 141/141 automated tests pass (eight new Combo tests). Chrome with mocked HTTP verified desktop 1440×1000/mobile 390×844, validation, create/edit/publication/delete, UTC payloads, modal focus/Escape/return, empty/error/403 and retry. Shared dialog focus return was corrected and documented; existing regression tests pass. Production build reports a chunk-size warning (>500 kB). Live backend integration, deployed contract version and real owner/non-owner accounts remain unverified. No real backend test writes were performed.

UI revision verified on 04/11/2026: lint clean, production build succeeds, full regression 141/141 passes. Chrome mocked API checks pass again, including quantity → line total/retail total/savings, remove/re-add, read-only edit code, create/edit/lifecycle requests, modal focus, desktop/mobile and empty/error/403 recovery. Screenshots of list/create/edit/mobile were visually inspected against the supplied references. No real backend writes were performed by these checks.

Final design correction, per owner: removed the wireframe presentation and verified the standard project design. Lint/build pass, regression 141/141 passes, Chrome desktop/mobile checks pass. Computed input border radius, height and font size plus heading size match Brands exactly. Existing Categories/Brands shared presentation is the visual authority; supplied screenshots only determine content and flow.

Classification UI verification: FE lint/build and eight targeted Combo tests previously passed with mocked API. The subsequent BE system-category implementation is verified separately on isolated PostgreSQL; no live integration is claimed. Historical classification-nullability patches and their test results are superseded.

System-category verification (04/11/2026): 88 Combo backend tests and eight targeted frontend tests pass. Full BE suite not claimed: shared FlywayMigrationIT has a hardcoded migration count of six and fails with actual seven after adding V7. That pre-existing modified file remains untouched per owner instruction; its owner needs to update the assertion. Product and 63 unrelated baseline files verified unchanged. No live deployment/migration performed.
