# Project memory

## Product intent & audience

- French-language application (user communicates in French; UI likely French).
- Work is organized in incremental tickets: **SF-001** (dashboard/tableau de bord — done), **SF-002**, **SF-003**, **SF-004** (pending).
- Production-grade, fully-featured web app.

## Brand personality & voice

- Tone: professional French; practical and direct in conversation.

## Visual design & UX direction

- SF-001 implemented a dashboard (tableau de bord); current baseline is that existing UI.
- No specific aesthetic/color/typography details inferred yet beyond production-quality requirement.

## Decisions, constraints & rationale

- Stack: Vite + React (JSX), Tailwind CSS, React hooks, Lucide React for icons — no extra UI/theme/icon packages unless requested.
- This Bolt project is **not a git repo** and has no GitHub connection; branches cannot be fetched automatically.
- External code must be integrated by pasting file contents/diffs, or by importing the GitHub repo into a new Bolt project.
- SF-001 work remains present in the current project state.

## Open questions & assumptions

- What do SF-002, SF-003, SF-004 require functionally? (No specs received yet.)
- Does the user want to continue in this Bolt project (via pasted content) or re-import from GitHub?
- Target audience and detailed visual direction still unspecified.