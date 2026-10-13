/**
 * Utility functions for beautifying AI-generated email drafts and compiling clean HTML emails.
 */

/**
 * Cleans up and structures raw plain text from LLM / n8n email generation.
 * - Removes accidental code fences or subject line echoes.
 * - Normalizes paragraph spacing so the email is well-spaced, breathable, and not compact.
 * - Formats greetings, bullet points, and sign-offs naturally.
 */
export function formatEmailDraft(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText
    // Normalize newlines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove markdown code fences if wrapped
    .replace(/^```[a-z]*\n/i, '')
    .replace(/\n```$/i, '')
    .trim();

  // If HTML tags are present (from an existing draft or sent email), convert to clean plain text
  if (/<(?:p|div|br|li|h[1-6]|table)[^>]*>/i.test(cleaned)) {
    cleaned = cleaned
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  // Remove accidental duplicate Subject / Objet lines at the beginning of the body
  cleaned = cleaned.replace(/^(?:objet|subject|sujet)\s*:\s*[^\n]+\n+/i, '');

  // Split into raw blocks by multiple newlines
  const rawBlocks = cleaned.split(/\n{2,}/);

  const formattedBlocks: string[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Check if block is a list of bullet points
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    const isBulletList = lines.length > 1 && lines.every(l => /^[-*•–]\s+/.test(l));

    if (isBulletList) {
      formattedBlocks.push(lines.map(l => l.replace(/^[-*–]\s+/, '• ')).join('\n'));
    } else {
      // Regular paragraph - join single line breaks with space unless it looks like a sub-header or deliberate verse
      const isShortLines = lines.length === 2 && (
        /^(bonjour|cher|chère|hello|hi|salut)\b/i.test(lines[0]) ||
        /^(cordialement|bien cordialement|sincèrement|bonne journée|merci|best regards|regards)\b/i.test(lines[lines.length - 1])
      );

      if (isShortLines) {
        // Keep each on its own line
        formattedBlocks.push(lines.join('\n\n'));
      } else {
        // Normal paragraph with proper flow
        formattedBlocks.push(lines.join(' '));
      }
    }
  }

  // Join blocks with distinct double newlines for visual breathing room
  return formattedBlocks.join('\n\n');
}

/**
 * Compiles a plain text message into responsive, professional HTML for email delivery.
 * Wraps paragraphs with clean typography and optionally appends the styled signature.
 */
export function compileHtmlEmail(
  bodyText: string,
  signatureHtml?: string | null,
  includeSignature: boolean = true
): string {
  if (!bodyText) return '';

  // If the body already looks like a rich HTML email document, keep it intact
  const hasHtmlTags = /<(?:p|div|table|h[1-6]|ul|ol|br)[^>]*>/i.test(bodyText);

  let formattedBody = '';

  if (hasHtmlTags) {
    formattedBody = bodyText;
  } else {
    const paragraphs = bodyText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    formattedBody = paragraphs
      .map(paragraph => {
        // Handle bullet points
        const lines = paragraph.split('\n').map(l => l.trim()).filter(Boolean);
        const isBulletList = lines.length > 1 && lines.every(l => /^[-*•–]\s+/.test(l));

        if (isBulletList) {
          const listItems = lines
            .map(l => `<li style="margin-bottom: 6px;">${l.replace(/^[-*•–]\s+/, '')}</li>`)
            .join('');
          return `<ul style="margin: 0 0 16px 20px; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b;">${listItems}</ul>`;
        }

        const innerContent = paragraph.replace(/\n/g, '<br/>');
        return `<p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b;">${innerContent}</p>`;
      })
      .join('');
  }

  // If signature is disabled or empty, return formatted body directly
  if (!includeSignature || !signatureHtml || !signatureHtml.trim()) {
    return formattedBody;
  }

  const cleanSig = signatureHtml.trim();

  // Avoid duplicate signature if already in body
  if (formattedBody.includes(cleanSig)) {
    return formattedBody;
  }

  return `${formattedBody}
<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
  ${cleanSig}
</div>`;
}
