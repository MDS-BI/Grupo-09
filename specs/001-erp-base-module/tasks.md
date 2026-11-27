# Tasks: Módulo de Contabilidad y Finanzas (001-erp-base-module)

**Input**: Design documents from `/specs/001-erp-base-module/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Include test tasks. plan.md requires automated coverage for business logic, workflows and the performance budgets SC-003, SC-006, SC-011, SC-012, SC-015 and SC-016, using Vitest with jsdom.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel once prerequisites are complete (different files, no same-phase dependencies)
- **[Story]**: Which user story this task belongs to (US1–US12)
- Every task includes an exact file path
- Task IDs are sequential from T001 to T076; the former non-standard setup ID is normalized to T005

## Tech Stack (from plan.md)

- JavaScript (ES2022) + HTML + CSS, Vite, no UI framework
- Persistence: `localStorage` with a versioned schema envelope
- Testing: Vitest + jsdom, including seeded 500-entry performance scenarios
- Quality: ESLint 10 (flat config) + Prettier 3, enforced with `npm run lint` and `npm run format:check`
- Workspace shell: top bar + sidebar shared across all views; route registry in `src/components/shell.js`
- Money: exact decimal arithmetic with up to 4 decimals — never floating point
- Cash designation: explicit `Cuenta_Contable.es_efectivo` flag shared by dashboard and cash-flow report

## Module Source Structure (target)

```text
src/
├── main.js                 (entry point — initializes storage, shell and current user)
├── styles.css              (design tokens and view styles)
├── storage.js              (localStorage collections + schema versioning)
├── module-config.js        (module labels, state lifecycle, accent color)
├── utils/
│   ├── money.js            (exact decimal arithmetic)
│   ├── validation.js       (shared validators and strict amount parser)
│   └── seed.js             (demo, test and 500-entry performance seed data)
├── domain/
│   ├── account.js          (Cuenta_Contable, including es_efectivo)
│   ├── entry.js            (Transaccion + Detalle_Transaccion)
│   └── shared.js           (Usuario_Base / Departamento_Base references)
├── services/
│   ├── metrics-service.js  (shared posted-entry aggregation + dashboard metrics)
│   ├── cost-center-service.js
│   ├── report-service.js
│   ├── account-service.js
│   ├── entry-service.js
│   ├── audit-service.js
│   ├── reverse-service.js
│   ├── approval-service.js
│   ├── query-service.js
│   └── settings-service.js
└── components/
    ├── shell.js            (workspace frame and route registry)
    ├── dashboard.js
    ├── account-form.js
    ├── account-list.js
    ├── entry-form.js
    ├── entry-list.js
    ├── entry-actions.js
    ├── cost-centers-view.js
    ├── reports-view.js
    ├── audit-view.js
    └── settings-view.js
tests/
├── unit/
├── integration/
└── setup/
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for the accounting module

- [ ] T001 Create module directory structure `src/utils/`, `src/domain/`, `src/services/`, `src/components/`, `tests/setup/` per the structure above
- [ ] T002 [P] Configure Vitest + jsdom environment and DOM helpers in `vitest.config.mjs` and `tests/setup/dom.js`
- [ ] T003 [P] Create module configuration (Spanish labels, state lifecycle `Borrador → Pendiente → Aprobada → Contabilizada → Revertida`, accent color token) in `src/module-config.js`
- [ ] T004 [P] Create generic localStorage collection layer with `loadCollection/saveCollection/addRecord/updateRecord/deleteRecord`, auto ids, ISO timestamps and schema-envelope hooks in `src/storage.js`
- [ ] T005 [P] Configure ESLint flat config and Prettier (browser/node globals, build-output ignores) plus `lint`, `lint:fix`, `format` and `format:check` scripts in `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` and `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 [P] Implement exact decimal money arithmetic (integer scaling, 4-decimal limit, no float ops) in `src/utils/money.js`
- [ ] T007 [P] Implement shared validators (required fields, account code format, ISO 4217 currency, dates, amount rules) in `src/utils/validation.js`
- [ ] T008 [P] Implement shared ERP references for `Usuario_Base` and `Departamento_Base` (lookup, seed data, block deletion when referenced) in `src/domain/shared.js`
- [ ] T009 Implement workspace shell route registry for `dashboard`, `accounts`, `entries`, `query`, `cost-centers`, `reports`, `audit` and `settings` views in `src/components/shell.js`, initialize it from `src/main.js` and add placeholder view containers in `index.html`
- [ ] T010 [P] Create demo/test seed data (accounts with `es_efectivo` true and false, users, departments, sample balanced entries in state `Contabilizada`) plus a helper that seeds 500 posted entries for performance tests in `src/utils/seed.js`
- [ ] T011 [P] Create unit tests for money, validation and shared ERP reference guards (lookup without duplication and deletion blocking for referenced users/departments) in `tests/unit/money.test.js`, `tests/unit/validation.test.js` and `tests/unit/shared-references.test.js` (FR-021, FR-023)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Panel financiero para la toma de decisiones (Priority: P1)

**Goal**: Dashboard showing ingresos, gastos, resultado neto and flujo de caja computed from `Contabilizada` entries of the selected period, using `es_efectivo = true` for cash flow, with zero-state when empty and live updates (FR-001, FR-002, FR-003, FR-033).

**Independent Test**: Open the module with existing `Contabilizada` entries and verify the metric cards show correct totals; with an empty module all metrics show zero and an invitation message appears; after registering, approving, posting or reversing an entry the metrics refresh without a manual reload; cash flow matches the report's `es_efectivo` designation.

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create metrics service exposing a shared `aggregatePostedEntries` helper and computing ingresos, gastos, resultado neto and flujo de caja from `Contabilizada` entries per period; cash flow MUST filter `Cuenta_Contable.es_efectivo = true` using the account records seeded by T010, whose field is formalized by T017 (FR-001, FR-033, depends on T010) in `src/services/metrics-service.js`
- [ ] T013 [P] [US1] Create dashboard component with 4 live metric cards, empty state message and quick-action buttons in `src/components/dashboard.js`
- [ ] T014 [US1] Wire dashboard refresh-on-visible and quick actions into the existing shell route lifecycle in `src/components/shell.js` and `src/main.js`, including refresh after register/approve/post/reverse transitions (depends on T012, T013)
- [ ] T015 [US1] Add dashboard styles (metric card grid, empty state) using design tokens in `src/styles.css`
- [ ] T016 [US1] Create integration tests: metrics from seeded entries, zero-state, refresh after registering, approving, posting and reversing an entry, cash flow uses `es_efectivo`, and metrics render within 2 s for 500 posted entries (FR-001–FR-003, FR-033, SC-003, SC-013) in `tests/integration/dashboard-metrics.test.js`

**Checkpoint**: User Story 1 fully functional and testable independently

---

## Phase 4: User Story 2 - Administración del plan de cuentas (Priority: P1)

**Goal**: Hierarchical chart of accounts with unique code, type, nature, parent account, active/inactive state and explicit `es_efectivo` designation; create, edit, deactivate/reactivate; block deletion of accounts with movements; prevent hierarchy cycles (FR-004–FR-008, FR-033).

**Independent Test**: Create an account with a unique code, mark it as cash/bank or not, edit it, deactivate it, and verify it appears/disappears from the catalog and from entry forms; duplicate codes and cycles are rejected with clear messages; `es_efectivo` persists.

### Implementation for User Story 2

- [ ] T017 [P] [US2] Create account domain model with validation (unique mandatory code as text, tipo, naturaleza, parent, acepta_movimientos, `es_efectivo` boolean default `false`, activa) in `src/domain/account.js` (FR-004, FR-005, FR-033)
- [ ] T018 [P] [US2] Create unit tests for account validation (duplicate code, cycle/autorreference, inactive parent, `es_efectivo` default and persistence) in `tests/unit/account.test.js`
- [ ] T019 [US2] Implement account service: CRUD including `es_efectivo`, unique-code enforcement, hierarchy assignment validation and delete blocking via a shared `checkAccountIntegrity` extension point that is reused and hardened in T053 (FR-004–FR-008, FR-034, FR-035, depends on T017) in `src/services/account-service.js`
- [ ] T020 [US2] Create account create/edit form with an `es_efectivo` checkbox (Spanish label "Cuenta de efectivo/banco") and clear validation messages preserving entered data in `src/components/account-form.js` (depends on T019)
- [ ] T021 [US2] Create account catalog list with search, cash/bank indicator, edit, deactivate/reactivate actions in `src/components/account-list.js` (depends on T019)
- [ ] T022 [US2] Wire the accounts view (form + list) into the existing shell route in `src/components/shell.js`, `index.html` and `src/main.js` (depends on T020, T021)
- [ ] T023 [US2] Create integration tests: create/edit/deactivate, duplicate code rejected, delete-with-movements blocked, and `es_efectivo` persists and toggles correctly (FR-033) in `tests/integration/accounts.test.js`

**Checkpoint**: US1 and US2 both work independently

---

## Phase 5: User Story 3 - Registro de asientos por partida doble (Priority: P1)

**Goal**: Register entries with accounting date, document type/number, description, currency and at least 2 lines; each line posts to one account on exactly one side (Debe xor Haber) with optional cost center and glosa; block unbalanced entries, inactive accounts and invalid amounts (FR-009–FR-013, FR-026).

**Independent Test**: Create an entry with at least two lines; verify saving is blocked when unbalanced and succeeds when Debe equals Haber; lines with both sides, null/negative/over-4-decimal amounts, or inactive accounts are rejected.

### Implementation for User Story 3

- [ ] T024 [P] [US3] Create entry domain models (`Transaccion`, `Detalle_Transaccion`) with line/header structural validation and amount parsing delegated to the shared money/validation utilities, in `src/domain/entry.js` (FR-009–FR-013, FR-036, depends on T006, T007)
- [ ] T025 [P] [US3] Create unit tests for entry validation (balance, min 2 lines, one-side-only, amount format, inactive account) in `tests/unit/entry-validation.test.js`
- [ ] T026 [US3] Implement entry service: atomic save of balanced draft entries with referential checks (users, departments, active accounts) in `src/services/entry-service.js` (depends on T024, T019)
- [ ] T027 [US3] Create entry form with header fields, dynamic detail lines and live Debe/Haber totals with blocking validation messages in `src/components/entry-form.js` (depends on T026)
- [ ] T028 [US3] Wire the entries view (new/edit draft) into the existing shell route in `src/components/shell.js`, `index.html` and `src/main.js` (depends on T027)
- [ ] T029 [US3] Create integration tests: balanced draft saved, unbalanced blocked, invalid line rejected, fewer-than-2 lines rejected in `tests/integration/entry-create.test.js`

**Checkpoint**: US3 independently testable with seeded accounts

---

## Phase 6: User Story 4 - Auditoría, inmutabilidad y reversas (Priority: P1)

**Goal**: `Contabilizada`/`Revertida` entries cannot be edited or deleted; corrections via a linked reverse entry with swapped Debe/Haber; only one direct reverse per entry; full state-change history with user and timestamp (FR-015–FR-019, FR-037 base).

**Independent Test**: Attempt to edit a `Contabilizada` entry → blocked with guidance to reverse; execute "Revertir" → new entry created with sides swapped and reference to the original; reversing an already-reversed entry is blocked and shows the existing reverse; history shows who did what and when.

### Implementation for User Story 4

- [ ] T030 [P] [US4] Create the global append-only audit service foundation recording actor, action, state change, timestamp and affected entity for entry events, with a schema reusable by US10 in `src/services/audit-service.js` (FR-015, FR-019, FR-037)
- [ ] T031 [US4] Enforce immutability: block edit/delete of `Contabilizada`/`Revertida` entries in `src/services/entry-service.js` (depends on T026)
- [ ] T032 [US4] Implement reverse service: swap Debe/Haber, link `id_transaccion_revertida`, one-reverse-only, reject non-`Contabilizada` reversals, atomic posting of both entries in `src/services/reverse-service.js` (depends on T026, T030)
- [ ] T033 [US4] Add entry detail/actions UI: reverse button, immutability warnings and state-change history panel filtered from the global audit log in `src/components/entry-actions.js` (depends on T032)
- [ ] T034 [US4] Create integration tests: edit blocked, reverse created with swapped sides and link, double-reverse blocked, history recorded in `tests/integration/audit-reverse.test.js`

**Checkpoint**: US1–US4 independently functional

---

## Phase 7: User Story 5 - Flujo de aprobación de asientos (Priority: P2)

**Goal**: State machine `Borrador → Pendiente → Aprobada → Contabilizada` with no skips; approval records approver identity and date; permission checks enforced in the service layer, not just the UI (FR-014, FR-015, FR-020).

**Independent Test**: An authorized user sends a draft to review (→`Pendiente`) and another user with approval permission approves and posts it, recording identity and date; posting a draft directly is rejected; a user without permission is denied.

### Implementation for User Story 5

- [ ] T035 [P] [US5] Implement approval service: allowed transitions only, permission gate, approver/posting audit fields in `src/services/approval-service.js` (depends on T030)
- [ ] T036 [US5] Add approval workflow actions (send to review, approve, post) with permission-aware enabling in `src/components/entry-actions.js` (depends on T035)
- [ ] T037 [US5] Create integration tests: full flow with identities, illegal skip blocked, unauthorized denied in `tests/integration/approval-flow.test.js`

**Checkpoint**: US5 independently testable; approval flow complete end-to-end

---

## Phase 8: User Story 6 - Consulta histórica y filtrado (Priority: P2)

**Goal**: Search entries by date range, account, cost center, state and free text; clear empty state with "clear filters" option; fluid performance up to 500 entries (FR-024, FR-025, SC-006).

**Independent Test**: Apply a department + state filter and get only matching entries; clearing filters restores the full list; a no-match filter shows an empty state, not an error; 500 entries filter in under 1 second.

### Implementation for User Story 6

- [ ] T038 [P] [US6] Implement query service filtering entries by date range, account, cost center, state and free text (description/document number) in `src/services/query-service.js` (depends on T026)
- [ ] T039 [US6] Create filter panel and results list with empty state, clear-filters action and mount it on the existing `query` route in `src/components/entry-list.js` (depends on T038)
- [ ] T040 [US6] Optimize list rendering for up to 500 records using lightweight incremental DOM updates in `src/components/entry-list.js` (depends on T039)
- [ ] T041 [US6] Create integration tests: combined filters, text search, empty state, clear filters, and ≤ 1 s filtered query over 500 entries (SC-006) in `tests/integration/entry-search.test.js`

**Checkpoint**: US1–US6 independently functional

---

## Phase 9: User Story 7 - Imputación y Control por Centros de Costo (Priority: P2)

**Goal**: Imputar las líneas de asiento a departamentos del catálogo ERP y mostrar ingresos, gastos y saldo neto acumulados por departamento en la vista "Centros de costo", incluyendo departamentos sin movimientos en $0.00 y una categoría explícita "Sin departamento" que permita conciliar con los totales del período (FR-010, FR-022, FR-024, FR-030, SC-011).

**Independent Test**: Contabilizar asientos asociados a distintos departamentos, incluyendo líneas sin centro de costo y un departamento sin movimientos; verificar que los totales por departamento más "Sin departamento" concilian con ingresos y gastos del período, y que el departamento sin movimientos aparece en $0.00.

### Implementation for User Story 7

- [ ] T042 [P] [US7] Add an optional cost-center (`Departamento_Base`) selector per entry line, populated from the shared catalog, and reject unknown departments on save in `src/components/entry-form.js` and `src/services/entry-service.js` (FR-022, FR-030, depends on T026, T027, T008)
- [ ] T043 [P] [US7] Implement `src/services/cost-center-service.js` with `computeDepartmentTotals({ from, to })` reusing `metrics-service` posted-entry aggregation, grouping by `id_departamento` into ingresos, gastos and saldo neto, returning zero totals for departments without movements and a "Sin departamento" bucket that reconciles with period totals (FR-030, SC-011, depends on T012, T026, T008)
- [ ] T044 [US7] Create unit tests for department totals: grouping by `id_departamento`, zero-movement departments, "Sin departamento" reconciliation, exclusion of `Borrador`/`Pendiente`/`Aprobada`/`Revertida`, and 4-decimal precision in `tests/unit/cost-center.test.js` (depends on T043)
- [ ] T045 [US7] Create `src/components/cost-centers-view.js` rendering a department totals table/cards with period selector, catalog departments, "Sin departamento", $0.00 rows and an empty state, reusing existing design tokens in `src/styles.css` (depends on T043)
- [ ] T046 [US7] Wire `cost-centers-view.js` into the existing `cost-centers` shell route, add its view container in `index.html` and route-specific styles in `src/styles.css` (depends on T045)
- [ ] T047 [US7] Create integration tests: totals per department from seeded posted entries, department without movements at $0.00, non-posted entries excluded, "Sin departamento" reconciliation, and ≤ 2 s rendering for 500 posted entries across 50 departments (SC-011) in `tests/integration/cost-centers.test.js`

**Checkpoint**: US7 independently testable with seeded posted entries

---

## Phase 10: User Story 8 - Generación de Estado de Resultados y Flujo de Caja (Priority: P2)

**Goal**: Generate Estado de Resultados and Flujo de Caja by period, grouping income/expense account balances, computing net result with 4-decimal precision, using the same posted entries and the explicit `es_efectivo` designation as the dashboard, and excluding non-posted entries (FR-001, FR-031, FR-032, FR-033, SC-012, SC-013).

**Independent Test**: Select a date range in "Reportes" and verify account breakdowns, exact profit/loss and cash flow; confirm drafts/pending/approved/reversed entries are excluded and that cash-flow totals match the dashboard with zero discrepancies.

### Implementation for User Story 8

- [ ] T048 [P] [US8] Implement `src/services/report-service.js` with `buildIncomeStatement({ from, to })` grouping posted balances by income/expense account and computing net result, plus `buildCashFlow({ from, to })` filtering `es_efectivo = true` and reusing `metrics-service` posted-entry aggregation, excluding every state except `Contabilizada` and using exact decimals (FR-031, FR-032, FR-033, depends on T012, T019, T026)
- [ ] T049 [P] [US8] Create unit tests for report calculations: account grouping, utilidad/pérdida neta, cash-flow totals by `es_efectivo`, exclusion of `Borrador`/`Pendiente`/`Aprobada`/`Revertida`, empty period, 4-decimal precision and dashboard/report designation parity in `tests/unit/reports.test.js` (FR-033, SC-013)
- [ ] T050 [US8] Create `src/components/reports-view.js` with period range inputs, tabs for "Estado de Resultados" and "Flujo de Caja", account breakdown rows and a clear empty state (depends on T048)
- [ ] T051 [US8] Wire `reports-view.js` into the existing `reports` shell route, add its view container in `index.html` and report styles in `src/styles.css` (depends on T048, T050)
- [ ] T052 [US8] Create integration tests: income statement grouping and net result, cash-flow totals from `es_efectivo`, drafts/pending/approved/reversed excluded, empty period state, 0 dashboard/report cash-flow discrepancies and ≤ 2 s generation for 500 posted entries (SC-012, SC-013) in `tests/integration/reports.test.js`

**Checkpoint**: US8 independently testable; formal reports available from posted entries

---

## Phase 11: User Story 9 - Protección de Jerarquía e Integridad del Plan de Cuentas (Priority: P2)

**Goal**: Impedir la eliminación de cuentas referenciadas por líneas de asiento en cualquier estado y bloquear ciclos o autorreferencias en la jerarquía, incluyendo datos heredados, ofreciendo la desactivación como alternativa segura (FR-034, FR-035, SC-014).

**Independent Test**: Attempt to delete an account referenced by a draft and by a posted entry and verify both are blocked with a deactivation suggestion; attempt self-parent and direct/indirect cycles and verify they are rejected; load a legacy cyclic hierarchy without recursion failure.

### Implementation for User Story 9

- [ ] T053 [P] [US9] Harden the shared `checkAccountIntegrity(accountId)`/`canDeleteAccount` extension point from T019 to detect references in any `Detalle_Transaccion` (all entry states) and cycles/self-parent across the hierarchy, returning `{ allowed, reason, suggestedAction: 'deactivate' }`; policy remains single-sourced (FR-034, FR-035, depends on T019, T026) in `src/services/account-service.js`
- [ ] T054 [US9] Create unit tests for account integrity: delete blocked for draft and posted references, self-parent, direct and indirect cycles, inactive parent, and delete allowed for unused accounts in `tests/unit/account-integrity.test.js` (depends on T053)
- [ ] T055 [US9] Update `src/components/account-form.js` and `src/components/account-list.js` to surface cycle/self-parent messages and replace the delete action with "Desactivar cuenta" when deletion is blocked (FR-034, depends on T053)
- [ ] T056 [US9] Create integration tests: deleting an account with posted and draft movements is blocked with a deactivation suggestion, and UI hierarchy cycle attempts are rejected without mutating the catalog in `tests/integration/account-integrity.test.js` (SC-014)
- [ ] T057 [US9] Guard account-tree traversal against recursion when legacy data contains a parent cycle, and add a regression test in `src/services/account-service.js` and `tests/unit/account-integrity.test.js` (depends on T053)

**Checkpoint**: US9 independently testable; catalog integrity preserved

---

## Phase 12: User Story 11 - Validación Estricta de Líneas e Importes Monetarios (Priority: P2)

**Goal**: Validate every entry line in real time and again before persistence: active account accepting movements, exactly one side, positive amount and maximum four decimals, rejecting null/negative/zero/over-4-decimal values without auto-rounding and preserving entered data (FR-036, SC-015).

**Independent Test**: Enter a negative, zero, five-decimal or empty amount, or select an inactive/non-postable account, and receive an immediate message that blocks saving without altering entered data; service-level save rejects the same invalid values.

### Implementation for User Story 11

- [ ] T058 [P] [US11] Harden the shared `src/utils/money.js` and `src/utils/validation.js` parsers introduced in T006/T007 and consumed by T024 with strict amount parsing that rejects null, negative, zero and more-than-4-decimal values without auto-rounding, returning field-level validation messages (FR-036, depends on T006, T007)
- [ ] T059 [US11] Create unit tests for strict amount parsing and account eligibility covering `"100.12345"`, `"0"`, `"-5"`, empty, valid `"100.1200"` and inactive/non-postable accounts in `tests/unit/entry-line-validation.test.js` (depends on T058)
- [ ] T060 [US11] Add real-time line validation to `src/components/entry-form.js`: inline errors on amount/account changes, save disabled while any line is invalid, and inactive/non-postable accounts filtered from the selector (FR-036, depends on T027, T058)
- [ ] T061 [US11] Create integration tests: five-decimal or non-positive amounts show an immediate error and block save without rounding, inactive accounts are absent from the selector, entered data is preserved after rejection, and validation updates in ≤ 100 ms (FR-036, SC-015) in `tests/integration/entry-line-validation.test.js` (depends on T060)
- [ ] T062 [US11] Apply the same strict amount and active-account rules when editing existing draft lines in `src/services/entry-service.js` so UI bypasses cannot persist invalid amounts (FR-036, depends on T026, T058)

**Checkpoint**: US11 independently testable; invalid line values cannot be persisted

---

## Phase 13: User Story 10 - Bitácora Cronológica de Eventos de Auditoría (Priority: P3)

**Goal**: Consult a chronological, immutable log of critical actions (entry creation, review submission, approval, posting, reversal, and account create/edit/deactivate/reactivate) with user, timestamp and affected entity, in read-only mode; per-entry history is a filtered query of the same log (FR-037, SC-016).

**Independent Test**: Perform the full lifecycle of an entry and account changes, then verify every step appears in "Auditoría" with timestamp and user, with no edit/delete controls; the first page or filter loads in ≤ 1 s for 1,000 events.

### Implementation for User Story 10

- [ ] T063 [P] [US10] Extend `src/services/audit-service.js` with a global append-only event log (`logEvent`, `getEvents({ from, to, type, entityId })`) recording action type, timestamp, affected entity and active user id for entry creation/transitions/reversals and account changes (FR-037, depends on T030, T019, T026)
- [ ] T064 [US10] Create unit tests for the audit log: required event fields, chronological order, append-only behavior, filters, per-entry history as a filtered query, events emitted by account changes, and each critical `logEvent` write completing in ≤ 1 s (SC-016) in `tests/unit/audit-log.test.js` (depends on T063)
- [ ] T065 [US10] Create `src/components/audit-view.js` rendering a read-only chronological event table with date/time, user, action and entity, plus filters and an empty state, without edit/delete controls (depends on T063)
- [ ] T066 [US10] Wire `audit-view.js` into the existing `audit` shell route, add its view container in `index.html` and audit styles in `src/styles.css` (depends on T065)
- [ ] T067 [US10] Create integration tests: full entry lifecycle produces one chronological event per action with user/timestamp and records each critical event within ≤ 1 s, account create/edit/deactivate/reactivate events appear, the audit UI has no edit/delete controls, and first page/filter remains under 1 s for 1,000 events as a separate UX target (SC-016) in `tests/integration/audit-log.test.js`

**Checkpoint**: US10 independently testable; complete chronological traceability

---

## Phase 14: User Story 12 - Configuración del Período Contable y Respaldo de Estado Local (Priority: P3)

**Goal**: Configure and persist the active accounting period with month/quarter/custom presets, use it as the default period in Dashboard and Reports, version the `localStorage` schema, migrate safely, preserve data on incompatible versions, and show storage integrity status (FR-038, FR-039, FR-040, SC-017, SC-018).

**Independent Test**: Save a period in "Configuración", simulate closing and reopening the app, and verify the period, accounts, entries and events remain intact; Dashboard and Reports use the saved period; an incompatible schema version preserves data and shows an explanation.

### Implementation for User Story 12

- [ ] T068 [P] [US12] Implement `src/services/settings-service.js` with `loadSettings`/`saveSettings` persisting `activePeriod` (`from`, `to`, preset), `schemaVersion` and defaults, validating values before save and rejecting inverted ranges while preserving the previous configuration (FR-038, depends on T003, T004)
- [ ] T069 [P] [US12] Add schema versioning and safe restore to `src/storage.js`: `ensureSchemaVersion`, parse/validate stored collections, migrate unversioned data (including `es_efectivo = false` for legacy accounts) and never discard existing records on version mismatch (FR-039, depends on T004, T017)
- [ ] T070 [US12] Create `src/components/settings-view.js` with period selection (mes/trimestre/rango personalizado), save and reset-to-default actions, and a storage status panel showing active schema version and account/entry/event counts (FR-038, FR-040, depends on T068, T069)
- [ ] T071 [US12] Wire `src/components/settings-view.js` into the existing `settings` shell route, add its view container in `index.html`, and make Dashboard and Reports use the saved `activePeriod` as their default range (FR-038, depends on T014, T051, T068)
- [ ] T072 [US12] Create integration tests: saved period survives a simulated reload and is used by dashboard/reports; stored accounts, entries and events survive reload with version validation, no duplication and no precision loss; incompatible version preserves records and shows an explanation; counts are accurate (SC-017, SC-018) in `tests/integration/settings-persistence.test.js`

**Checkpoint**: US12 independently testable; settings and local state survive reloads

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T073 [P] Audit Spanish UI copy and ERP shell consistency (top bar + sidebar identical across all views, shell route registry intact) in `src/components/shell.js` and `src/module-config.js`
- [ ] T074 Verify persistence integrity across reloads (no loss, no duplication, precision preserved) with a test in `tests/integration/persistence.test.js`
- [ ] T075 Run full validation: `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, and manual walkthrough of `specs/001-erp-base-module/quickstart.md` scenarios including all performance budgets
- [ ] T076 [P] Update `README.md` with module features, scripts, `es_efectivo` configuration and extension points

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–14)**: All depend on Foundational completion
  - Priority order: P1 (US1, US2, US3, US4) → P2 (US5, US6, US7, US8, US9, US11) → P3 (US10, US12)
- **Polish (Phase 15)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1) Panel financiero**: Starts after Phase 2. Independent — testable with seeded `Contabilizada` entries and `es_efectivo` accounts. T012 exposes the shared aggregation reused by US7 and US8.
- **US2 (P1) Plan de cuentas**: Starts after Phase 2. No dependencies on other stories; defines `es_efectivo`.
- **US3 (P1) Registro de asientos**: Starts after Phase 2; needs accounts (US2) for real usage but is testable with seeded accounts. Depends on T019 for active-account checks.
- **US4 (P1) Auditoría/reversas**: Depends on US3 (`entry-service`, T026) and the audit foundation T030.
- **US5 (P2) Aprobación**: Depends on US3 entry model and US4 audit service — start after T030.
- **US6 (P2) Consulta**: Depends on US3 entries existing — start after T026; independent of US4/US5 UI.
- **US7 (P2) Centros de costo**: Independent — consumes posted entries, the shared department catalog and the shared aggregation from T012.
- **US8 (P2) Reportes**: Independent — consumes posted entries, accounts with `es_efectivo` and the shared aggregation from T012; does not require US7.
- **US9 (P2) Integridad de cuentas**: Independent — extends account service with movement-reference and cycle checks.
- **US11 (P2) Validación estricta**: Independent — extends money/validation utilities and entry form/service.
- **US10 (P3) Bitácora de auditoría**: Depends on the audit foundation (T030) plus account/entry operations; ordering after US7–US11 yields complete event coverage.
- **US12 (P3) Período y respaldo**: Depends on storage, settings and reports wiring (T051); no dependency on US10.

### Within Each User Story

- Unit tests before or alongside domain models
- Domain models before services
- Services before components
- Components before view wiring in `src/components/shell.js`
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T002, T003, T004, T005 in parallel (different files)
- Phase 2: T006, T007, T008, T010, T011 in parallel
- US1: T012 ∥ T013 (metrics service ∥ dashboard component)
- US2: T017 ∥ T018 (model ∥ unit tests); T020 ∥ T021 after T019
- US3: T024 ∥ T025 (model ∥ unit tests)
- US4: T030 can start in parallel with US2/US3 work
- US7: T042 ∥ T043; T044 after T043 (different files)
- US8: T048 ∥ T049; T050 after T048
- US9: T053; T054, T055 and T057 after T053
- US11: T058; T059, T060 and T062 after T058; T060 and T062 can proceed in parallel after T058
- US10: T063; T064 and T065 after T063
- US12: T068 ∥ T069; T070 after T068/T069
- Once Phase 2 completes, US1 ∥ US2 can run in parallel (independent files)
- US6 query service (T038), US7 service (T043) and US8 service (T048) can be developed in parallel after their stated prerequisites
- Route tasks T046, T051, T066 and T071 all touch `src/components/shell.js`, `index.html` and `src/styles.css`; serialize them to avoid conflicts

---

## Parallel Example: User Story 2

```text
# Launch together (different files, no dependencies):
Task: "Create account domain model including es_efectivo in src/domain/account.js"
Task: "Create unit tests for account validation in tests/unit/account.test.js"

# Then sequential:
Task: "Implement account service in src/services/account-service.js"
Task: "Create account form in src/components/account-form.js" ∥ "Create account list in src/components/account-list.js"
Task: "Wire accounts view in src/components/shell.js, index.html and src/main.js"
Task: "Create integration tests in tests/integration/accounts.test.js"
```

## Parallel Example: User Story 1

```text
Task: "Create shared metrics service in src/services/metrics-service.js"
Task: "Create dashboard component in src/components/dashboard.js"
# Then:
Task: "Wire dashboard refresh in src/components/shell.js and src/main.js"
Task: "Add dashboard styles in src/styles.css"
Task: "Create integration tests in tests/integration/dashboard-metrics.test.js"
```

## Parallel Example: User Story 7

```text
Task: "Add optional cost-center selector and validation in src/components/entry-form.js and src/services/entry-service.js"
Task: "Implement cost-center aggregation service in src/services/cost-center-service.js"
Task: "Create unit tests for department totals in tests/unit/cost-center.test.js"
# Then:
Task: "Create cost-centers view in src/components/cost-centers-view.js"
Task: "Wire route in src/components/shell.js and index.html"
Task: "Create integration tests in tests/integration/cost-centers.test.js"
```

## Parallel Example: User Story 8

```text
Task: "Implement report service with es_efectivo cash flow in src/services/report-service.js"
Task: "Create unit tests for reports in tests/unit/reports.test.js"
# Then:
Task: "Create reports view in src/components/reports-view.js"
Task: "Wire route in src/components/shell.js and index.html"
Task: "Create integration tests in tests/integration/reports.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 + prerequisites)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 4 (US2 plan de cuentas, including `es_efectivo`) and Phase 5 (US3 asientos) — required data entry points
4. Complete Phase 3: User Story 1 (panel financiero)
5. **STOP and VALIDATE**: Test US1 independently with seeded entries (SC-001, SC-003, SC-013)
6. Deploy/demo if ready

> Note: Although US1 is listed first by value, the dashboard reads posted entries; seed data (`src/utils/seed.js`) or US3 entries make it demonstrable immediately after Phase 2.

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US2 (cuentas con `es_efectivo`) → test independently → demo
3. US3 (asientos) → test independently → demo
4. US1 (panel) → test independently → **MVP completo**
5. US4 (auditoría/reversas) → test independently → demo
6. US5 (aprobación) → test independently → demo
7. US6 (consulta) → test independently → demo
8. US7 (centros de costo) → test independently → demo
9. US8 (reportes con `es_efectivo`) → test independently → demo
10. US9 (integridad de cuentas) → test independently → demo
11. US11 (validación estricta) → test independently → demo
12. US10 (bitácora de auditoría) → test independently → demo
13. US12 (período y respaldo local) → test independently → demo
14. Polish → full validation (`npm test`, `npm run build`, quickstart walkthrough)

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US2 (cuentas) → US3 (asientos)
   - Developer B: US1 (panel + metrics)
   - Developer C: US4 (auditoría/reversas) after US3 domain lands
3. After US1–US3:
   - Developer A: US6 (consulta) and US11 (validación estricta)
   - Developer B: US7 (centros de costo) and US8 (reportes)
   - Developer C: US9 (integridad de cuentas) and US10 (bitácora)
4. US12 after reports routing lands; Polish last
5. Stories complete and integrate independently

---

## Notes

- Task IDs are normalized and sequential from T001 to T076; do not reintroduce suffixed IDs
- [P] tasks = different files and no same-phase dependencies; T044, T054, T059 and T064 intentionally omit [P] because they verify same-phase work
- [Story] label maps task to specific user story for traceability
- `Cuenta_Contable.es_efectivo` is the single cash/bank designation consumed by both dashboard and cash-flow report (FR-033, SC-013); the applicable value is the current catalog designation at calculation time and every change is audited
- `metrics-service.aggregatePostedEntries` is the shared posted-entry source consumed by dashboard, centers of cost and reports; do not duplicate aggregation rules
- `audit-service` must remain one global append-only log; per-entry history is a filtered query, not a separate store
- Money arithmetic must use exact decimals (`src/utils/money.js`) — never floating point
- Performance tests must use seeded data: 500 posted entries for dashboard, centers of cost, reports and queries; 1,000 events for audit; validation ≤ 100 ms per change
- SC-016's 1 s budget applies to writing each critical audit event; first page/filter performance is a separate UX target, not a substitute for the write-latency assertion
- Authorization checks live in services (`approval-service.js`, `entry-service.js`), never only in the UI (FR-020)
- Run `npm run lint` and `npm run format:check` before considering any task complete; add `npm test` and `npm run build` before a story checkpoint
- `contracts/entity-storage.md` documents the legacy base Entity/Document contract and does not apply to the accounting module; no contract tests are generated from it
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently

---

## Reality Note (synchronized 2026-11-26)

The "Module Source Structure (target)" block above, and every `src/components/*` file path referenced in Phases 1–15 below, describe the **original plan**, not what was actually built. The real, running application differs as follows:

- Routing and view mounting happen entirely inline in `src/main.js` (hash-based route table), not in `src/components/shell.js`.
- The real view files live in `src/views/*.js` with Spanish names: `dashboard.js`, `plan-cuentas.js`, `nueva-transaccion.js`, `transacciones.js`, `consulta.js`, `centros-costo.js`, `reportes.js`, `auditoria.js`, `configuracion.js`, `login.js` (plus an unused `placeholder.js`).
- `src/components/*` (11 files: `shell.js`, `dashboard.js`, `account-form.js`, `account-list.js`, `entry-form.js`, `entry-list.js`, `entry-actions.js`, `cost-centers-view.js`, `reports-view.js`, `audit-view.js`, `settings-view.js`) and `src/module-config.js` are confirmed dead code — not imported anywhere outside themselves.
- `src/services/metrics-service.js`, `cost-center-service.js` and `report-service.js` are implemented and tested but not consumed by any real view; `dashboard.js`, `centros-costo.js` and `reportes.js` each reimplement their own aggregation.
- `src/services/auth-service.js` and `src/views/login.js` (a real login/session system, not in the original plan) exist and gate the app.

Historical tasks below are left as originally written (append-only record of what was planned); do not use their `src/components/*` paths as a guide to the current codebase. See `plan.md`'s "Desviaciones conocidas respecto al diseño original" and `data-model.md` for full detail. Phase 16 below tracks the real, confirmed gaps as of this sync.

---

## Phase 16: Known Implementation Gaps (confirmed 2026-11-26)

These are verified defects/architecture gaps in the current codebase, independent of the documentation-sync direction — i.e. they remain true whether spec.md is read as intent or as description of reality.

- [ ] T077 Replace vacuous/no-op test assertions with concrete expected-value assertions in `tests/unit/account-integrity.test.js` (lines 11-39, 46-56), `tests/integration/account-integrity.test.js` (11-39, 52-62), `tests/unit/reports.test.js` (57-59, 61-79, 88-106), `tests/integration/approval-flow.test.js` (38-61), `tests/integration/audit-log.test.js` (12-33, 63-66), and `tests/integration/entry-line-validation.test.js` (49-85) per Constitution II (test-first)
- [ ] T078 Fix `account-service.checkAccountIntegrity` in `src/services/account-service.js` so it also blocks deletion of accounts referenced by `Contabilizada`/`Revertida` entries (currently only blocks for Borrador/Pendiente/Aprobada, the opposite of the intended protection) per FR-034 (bug)
- [ ] T079 Make `isCashInflowAccount()` in `src/views/dashboard.js` use only `Cuenta_Contable.es_efectivo` (remove the `tipo`/`codigo` fallback) so it matches `src/views/reportes.js` and eliminates dashboard/report cash-flow discrepancies per FR-033 (bug)
- [ ] T080 Add account lifecycle events (create/edit/deactivate/reactivate) to the real global audit log (`src/services/audit-service.js::logEvent`) from `src/domain/account.js`/`src/services/account-service.js`, and remove the dead-end parallel `accountAuditLogs` localStorage writer in `src/views/plan-cuentas.js` per FR-037 (bug)
- [ ] T081 Add indirect hierarchy-cycle and inactive-parent validation to `src/domain/account.js`'s `accountValidator` (or `src/services/account-service.js`, actually wired into `addAccount`/`updateAccount` as called by `src/views/plan-cuentas.js`) so cycle protection isn't solely a UI-layer concern in `creaCicloJerarquico()` per FR-035 (gap)
- [ ] T082 Add entry-reference checks to `src/domain/shared.js`'s `canDeleteUser`/`canDeleteDepartment` before allowing deletion of a referenced user or department per FR-021, FR-023 (bug)
- [ ] T083 Add shape/type validation for individual stored records per collection when loading in `src/storage.js`, preserving existing data and informing the user on malformed records instead of trusting `schemaVersion` presence/equality alone per FR-039 (gap)
- [ ] T084 Scope `addEntry()` in `src/services/entry-service.js` as a test-only seeding helper (move to `tests/setup` or `src/utils/seed.js`) or add the same balance/line validation guard as `saveEntry` so the service's public surface cannot bypass validation per FR-012, FR-036 (bug)
- [ ] T085 Consolidate the duplicate approval implementations (`src/services/entry-service.js::approveEntry` vs `src/services/approval-service.js::approveEntry`) and the duplicate reverse implementations (`src/services/entry-service.js::reverseEntry` vs `src/services/reverse-service.js::reverseEntry`, which also disagree on `>= 0` vs `> 0` when swapping sides) into one canonical implementation each — matching whichever one `src/views/transacciones.js` actually calls — and delete the other per Constitution I (maintainability)
- [ ] T086 Wire `src/views/dashboard.js`, `src/views/centros-costo.js` and `src/views/reportes.js` to the shared `src/services/metrics-service.js`, `cost-center-service.js` and `report-service.js` aggregation instead of each view re-implementing its own, or retire the unused services if the per-view approach is kept intentionally (plan: single aggregation source)
- [ ] T087 Delete the unwired `src/components/*` tree (11 files) and `src/module-config.js`, superseded by `src/views/*` and `src/main.js` (dead code cleanup)
- [ ] T088 Decide and document whether `src/services/auth-service.js`'s demo-password login is a permanent placeholder or should be replaced by real host-ERP SSO integration before this module leaves demo status per spec: Assumptions / FR-021
- [ ] T089 Once T086 wires views to the shared services, extend `tests/unit/cost-center.test.js` and `tests/unit/reports.test.js` to cover the production aggregation path exercised by `src/views/centros-costo.js` and `src/views/reportes.js` (test-coverage gap)
