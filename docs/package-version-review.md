# Package Version Review

## Summary
Overall stack mixes future-major versions (React 19, Next 16, Tailwind 4, Zod 4, Jest 30) with libraries whose latest broadly adopted stable majors (late 2025) are earlier. This increases risk of subtle incompatibilities (esp. React 19 + MUI 7 + next-intl + testing libraries). Recommend pinning (remove carets) for all future / less battle‑tested majors, downgrading where warranted for stability, and adding missing test/transpile tooling.

## Dependencies

| Package | Version | Notes / Action |
|---------|---------|----------------|
| next | ^16.0.1 | Ensure this is actually released; if not, use latest stable (e.g. 15.x) or canary explicitly. Pin: 16.0.1 (no caret) if kept. |
| react / react-dom | ^19.2.0 | React 19 introduces breaking internals; verify MUI 7 supports 19.x officially. If not, consider React 18.3.x. Pin both identically. |
| @mui/material / icons-material | ^7.3.5 | Keep same minor; check release notes for React 19 support. Pin to 7.3.5. |
| @emotion/react / styled | ^11.14.x | Compatible with MUI; caret ok. |
| @tanstack/react-query | ^5.90.7 | v5 stable; caret acceptable. |
| next-intl | ^4.5.0 | Confirm compatibility with Next 16/React 19; pin if upstream hasn’t declared support yet. |
| zustand | ^5.0.8 | v5 has breaking changes; audit API usage (e.g. middleware differences). Pin. |
| date-fns | ^4.1.0 | v4 may still be early; if unstable consider v3.x. Pin if staying on v4. |
| zod | ^4.1.12 | v4 introduces breaking changes from v3; confirm needed features. Pin. |

## Dev Dependencies

| Package | Version | Notes / Action |
|---------|---------|----------------|
| jest | ^30.2.0 | If experimental; stable may be 29.x. Need transformer for TypeScript. |
| @types/jest | ^30.0.0 | Match installed Jest major. |
| jest-environment-jsdom | ^30.2.0 | Align with Jest major. |
| @testing-library/* | Latest majors; OK with React 19 but verify changelog. |
| tailwindcss | ^4.1.17 | Tailwind 4 introduces design tokens / config changes; ensure migration is intentional; otherwise revert to 3.x stable. |
| typescript | ^5.9.3 | Cutting edge; ensure Jest transform supports it. |
| eslint / prettier | Current; fine. |

## Missing / Recommended Adds

- jest transformer for TypeScript:
  - Option A: ts-jest (adds compilation; simple config)
  - Option B: babel-jest + @babel/preset-typescript (add Babel config)
  - Option C: swc-jest (fast, aligns with Next’s SWC)
- jest config file (jest.config.mjs):
  - testEnvironment: 'jsdom'
  - transform using chosen option
  - setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
- jest.setup.ts:
  - import '@testing-library/jest-dom';
- Script: "test": "jest"
- Consider locking with exact versions (no ^) for: next, react, react-dom, jest, tailwindcss, zod, zustand, date-fns (if on major in flux).

## Version Strategy

1. Pin future majors to reduce unexpected breakages.
2. Downgrade any future major not required (React 19 → 18.3.x, Next 16 → stable current, Tailwind 4 → 3.x) if ecosystem support unclear.
3. Introduce Renovate or Dependabot for controlled upgrades.
4. Use a compatibility matrix in docs (React/MUI/Next/Tailwind versions) to avoid mismatched upgrades.

## Priority Actions

- Decide stability vs adopting future majors; adjust versions.
- Add test tooling (transform + scripts).
- Pin critical versions.
- Run initial test + build to confirm no peer dependency warnings.
