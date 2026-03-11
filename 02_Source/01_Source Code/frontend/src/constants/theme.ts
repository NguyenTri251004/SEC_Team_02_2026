/**
 * Centralised design tokens for the IMS design system.
 * Enterprise-grade theme inspired by Stripe / Linear / Ant Design Pro.
 *
 * Keys use `string` so table column renderers can look up values directly
 * without casting from the generic `string` that Ant Design passes.
 */

export type TagCfg = { color: string; label: string };

// ── Status tag maps ─────────────────────────────────────────────

export const LOT_STATUS_TAG: Record<string, TagCfg> = {
  Accepted: { color: "success", label: "Accepted" },
  Quarantine: { color: "warning", label: "Quarantine" },
  Rejected: { color: "error", label: "Rejected" },
  Depleted: { color: "default", label: "Depleted" },
};

export const QC_STATUS_TAG: Record<string, TagCfg> = {
  Pending: { color: "processing", label: "Pending" },
  Pass: { color: "success", label: "Pass" },
  Fail: { color: "error", label: "Fail" },
};

export const BATCH_STATUS_TAG: Record<string, TagCfg> = {
  Planned: { color: "blue", label: "Planned" },
  "In Progress": { color: "processing", label: "In Progress" },
  Complete: { color: "success", label: "Completed" },
  Rejected: { color: "error", label: "Rejected" },
};

export const TXN_TYPE_TAG: Record<string, TagCfg> = {
  Receipt: { color: "green", label: "Receipt" },
  Usage: { color: "volcano", label: "Usage" },
  Split: { color: "purple", label: "Split" },
  Transfer: { color: "blue", label: "Transfer" },
  Adjustment: { color: "gold", label: "Adjustment" },
  Disposal: { color: "red", label: "Disposal" },
  QC_Approved: { color: "geekblue", label: "QC Approved" },
  QC_Rejected: { color: "magenta", label: "QC Rejected" },
};

// ── Layout spacing ──────────────────────────────────────────────

export const SECTION_GAP = 24;
export const CARD_GAP: [number, number] = [16, 16];

// ── Enterprise design tokens (8-pt grid) ────────────────────────

export const tokens = {
  /** Core palette */
  colorPrimary: "#1677ff",
  colorSuccess: "#52c41a",
  colorWarning: "#faad14",
  colorError: "#ff4d4f",
  colorInfo: "#1677ff",

  /** Chart palette (8 colours – Stripe-inspired) */
  chart: [
    "#1677ff",
    "#52c41a",
    "#faad14",
    "#ff4d4f",
    "#722ed1",
    "#13c2c2",
    "#eb2f96",
    "#fa8c16",
  ] as readonly string[],

  /** Surfaces */
  bgPage: "#f5f5f5",
  bgCard: "#ffffff",
  bgCardHover: "#fafafa",

  /** Border / shadow */
  borderRadius: 8,
  borderColor: "#f0f0f0",
  shadow:
    "0 1px 2px 0 rgba(0,0,0,.03), 0 1px 6px -1px rgba(0,0,0,.02), 0 2px 4px 0 rgba(0,0,0,.02)",
  shadowHover:
    "0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)",

  /** Spacing */
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },

  /** Typography */
  fontSizeCaption: 12,
  fontSizeBody: 14,
  fontSizeH4: 20,
  fontWeightMedium: 500,
  fontWeightBold: 600,
} as const;

// ── Ant Design ConfigProvider theme ─────────────────────────────

export const antTheme = {
  token: {
    colorPrimary: tokens.colorPrimary,
    borderRadius: tokens.borderRadius,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Card: { paddingLG: 20 },
    Table: { headerBg: "#fafafa", borderColor: tokens.borderColor },
  },
};
