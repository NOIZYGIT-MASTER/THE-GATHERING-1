# NOIZY.AI — Block 1: Hero + Quick Signup
## Component Specification & Dev Handoff

**Author:** Robert Stephen Plowman × Claude (Co-Architect)  
**Version:** 1.0.0 — April 12, 2026  
**Goal:** Convert first-time visitors into trial users in one interaction  
**Success Metrics:** >10% CTA click-through from hero to signup modal; >40% completion of quick signup (email + 1 preference)

---

## 1. Design Tokens

All components reference a shared token object. These map directly to CSS custom properties in production.

| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `#0D0D0D` | Page background |
| `surface` | `rgba(161, 243, 255, 0.04)` | Card backgrounds |
| `surfaceHover` | `rgba(161, 243, 255, 0.08)` | Card hover state |
| `border` | `rgba(161, 243, 255, 0.12)` | Default borders |
| `borderBright` | `rgba(161, 243, 255, 0.25)` | Hover/focus borders |
| `text` | `#FFFFFF` | Primary text |
| `textDim` | `rgba(255, 255, 255, 0.65)` | Secondary text |
| `textMuted` | `rgba(255, 255, 255, 0.38)` | Tertiary/hint text |
| `primary` | `#A1F3FF` | Cyan — primary accent |
| `accent` | `#D9FF00` | Chartreuse — highlight accent |
| `danger` | `#FF4D6A` | Error states |
| `success` | `#4ADE80` | Confirmation states |
| `radius` | `6px` | Default corner radius |
| `radiusLg` | `12px` | Modal/card radius |
| `fontSystem` | `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif` | All text |
| `fontMono` | `'SF Mono', 'JetBrains Mono', 'Fira Code', Monaco, monospace` | Metric values |

**Typography scale:** clamp-based fluid type — `clamp(2.5rem, 7vw, 4rem)` for headlines, `clamp(1rem, 2.5vw, 1.15rem)` for body.

---

## 2. Component Architecture

```
<NoizyHeroSignup>
  ├── Ambient Background (fixed, decorative)
  ├── Skip Link (a11y)
  ├── Variant Switcher (dev-only, remove in prod)
  ├── <main>
  │   ├── Nav (logo + signup button)
  │   ├── Tagline ("Consent as Executable Code")
  │   ├── <h1> + <h2> (headline + subhead from copy variant)
  │   ├── Body paragraph (from copy variant)
  │   ├── <WaveformBars> (animated CSS waveform, 28 bars)
  │   ├── CTA Row
  │   │   ├── <CTAButton variant="primary"> (opens modal)
  │   │   └── <CTAButton variant="secondary"> (scrolls/navigates)
  │   ├── Trust Metrics Grid (4 cards)
  │   │   ├── <MetricCard> 75% Creator Royalty
  │   │   ├── <MetricCard> 9 Never Clauses
  │   │   ├── <MetricCard> <30ms Edge Latency
  │   │   └── <MetricCard> ∞ Consent Revoke
  │   ├── Consent Pillars Grid (2×2)
  │   └── Footer quote
  └── <SignupModal>
      ├── Step 1: Email input
      ├── Step 2: Preference selector (2×2 grid)
      │   ├── Voice Actor 🎙
      │   ├── Studio / Publisher 🎛
      │   ├── Developer / API ⌨
      │   └── Just Curious ✦
      └── Step 3: Confirmation
```

---

## 3. Copy Variants

Three variants are built into the component, switchable via dev toolbar. A/B test in production using feature flags (KV namespace `FEATURE_FLAGS`).

### Variant A (Primary — Default)

| Element | Text |
|---------|------|
| Headline | Your Voice. Your Rules. |
| Subhead | No Exceptions. |
| Body | The first platform where consent is executable code. Artists keep 75% of every dollar. AI works for you — not the other way around. |
| Primary CTA | Claim Your Voice |
| Secondary CTA | See How It Works |

### Variant B

| Element | Text |
|---------|------|
| Headline | Consent Is Law. |
| Subhead | Not a Checkbox. |
| Body | NOIZY.AI protects the artists who power AI. Cryptographic consent. Immutable never-clauses. 75% creator royalties — enforced at the edge. |
| Primary CTA | Join the Guild |
| Secondary CTA | Read the Manifesto |

### Variant C

| Element | Text |
|---------|------|
| Headline | AI Needs Your Voice. |
| Subhead | You Deserve the Keys. |
| Body | We built the infrastructure that puts artists in control. Your voice DNA is sovereign. Your consent is cryptographic. Your royalties are automatic. |
| Primary CTA | Start Free Trial |
| Secondary CTA | Explore the Platform |

---

## 4. Signup Modal — Interaction Design

### Flow

```
[CTA Click] → Modal opens (focus trapped, backdrop blur)
  → Step 1: Email field (autofocus)
    → Validate: RFC-compliant email regex
    → Error: inline, red, with aria-invalid
    → Submit: "Continue →"
  → Step 2: Preference selector (2×2 grid of cards)
    → Single-select, immediate submission on click
    → Loading state: "Setting up your account..." (800ms simulated)
  → Step 3: Confirmation
    → "You're in." + email echo + "Enter the DreamChamber" CTA
    → [Close] → Return to hero
```

### Modal Microcopy

| Location | Text |
|----------|------|
| Step indicator | "Step 1 of 2" / "Step 2 of 2" |
| Step 1 heading | Claim your place in the Guild |
| Step 1 body | Your email starts everything. No spam. No selling. Just access. |
| Email placeholder | you@example.com |
| Email error | Please enter a valid email address. |
| Legal disclaimer | By continuing, you agree to our Terms of Service. We'll never share your data without explicit consent. |
| Step 2 heading | What brings you to NOIZY? |
| Step 2 body | This helps us show you the right tools first. |
| Loading | Setting up your account... |
| Step 3 heading | You're in. |
| Step 3 body | Check {email} for your access link. |
| Step 3 sub | Your voice sovereignty starts now. |
| Step 3 CTA | Enter the DreamChamber |

### Interaction Notes

1. **Escape key** dismisses modal at any step. Backdrop click also dismisses.
2. **Focus management:** input autofocuses on open (150ms delay for animation).
3. **Abandonment tracking:** if user closes before step 3, fires `signup_abandoned` with step number.
4. **No password required** — magic link pattern. Email receives access link.
5. **Preference is required** — no skip option. Selecting a card is the submission action.
6. **Mobile:** CTA row stacks vertically at ≤640px. Modal is full-width with 1rem padding.

---

## 5. Responsive Behavior

| Breakpoint | Changes |
|------------|---------|
| Desktop (>640px) | 4-column metrics grid, horizontal CTA row, 440px modal |
| Mobile (≤640px) | 2-column metrics grid, stacked CTAs (full-width), full-width modal |
| Headline | `clamp(2.5rem, 7vw, 4rem)` — fluid from 40px to 64px |
| Body | `clamp(1rem, 2.5vw, 1.15rem)` — fluid from 16px to 18.4px |

---

## 6. Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Skip link | Hidden until focused, jumps to `#main` |
| Modal role | `role="dialog"`, `aria-modal="true"`, `aria-label` |
| Email validation | `aria-invalid`, `aria-describedby` linking to error message |
| Error announcements | `role="alert"` on error messages for screen reader announcement |
| Focus trap | Escape key handler, focus-on-open |
| Color contrast | All text meets WCAG 2.1 AA against `#0D0D0D` background |
| Motion | CSS transitions only — no forced motion. Respects `prefers-reduced-motion` (add media query in prod) |
| Keyboard navigation | Tab through all interactive elements, Enter/Space to activate |

---

## 7. Acceptance Criteria

### Hero

- [ ] Page loads with staggered fade-up animations (nav → tagline → headline → body → waveform → CTAs → metrics → pillars)
- [ ] Waveform bars animate continuously with gradient from primary to accent
- [ ] All three copy variants render correctly when switched
- [ ] Primary CTA opens signup modal
- [ ] Secondary CTA fires analytics event (link target TBD)
- [ ] Trust metrics display with mono font for values
- [ ] Consent pillars render in 2×2 grid
- [ ] Mobile: metrics collapse to 2×2, CTAs stack vertically

### Signup Modal

- [ ] Modal opens with backdrop blur and slide-up animation
- [ ] Email input autofocuses on open
- [ ] Invalid email shows inline error with `aria-invalid`
- [ ] Valid email advances to step 2
- [ ] Preference cards render in 2×2 grid
- [ ] Clicking a preference shows loading state then confirmation
- [ ] Confirmation shows user's email address
- [ ] Escape key and backdrop click dismiss modal
- [ ] Abandonment fires analytics event with step number
- [ ] Completion fires analytics event with email domain + preference + variant

---

## 8. Analytics Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `hero_page_view` | Page load | `{ variant }` |
| `hero_cta_clicked` | Primary CTA clicked | `{ variant, cta_text }` |
| `hero_secondary_clicked` | Secondary CTA clicked | `{ variant, cta_text }` |
| `signup_modal_opened` | Modal opens | `{ variant }` |
| `signup_email_entered` | Email submitted (valid) | `{ email_domain }` |
| `signup_email_invalid` | Email submitted (invalid) | `{ email_domain }` |
| `signup_preference_selected` | Preference card clicked | `{ preference }` |
| `signup_completed` | Step 3 reached | `{ email_domain, preference, variant }` |
| `signup_abandoned` | Modal closed before step 3 | `{ step, variant }` |
| `variant_switched` | Dev toolbar variant change | `{ to }` |

### Funnel Definition

```
hero_page_view → hero_cta_clicked → signup_modal_opened → signup_email_entered → signup_preference_selected → signup_completed
```

**Target conversion rates:**
- `hero_page_view → hero_cta_clicked`: >10%
- `signup_modal_opened → signup_completed`: >40%
- Overall `hero_page_view → signup_completed`: >4%

---

## 9. QA Checklist

### Functional

- [ ] All three copy variants render without layout shift
- [ ] Modal opens/closes correctly via CTA, Escape, backdrop click
- [ ] Email validation rejects: empty, no @, no domain, spaces
- [ ] Email validation accepts: standard addresses, +aliases, subdomains
- [ ] Preference selection triggers loading state and confirmation
- [ ] All analytics events fire with correct properties (check console)
- [ ] Back-to-back modal open/close doesn't break state
- [ ] Modal state resets on close (email cleared, step reset to 1)

### Visual

- [ ] Ambient background gradients render on page load
- [ ] Waveform bars animate smoothly (no jank at 60fps)
- [ ] Staggered entrance animations play in correct order
- [ ] Metric cards hover state: border brightens, slight lift
- [ ] CTA primary: cyan → chartreuse on hover, shadow appears
- [ ] CTA secondary: border + text brighten on hover
- [ ] Modal backdrop blurs content behind it
- [ ] Error state: red border on input, red error text

### Responsive

- [ ] Desktop (1440px): 4-column metrics, horizontal CTAs
- [ ] Tablet (768px): Layout holds, comfortable touch targets
- [ ] Mobile (375px): 2-column metrics, stacked CTAs, full-width modal
- [ ] No horizontal scroll at any breakpoint
- [ ] Touch targets ≥44px on mobile

### Accessibility

- [ ] Skip link appears on Tab, jumps to main
- [ ] Screen reader announces modal as dialog
- [ ] Screen reader announces email errors
- [ ] Tab order is logical throughout hero and modal
- [ ] No keyboard traps
- [ ] Focus returns to CTA button when modal closes

### Performance

- [ ] First contentful paint < 1.5s
- [ ] No layout shift after initial load (CLS = 0)
- [ ] Waveform animation doesn't cause dropped frames
- [ ] Modal open/close transitions are smooth

---

## 10. Implementation Notes for Dev

### Production Cleanup

1. Remove the variant switcher (`position: fixed, top: 1rem, right: 1rem`) — replace with server-side A/B assignment via `FEATURE_FLAGS` KV namespace.
2. Replace `track()` console stub with PostHog, Segment, or Plausible integration.
3. Replace simulated 800ms API delay with actual signup endpoint (HEAVEN `/api/signup`).
4. Add `prefers-reduced-motion` media query to disable waveform and entrance animations.
5. Add CSP headers for inline styles if deploying via Cloudflare Workers.

### Backend Integration Points

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/signup` | POST | Accept `{ email, preference, variant }`, return `{ success, token }` |
| `/api/variant` | GET | Return assigned copy variant for A/B testing |

### File Structure (Production)

```
src/
  components/
    Hero/
      Hero.tsx
      Hero.module.css
      WaveformBars.tsx
      MetricCard.tsx
      CTAButton.tsx
    SignupModal/
      SignupModal.tsx
      SignupModal.module.css
      PreferenceCard.tsx
      steps/
        EmailStep.tsx
        PreferenceStep.tsx
        ConfirmationStep.tsx
  tokens/
    design-tokens.ts
  copy/
    hero-variants.ts
  analytics/
    track.ts
```

---

*Consent is law. Build forward.*
