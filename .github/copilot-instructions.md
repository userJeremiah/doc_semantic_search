<!-- .github/copilot-instructions.md - short, actionable guidance for AI coding agents -->
# Repo-specific instructions for AI coding agents

Keep guidance compact and actionable. This project is a Node/Express backend that combines Algolia (search) and Permit.io (authorization).

- Big picture
  - Entry point: `server.js` (exports the Express app). `test-server.js` is used by tests.
  - Main functional layers:
    - Routes: `routes/*.js` (e.g. `routes/search.js`) — validate input, call services, format responses.
    - Services: `services/*` (notably `secureSearch.js`, `algolia.js`, `permit.js`) — business logic, external integration.
    - Middleware: `middleware/auth.js` — JWT verification, role checks, shift/expiry checks.
  - Data flow for a search: route -> `SecureSearchService.secureSearch()` -> Algolia search -> Permit checks (batched) -> sanitize & audit -> response.

- Quick dev / test commands (use PowerShell on Windows):
  - Start: `npm start` (runs `node server.js`)
  - Dev with reload: `npm run dev` (uses nodemon)
  - Demo (no external keys): `npm run demo`
  - Tests: `npm test` (Jest), watch: `npm run test:watch`, coverage: `npm run test:coverage`
  - Lint: `npm run lint` and auto-fix: `npm run lint:fix`

- Environment & integrations
  - Required env vars: `PERMIT_TOKEN`, `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`, `ALGOLIA_ADMIN_KEY`, `ALGOLIA_INDEX_NAME`, `JWT_SECRET` (see README / QUICKSTART).
  - Tests and demo use Algolia mocks when `NODE_ENV === 'test'` or `ALGOLIA_APP_ID==='test-app-id'` (see `services/algolia.js`).
  - Permit.io role/resource mappings are in `config/permit-mappings.js` — roles like `hospital_admin` map to `admin`, `attending_physician` maps to `doctor`, etc.

- Important code / conventions to preserve
  - Internal security metadata fields in Algolia records are prefixed with underscore: `_department`, `_patient_id`, `_sensitivity_level`. These must be removed before returning results to clients (see `secureSearch.js`).
  - Algolia uses `objectID` as the record identifier — keep that stable across index and API responses.
  - `req.user` shape produced by JWT middleware (`middleware/auth.js`) is expected by services and routes: { id, email, role, department, permissions, shiftStart, shiftEnd, accessExpiry, assignedPatients, emergencyAccess }.
  - Permit checks are batched (batchSize = 10 in `secureSearch.js`). Avoid changing that without adding tests and performance checks.

- Testing patterns
  - Tests mock services with `jest.mock(...)` (see `tests/search.test.js`). When adding tests, follow the same pattern: mock external services (Algolia, Permit) and assert route behavior.
  - Use `test-server.js` (instead of `server.js`) for faster, isolated tests.

- Error handling & logging
  - The app uses a centralized global error handler in `server.js`. Routes and services use thrown Error messages like `Access denied` and `Record not found` — tests and handlers rely on these exact substrings to choose status codes.
  - Audit/logging is currently via `console.log` for search and export events. Keep audit payload keys consistent (`userId`, `userEmail`, `action`, `timestamp`, etc.) when extending logs.

- Where to change behavior safely
  - Algolia index settings and synonyms: `services/algolia.js` — safe to adjust searchable attributes, facets, and synonyms; add tests that assert `initializeIndex()` calls when changing defaults.
  - Security filters and emergency access: `services/secureSearch.js` — small, well-scoped changes ok, but must preserve sanitization of internal fields and Permit authorization calls.

- PR & test checklist for code changes
  - Update/extend or add unit tests in `tests/` for all changed behavior (follow existing jest/supertest patterns).
  - Preserve API shapes in `routes/*.js` (response fields like `hits`, `totalHits`, `securityInfo`, `query`).
  - Run `npm test` and `npm run lint` before committing.

- Where to find examples
  - Search flow example: `services/secureSearch.js` (filtering, batching, audit)
  - Auth & access checks: `middleware/auth.js` (JWT, requireRole, checkAccessExpiry)
  - Algolia integration & test mocking: `services/algolia.js`
  - Route validations & response shaping: `routes/search.js`
  - Tests illustrating mocks: `tests/search.test.js`

If anything in these notes is unclear or you want more detail on a section (routes, tests, or a specific service), tell me which part and I will expand or add short examples.
