// Errors raised by the portable-core translator. `unsupported` errors are the
// precise obligations the issue requires: they name the construct, the
// source span, and the reason no faithful encoding exists yet.

export class TranslationError extends Error {
  constructor(kind, message, span = undefined, details = {}) {
    super(span ? `${message} at ${span.start}..${span.end}` : message);
    this.name = 'TranslationError';
    this.kind = kind;
    this.reason = message;
    this.span = span ? { start: span.start, end: span.end } : null;
    this.details = details;
  }
}

/** A precise obligation for a construct outside the portable core. */
export function unsupported(construct, reason, span) {
  return new TranslationError('unsupported', `${construct}: ${reason}`, span, { construct });
}

export function typeError(message, span) {
  return new TranslationError('type', message, span);
}
