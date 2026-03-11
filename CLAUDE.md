# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server at http://localhost:3000
npm run build        # Production build
npm run type-check   # TypeScript type check (tsc --noEmit)
npm run lint         # ESLint
```

There is no test runner configured. Verification is done via `type-check`, `lint`, and static analysis.

## Architecture

This is a **Next.js 15 App Router** project using React 19, TypeScript (strict mode), and Tailwind CSS v4.

```
src/
  app/          # App Router — page.tsx dynamically requires components via try/catch
  components/   # All React components live here (PascalCase .tsx files)
  data/         # mock-customers.ts — source of truth for the Customer interface and mock data
```

**Key data contract:** All customer-facing components consume the `Customer` interface from `src/data/mock-customers.ts`. Import path is `@/data/mock-customers` (the `@/*` alias maps to `src/*`).

**Component conventions:**
- Stateless presentational components; all state managed by parent
- Export a `[ComponentName]Props` interface from the component file
- Interactive divs require `role`, `tabIndex`, and `onKeyDown` alongside `onClick`
- Tailwind only — no CSS modules, no inline style objects

## Spec-Driven Workflow

This repo uses a spec-driven development methodology. The pipeline is:

```
requirements/[name].md  →  specs/[name]-spec.md  →  src/components/[Name].tsx
```

- **`requirements/`** — raw product requirements, one file per feature
- **`specs/`** — structured specs following `templates/spec-template.md` (Context, Requirements, Constraints, Acceptance Criteria)
- **`templates/spec-template.md`** — canonical template; always use as structure reference when generating specs

Spec filenames use kebab-case; component filenames use PascalCase.

## Custom Slash Commands

Four workflow commands are defined in `.claude/commands/`:

| Command | Parameter | Output |
|---------|-----------|--------|
| `/spec [ComponentName]` | Component name (PascalCase or kebab) | `specs/[name]-spec.md` |
| `/implement [spec path]` | Path to spec file | `src/components/[Name].tsx` with iterative refinement |
| `/verify [component path]` | Path to component file | Type check + lint + data compatibility + responsive + accessibility + spec compliance report |
| `/spec-review [spec path]` | Path to spec file | Validation report against template structure |
