---
name: baseline-ui
description: >-
  Enforces an opinionated UI baseline to prevent AI-generated interface slop.
  Audits spacing, layout hierarchy, typography, 200ms motion limits, and accessibility.
---

# Baseline UI Constraints

Apply these constraints to any UI work or component inspection in this conversation.

## Stack & Components
- MUST use Tailwind CSS defaults and token scales.
- MUST use `cn` utility (`clsx` + `tailwind-merge`) for conditional class logic.
- MUST add an `aria-label` or `title` to icon-only buttons.
- MUST use accessible dialog/modal primitives with focus management for modals and drawers.
- NEVER block paste in input or textarea elements.
- MUST show validation errors adjacent to where the action happens.

## Layout & Responsive
- NEVER use `h-screen`, use `h-dvh` to handle mobile dynamic address bars.
- MUST respect `safe-area-inset` for fixed bars and floating checkout summaries.
- MUST use `flex` or `grid` with `gap` instead of individual child margins.
- Ensure minimum touch target size of 44x44px for touchable buttons on POS screens.

## Animation & Motion
- Interaction feedback MUST NOT exceed 200ms.
- MUST animate only compositor properties (`transform`, `opacity`).
- NEVER animate layout properties (`width`, `height`, `margin`, `padding`).
- MUST respect `prefers-reduced-motion`.

## Typography & Presentation
- MUST use `text-balance` for headings and `text-pretty` for body copy.
- MUST use `tabular-nums` (`font-mono`) for prices, quantities, barcodes, and numbers.
- Ensure minimum 4.5:1 WCAG AA color contrast ratio across all light/dark elements.
