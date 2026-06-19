# CSS and BEM Rules for Pure HTML Pages

Use this document as the styling reference for AI agents and humans working on pure HTML pages. The goal is to keep styles predictable, maintainable, accessible, and easy to extend without a JavaScript framework or build system.

## 1. Core Principles

### Keep HTML semantic

Use the correct HTML element before adding styling classes.

```html
<header class="site-header">...</header>
<nav class="site-nav">...</nav>
<main class="page-main">...</main>
<section class="hero">...</section>
<button class="button button--primary">Save</button>
```

Prefer semantic elements such as `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `button`, `label`, and `fieldset`.

### Separate structure, styling, and behavior

Do not rely on element order, deep nesting, or JavaScript hooks for styling.

Good:

```html
<button class="button button--primary js-submit-button">Submit</button>
```

Bad:

```css
.form div:nth-child(3) button { ... }
```

### Make styles reusable

Avoid one-off classes unless the design is truly unique. Prefer reusable blocks such as `button`, `card`, `form-field`, `alert`, `modal`, and `site-header`.

### Optimize for readability

CSS should be easy to scan. Use consistent naming, consistent spacing, and a predictable file structure.

---

## 2. Recommended CSS File Structure

For a simple pure HTML page, organize CSS in this order:

```css
/* 1. Design tokens */
:root { ... }

/* 2. Reset / base styles */
*, *::before, *::after { ... }
body { ... }
img { ... }

/* 3. Typography */
h1, h2, h3 { ... }
p { ... }

/* 4. Layout utilities */
.container { ... }
.stack { ... }
.cluster { ... }

/* 5. Components / BEM blocks */
.button { ... }
.card { ... }
.site-header { ... }

/* 6. Page-specific sections */
.hero { ... }
.pricing { ... }

/* 7. State and accessibility helpers */
.is-hidden { ... }
.sr-only { ... }

/* 8. Media queries */
@media (min-width: 48rem) { ... }
```

Keep related component styles together.

---

## 3. Design Tokens

Use CSS custom properties for repeated values.

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f6f7f9;
  --color-text: #1f2937;
  --color-muted: #6b7280;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-border: #d1d5db;

  --font-base: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;

  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.08);
  --shadow-md: 0 8px 24px rgb(0 0 0 / 0.12);

  --container-max: 72rem;
}
```

Rules:

- Use tokens for colors, spacing, shadows, radii, font families, and layout widths.
- Do not hard-code repeated values throughout components.
- Use meaningful token names, not visual-only names such as `--blue-1` unless you are creating a full color scale.

---

## 4. Base Styles

Use a small reset to reduce browser inconsistencies.

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-base);
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg);
}

img,
picture,
svg {
  display: block;
  max-width: 100%;
}

button,
input,
select,
textarea {
  font: inherit;
}

a {
  color: inherit;
}
```

Rules:

- Do not remove focus outlines globally.
- Do not set a fixed `height: 100vh` on major layouts unless overflow is handled.
- Avoid global styling that unintentionally affects third-party or embedded content.

---

## 5. BEM Naming Convention

BEM stands for Block, Element, Modifier.

```css
.block {}
.block__element {}
.block--modifier {}
.block__element--modifier {}
```

### Block

A standalone component or section.

Examples:

```css
.card {}
.button {}
.site-header {}
.product-grid {}
```

### Element

A part of a block that has no standalone meaning outside that block.

```css
.card__title {}
.card__body {}
.card__footer {}
.site-header__logo {}
.site-header__nav {}
```

### Modifier

A variation of a block or element.

```css
.button--primary {}
.button--secondary {}
.card--featured {}
.card__title--compact {}
```

HTML example:

```html
<article class="card card--featured">
  <img class="card__image" src="product.jpg" alt="Product preview">
  <div class="card__body">
    <h2 class="card__title">Product title</h2>
    <p class="card__text">Short product description.</p>
  </div>
  <footer class="card__footer">
    <button class="button button--primary">Buy now</button>
  </footer>
</article>
```

---

## 6. BEM Rules

### Use lowercase kebab-case

Good:

```css
.site-header {}
.product-card__title {}
.product-card--featured {}
```

Bad:

```css
.siteHeader {}
.product_card__title {}
.ProductCard {}
```

### Do not nest element names

Good:

```css
.card__title {}
.card__icon {}
```

Bad:

```css
.card__body__title {}
.card__footer__icon {}
```

### Do not use elements outside their block

Good:

```html
<article class="card">
  <h2 class="card__title">Title</h2>
</article>
```

Bad:

```html
<h2 class="card__title">Title outside a card</h2>
```

### Modifiers must accompany their base class

Good:

```html
<button class="button button--primary">Submit</button>
```

Bad:

```html
<button class="button--primary">Submit</button>
```

### Avoid styling one block through another block

Good:

```css
.card { ... }
.card--compact { ... }
```

Bad:

```css
.sidebar .card { ... }
```

If a card needs to look different in a sidebar, use a modifier:

```html
<article class="card card--compact">...</article>
```

### Avoid IDs for styling

Use classes for styling. Reserve IDs for anchors, form labels, or JavaScript targets when truly needed.

Good:

```css
.contact-form {}
```

Bad:

```css
#contactForm {}
```

---

## 7. Selectors and Specificity

Keep selectors shallow and low-specificity.

Preferred:

```css
.card__title { ... }
.button--primary { ... }
```

Avoid:

```css
main section div.card > div:first-child h2 { ... }
```

Rules:

- Prefer single-class selectors.
- Avoid styling by tag name inside components unless the component owns the markup.
- Avoid `!important`; use it only for small utility helpers where intentional.
- Avoid IDs in CSS.
- Avoid overqualified selectors such as `button.button`.

---

## 8. Layout Rules

Use layout classes for reusable layout behavior.

```css
.container {
  width: min(100% - 2rem, var(--container-max));
  margin-inline: auto;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: center;
}

.grid {
  display: grid;
  gap: var(--space-6);
}
```

Rules:

- Use `gap` instead of margins between flex/grid children when possible.
- Prefer `max-width` and fluid widths over fixed pixel widths.
- Use logical properties such as `margin-inline`, `padding-block`, and `border-inline-start` where helpful.
- Avoid layout styles that depend on fragile child order.

---

## 9. Responsive Design

Use mobile-first CSS.

```css
.product-grid {
  display: grid;
  gap: var(--space-6);
}

@media (min-width: 48rem) {
  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 64rem) {
  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

Rules:

- Start with the smallest layout first.
- Use `rem` or `em` for breakpoints.
- Avoid device-specific breakpoints such as "iPhone width".
- Test zoomed text and narrow screens.

---

## 10. Typography

Use consistent text styles and avoid arbitrary font sizes.

```css
.page-title {
  font-size: clamp(2rem, 6vw, 4rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.section-title {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  line-height: 1.15;
}

.text-muted {
  color: var(--color-muted);
}
```

Rules:

- Use readable line heights.
- Avoid long line lengths; keep body text around 60 to 75 characters when possible.
- Do not use text images for important content.
- Do not use all caps for long text blocks.

---

## 11. Buttons and Links

Buttons perform actions. Links navigate.

```html
<a class="button button--secondary" href="/pricing.html">View pricing</a>
<button class="button button--primary" type="submit">Submit</button>
```

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 2.75rem;
  padding: 0.625rem 1rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
}

.button--primary {
  color: #ffffff;
  background: var(--color-primary);
}

.button--primary:hover {
  background: var(--color-primary-hover);
}

.button:focus-visible {
  outline: 3px solid rgb(37 99 235 / 0.35);
  outline-offset: 2px;
}
```

Rules:

- Always include `type="button"` or `type="submit"` on buttons.
- Preserve visible focus states.
- Do not use links as buttons for form actions.
- Do not use buttons as links for navigation.

---

## 12. Forms

Use labels and accessible error/help text.

```html
<div class="form-field">
  <label class="form-field__label" for="email">Email</label>
  <input class="form-field__control" id="email" name="email" type="email" autocomplete="email">
  <p class="form-field__hint">Use your work email.</p>
</div>
```

```css
.form-field {
  display: grid;
  gap: var(--space-2);
}

.form-field__label {
  font-weight: 600;
}

.form-field__control {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.form-field__control:focus-visible {
  outline: 3px solid rgb(37 99 235 / 0.25);
  border-color: var(--color-primary);
}
```

Rules:

- Every input must have a visible or screen-reader-accessible label.
- Use `autocomplete` where appropriate.
- Use `aria-describedby` for hints and errors.
- Do not rely on placeholder text as the only label.

---

## 13. Accessibility Rules

### Focus states

Use `:focus-visible` for clear keyboard focus.

```css
:focus-visible {
  outline: 3px solid rgb(37 99 235 / 0.35);
  outline-offset: 2px;
}
```

### Screen-reader-only content

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Motion

Respect reduced motion preferences.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Rules:

- Maintain sufficient color contrast.
- Do not hide focus indicators.
- Do not communicate meaning through color alone.
- Use real text instead of images of text.
- Ensure interactive targets are large enough to tap comfortably.

---

## 14. State Classes

Use state classes for temporary UI states.

```css
.is-hidden {
  display: none !important;
}

.is-active { ... }
.is-disabled { ... }
.is-loading { ... }
```

Rules:

- State classes should describe state, not appearance.
- Use `aria-expanded`, `aria-hidden`, `disabled`, or `hidden` where appropriate.
- Do not replace semantic attributes with classes only.

Example:

```html
<button class="accordion__trigger is-active" aria-expanded="true">
  Details
</button>
```

---

## 15. Utility Classes

Use utilities sparingly for common, stable patterns.

```css
.flow > * + * {
  margin-block-start: var(--space-4);
}

.text-center {
  text-align: center;
}

.visually-hidden,
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Rules:

- Do not build entire components from many tiny utility classes unless that is the project convention.
- Prefer BEM component classes for major styling.
- Utilities may use `!important` only when the override is intentional and limited.

---

## 16. Comments

Use comments to explain sections or non-obvious decisions.

```css
/* Prevent long product names from breaking card layout. */
.card__title {
  overflow-wrap: anywhere;
}
```

Avoid comments that restate the obvious.

Bad:

```css
/* Makes text red */
.error {
  color: red;
}
```

---

## 17. Performance

Rules:

- Avoid large unused CSS blocks.
- Avoid expensive selectors and deep descendant chains.
- Prefer system fonts unless custom fonts are required.
- Use responsive images in HTML with `srcset` when needed.
- Avoid animating layout properties such as `width`, `height`, `top`, and `left`; prefer `transform` and `opacity`.

---

## 18. Pure HTML Page Checklist

Before finalizing styles, verify:

- HTML uses semantic elements.
- CSS classes use BEM naming where appropriate.
- Components are styled through their own block classes.
- Modifiers are paired with base classes.
- No IDs are used only for styling.
- Selectors are shallow and low-specificity.
- Repeated colors and spacing use CSS custom properties.
- Layout works on mobile first.
- Focus states are visible.
- Forms have labels.
- Images have useful `alt` text or empty `alt=""` when decorative.
- Motion respects `prefers-reduced-motion`.
- No unnecessary `!important` declarations are used.

---

## 19. Example Mini Page Pattern

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Example Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <div class="site-header__inner container">
      <a class="site-header__logo" href="/">Brand</a>
      <nav class="site-header__nav" aria-label="Main navigation">
        <a class="site-header__link" href="/features.html">Features</a>
        <a class="site-header__link" href="/pricing.html">Pricing</a>
      </nav>
    </div>
  </header>

  <main class="page-main">
    <section class="hero">
      <div class="hero__inner container">
        <p class="hero__eyebrow">Simple CSS</p>
        <h1 class="hero__title">Build readable pure HTML pages.</h1>
        <p class="hero__text">Use semantic HTML, BEM classes, and reusable CSS tokens.</p>
        <a class="button button--primary" href="/start.html">Get started</a>
      </div>
    </section>
  </main>
</body>
</html>
```

```css
.hero {
  padding-block: var(--space-12);
}

.hero__inner {
  display: grid;
  gap: var(--space-4);
}

.hero__eyebrow {
  margin: 0;
  color: var(--color-primary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero__title {
  max-width: 12ch;
  margin: 0;
  font-size: clamp(2.5rem, 8vw, 5rem);
  line-height: 1;
}

.hero__text {
  max-width: 42rem;
  margin: 0;
  color: var(--color-muted);
}
```

---

## 20. AI Agent Implementation Rules

When an AI agent edits or generates a pure HTML page:

1. Read existing class names before adding new ones.
2. Reuse existing tokens, blocks, utilities, and modifiers.
3. Add new CSS only in the correct section of the stylesheet.
4. Use BEM for new components.
5. Do not introduce a framework, preprocessor, build step, or external dependency unless explicitly requested.
6. Do not use inline styles unless they are required for dynamic values or email-style HTML.
7. Do not use JavaScript hooks as styling selectors.
8. Preserve accessibility attributes and visible focus styles.
9. Keep selectors shallow.
10. Update this reference if a new project-level convention is introduced.
