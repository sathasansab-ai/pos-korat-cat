---
name: improve-ui
description: >-
  Audit an existing product surface against its own design evidence, identify verified UI
  problems, and write self-contained implementation plans without breaking product identity.
---

# Improve UI Audit Workflow

Audit a product surface against the system that governs it. Preserve the product's identity, fix verified issues, and eliminate regressions.

## 1. Select the Surface & Reconstruct System
- Identify the exact component tree, styles, and design tokens governing the surface.
- Reconstruct the normative patterns: typography hierarchy, color palette, border radius, spacing rhythms.

## 2. Audit & Prove
To confirm any finding, verify:
1. **Contract:** What specific guideline or design rule is violated?
2. **Runtime Path:** Which exact file and line number causes the issue?
3. **Single Correction:** What is the precise, surgical code fix that solves it cleanly?

## 3. Core Checks
- Scannability & visual noise reduction
- Alignment and spacing consistency (4px/8px grid)
- Typography scale and contrast verification
- Mobile and tablet responsiveness
