import { detectRustSourceAssignmentToken } from './rust-scalar-parameter-rules.js';

// This proves only that the complete token region contains no assignments.
// The existing parser and source-origin validator must still admit its body.
export function readRustScalarParameterBody(cursor) {
  if (!cursor.is('{')) return { closed: false, possibleWrite: false };
  let depth = 0;
  let possibleWrite = false;
  for (let offset = 0; ; offset += 1) {
    const token = cursor.peek(offset);
    if (token.kind === 'eof') return { closed: false, possibleWrite };
    possibleWrite ||= detectRustSourceAssignmentToken(token.kind, token.value);
    if (offset > 0 && token.kind === 'punct') {
      const previous = cursor.peek(offset - 1);
      if (previous.kind === 'punct' && previous.end === token.start) {
        possibleWrite ||= detectRustSourceAssignmentToken('punct', previous.value + token.value);
      }
    }
    if (token.kind === 'punct' && token.value === '{') depth += 1;
    if (token.kind === 'punct' && token.value === '}') {
      depth -= 1;
      if (depth === 0) return { closed: true, possibleWrite };
    }
  }
}
