# Architecture Decision Records - Index

This directory contains Architecture Decision Records (ADRs) documenting significant architectural decisions made in the canvas-editor project.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision along with its context and consequences. Each ADR describes a decision that affects the structure, non-functional characteristics, dependencies, interfaces, or construction techniques of the project.

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-XXXX: [Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded]  
**Date**: YYYY-MM-DD  
**Deciders**: [Who made the decision]  
**Tags**: [relevant, tags]

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive
- List of positive consequences

### Negative
- List of negative consequences

### Risks
- List of identified risks

## Alternatives Considered

What other options were evaluated?

## References

- Links to related documents, discussions, or external resources
```

## Active ADRs

### Infrastructure & Tooling
- [ADR-0001](adr-0001-shape-engine-integration.md) - Shape Engine Integration for Complex Scripts (2026-02-04)

### Core Editor
- [ADR-0002](adr-0002-table-auto-fit-and-multipage.md) - Table Auto-Fit and Multi-Page Improvements (2026-02-17)

### Performance
- (none yet)

### API Design
- (none yet)

## Deprecated ADRs
- (none yet)

## How to Create a New ADR

1. Choose the next available number (e.g., ADR-0002)
2. Create a file: `adr-XXXX-short-title.md`
3. Fill in the template above
4. Discuss with team if needed
5. Update status to "Accepted" when decided
6. Add entry to this index
7. Commit to repository

## Decision Status

- **Proposed**: Under discussion, not yet decided
- **Accepted**: Decision made and approved
- **Deprecated**: No longer relevant
- **Superseded**: Replaced by another ADR (link to new ADR)
