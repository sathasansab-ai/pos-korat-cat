---
name: ui-skills
description: >-
  Curated frontend design-engineering rules, constraints, and audit workflows from
  ibelick/ui-skills. Includes baseline-ui constraints, improve-ui audit plans,
  motion performance standards, and accessibility requirements for production interfaces.
---

# UI Skills (Design Engineering Suite)

This skill equips the agent with the authoritative design-engineering constraints and audit practices from **ibelick/ui-skills**. It ensures high-performance, accessible, and polished user interfaces that prevent visual bugs, jank, and "AI slop".

---

## 1. Baseline UI Constraints (`baseline-ui`)

Apply these core rules to any UI creation, component review, or styling task:

### Stack & Utilities
- **Tailwind CSS:** MUST use Tailwind CSS defaults and project token scales; avoid arbitrary magic pixel values unless specifically needed.
- **Class Merging:** MUST use `cn` (`clsx` + `tailwind-merge`) when conditionally combining classes.
- **Motion Library:** MUST use `motion/react` (or CSS animations) when JavaScript animations are required.

### Components & Accessibility
- **Accessible Primitives:** MUST use robust primitives (Radix UI, Base UI, or React Aria) for interactive dialogs, dropdowns, and menus with focus trapping.
- **Icon Buttons:** MUST add an `aria-label` or `title` to every icon-only button for screen reader support.
- **Form Controls:** NEVER block paste in input or textarea fields. Always show validation errors directly adjacent to the input field.
- **Destructive Actions:** MUST use a confirmation dialog/modal before executing irreversible actions (e.g. deleting variants, voiding bills).

### Layout & Responsive Boundaries
- **Viewport Height:** NEVER use `h-screen`; use `h-dvh` (Dynamic Viewport Height) to prevent layout jumping on mobile and tablet browsers with dynamic toolbars.
- **Safe Areas:** MUST respect `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` for fixed bottom/top navigation bars.
- **Layout Architecture:** MUST use `flex` or `grid` for structure. Use `gap` instead of individual child margins for consistent spacing rhythm.
- **Touch Ergonomics:** Interactive touch targets on tablets and POS registers MUST be at least 44x44px.

### Animation & Motion Performance
- **Snappy Feedback:** Interaction feedback transitions MUST NOT exceed 200ms (`duration-150` or `duration-200`).
- **Compositor Properties Only:** Animate ONLY `transform` (scale, translate) and `opacity`. NEVER animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`).
- **Hardware Acceleration:** Ensure 60fps rendering without layout thrashing.
- **Accessibility:** MUST respect `prefers-reduced-motion` for animated transitions.

### Typography & Numbers
- **Text Wrapping:** MUST use `text-balance` for headings and `text-pretty` for body/paragraphs.
- **Tabular Data:** MUST use `tabular-nums` (`font-mono`) for metrics, prices, timestamps, stock quantities, and financial calculations so columns align vertically.
- **Truncation:** When using `truncate` or `line-clamp`, always provide a `title="..."` attribute or tooltip so users can inspect the full text.

### Visual Polish & Contrast
- **WCAG AA Contrast:** Text contrast ratio MUST meet or exceed 4.5:1. Never place pale gray text on pastel backgrounds.
- **Spacing Multiples:** Maintain a strict 4px/8px grid scale (`p-1`, `p-2`, `p-3`, `p-4`, `p-6`).
- **Tactile Response:** Touch buttons on POS registers and interactive tables should provide immediate visual compression (`active:scale-95`).

---

## 2. Interface Auditing & Improvement (`improve-ui`)

When reviewing existing UI surfaces or preparing design improvements:

1. **Reconstruct the Local System:** Read existing design tokens, typography scales, color palettes, and component conventions. Never impose foreign design patterns that clash with the brand.
2. **Audit & Prove:** Only report verified UI defects:
   - *Contract:* Quote the specific styling convention or accessibility rule violated.
   - *Runtime Path:* Identify the exact file, component, and line numbers.
   - *Single Correction:* Provide a surgical, drop-in code fix without unintended side effects.
3. **Preserve Identity:** Improve scannability, contrast, and alignment while strictly preserving the brand essence (e.g. Korat Cat luxury heritage boutique).
