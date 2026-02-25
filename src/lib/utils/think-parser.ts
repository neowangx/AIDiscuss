export interface ThinkSegment {
  type: 'think' | 'content';
  text: string;
}

/**
 * Parse <think>...</think> tags from LLM output into segments.
 * Handles incomplete/streaming content gracefully.
 */
export function parseThinkTags(text: string): ThinkSegment[] {
  const segments: ThinkSegment[] = [];
  const regex = /<think>([\s\S]*?)<\/think>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Content before this think block
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index).trim();
      if (before) {
        segments.push({ type: 'content', text: before });
      }
    }
    // The think block itself
    const thinkContent = match[1].trim();
    if (thinkContent) {
      segments.push({ type: 'think', text: thinkContent });
    }
    lastIndex = regex.lastIndex;
  }

  // Remaining content after last match
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    // Check if there's an unclosed <think> tag (streaming)
    const openIdx = remaining.indexOf('<think>');
    if (openIdx !== -1) {
      const before = remaining.slice(0, openIdx).trim();
      if (before) {
        segments.push({ type: 'content', text: before });
      }
      const thinkContent = remaining.slice(openIdx + 7).trim();
      if (thinkContent) {
        segments.push({ type: 'think', text: thinkContent });
      }
    } else {
      segments.push({ type: 'content', text: remaining });
    }
  }

  return segments;
}

/**
 * Check if the current streaming content is inside an unclosed <think> block.
 */
export function isInThinkBlock(text: string): boolean {
  let depth = 0;
  let idx = 0;
  while (idx < text.length) {
    const openIdx = text.indexOf('<think>', idx);
    const closeIdx = text.indexOf('</think>', idx);
    if (openIdx === -1 && closeIdx === -1) break;
    if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) {
      depth++;
      idx = openIdx + 7;
    } else if (closeIdx !== -1) {
      depth = Math.max(0, depth - 1);
      idx = closeIdx + 8;
    }
  }
  return depth > 0;
}

/**
 * Strip all <think>...</think> blocks from text, returning only visible content.
 */
export function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}
