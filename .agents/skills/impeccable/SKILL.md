---
name: impeccable
description: >-
  The design vocabulary for your coding agent. Steer with polish and bolder,
  review with critique and audit, catch AI slop before it ships. Provides
  heuristics, design principles, and commands for world-class frontend UI craft.
---

# Impeccable Design Skill

You are now operating under the **Impeccable Design System**, crafted to eliminate "AI slop" (generic purple-to-blue gradients, nested cards, bland default fonts, lack of hierarchy) and enforce award-winning frontend visual craft and user experience.

---

## 1. Core Operating Modes

Before styling or designing any surface, identify its primary mode:

1. **OPERATE (Dashboards, POS, Data Tables, Admin, Tooling):**
   - **Motto:** High utility, extreme scannability, dense without feeling cramped.
   - **Rules:** High contrast, tabular numerals (`font-mono`), clear status badges, instant tactile active states (`active:scale-95`), zero wasted whitespace, clear keyboard ergonomics.
2. **PERSUADE (Landing Pages, Hero Banners, Promos, Marketing):**
   - **Motto:** Emotion, bold hook, strong point of view.
   - **Rules:** Generous scale, strong typographic contrasts, distinctive brand colors, memorable accents.
3. **READ (Docs, Receipt printouts, Reports, Articles):**
   - **Motto:** Effortless comprehension, optimal reading measure.
   - **Rules:** 55–75 character line widths, balanced line heights (1.5–1.75), subtle text colors (`text-slate-600`), clear section anchors.
4. **EXPERIENCE (Interactive tools, Tailoring canvas, Touchscreens, Animations):**
   - **Motto:** Delight, responsive feedback, tactile physicality.

---

## 2. The Quality Floor (Strict Anti-Patterns)

Never emit the following AI design anti-patterns:
- ❌ **The "Purple/Indigo Slop":** Do not default to purple gradients or generic indigo primary buttons unless the brand specifically calls for it.
- ❌ **Nested Card Inception:** Avoid cards inside cards inside cards. Use subtle background tone shifts (`bg-slate-50`), divider lines (`border-slate-100`), or whitespace instead.
- ❌ **Low-Contrast Gray-on-Color:** Never put light gray text on pastel backgrounds. Maintain minimum 4.5:1 WCAG AA contrast.
- ❌ **Floating Orphan Badges:** Do not float meaningless pill tags over titles without strong context.
- ❌ **Sluggish Animations:** Transitions must be snappy (120ms–200ms `ease-out`). Anything slower feels unresponsive.
- ❌ **Missing States:** Every interactive element MUST have:
  - Default state
  - Hover state (`hover:...`)
  - Active/Pressed state (`active:scale-95` or `active:bg-...`)
  - Focus state for accessibility
  - Disabled state with clear visual cue (`disabled:opacity-50`)
  - Loading / Skeleton state

---

## 3. Impeccable Commands Vocabulary

When invoked or instructed by the user, route actions accordingly:

- **`/impeccable critique`:** Perform a heuristic UX evaluation. Check scannability, visual hierarchy, feedback clarity, and friction points. Grade each section from 1-10 with actionable improvements.
- **`/impeccable audit`:** Scan code for accessibility issues (missing `alt`, bad contrast, small touch targets < 44px), responsive layout breakage, and font inconsistencies.
- **`/impeccable polish`:** Perform final craftsmanship pass: tighten borders (`border-slate-200/80`), add micro-shadows, refine badge margins, align numbers to right, tune paddings.
- **`/impeccable bolder`:** Push visual confidence—increase heading weight, deepen primary brand colors, sharpen outlines, heighten card separation.
- **`/impeccable quieter`:** Subdue overwhelming visual noise—soften bright borders, replace harsh icons with clean text, reduce font sizes on secondary meta text.
- **`/impeccable typeset`:** Refine typographic rhythm—tighten leading on large headers, set numbers to monospace, add letter-spacing tracking on uppercase labels.
- **`/impeccable harden`:** Handle all edge cases: long text truncation (`truncate`, `line-clamp`), 0/empty lists, extreme quantities, network offline indicators, and small mobile viewport breakpoints.

---

## 4. Application to Current Project (POS Korat Cat)

- **Brand Spirit:** Heritage Craft Boutique, Korat Cat Silk & Cotton, Luxurious Thai Craftsmanship.
- **Palette Hierarchy:** Deep Slate (`slate-950`, `slate-900`), Warm Amber & Gold (`amber-500`, `amber-600`), Clean Cream/Ivory (`#fdfbf7`, `amber-50`), Crisp Slate Borders (`slate-200`, `slate-800`).
- **Tactile Feedback:** Cashier touch buttons must respond immediately with sound and visual compression (`active:scale-95`).
- **Typography:** Sarabun / Modern Sans for Thai, Monospace for Barcodes, SKUs, and Baht currency totals.
