// The message a source program aborts with, in the words of the source
// language, so every target aborts where the source does with the message
// the source prints. Machine integers are Rust's, whose arithmetic panics
// (overflow checks on, as in a debug build) with these messages; BigInt
// division by zero is JavaScript's RangeError; a natural parameter is a
// JavaScript BigInt parameter whose leading guard throws its own message.

const RUST_OVERFLOW = {
  add: 'attempt to add with overflow',
  sub: 'attempt to subtract with overflow',
  mul: 'attempt to multiply with overflow',
  div: 'attempt to divide with overflow',
  rem: 'attempt to calculate the remainder with overflow',
  neg: 'attempt to negate with overflow',
};

/** The panic of a machine-integer operation whose result is out of range. */
export function overflowMessage(op) {
  return RUST_OVERFLOW[op];
}

/** The abort of an integer division or remainder by zero. */
export function zeroDivisorMessage(op, type) {
  if (type.kind !== 'fixed') return 'Division by zero';
  return op === 'rem' ? 'attempt to calculate the remainder with a divisor of zero' : 'attempt to divide by zero';
}

/** The abort of a checked conversion of a negative integer to a natural: the guard's own message. */
export function castMessage(cast) {
  return cast.message ?? 'conversion of a negative integer to a natural';
}

/** The message of `panic!`, `unreachable!`, `unimplemented!` and `todo!`, with an optional literal message. */
export function rustMacroMessage(name, message) {
  const prefix = {
    panic: null,
    unreachable: 'internal error: entered unreachable code',
    unimplemented: 'not implemented',
    todo: 'not yet implemented',
  }[name];
  if (message === undefined) return prefix ?? 'explicit panic';
  return prefix === null ? message : `${prefix}: ${message}`;
}
