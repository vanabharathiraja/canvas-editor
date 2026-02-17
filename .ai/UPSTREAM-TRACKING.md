# Upstream Tracking — Hufe921/canvas-editor

**Our Fork**: `vanabharathiraja/canvas-editor`
**Branch**: `shape-engine`
**Upstream**: `Hufe921/canvas-editor` (remote: `upstream`)
**Last Merged Upstream Commit**: `570b9c1c` — `feat: add label element and event #859`
**Last Checked**: 2026-02-17

---

## Sync Strategy

> **DO NOT directly merge or cherry-pick upstream commits.**
>
> Our `shape-engine` branch has deep modifications to the core rendering pipeline
> (HarfBuzz shaping, BiDi reordering, RTL cursor/selection, contextual measurement,
> Arabic line-breaking, etc.). A direct merge will cause conflicts and subtle bugs.
>
> **Approach**: Track upstream commits here. Evaluate each for relevance. If a change
> is needed, **reimplement it manually** in our codebase, respecting our Arabic/BiDi/
> shaping architecture. This is safer than resolving merge conflicts in code we've
> heavily modified.

### Areas We've Modified (Conflict Zones)
- `Draw.ts` — shaping gateway, BiDi reordering, contextual batching, RTL rendering
- `TextParticle.ts` — HarfBuzz measurement/rendering, contextual groups
- `Position.ts` — RTL hit testing, BiDi visual coordinates
- `Cursor.ts` — RTL cursor placement
- `ListParticle.ts` — RTL list markers, right-side positioning
- `Control.ts` / `Border.ts` — RTL control borders, popup positioning
- `TableParticle.ts` / `TableTool.ts` — RTL column ordering
- `LabelParticle.ts` — RTL padding, shaping gateway
- `PageBreakParticle.ts` — shaping gateway
- `SeparatorParticle.ts` — (minor, mostly untouched)
- `Header.ts` / `Footer.ts` — background image scaling fixes
- `CommandAdapt.ts` — separator API already uses old signature in our branch
- `option.ts` / `element.ts` interfaces — we have same base, may diverge

---

## Upstream Commits After 570b9c1 (Chronological)

### Already on origin/main (merged before shape-engine branched or picked up)

| # | Commit | Description | Status |
|---|--------|-------------|--------|
| 1 | `cdaf5fc` | feat: add image preview disable option and double click callback #1351 | **On origin/main** |
| 2 | `0f191a4` | feat: add lineWidth and color to the separator #674 | **On origin/main** |

> These are on `origin/main` but NOT on `shape-engine` (branched from `570b9c1`).
> They need to be evaluated for inclusion.

### New upstream commits (not on origin/main yet)

| # | Commit | Description | Status |
|---|--------|-------------|--------|
| 3 | `f01024e` | chore: add CLAUDE.md | Skip — dev tooling |
| 4 | `8d6e873` | chore: add formatOnSave option | Skip — dev tooling |
| 5 | `c7e4c16` | types: add textWrapType to IContextmenuLang interface | **Evaluate** |
| 6 | `45d01fc` | feat: add image caption #1326 | **Evaluate** |
| 7 | `bf41f69` | feat: add executeHideCursor api #1352 | **Evaluate** |
| 8 | `bbd2df0` | release: v0.9.125 | Skip — release tag only |
| 9 | `afa05b2` | chore: update README.md | Skip — docs |
| 10 | `0b99406` | feat: implement list number style inheritance #727 | **Evaluate** ⚠️ |
| 11 | `0b659ef` | fix: restore titleId when splitting/merging title #921 #1337 | **IMPORTANT** 🔴 |
| 12 | `3fe395e` | fix: adjusted image rowFlex when converting HTML to elements #1354 | **Evaluate** |
| 13 | `ea650f6` | fix: cursor positioning when clicking control postfix #1353 | **IMPORTANT** 🔴 |
| 14 | `99de4e4` | chore: add claude settings | Skip — dev tooling |
| 15 | `f5e80f9` | feat: add compute elements height and remaining page height api #1213 | **Evaluate** |
| 16 | `47f46a0` | release: v0.9.126 | Skip — release tag only |
| 17 | `6fe3e70` | fix: format elements error in executeComputeElementListHeight #1356 | **Evaluate** (depends on #15) |

---

## Detailed Analysis

### 🔴 IMPORTANT — Should Implement

#### `0b659ef` — fix: restore titleId when splitting/merging title #921 #1337
**Priority**: HIGH — Core bug fix
**Files**: `keydown/backspace.ts`, `keydown/enter.ts`
**Impact**: When pressing Enter in middle of title, or Backspace to merge titles,
the `titleId` was not properly maintained. This caused title catalog/TOC issues.
**Our Concern**: These files are NOT in our heavy-modification zone (shaping/BiDi).
The fix is in the keydown event handlers which we haven't significantly changed.
**Recommendation**: **Reimplement** — straightforward to add the titleId restoration
logic to our backspace.ts and enter.ts handlers.

**Change Summary**:
- `backspace.ts`: After deletion, if pre-element and next-element both have titleId
  at same level but different titleId, update all following elements with the
  next-element's titleId to use the pre-element's titleId instead.
- `enter.ts`: After inserting newline in middle of title, generate new `getUUID()`
  titleId for all elements after the split point that shared the original titleId.

---

#### `ea650f6` — fix: cursor positioning when clicking control postfix #1353
**Priority**: HIGH — Core bug fix
**Files**: `Control.ts`
**Impact**: When clicking control postfix and it's the last element in the document,
cursor position was wrong.
**Our Concern**: We modified `Control.ts` for RTL border handling, but the
`moveCursorByOffset` method (where this fix goes) is separate from our changes.
**Recommendation**: **Reimplement** — add the `startIndex === elementList.length - 1`
guard in our `Control.ts`.

**Change Summary**:
- In `moveCursorByOffset()`, when walking forward past POSTFIX and reaching
  `startIndex === elementList.length - 1`, return `{ newIndex: startIndex, newElement: elementList[startIndex] }`
  instead of continuing to increment past the array bounds.

---

### ⚠️ EVALUATE — Potentially Useful

#### `cdaf5fc` — feat: image preview disable + double click callback #1351
**Priority**: MEDIUM — New feature
**Files**: `click.ts`, `Element.ts` (interface), `Listener.ts`, `EventBus.ts`, `constant/Element.ts`
**Impact**: Adds `imgPreviewDisabled` property and `imageDblclick` event bus.
**Our Concern**: `click.ts` might interact with BiDi hit testing. Need to verify
our dblclick handler still calls `draw.getPreviewer().render()` at the right point.
**Recommendation**: **Reimplement when needed** — useful feature but not blocking.

**Change Summary**:
- `IImageRule` interface: add `imgPreviewDisabled?: boolean`
- `IImageDblclick` type: new `{ evt: MouseEvent, element: IElement }` listener
- `EventBusMap`: add `imageDblclick` event
- `EDITOR_ELEMENT_ZIP_ATTR`: add `'imgPreviewDisabled'`
- `click.ts` dblclick: emit `imageDblclick` event, check `imgPreviewDisabled`

---

#### `0f191a4` — feat: separator lineWidth and color #674
**Priority**: MEDIUM — Enhancement
**Files**: `CommandAdapt.ts`, `Draw.ts`, `SeparatorParticle.ts`, `Element.ts`, `constant/Element.ts`
**Impact**: Separator can now have per-element `lineWidth` and `color` (was global only).
**Our Concern**: We haven't heavily modified separator code. `Draw.ts` change is in
the separator metrics section (not in our shaping path). `CommandAdapt.separator()`
signature changes from `(payload: number[])` to `(dashArray, option?)`.
**Recommendation**: **Reimplement when needed** — low conflict risk.

**Change Summary**:
- `ISeparator` interface: add `lineWidth?: number`
- `EDITOR_ELEMENT_ZIP_ATTR`: add `'lineWidth'`
- `CommandAdapt.separator()`: new signature `(dashArray, option?)`
- `Draw.ts`: use `element.lineWidth || defaultLineWidth` for separator height
- `SeparatorParticle.ts`: use `element.lineWidth || lineWidth` for rendering

---

#### `c7e4c16` — types: add textWrapType to IContextmenuLang
**Priority**: LOW — Type fix
**Files**: `ContextMenu.ts` interface
**Impact**: Missing type in context menu language interface.
**Recommendation**: **Reimplement when needed** — trivial one-liner.

---

#### `45d01fc` — feat: image caption #1326
**Priority**: MEDIUM — New feature (large)
**Files**: `ImageParticle.ts`, `Draw.ts`, `CommandAdapt.ts`, `Command.ts`,
`Element.ts`, `Editor.ts`, `option.ts`, new `ImgCaption.ts` constant
**Impact**: Adds caption text below images with auto-numbering (`{imageNo}`),
truncation, font/color/size options.
**Our Concern**: `Draw.ts` changes are in the image metrics section (adds caption
height to `boundingBoxAscent`). `ImageParticle.ts` gets new `_renderCaption()`
method. Neither conflicts with our shaping pipeline directly.
**Recommendation**: **Reimplement when needed**. The `_renderCaption` uses
`ctx.fillText()` directly — if captions need Arabic support, we'd route through
our shaping gateway instead.

**Change Summary**:
- New interfaces: `IImageCaption`, `IImgCaptionOption`
- New constant: `defaultImgCaptionOption` (color: #666, font: MS YaHei, size: 12, top: 5)
- `IEditorOption`: add `imgCaption?: IImgCaptionOption`
- `IImageBasic`: add `imgCaption?: IImageCaption`
- `EDITOR_ELEMENT_ZIP_ATTR`: add `'imgCrop'`, `'imgCaption'`
- `ImageParticle`: `_countImagesBeforeTarget()`, `_renderCaption()` methods
- `Draw.ts`: add caption height to image metrics
- `CommandAdapt`: `setImageCaption()` method
- `Command.ts`: bind `executeSetImageCaption`

---

#### `bf41f69` — feat: executeHideCursor api #1352
**Priority**: LOW — New API
**Files**: `CommandAdapt.ts`, `Command.ts`
**Impact**: Exposes cursor hiding as public API. Trivial 4-line addition.
**Recommendation**: **Reimplement when needed** — very simple.

**Change Summary**:
- `CommandAdapt.hideCursor()`: calls `this.draw.getCursor().recoveryCursor()`
- `Command.ts`: binds `executeHideCursor`

---

#### `0b99406` — feat: list number style inheritance #727
**Priority**: MEDIUM — Enhancement ⚠️ CONFLICTS with our ListParticle changes
**Files**: `ListParticle.ts`, `List.ts` constant, `Editor.ts`, `Element.ts`, `option.ts`
**Impact**: List markers inherit font style (size, bold, italic) from first styled
element in the list. Controlled by `list.inheritStyle` option.
**Our Concern**: **We heavily modified `ListParticle.ts`** for RTL marker positioning,
right-aligned numbering, Arabic format. The upstream changes add `findStyledElement()`
and `getListFontStyle()` private methods, and modify `getListStyleWidth()` and
`render()`. These touch the same methods we modified.
**Recommendation**: **Reimplement carefully when needed**. Must integrate with our
RTL list rendering. The style inheritance logic itself is straightforward — find
styled element, build font string — but placement in our modified code needs care.

**Change Summary**:
- New interface: `IListOption { inheritStyle?: boolean }`
- New constant: `defaultListOption { inheritStyle: false }`
- `IEditorOption`: add `list?: IListOption`
- `option.ts`: merge `listOptions`
- `ListParticle`: `findStyledElement()`, `getListFontStyle()` methods
- `getListStyleWidth()`: save/restore ctx, set font from `getListFontStyle()`
- `render()`: use `getListFontStyle()` instead of hardcoded default font/size

---

#### `3fe395e` — fix: adjusted image rowFlex when converting HTML to elements #1354
**Priority**: LOW — Edge case fix
**Files**: `element.ts` utility
**Impact**: When converting HTML to elements, images now inherit `rowFlex` from
parent element's text-align.
**Recommendation**: **Reimplement when needed** — minimal change, low conflict.

---

#### `f5e80f9` + `6fe3e70` — feat/fix: compute elements height API #1213 #1356
**Priority**: LOW — New API
**Files**: `CommandAdapt.ts`, `Command.ts`
**Impact**: New `executeComputeElementListHeight()` and `getRemainingContentHeight()`
APIs. The fix adds `formatElementList()` call before computing.
**Our Concern**: Uses `computeRowList()` which we've modified for shaping. Would
need testing with Arabic content if adopted.
**Recommendation**: **Reimplement when needed** — useful API but not blocking.

---

## Implementation Queue

Priority order for reimplementing upstream changes:

1. 🔴 `0b659ef` — titleId fix (backspace/enter) — **DO FIRST** (core bug)
2. 🔴 `ea650f6` — control postfix cursor — **DO SECOND** (core bug)
3. ⚠️ `0f191a4` — separator lineWidth/color — when separator features needed
4. ⚠️ `cdaf5fc` — image preview disable + dblclick — when image features needed
5. ⚠️ `0b99406` — list style inheritance — when list styling needed (careful: conflicts)
6. ⚠️ `45d01fc` — image caption — when image caption needed (route through shaping)
7. ⚠️ `bf41f69` — hideCursor API — when API needed
8. ⚠️ `f5e80f9`+`6fe3e70` — compute height API — when API needed
9. Low: `c7e4c16`, `3fe395e` — trivial type/fix, do whenever

---

## How to Check for New Upstream Commits

```bash
git fetch upstream
git log --oneline <last-checked-commit>..upstream/main
```

Then update this file with the new commits and their analysis.

**Next check**: Update `<last-checked-commit>` to `6fe3e70` after reviewing.
