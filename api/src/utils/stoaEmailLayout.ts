/**
 * Stoa Group branded email header and footer for notification emails.
 * Uses inline styles only for maximum email client compatibility.
 * Brand colors: primary green #7e8a6b, dark green #6b7a5a, grey #757270.
 */

export const STOA_EMAIL = {
  primaryGreen: '#7e8a6b',
  darkGreen: '#6b7a5a',
  grey: '#757270',
  greyMuted: '#6b7280',
  greyLight: '#9ca3af',
  textDark: '#1f2937',
  textBody: '#4b5563',
  bgBody: '#f5f5f5',
  bgCard: '#ffffff',
  border: '#e5e7eb',
  paleGreen: '#f0f4eb',
  white: '#ffffff',
} as const;

export interface StoaEmailHeaderOptions {
  /** Main title in the header (e.g. "Banking Dashboard – Covenant Reminder") */
  title?: string;
  /** Optional subtitle line below the title */
  subtitle?: string;
  /** If true, show "Stoa Group" as the brand line above the title. Default true. */
  showBrand?: boolean;
}

export interface StoaEmailFooterOptions {
  /** Custom line of text (e.g. "This reminder was sent by the system based on your reminder settings.") */
  line?: string;
  /** Optional second line (e.g. context or link) */
  secondaryLine?: string;
}

const DEFAULT_HEADER: Required<StoaEmailHeaderOptions> = {
  title: 'Notification',
  subtitle: '',
  showBrand: true,
};

const DEFAULT_FOOTER: StoaEmailFooterOptions = {
  line: 'Stoa Group – Property Management & Investments',
  secondaryLine: '',
};

/**
 * Returns the Stoa-branded email header HTML fragment (no wrapping html/body).
 * Use inside a single container (e.g. max-width card) for consistent layout.
 */
export function getStoaEmailHeader(options: StoaEmailHeaderOptions = {}): string {
  const opts = { ...DEFAULT_HEADER, ...options };
  const brandBlock =
    opts.showBrand !== false
      ? `<tr><td style="padding:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${STOA_EMAIL.white};opacity:0.9;">Stoa Group</td></tr>`
      : '';
  const subtitleBlock =
    opts.subtitle && opts.subtitle.trim()
      ? `<tr><td style="padding:6px 0 0 0;font-size:14px;color:${STOA_EMAIL.white};opacity:0.95;">${escapeHtml(opts.subtitle)}</td></tr>`
      : '';
  const title = escapeHtml((opts.title || DEFAULT_HEADER.title).trim() || DEFAULT_HEADER.title);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
  <tr>
    <td style="background-color:${STOA_EMAIL.primaryGreen};color:${STOA_EMAIL.white};padding:20px 24px;border-radius:8px 8px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
        ${brandBlock}
        <tr><td style="font-size:20px;font-weight:600;color:${STOA_EMAIL.white};line-height:1.3;">${title}</td></tr>
        ${subtitleBlock}
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Returns the Stoa-branded email footer HTML fragment.
 */
export function getStoaEmailFooter(options: StoaEmailFooterOptions = {}): string {
  const opts = { ...DEFAULT_FOOTER, ...options };
  const line = opts.line && opts.line.trim() ? `<p style="margin:0 0 4px 0;font-size:12px;color:${STOA_EMAIL.greyMuted};line-height:1.4;">${escapeHtml(opts.line)}</p>` : '';
  const secondary =
    opts.secondaryLine && opts.secondaryLine.trim()
      ? `<p style="margin:0;font-size:12px;color:${STOA_EMAIL.greyLight};line-height:1.4;">${escapeHtml(opts.secondaryLine)}</p>`
      : '';
  const tagline = `Stoa Group – Property Management & Investments`;
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
  <tr>
    <td style="padding:16px 24px;background-color:#f9fafb;border-top:1px solid ${STOA_EMAIL.border};border-radius:0 0 8px 8px;font-size:12px;color:${STOA_EMAIL.greyMuted};text-align:center;">
      ${line}
      <p style="margin:8px 0 0 0;font-size:12px;font-weight:600;color:${STOA_EMAIL.grey};letter-spacing:0.02em;">${tagline}</p>
      ${secondary}
    </td>
  </tr>
</table>`;
}

/**
 * Wraps body HTML in a full Stoa-branded email: outer wrapper + header + body cell + footer.
 * Use this to build a complete HTML email for notifications.
 */
export function wrapStoaEmailLayout(
  bodyHtml: string,
  options: {
    header?: StoaEmailHeaderOptions;
    footer?: StoaEmailFooterOptions;
    /** Page title for the document (e.g. "Covenant Reminder") */
    pageTitle?: string;
  } = {}
): string {
  const header = getStoaEmailHeader(options.header);
  const footer = getStoaEmailFooter(options.footer);
  const title = options.pageTitle ? escapeHtml(options.pageTitle) : 'Stoa Group';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:${STOA_EMAIL.textDark};background-color:${STOA_EMAIL.bgBody};padding:24px 16px;">
  <div style="max-width:560px;margin:0 auto;background:${STOA_EMAIL.bgCard};border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
    ${header}
    <div style="padding:24px;font-size:14px;color:${STOA_EMAIL.textBody};">
      ${bodyHtml}
    </div>
    ${footer}
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
