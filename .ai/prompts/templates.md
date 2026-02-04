# Reusable Prompt Templates

Templates for common AI interactions during the shape engine integration project.

---

## Starting a New Session

```
I'm continuing work on the canvas-editor shape engine integration project.

Please read the following context files:
- .ai/context/current-focus.md
- .ai/tasks/shape-engine-integration.md
- .ai/sessions/session-log.md (latest entry)
- .ai/decisions/adr-0001-shape-engine-integration.md

Current Phase: [Phase X - Name]
Today's Goal: [Specific objective]

Please confirm understanding and suggest next steps.
```

---

## Requesting Code Review

```
Please review the following code for [specific concern]:

File: [file path]
Lines: [line range or paste code]

Considerations:
- Follows project code style? (no semicolons, single quotes, 2-space indent)
- TypeScript strict mode compliance?
- Performance implications?
- Edge cases handled?
- [Any other specific concerns]

Refer to .ai/context/technical-constraints.md for code style rules.
```

---

## Asking for Architecture Guidance

```
I need architecture guidance for: [specific problem]

Context:
- Current Phase: [phase number and name]
- Related Files: [list relevant files]
- Constraint: [any specific constraints]

Question:
[Your specific question]

Please consider:
- ADR-0001 (shape engine integration)
- Existing canvas-editor architecture
- Performance implications
- Backward compatibility
```

---

## Requesting Implementation

```
Implement [specific feature/task]

Task Reference: .ai/tasks/shape-engine-integration.md - Task [X.Y]

Requirements:
- [Requirement 1]
- [Requirement 2]
- [etc.]

Technical Constraints:
- Follow .ai/context/technical-constraints.md
- No semicolons, single quotes, 2-space indent
- TypeScript strict mode
- Must maintain backward compatibility

Files to Modify: [if known]
New Files Needed: [if known]

Please implement with unit tests.
```

---

## Debugging Assistance

```
I'm experiencing [issue description]

File: [file path]
Function/Area: [specific function or area]
Expected: [expected behavior]
Actual: [actual behavior]

Relevant code:
[paste code snippet]

Error message (if any):
[paste error]

Context:
- Task: [current task reference]
- Recent changes: [brief description]

Please help debug and suggest fixes.
```

---

## Performance Analysis

```
Please analyze performance for: [specific code or feature]

File: [file path]
Code:
[paste code]

Concerns:
- Performance target: [e.g., 60fps, <16ms per frame]
- Expected usage: [how frequently this code runs]
- Data size: [typical data size]

Please:
1. Identify potential bottlenecks
2. Suggest optimizations
3. Recommend profiling approach
4. Consider caching strategies
```

---

## Test Creation

```
Create tests for [feature/function]

File to Test: [file path]
Function/Class: [specific function or class]

Test Coverage Needed:
- [ ] Happy path
- [ ] Edge cases: [list specific edge cases]
- [ ] Error handling
- [ ] Performance (if applicable)

Test Framework: [Cypress E2E / Unit tests]

Refer to existing tests in cypress/e2e/ for patterns.
```

---

## Documentation Request

```
Create/update documentation for [feature]

Type: [API docs / User guide / Code comments]

Content needed:
- Overview: [high-level description]
- Usage: [how to use]
- Examples: [specific examples needed]
- Parameters: [if API]
- Returns: [if API]
- Edge cases: [important edge cases to document]

Style: Follow existing documentation in docs/ folder
Format: Markdown
```

---

## Task Status Update

```
Update task status in .ai/tasks/shape-engine-integration.md

Completed:
- [x] Task X.Y - [task name]
- [x] Task X.Z - [task name]

In Progress:
- [~] Task X.W - [task name]

Blocked:
- [!] Task X.V - [task name] - Reason: [blocking reason]

Also update .ai/sessions/session-log.md with today's progress.
```

---

## Architecture Decision Required

```
I need to make an architecture decision for: [topic]

Context: [explain the situation]

Options:
1. [Option 1]: [description]
   - Pros: [list]
   - Cons: [list]

2. [Option 2]: [description]
   - Pros: [list]
   - Cons: [list]

3. [Option 3]: [description]
   - Pros: [list]
   - Cons: [list]

Recommendation: [if you have one]

Please help evaluate and create an ADR if this is a significant decision.
Reference: .ai/decisions/adr-index.md for ADR template
```

---

## Ending Session

```
Session ending - please help wrap up:

Today's Accomplishments:
- [List what was completed]

Updated Files:
- [List modified files]

Next Session Goals:
- [What should be tackled next]

Please:
1. Update .ai/sessions/session-log.md with today's session
2. Update task statuses in .ai/tasks/shape-engine-integration.md
3. Update .ai/context/current-focus.md if focus changed
4. Suggest commit message for today's changes
```

---

## Emergency Rollback

```
Need to rollback changes due to [reason]

Changed Files: [list files]
Issue: [describe the problem]

Please help:
1. Identify what needs to be reverted
2. Suggest git commands to rollback
3. Document what went wrong in session log
4. Update task status to reflect the rollback
```

---

## Cross-Reference Another Session

```
Refer to previous session for context:

Session: [date] or [session number]
Topic: [what was worked on]
File: .ai/sessions/session-log.md

I need to [continue/modify/revert] work from that session.

Current situation: [describe current state]
Goal: [what you want to achieve]

Please review that session and advise on next steps.
```

---

## Integration Point Analysis

```
Analyze integration point for: [component/feature]

New Component: [name and description]
Existing System: [what it needs to integrate with]

Files involved:
- New: [new files]
- Modified: [files to modify]

Questions:
- How should this integrate without breaking existing code?
- What interfaces are needed?
- What tests are needed to verify integration?
- Any backward compatibility concerns?

Refer to project architecture in .ai/context/project-overview.md
```

---

## Notes

- All prompts should reference `.ai/` files for context
- Be specific about task references (e.g., "Task 2.3" from tasks file)
- Always mention relevant ADRs
- Include code style constraints when requesting implementation
- Update session logs after major milestones
