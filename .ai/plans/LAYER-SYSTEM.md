# Canvas Editor — Multi-Canvas Layer System

## Problem Statement

The editor renders everything onto a **single canvas per page**. Selection highlighting
(`range.render()`) draws on the same canvas as text, making it impossible to place
selection behind text without artifacts. Three approaches were tried and all failed:

1. **Reorder in `drawRow`** — `textParticle.complete()` is called 20+ times mid-loop
   (checkboxes, radios, tabs, BiDi, blocks, justified text, superscript, subscript,
   dates, images, labels, hyperlinks, offset elements, style changes). Moving selection
   before the end-of-row flush produces mixed above/below behavior.

2. **`destination-over` compositing** — `ctx.globalCompositeOperation = 'destination-over'`
   paints behind ALL existing pixels including the white page background. Selection
   becomes completely invisible.

3. **Lower alpha on top** — `rangeAlpha = 0.35` with lighter color. Works visually as
   an interim fix but selection still covers text. Not ideal for professional documents.

## Proposed Architecture: Two-Canvas Layer System

Instead of one canvas per page, create **two stacked canvases** inside a wrapper div:

```
pageContainer (div.ce-page-container)
└── pageWrapper[data-index="N"] (div, position: relative)
    ├── selectionCanvas (z-index: 0, background: #ffffff)
    │   Contains: white fill, background, watermark, selection rects, search highlights
    └── contentCanvas (z-index: 1, background: transparent, cursor: text)
        Contains: margins, area indicators, control highlights, float images,
                  text, tables, controls, underlines, strikeouts, groups,
                  header/footer, line numbers, page border, badges, graffiti
```

### Visual Layering Result

| Layer | Canvas           | Content                                           |
|-------|------------------|----------------------------------------------------|
| 1     | Selection canvas | White page background                              |
| 2     | Selection canvas | Custom background color/image                      |
| 3     | Selection canvas | Watermark                                          |
| 4     | Selection canvas | Selection rectangles (full opacity, no alpha needed)|
| 5     | Selection canvas | Search match highlights                            |
| 6     | Content canvas   | Float-bottom images, area indicators, margins       |
| 7     | Content canvas   | Element highlights, text, controls, tables           |
| 8     | Content canvas   | Underlines, strikeouts, groups, borders              |
| 9     | Content canvas   | Float-top images, badges, graffiti                   |
| 10    | DOM              | Cursor (already separate `<div>`)                   |

Text renders on the transparent content canvas which overlays the selection canvas.
Selection is visually **behind** text because it's on the canvas below.

### Why This Works

- Content canvas has `transparent` background (no CSS backgroundColor)
- Where no content pixels exist, the selection canvas shows through
- Text pixels on the content canvas fully cover anything below
- Selection rects on the bottom canvas are visible only where text isn't
- No compositing tricks needed — just natural CSS stacking

---

## Architecture Analysis

### Current State (single canvas)

**DOM structure:**
```
container (div, position: relative)
└── pageContainer (div.ce-page-container)
    ├── canvas[data-index="0"]  ← single canvas per page
    ├── canvas[data-index="1"]
    └── canvas[data-index="N"]
```

**Key data structures:**
- `pageList: HTMLCanvasElement[]` — one per page
- `ctxList: CanvasRenderingContext2D[]` — one per page
- Events attached to `pageContainer` via delegation
- `data-index` on canvas used by mousedown/mouseup/mousemove/drag handlers

**`_drawPage()` rendering order (21 steps, all onto same ctx):**
1. Clear page
2. Background
3. Area indicators
4. Watermark
5. Page margins
6. Float-bottom images
7. Control highlights
8. **`drawRow(ctx, ...)`** — text, tables, controls, selection
9. Header background
10. Footer background
11. Header content (calls `drawRow` internally)
12. Page number
13. Footer content (calls `drawRow` internally)
14. Float-top images
15. Search highlights
16. Placeholder
17. Line numbers
18. Page border
19. Badges
20. Graffiti

**`drawRow()` per-row flush order:**
1. List styles
2. `textParticle.complete()` — final text flush
3. Control borders
4. Underlines
5. Strikeouts
6. Group decorations
7. **Selection rects** ← this is what we're moving

**`textParticle.complete()` mid-loop calls (20+):** hidden elements, images,
LaTeX, hyperlinks, labels, dates, superscript, subscript, checkboxes, radios,
tabs, justify/alignment, blocks, offset elements, BiDi mixed rows, RTL rows,
letterSpacing, internal style-change flushes.

### Impact Assessment

**Methods that manipulate `pageList`/`ctxList`:**

| Method | Action | Changes Needed |
|--------|--------|----------------|
| `_createPage(pageNo)` | Creates canvas, sets bg/dimensions, DPR | Create wrapper + 2 canvases |
| `_clearPage(pageNo)` | `clearRect` on canvas | Clear both canvases |
| `_initPageContext(ctx)` | Scale, reset letter/word spacing | Call for both contexts |
| `setPageScale(payload)` | Resize all canvases | Resize both canvas sets + wrappers |
| `setPageDevicePixel()` | Reset DPR on all canvases | Reset both canvas sets |
| `setPaperSize(w, h)` | Resize all canvases | Resize both canvas sets + wrappers |
| `setPaperDirection(d)` | Resize all canvases | Resize both canvas sets + wrappers |
| `render()` page creation | `if (!this.pageList[i]) _createPage(i)` | Same, _createPage handles both |
| `render()` page removal | Splice + `page.remove()` | Remove wrapper + both canvases |
| `getDataURL()` | `pageList.map(c => c.toDataURL())` | Composite both canvases |
| `getPage(pageNo)` | Returns `pageList[pageNo]` | Return content canvas (for events) |
| `getCtx()` | Returns `ctxList[pageNo]` | Return content ctx |
| `_lazyRender()` | IntersectionObserver on pageList | Observe wrapper divs instead |
| `_computePageList()` continuity | Resizes `pageList[0]` height | Resize both canvases + wrapper |

**External consumers of `getPage()`:**
- `Previewer.ts` — for position calculations (getBoundingClientRect)
- `TableTool.ts` — for position calculations
- `BaseBlock.ts` — for position calculations
All use the canvas reference for DOM measurements — content canvas works fine.

**Event handling:**
- Events bound to `pageContainer` (delegation)
- `target.dataset.index` used by mousedown, mouseup, mousemove, drag
- With wrapper div approach: events bubble from content canvas → wrapper → pageContainer
- Content canvas (top layer) receives pointer events; but `data-index` is on wrapper
- **Solution**: Set `data-index` on BOTH wrapper div AND content canvas, OR
  use `target.closest('[data-index]')` pattern

---

## Implementation Plan

### Phase 1: Page Structure (Wrapper + Two Canvases)

**Task 1.1: New data structures in `Draw.ts`**
- Add `pageWrapperList: HTMLDivElement[]`
- Add `selectionPageList: HTMLCanvasElement[]`
- Add `selectionCtxList: CanvasRenderingContext2D[]`
- Keep existing `pageList`/`ctxList` as the **content** canvas arrays
- Initialize all three arrays in constructor

**Task 1.2: Rewrite `_createPage(pageNo)`**
```
1. Create wrapper div (position: relative, dimensions match page)
2. Create selection canvas:
   - position: absolute, top: 0, left: 0
   - backgroundColor: #ffffff
   - full page dimensions with DPR scaling
   - z-index: 0 (or just DOM order)
3. Create content canvas:
   - position: absolute, top: 0, left: 0
   - background: transparent (no backgroundColor)
   - full page dimensions with DPR scaling
   - cursor: text
   - data-index attribute
4. Append both canvases to wrapper
5. Append wrapper to pageContainer
6. Set marginBottom (page gap) on WRAPPER, not canvas
7. Initialize both contexts with _initPageContext()
8. Push to respective lists
```

**Task 1.3: Update `_clearPage(pageNo)`**
- Clear both selection and content canvases
- Reset blockParticle

**Task 1.4: Update page management in `render()`**
- Page creation: `if (!this.pageList[i]) this._createPage(i)` — unchanged logic
- Page removal: splice all three lists; remove wrapper div (removes children too)

**Task 1.5: Update `destroy()`**
- `this.container.remove()` already removes everything — no change needed

### Phase 2: Rendering Pipeline Split

**Task 2.1: Split `_drawPage()` rendering across canvases**

On **selection canvas** (`selectionCtx`):
```
1. Clear selection canvas
2. Fill white background (ctx.fillRect for toDataURL compatibility)
3. Render custom background (this.background.render)
4. Render watermark (this.waterMark.render)
```

On **content canvas** (`contentCtx`):
```
1. Clear content canvas
2. Render area indicators
3. Render page margins
4. Render float-bottom images
5. Render control highlights
6. drawRow(contentCtx, ...) — WITHOUT selection rendering
7. Header/footer backgrounds and content
8. Float-top images
9. Placeholder
10. Line numbers, page border
11. Badges, graffiti
```

On **selection canvas** (after drawRow):
```
5. Render selection rects (recorded during drawRow)
6. Render search highlights
```

**Task 2.2: Modify `drawRow()` — decouple selection rendering**

Option A (cleanest): Extract selection rect recording into a storage array.
`drawRow` records rects but does NOT call `range.render()`. Instead, return/store
the rects. After `drawRow` completes in `_drawPage`, render them on selectionCtx.

Option B (simpler): `drawRow` calls `this.range.render()` but with the
selectionCtx instead of the content ctx. Since `drawRow` has `pageNo` in payload
and access to `this.selectionCtxList[pageNo]`, it can target the correct canvas.

**Recommended: Option B** — minimal changes to drawRow logic. Replace:
```ts
this.range.render(ctx, rangeX, rangeY, rangeW, rangeH)
```
with:
```ts
const selCtx = this.selectionCtxList[pageNo]
this.range.render(selCtx, rangeX, rangeY, rangeW, rangeH)
```

Same for table range rendering and BiDi range rendering.

**Task 2.3: Move search highlights to selection canvas**
In `_drawPage()`, change:
```ts
this.search.render(ctx, pageNo)
```
to:
```ts
this.search.render(selectionCtx, pageNo)
```

**Task 2.4: Handle header/footer selection**
`header.render(ctx, pageNo)` and `footer.render(ctx, pageNo)` internally call
`drawRow()`. Selection within headers/footers should also render on the selection
canvas. Since `drawRow` uses `this.selectionCtxList[pageNo]` directly (Option B),
this works automatically.

### Phase 3: Canvas Size Management

**Task 3.1: Update `setPageScale()`**
Add parallel loop for selection canvases + wrapper divs:
```ts
this.pageWrapperList.forEach((w, i) => {
  w.style.width = `${width}px`
  w.style.height = `${height}px`
  w.style.marginBottom = `${this.getPageGap()}px`
})
this.selectionPageList.forEach((s, i) => {
  s.width = width * dpr
  s.height = height * dpr
  s.style.width = `${width}px`
  s.style.height = `${height}px`
  this._initPageContext(this.selectionCtxList[i])
})
```

**Task 3.2: Update `setPageDevicePixel()`**
Same pattern — loop over selection canvases too.

**Task 3.3: Update `setPaperSize()`**
Same pattern — resize wrappers + selection canvases.

**Task 3.4: Update `setPaperDirection()`**
Same pattern.

**Task 3.5: Update continuity mode height resize**
In `_computePageList()`, when `pageMode === PageMode.CONTINUITY`, the code
resizes `pageList[0]`. Must also resize `selectionPageList[0]` and
`pageWrapperList[0]`.

### Phase 4: Image Export & Lazy Render

**Task 4.1: Update `getDataURL()`**
Current: `this.pageList.map(c => c.toDataURL())`
New: For each page, composite both canvases onto a temporary canvas:
```ts
const dataUrlList = this.pageList.map((contentCanvas, i) => {
  const selCanvas = this.selectionPageList[i]
  const temp = document.createElement('canvas')
  temp.width = contentCanvas.width
  temp.height = contentCanvas.height
  const tCtx = temp.getContext('2d')!
  tCtx.drawImage(selCanvas, 0, 0)  // background + selection
  tCtx.drawImage(contentCanvas, 0, 0)  // content on top
  return temp.toDataURL()
})
```

**Task 4.2: Update `_lazyRender()`**
Currently observes `pageList` elements. Change to observe `pageWrapperList`
elements (since those are the visible DOM containers). The `data-index` is read
from wrapper div dataset.

### Phase 5: Event Handling

**Task 5.1: Ensure `data-index` propagation**
Events use `(evt.target as HTMLElement).dataset.index`. With the content canvas
on top receiving pointer events, `data-index` must be on the content canvas.

Alternative: In mousedown/mousemove/mouseup/drag handlers, use:
```ts
const target = evt.target as HTMLElement
const pageIndex = target.dataset.index ||
                  target.closest('[data-index]')?.dataset?.index
```
This handles both direct canvas hits and wrapper div hits.

**Recommended**: Set `data-index` on the content canvas (simplest, no handler changes).

**Task 5.2: Verify `pointer-events`**
Selection canvas: `pointer-events: none` (prevent it from capturing clicks)
Content canvas: default `pointer-events: auto`

### Phase 6: Selection Rendering Optimization

**Task 6.1: Remove alpha from selection rendering**
Since selection is now on a separate canvas below text, we can use full opacity
or a much higher alpha for crisp, Google-Docs-style selection:
```ts
rangeAlpha: 0.6  // or even 1.0 with a lighter color
rangeColor: '#C2D9FC'  // lighter since no transparency needed
```

**Task 6.2: Adjust search highlight rendering**
Same treatment — full or near-full opacity since highlights are below text.

### Phase 7: Testing & Edge Cases

**Task 7.1: Manual testing checklist**
- [ ] Selection appears behind text
- [ ] Selection works across pages
- [ ] Selection works in tables
- [ ] Selection works in headers/footers
- [ ] Search highlights appear behind text
- [ ] Watermark visible behind text and selection
- [ ] Float-bottom images render correctly
- [ ] Context menu positioning correct
- [ ] Image previewer positioning correct
- [ ] Table tool positioning correct
- [ ] Page scale works
- [ ] Paper size change works
- [ ] Paper direction change works
- [ ] Continuity mode works
- [ ] `getDataURL()` produces correct composite image
- [ ] Print mode renders correctly
- [ ] BiDi/RTL selection rendering correct
- [ ] Cross-row-col table selection correct
- [ ] Page creation/removal on content changes

**Task 7.2: Performance validation**
- Memory: 2 canvases per page vs 1. For 10-page document, 20 canvases vs 10.
  Each canvas is ~3MB at 794×1123×4bytes×DPR². Additional ~30MB for 10 pages at
  2x DPR. Acceptable for desktop; monitor on mobile.
- Render time: Clearing and drawing on 2 canvases vs 1. Marginal overhead since
  the rendering operations themselves don't change.
- Future optimization: Only redraw selection canvas when selection changes
  (separate from content re-renders). This is a Phase 11 item.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Event handling breaks | HIGH | Keep `data-index` on content canvas; add `pointer-events: none` to selection canvas |
| `getDataURL()` quality loss | MEDIUM | Use same dimensions as originals; no scaling in composite |
| Memory increase (2x canvases) | LOW | Acceptable on desktop; canvas size unchanged per page |
| Continuity mode height bugs | MEDIUM | Test resize logic carefully for both canvases |
| Previewer/TableTool position calc | MEDIUM | These use `getPage()` for `getBoundingClientRect` — wrapper div or content canvas works |
| CSS-in-JS style injection | LOW | Existing styles apply to `.ce-page-container` children; may need adjustments |

## Estimated Effort

| Phase | Tasks | Complexity | Estimate |
|-------|-------|------------|----------|
| Phase 1: Page Structure | 5 tasks | Medium | Core work |
| Phase 2: Rendering Split | 4 tasks | High | Most complex |
| Phase 3: Size Management | 5 tasks | Low | Mechanical |
| Phase 4: Export/Lazy | 2 tasks | Medium | Careful |
| Phase 5: Events | 2 tasks | Low | Verify |
| Phase 6: Selection Style | 2 tasks | Low | Simple |
| Phase 7: Testing | 2 tasks | Medium | Thorough |

**Total: ~22 tasks across 7 phases**

## Implementation Order

1. Phase 1 (structure) — foundation, everything else depends on it
2. Phase 5 (events) — verify early to avoid painful debugging later
3. Phase 2 (rendering split) — the core change
4. Phase 3 (size management) — mechanical follow-up
5. Phase 4 (export/lazy) — important but separable
6. Phase 6 (selection style) — aesthetic polish
7. Phase 7 (testing) — continuous, but final validation here

## Future Optimization (Phase 11)

With two separate canvases, a future optimization is **selective invalidation**:
- When only the selection changes (cursor move, shift+click, shift+arrow),
  only redraw the selection canvas — skip the expensive content canvas redraw.
- This requires tracking what changed (content vs selection-only) and passing
  a flag to `render()` like `isSelectionOnly: true`.
- Estimated 50-70% render time reduction for selection-only changes.

This is NOT part of the current plan but the two-canvas architecture enables it.
