// Shared identity and diagnostics of scoped structured data frames.
export const failure = message => { throw new TypeError(`structured data record: ${message}`); };
export const namespacePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
