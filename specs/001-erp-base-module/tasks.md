# Tasks: Módulo de Contabilidad y Finanzas (001-erp-base-module)

**Input**: Design documents from `/specs/001-erp-base-module/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Include test tasks — plan.md (Verificación de la Constitución) requires automated coverage of core create/edit/delete/search flows using Vitest with jsdom.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Every task includes an exact file path

## Tech Stack (from plan.md)

- JavaScript (ES2022) + HTML + CSS, Vite, no UI framework
- Persistence: `localStorage` (single-instance module)
- Testing: Vitest + jsdom
- Workspace shell: top bar + sidebar shared across all views (already present in `index.html` / `src/main.js`)
- Money: exact decimal arithmetic with up to 4 decimals — never floating point

## Module Source Structure (target)

```text
src/
├── main.js                 (existing — navigation + view wiring)
├── styles.css              (existing — design tokens incl. accent color)
├── storage.js              (generic localStorage collection layer)
├── module-config.js        (module labels, state lifecycle, accent color)
├── utils/
│   ├── money.js            (exact decimal arithmetic)
│   ├── validation.js       (shared validators)
│   └── seed.js             (demo/test seed data)
├── domain/
│   ├── account.js          (Cuenta_Contable)
│   ├── entry.js            (Transaccion + Detalle_Transaccion)
│   └── shared.js           (Usuario_Base / Departamento_Base references)
├── services/
│   ├── metrics-service.js
│   ├── account-service.js
│   ├── entry-service.js
│   ├── audit-service.js
│   ├── reverse-service.js
│   ├── approval-service.js
│   └── query-service.js
├── components/
│   ├── shell.js            (workspace frame: top bar, sidebar, routing)
│   ├── dashboard.js
│   ├── account-form.js
│   ├── account-list.js
│   ├── entry-form.js
│   ├── entry-list.js
│   └── entry-actions.js
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
- [ ] T003 [P] Create module configuration (labels in Spanish, state lifecycle `Borrador → Pendiente → Aprobada → Contabilizada → Revertida`, accent color token) in `src/module-config.js`
- [ ] T004 [P] Create generic localStorage collection layer with `loadCollection/saveCollection/addRecord/updateRecord/deleteRecord`, auto ids and ISO timestamps in `src/storage.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] Implement exact decimal money arithmetic (integer scaling, 4-decimal limit, no float ops) in `src/utils/money.js`
- [ ] T006 [P] Implement shared validators (required fields, account code format, ISO 4217 currency, dates, amount rules) in `src/utils/validation.js`
- [ ] T007 [P] Implement shared ERP references for `Usuario_Base` and `Departamento_Base` (lookup, seed data, block deletion when referenced) in `src/domain/shared.js`
- [ ] T008 Implement workspace shell view routing for `dashboard`, `accounts`, `entries`, `query`, `audit` views in `src/components/shell.js` and wire it in `src/main.js` and `index.html`
- [ ] T009 [P] Create demo/test seed data (accounts, users, departments, sample balanced entries in state `Contabilizada`) in `src/utils/seed.js`
- [ ] T010 [P] Create unit tests for money and validation utilities in `tests/unit/money.test.js` and `tests/unit/validation.test.js`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Panel financiero para la toma de decisiones (Priority: P1) 🎯 MVP

**Goal**: Dashboard showing ingresos, gastos, resultado neto and flujo de caja computed from `Contabilizada` entries of the selected period, with zero-state when empty and live updates (FR-001, FR-002, FR-003).

**Independent Test**: Open the module with existing `Contabilizada` entries and verify the metric cards show correct totals; with an empty module all metrics show zero and an invitation message appears; after registering/posting an entry the metrics refresh without a manual reload.

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create metrics service computing ingresos, gastos, resultado neto and flujo de caja from `Contabilizada` entries per period in `src/services/metrics-service.js`
- [ ] T012 [P] [US1] Create dashboard component with 4 live metric cards, empty state message and quick-action buttons in `src/components/dashboard.js`
- [ ] T013 [US1] Wire dashboard refresh-on-visible and quick actions into view routing in `src/main.js` (depends on T011, T012)
- [ ] T014 [US1] Add dashboard styles (metric card grid, empty state) using design tokens in `src/styles.css`
- [ ] T015 [US1] Create integration tests: metrics from seeded entries, zero-state, update after posting an entry in `tests/integration/dashboard-metrics.test.js`

**Checkpoint**: User Story 1 fully functional and testable independently

---

## Phase 4: User Story 2 - Administración del plan de cuentas (Priority: P1)

**Goal**: Hierarchical chart of accounts with unique code, type, nature, parent account and active/inactive state; create, edit, deactivate/reactivate; block deletion of accounts with movements; prevent hierarchy cycles (FR-004–FR-008).

**Independent Test**: Create an account with a unique code, edit it, deactivate it, and verify it appears/disappears from the catalog and from entry forms; duplicate codes and cycles are rejected with clear messages.

### Implementation for User Story 2

- [ ] T016 [P] [US2] Create account domain model with validation (unique mandatory code as text, tipo, naturaleza, parent, acepta_movimientos, activa) in `src/domain/account.js`
- [ ] T017 [P] [US2] Create unit tests for account validation (duplicate code, cycle/autorreference, inactive parent) in `tests/unit/account.test.js`
- [ ] T018 [US2] Implement account service: CRUD, unique-code enforcement, hierarchy cycle prevention, block delete with movements → offer deactivate, in `src/services/account-service.js` (depends on T016)
- [ ] T019 [US2] Create account create/edit form with clear validation messages preserving entered data in `src/components/account-form.js`
- [ ] T020 [US2] Create account catalog list with search, edit, deactivate/reactivate actions in `src/components/account-list.js`
- [ ] T021 [US2] Wire accounts view (form + list) into navigation in `src/main.js` (depends on T019, T020)
- [ ] T022 [US2] Create integration tests: create/edit/deactivate, duplicate code rejected, delete-with-movements blocked in `tests/integration/accounts.test.js`

**Checkpoint**: US1 and US2 both work independently

---

## Phase 5: User Story 3 - Registro de asientos por partida doble (Priority: P1)

**Goal**: Register entries with accounting date, document type/number, description, currency and ≥2 lines; each line posts to one account on exactly one side (Debe xor Haber) with optional cost center and gloss (glosa); block unbalanced entries, inactive accounts, invalid amounts (FR-009–FR-013, FR-026).

**Independent Test**: Create an entry with at least two lines; verify saving is blocked when unbalanced and succeeds when Debe equals Haber; lines with both sides, null/negative/over-4-decimal amounts, or inactive accounts are rejected.

### Implementation for User Story 3

- [ ] T023 [P] [US3] Create entry domain models (`Transaccion`, `Detalle_Transaccion`) with line and header validation rules in `src/domain/entry.js`
- [ ] T024 [P] [US3] Create unit tests for entry validation (balance, min 2 lines, one-side-only, amount format, inactive account) in `tests/unit/entry-validation.test.js`
- [ ] T025 [US3] Implement entry service: atomic save of balanced draft entries with referential checks (users, departments, active accounts) in `src/services/entry-service.js` (depends on T023, T018)
- [ ] T026 [US3] Create entry form with header fields, dynamic detail lines and live Debe/Haber totals with blocking validation messages in `src/components/entry-form.js`
- [ ] T027 [US3] Wire entries view (new/edit draft) into navigation in `src/main.js` (depends on T026)
- [ ] T028 [US3] Create integration tests: balanced draft saved, unbalanced blocked, invalid line rejected, <2 lines rejected in `tests/integration/entry-create.test.js`

**Checkpoint**: US3 independently testable with seeded accounts

---

## Phase 6: User Story 4 - Auditoría, inmutabilidad y reversas (Priority: P1)

**Goal**: `Contabilizada`/`Revertida` entries cannot be edited or deleted; corrections via a linked reverse entry with swapped Debe/Haber; only one direct reverse per entry; full state-change history with user and timestamp (FR-015–FR-019).

**Independent Test**: Attempt to edit a `Contabilizada` entry → blocked with guidance to reverse; execute "Revertir" → new entry created with sides swapped and reference to the original; reversing an already-reversed entry is blocked and shows the existing reverse; history shows who did what and when.

### Implementation for User Story 4

- [ ] T029 [P] [US4] Create audit service recording actor, action, state change and timestamp per entry in `src/services/audit-service.js`
- [ ] T030 [US4] Enforce immutability: block edit/delete of `Contabilizada`/`Revertida` entries in `src/services/entry-service.js` (depends on T025)
- [ ] T031 [US4] Implement reverse service: swap Debe/Haber, link `id_transaccion_revertida`, one-reverse-only, reject non-`Contabilizada` reversals, atomic posting of both entries in `src/services/reverse-service.js` (depends on T025, T029)
- [ ] T032 [US4] Add entry detail/actions UI: reverse button, immutability warnings and state-change history panel in `src/components/entry-actions.js`
- [ ] T033 [US4] Create integration tests: edit blocked, reverse created with swapped sides and link, double-reverse blocked, history recorded in `tests/integration/audit-reverse.test.js`

**Checkpoint**: US1–US4 independently functional

---

## Phase 7: User Story 5 - Flujo de aprobación de asientos (Priority: P2)

**Goal**: State machine `Borrador → Pendiente → Aprobada → Contabilizada` with no skips; approval records approver identity and date; permission checks enforced in the service layer, not just the UI (FR-014, FR-015, FR-020).

**Independent Test**: An authorized user sends a draft to review (→`Pendiente`) and another user with approval permission approves and posts it, recording identity and date; posting a draft directly is rejected; a user without permission is denied.

### Implementation for User Story 5

- [ ] T034 [P] [US5] Implement approval service: allowed transitions only, permission gate, approver/posting audit fields in `src/services/approval-service.js` (depends on T029)
- [ ] T035 [US5] Add approval workflow actions (send to review, approve, post) with permission-aware enabling in `src/components/entry-actions.js` (depends on T034)
- [ ] T036 [US5] Create integration tests: full flow with identities, illegal skip blocked, unauthorized denied in `tests/integration/approval-flow.test.js`

**Checkpoint**: US5 independently testable; approval flow complete end-to-end

---

## Phase 8: User Story 6 - Consulta histórica y filtrado (Priority: P2)

**Goal**: Search entries by date range, account, cost center, state and free text; clear empty state with "clear filters" option; fluid performance up to 500 entries (FR-024, FR-025).

**Independent Test**: Apply a department + state filter and get only matching entries; clearing filters restores the full list; a no-match filter shows an empty state, not an error.

### Implementation for User Story 6

- [ ] T037 [P] [US6] Implement query service filtering entries by date range, account, cost center, state and free text (description/document number) in `src/services/query-service.js` (depends on T025)
- [ ] T038 [US6] Create filter panel and results list with empty state and clear-filters action in `src/components/entry-list.js`
- [ ] T039 [US6] Optimize list rendering for up to 500 records using lightweight DOM updates in `src/components/entry-list.js` (depends on T038)
- [ ] T040 [US6] Create integration tests: combined filters, text search, empty state, clear filters in `tests/integration/entry-search.test.js`

**Checkpoint**: All user stories independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T041 [P] Audit Spanish UI copy and ERP shell consistency (top bar + sidebar identical across all views) in `src/components/shell.js` and `src/module-config.js`
- [ ] T042 Verify persistence integrity across reloads (no loss, no duplication) with a test in `tests/integration/persistence.test.js`
- [ ] T043 Run full validation: `npm test`, `npm run build`, and manual walkthrough of `specs/001-erp-base-module/quickstart.md` scenarios
- [ ] T044 [P] Update `README.md` with module features, scripts and extension points

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–8)**: All depend on Foundational completion
  - Priority order: P1 (US1, US2, US3, US4) → P2 (US5, US6)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1) Panel financiero**: Starts after Phase 2. Independent — testable with seeded `Contabilizada` entries. Consumes `entry-service` data but not its UI.
- **US2 (P1) Plan de cuentas**: Starts after Phase 2. No dependencies on other stories.
- **US3 (P1) Registro de asientos**: Starts after Phase 2; needs accounts (US2) for real usage but is testable with seeded accounts. Depends on T018 (account service) for active-account checks.
- **US4 (P1) Auditoría/reversas**: Depends on US3 (`entry-service`) — start after T025.
- **US5 (P2) Aprobación**: Depends on US3 entry model and US4 audit service — start after T029.
- **US6 (P2) Consulta**: Depends on US3 entries existing — start after T025; independent of US4/US5 UI.

### Within Each User Story

- Unit tests before/alongside domain models
- Domain models before services
- Services before components
- Components before view wiring in `src/main.js`
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T002, T003, T004 in parallel (different files)
- Phase 2: T005, T006, T007, T009, T010 in parallel
- US1: T011 ∥ T012 (metrics service ∥ dashboard component)
- US2: T016 ∥ T017 (model ∥ unit tests)
- US3: T023 ∥ T024 (model ∥ unit tests)
- US4: T029 can start in parallel with US2/US3 work
- Once Phase 2 completes, US1 ∥ US2 can run in parallel (independent files)
- US6 query service (T037) can be developed in parallel with US4/US5

---

## Parallel Example: User Story 2

```text
# Launch together (different files, no dependencies):
Task: "Create account domain model in src/domain/account.js"
Task: "Create unit tests for account validation in tests/unit/account.test.js"

# Then sequential:
Task: "Implement account service in src/services/account-service.js"
Task: "Create account form in src/components/account-form.js" ∥ "Create account list in src/components/account-list.js"
Task: "Wire accounts view in src/main.js"
Task: "Create integration tests in tests/integration/accounts.test.js"
```

## Parallel Example: User Story 1

```text
Task: "Create metrics service in src/services/metrics-service.js"
Task: "Create dashboard component in src/components/dashboard.js"
# Then:
Task: "Wire dashboard refresh in src/main.js"
Task: "Add dashboard styles in src/styles.css"
Task: "Create integration tests in tests/integration/dashboard-metrics.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 + prerequisites)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 4 (US2 plan de cuentas) and Phase 5 (US3 asientos) — required data entry points
4. Complete Phase 3: User Story 1 (panel financiero)
5. **STOP and VALIDATE**: Test US1 independently with seeded entries (SC-001, SC-003)
6. Deploy/demo if ready

> Note: Although US1 is listed first by value, the dashboard reads posted entries; seed data (`src/utils/seed.js`) or US3 entries make it demonstrable immediately after Phase 2.

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US2 (cuentas) → test independently → demo
3. US3 (asientos) → test independently → demo
4. US1 (panel) → test independently → **MVP completo**
5. US4 (auditoría) → test independently → demo
6. US5 (aprobación) → test independently → demo
7. US6 (consulta) → test independently → demo
8. Polish → full validation (`npm test`, `npm run build`, quickstart walkthrough)

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US2 (cuentas) → US3 (asientos)
   - Developer B: US1 (panel + metrics)
   - Developer C: US4 (auditoría/reversas) after US3 domain lands
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Money arithmetic must use exact decimals (`src/utils/money.js`) — never floating point (Assumption)
- Authorization checks live in services (`approval-service.js`, `entry-service.js`), never only in the UI (FR-020)
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
