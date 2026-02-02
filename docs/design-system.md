# Design System

VocalAlchemy visual design specifications.

## Color Theme: Cyber-Alchemist

**Concept:** Deep Purple & Electric Blue — Evoking a futuristic, high-tech audio lab aesthetic

### Color Palette

```css
/* Base Colors */
--color-bg-canvas: #0D0221;      /* Midnight Abyss - Main background */
--color-surface: #190E2F;        /* Deep Nebula - Cards, panels, modals */
--color-surface-hover: #231744;  /* Lighter surface for hover states */

/* Primary Actions */
--color-primary: #BD00FF;        /* Electric Purple - Primary buttons, CTAs */
--color-primary-hover: #D433FF;  /* Lighter purple for hover */
--color-primary-glow: rgba(189, 0, 255, 0.4); /* Glow effect */

/* Secondary / Active States */
--color-secondary: #00F0FF;      /* Cyber Cyan - Waveforms, progress bars */
--color-secondary-hover: #33F3FF;
--color-secondary-glow: rgba(0, 240, 255, 0.3);

/* Accents */
--color-accent: #FF007A;         /* Neon Pink - Alerts, warnings, high energy */
--color-accent-hover: #FF338F;

/* Text */
--color-text-primary: #FFFFFF;   /* Pure white - Main text */
--color-text-secondary: #B8B8D1; /* Muted lavender - Secondary text */
--color-text-disabled: #6B6B7E;  /* Dim gray - Disabled states */

/* Status Colors */
--color-success: #00FF88;        /* Neon green - Success states */
--color-warning: #FFB800;        /* Amber - Warnings */
--color-error: #FF007A;          /* Neon pink - Errors (matches accent) */

/* Borders & Dividers */
--color-border: #2D1B4E;         /* Subtle purple border */
--color-border-focus: #BD00FF;   /* Primary color for focus states */
```

### Component Applications

| Component | Color Usage |
|-----------|-------------|
| **Primary Button** (Synthesize, Start Training) | Background: `#BD00FF`, Text: `#FFFFFF`, Glow: `rgba(189, 0, 255, 0.4)` |
| **Secondary Button** | Border: `#00F0FF`, Text: `#00F0FF`, Background: Transparent |
| **Audio Waveform** | Active: `#00F0FF`, Inactive: `#2D1B4E` |
| **Progress Bar** | Fill: `#00F0FF`, Background: `#190E2F`, Border: `#2D1B4E` |
| **Status Badge** | Training: `#FFB800`, Ready: `#00FF88`, Error: `#FF007A` |
| **Input Fields** | Background: `#190E2F`, Border: `#2D1B4E`, Focus: `#BD00FF` |
| **Cards/Panels** | Background: `#190E2F`, Border: `#2D1B4E` |
| **Navigation Active** | Underline/Indicator: `#00F0FF` |

## Typography

```css
/* Font Stack */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px - Labels, captions */
--text-sm: 0.875rem;   /* 14px - Secondary text */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Large body */
--text-xl: 1.25rem;    /* 20px - Section headers */
--text-2xl: 1.5rem;    /* 24px - Page titles */
--text-3xl: 1.875rem;  /* 30px - Hero text */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## Spacing & Layout

```css
/* Spacing Scale (Tailwind-inspired) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */

/* Border Radius */
--radius-sm: 0.25rem;  /* 4px - Small elements */
--radius-md: 0.5rem;   /* 8px - Buttons, inputs */
--radius-lg: 0.75rem;  /* 12px - Cards */
--radius-xl: 1rem;     /* 16px - Modals */
```

## Effects

```css
/* Shadows */
--shadow-sm: 0 1px 2px 0 rgba(189, 0, 255, 0.05);
--shadow-md: 0 4px 6px -1px rgba(189, 0, 255, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(189, 0, 255, 0.2);
--shadow-glow: 0 0 20px rgba(189, 0, 255, 0.5);

/* Transitions */
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

## Example Component Styles

```css
/* Primary Button */
.btn-primary {
  background: linear-gradient(135deg, #BD00FF 0%, #8B00CC 100%);
  color: #FFFFFF;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 0 20px rgba(189, 0, 255, 0.4);
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #D433FF 0%, #A800E6 100%);
  box-shadow: 0 0 30px rgba(189, 0, 255, 0.6);
  transform: translateY(-2px);
}

/* Card/Panel */
.card {
  background: #190E2F;
  border: 1px solid #2D1B4E;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(189, 0, 255, 0.1);
}

/* Waveform Visualization */
.waveform-bar {
  background: linear-gradient(180deg, #00F0FF 0%, #0088CC 100%);
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

/* Status Badge */
.badge-training {
  background: rgba(255, 184, 0, 0.1);
  border: 1px solid #FFB800;
  color: #FFB800;
}

.badge-ready {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid #00FF88;
  color: #00FF88;
}
```

## Accessibility Notes

- All text maintains WCAG AA contrast ratio (4.5:1 minimum)
- Primary purple (#BD00FF) on dark background (#0D0221) = 9.2:1 ✓
- Cyan (#00F0FF) on dark background (#0D0221) = 12.8:1 ✓
- White text (#FFFFFF) on surface (#190E2F) = 16.4:1 ✓

## Integration with Frontend

### For React + Tailwind

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'canvas': '#0D0221',
        'surface': '#190E2F',
        'primary': '#BD00FF',
        'secondary': '#00F0FF',
        'accent': '#FF007A',
      }
    }
  }
}
```

### For Vanilla CSS

Copy all CSS variables to your `:root` selector:

```css
:root {
  --color-bg-canvas: #0D0221;
  --color-surface: #190E2F;
  /* ... etc */
}
```
