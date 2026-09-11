/**
 * Lightweight ANSI escape sequence parser to format terminal colors and attributes
 */

export interface AnsiSpan {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  dim?: boolean;
  underline?: boolean;
}

const COLOR_MAP: Record<number, string> = {
  30: 'text-slate-500',      // Black / Dark Gray
  31: 'text-rose-400',       // Red
  32: 'text-emerald-400',    // Green
  33: 'text-amber-300',      // Yellow
  34: 'text-sky-400',        // Blue
  35: 'text-purple-400',     // Magenta
  36: 'text-cyan-300',       // Cyan
  37: 'text-slate-100',      // White
  90: 'text-slate-400',      // Bright Black (Gray)
  91: 'text-rose-300',       // Bright Red
  92: 'text-emerald-300',    // Bright Green
  93: 'text-amber-200',      // Bright Yellow
  94: 'text-sky-300',        // Bright Blue
  95: 'text-purple-300',     // Bright Magenta
  96: 'text-cyan-200',       // Bright Cyan
  97: 'text-white',          // Bright White
};

const BG_COLOR_MAP: Record<number, string> = {
  40: 'bg-slate-900',
  41: 'bg-rose-950',
  42: 'bg-emerald-950',
  43: 'bg-amber-950',
  44: 'bg-sky-950',
  45: 'bg-purple-950',
  46: 'bg-cyan-950',
  47: 'bg-slate-100 text-slate-900',
};

export function parseAnsiToSpans(rawText: string): AnsiSpan[] {
  const spans: AnsiSpan[] = [];
  // Regex to match ANSI escape codes like \x1b[32m or \x1b[1;31m
  const ansiRegex = /\x1b\[([0-9;]*)m/g;

  let lastIndex = 0;
  let currentColor: string | undefined = undefined;
  let currentBgColor: string | undefined = undefined;
  let isBold = false;
  let isDim = false;
  let isUnderline = false;

  let match: RegExpExecArray | null;

  while ((match = ansiRegex.exec(rawText)) !== null) {
    const textChunk = rawText.slice(lastIndex, match.index);
    if (textChunk) {
      spans.push({
        text: textChunk,
        color: currentColor,
        bgColor: currentBgColor,
        bold: isBold,
        dim: isDim,
        underline: isUnderline,
      });
    }

    const codes = match[1] ? match[1].split(';').map((c) => parseInt(c, 10)) : [0];

    for (const code of codes) {
      if (code === 0) {
        // Reset
        currentColor = undefined;
        currentBgColor = undefined;
        isBold = false;
        isDim = false;
        isUnderline = false;
      } else if (code === 1) {
        isBold = true;
      } else if (code === 2) {
        isDim = true;
      } else if (code === 4) {
        isUnderline = true;
      } else if (COLOR_MAP[code]) {
        currentColor = COLOR_MAP[code];
      } else if (BG_COLOR_MAP[code]) {
        currentBgColor = BG_COLOR_MAP[code];
      }
    }

    lastIndex = ansiRegex.lastIndex;
  }

  const remainingText = rawText.slice(lastIndex);
  if (remainingText) {
    spans.push({
      text: remainingText,
      color: currentColor,
      bgColor: currentBgColor,
      bold: isBold,
      dim: isDim,
      underline: isUnderline,
    });
  }

  return spans;
}
