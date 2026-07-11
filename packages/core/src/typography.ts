// ─── Unified font size hierarchy ────────────────────────────────
// Both mobile and web use these constants to ensure visual consistency.
// FONT_* exports are live bindings: call configureFontScale() at startup
// to make them respond to the system font scale setting.

// ─── Scale-aware internals ──────────────────────────────────────
let _fontScale = 1;

/** Base (design-time) values — never change at runtime. */
const BASE = {
  /** Page / modal title */
  FONT_TITLE: 18,
  /** Body text, descriptions */
  FONT_BODY: 15,
  /** Button label */
  FONT_BUTTON: 15,
  /** Empty state message */
  FONT_EMPTY: 15,
  /** Section label, form field label */
  FONT_LABEL: 16,
  /** Card title */
  FONT_CARD_TITLE: 17,
  /** Sub-label, unit, secondary text */
  FONT_SUB: 14,
  /** Badge, tag, small annotation */
  FONT_BADGE: 14,
  /** Error / validation message */
  FONT_ERROR: 14,
  /** Back navigation button */
  FONT_BACK: 20,
  /** Close (X) button */
  FONT_CLOSE: 22,
  /** Stat card big number */
  FONT_STAT_CARD: 22,
  /** Stat section prominent number */
  FONT_STAT_SECTION: 28,
  /** Hero / headline number (e.g. fasting timer) */
  FONT_HERO: 56,
  /** Chart axis label */
  FONT_CHART_AXIS: 14,
  /** Chart tooltip text */
  FONT_CHART_TOOLTIP: 14,
  /** Small annotation, footnote */
  FONT_SMALL: 14,
  /** Tiny text: count badges, micro labels */
  FONT_TINY: 14,
} as const;

/**
 * Configure the global font scale factor.
 * Call once at app startup with the system font scale (e.g. PixelRatio.getFontScale()).
 * Default is 1 (no scaling). Pass 1 explicitly to disable scaling.
 */
export function configureFontScale(scale: number): void {
  _fontScale = Math.max(0.85, Math.min(scale, 1.5));
}

/**
 * Scale an arbitrary font size value by the current font scale.
 * Use for raw numeric fontSize values that haven't been migrated to constants yet.
 */
export function scaleFontSize(size: number): number {
  return Math.round(size * _fontScale);
}

// ─── Named font size constants (live bindings via getter) ───────
// These are backward-compatible: `fontSize: FONT_TITLE` still works.
// The getter returns a scaled number on each access.

export function FONT_TITLE(): number { return Math.round(BASE.FONT_TITLE * _fontScale); }
export function FONT_BODY(): number { return Math.round(BASE.FONT_BODY * _fontScale); }
export function FONT_BUTTON(): number { return Math.round(BASE.FONT_BUTTON * _fontScale); }
export function FONT_EMPTY(): number { return Math.round(BASE.FONT_EMPTY * _fontScale); }
export function FONT_LABEL(): number { return Math.round(BASE.FONT_LABEL * _fontScale); }
export function FONT_CARD_TITLE(): number { return Math.round(BASE.FONT_CARD_TITLE * _fontScale); }
export function FONT_SUB(): number { return Math.round(BASE.FONT_SUB * _fontScale); }
export function FONT_BADGE(): number { return Math.round(BASE.FONT_BADGE * _fontScale); }
export function FONT_ERROR(): number { return Math.round(BASE.FONT_ERROR * _fontScale); }
export function FONT_BACK(): number { return Math.round(BASE.FONT_BACK * _fontScale); }
export function FONT_CLOSE(): number { return Math.round(BASE.FONT_CLOSE * _fontScale); }
export function FONT_STAT_CARD(): number { return Math.round(BASE.FONT_STAT_CARD * _fontScale); }
export function FONT_STAT_SECTION(): number { return Math.round(BASE.FONT_STAT_SECTION * _fontScale); }
export function FONT_HERO(): number { return Math.round(BASE.FONT_HERO * _fontScale); }
export function FONT_CHART_AXIS(): number { return Math.round(BASE.FONT_CHART_AXIS * _fontScale); }
export function FONT_CHART_TOOLTIP(): number { return Math.round(BASE.FONT_CHART_TOOLTIP * _fontScale); }
export function FONT_SMALL(): number { return Math.round(BASE.FONT_SMALL * _fontScale); }
export function FONT_TINY(): number { return Math.round(BASE.FONT_TINY * _fontScale); }
