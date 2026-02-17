# Session 014 — Priority Analysis & Next Steps Planning

**Date**: 2026-02-17
**Branch**: `shape-engine`

---

## Analysis Summary

### Current State (86% complete on shape-engine)

| Phase | Status | Completion |
|-------|--------|------------|
| 0-5B: Shaping + RTL rendering | Complete | 100% |
| 7: BiDi support | Complete | 100% |
| 8-9: Cursor/Selection/Hit-testing | Complete | 90% |
| 10: RTL Particle Adaptation | Complete | 90% |
| 11: Polish & Release | Not started | 0% |
| Beautification & Fixes | Partial | ~40% |
| Upstream tracking | Tracked | 2 critical, 6 optional |

### Pending Work Identified

#### A. Shape Engine — Remaining Items (Phase 10-11)
1. RTL selection fix for pure Arabic text (deferred bug)
2. Phase 11: Performance optimization — no benchmarks done yet
3. Phase 11: Cross-browser testing
4. Phase 11: Documentation & migration guide
5. Phase 11: E2E tests for RTL/BiDi
6. Phase 11: Bundle size optimization

#### B. Upstream Bug Fixes (Critical — 2 items)
1. `0b659ef` — titleId restoration (backspace/enter) — **Status: Already implemented** (confirmed in BEAUTIFICATION plan)
2. `ea650f6` — control postfix cursor — **Status: Already implemented** (confirmed guard exists)

#### C. Beautification (Partial — from BEAUTIFICATION-AND-FIXES.md)
1. ~~Selection overlay (render order + color)~~ → Implemented via layer system
2. Checkbox modernization (rounded corners) — **NOT DONE**
3. Radio modernization (softer border) — **NOT DONE**
4. Color/UI modernization (hyperlink, cursor, search, contextmenu) — **NOT DONE**

#### D. New Work — Table Improvement
1. Paste auto-fit (critical user-facing bug)
2. Multi-page split improvement
3. Auto-fit command

---

## Priority Decision

### Evaluation Matrix

| Work Item | User Impact | Effort | Risk | Priority |
|-----------|-----------|--------|------|----------|
| **Table paste auto-fit (T1)** | **Critical** — tables literally unusable when pasted wide | 1-2 sessions | Low | **P0** |
| **Beautification (checkboxes, colors)** | Medium — visual polish | 1 session | Very low | P2 |
| **Phase 11 Performance** | Unknown — no benchmarks yet | 2-4 sessions | Medium | **P1** (needs measurement first) |
| **Multi-page table split (T2)** | High — page overflow | 2-3 sessions | Medium | **P1** |
| **Phase 11 docs/tests** | Low — dev quality | 2-3 sessions | Low | P3 |

### Decision: Start with Table Paste Auto-Fit (Phase T1)

**Rationale:**

1. **It's a blocking user-facing bug**: When users paste a Google Docs table, the
   table expands beyond the editor with no recovery path. This is the single worst
   table experience compared to Google Docs.

2. **It's small and self-contained**: 1-2 sessions, localized to `element.ts` + 
   `TableOperate.ts`. No architecture changes. Low risk of regression.

3. **Performance (Phase 11) needs measurement first**: We don't know if there ARE
   performance problems. Running benchmarks is a prerequisite before spending
   sessions optimizing. The shaping engine has aggressive caching, smart routing
   (Canvas API for Latin text), and only activates for complex scripts. Likely
   performance is acceptable for most documents.

4. **Beautification is cosmetic**: Important but not blocking. Can be done anytime.

5. **Multi-page table split (T2) is harder**: Needs T1 first anyway (wide tables
   compound the split problem). Better sequencing.

### Recommended Execution Order

```
Session 014: Table Paste Auto-Fit (Phase T1)           ← START HERE
Session 015: Beautification (checkboxes, radio, colors)
Session 016: Performance Benchmarking (Phase 11 discovery)
Session 017: Multi-Page Table Split (Phase T2a)
Session 018: Performance Optimization (if needed from benchmarks)
Session 019: Multi-Page Table Split (Phase T2b)
Session 020: Auto-Fit Command (Phase T3) + remaining polish
```

### Performance Note

Phase 11 "performance improvement" is currently **undefined** — there are no
benchmarks showing what's slow. Before investing sessions in optimization:

1. Run `performance.now()` benchmarks for:
   - Typing latency (simple LTR, Arabic, mixed BiDi)
   - Full document render time (100-page document)
   - Scroll performance
   - Table rendering (large tables, 50+ rows)
2. If all metrics are under 16ms (60fps threshold) → performance work is LOW priority
3. If any metric exceeds 30ms → targeted optimization is warranted

The shaping engine was designed with performance in mind (LRU cache, smart routing,
Canvas API fast path for Latin). It's likely fine for typical documents.

---

## Files Created

| File | Purpose |
|------|---------|
| `.ai/decisions/adr-0002-table-auto-fit-and-multipage.md` | Architecture decision record |
| `.ai/plans/TABLE-IMPROVEMENT.md` | Detailed phase plan (T1-T4) |
| `.ai/sessions/SESSION-014-SUMMARY.md` | This analysis |

---

## Next Steps (Immediate)

1. **Begin Phase T1.1**: Implement `normalizeTableColWidths()` in TableOperate.ts
2. **Begin Phase T1.2**: Add normalization call in paste path (element.ts)
3. **Test**: Copy table from Google Docs → paste into editor → verify it fits
