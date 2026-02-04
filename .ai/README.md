# AI Session Management

This directory contains AI-assisted development session management files for the canvas-editor project.

## Purpose

Maintain continuity of AI-assisted development across different machines, sessions, and time periods. These files serve as project memory and context for both human developers and AI coding agents.

## Directory Structure

```
.ai/
├── README.md                    # This file - overview of AI session management
├── context/
│   ├── project-overview.md      # High-level project context
│   ├── current-focus.md         # What we're currently working on
│   └── technical-constraints.md # Important technical limitations & decisions
├── sessions/
│   ├── session-log.md          # Chronological session history
│   └── YYYY-MM-DD-<topic>.md   # Individual session notes
├── tasks/
│   ├── active-tasks.md         # Current sprint/active work items
│   ├── backlog.md              # Future planned work
│   └── <feature-name>.md       # Detailed task breakdowns per feature
├── decisions/
│   ├── adr-index.md            # Architecture Decision Records index
│   └── adr-NNNN-<title>.md     # Individual ADRs
├── prompts/
│   ├── templates.md            # Reusable prompt templates
│   └── context-snippets.md     # Important code patterns & context
└── progress/
    ├── milestones.md           # Major milestones & completion status
    └── metrics.md              # Progress tracking metrics
```

## Usage Guidelines

### For Human Developers

1. **Starting a new session**: Update `sessions/session-log.md` with date and goals
2. **Task management**: Update `tasks/active-tasks.md` with current status
3. **Making decisions**: Document in `decisions/adr-NNNN-<title>.md`
4. **Completing work**: Update progress files and mark tasks complete

### For AI Agents

1. **On session start**: Read `context/current-focus.md` and `tasks/active-tasks.md`
2. **During work**: Reference `decisions/adr-index.md` for architectural constraints
3. **Before major changes**: Create ADR in `decisions/` if needed
4. **On session end**: Update session log and task status

## File Format Standards

- Use Markdown for all documentation
- Date format: `YYYY-MM-DD`
- Task status: `[ ]` not started, `[~]` in progress, `[x]` completed
- ADR numbering: Sequential with leading zeros (e.g., ADR-0001)

## Maintenance

- Commit all `.ai/` changes to version control
- Review and archive completed sessions monthly
- Keep context files under 1000 lines for AI parsing efficiency
