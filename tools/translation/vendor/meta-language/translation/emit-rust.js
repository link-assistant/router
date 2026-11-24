import { renderStringLengthExpression, renderStringMapExpression, renderStringTestExpression } from './frontend-rules.js';
// Rust emitter. Naturals and integers are `ml::Big`, an unbounded integer
// the translation carries in its own prelude, so no value is ever narrowed;
// machine integers stay Rust machine integers with checked arithmetic, which
// panics exactly where the source aborts; a JavaScript Number is an `f64`,
// printed by `ml_number::js_number` exactly as JavaScript prints it. Data types are enums whose
// data-typed fields are boxed. Every value is owned: a variable is cloned
// where it is consumed. Theorems cannot be proved in Rust: each becomes an
// executable property, checked over a bounded domain by
// `--ml-check-theorems`, while the proof stays discharged by the source kernel.

import { castMessage, overflowMessage, zeroDivisorMessage } from './aborts.js';
import { unsupported } from './diagnostics.js';
import { typeKey } from './types.js';
import { renameFunction, renameMain, renameTheorem, tailLoop } from './ir.js';
import { EmitState, withParts } from './emit-common.js';
import { acceptConstantEmission, constantBindingForm, renderConstantBinding } from './frontend-rules.js';

const KEYWORDS = new Set([
  'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in',
  'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super',
  'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while', 'async', 'await', 'dyn', 'abstract', 'become', 'box',
  'do', 'final', 'macro', 'override', 'priv', 'typeof', 'unsized', 'virtual', 'yield', 'try', 'gen', 'union', 'raw',
  // Names the emitted code relies on.
  'ml', 'main', 'std', 'core', 'alloc', 'String', 'Vec', 'Box', 'Option', 'Some', 'None', 'Ok', 'Err', 'Result',
  'bool', 'str', 'char', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
  'f32', 'f64', 'Big', 'Clone', 'Debug', 'PartialEq', 'Eq', 'ToString', 'ml_main', 'ml_check_theorems', 'ml_number',
]);

const PRELUDE = `/// Unbounded integers for the portable core's naturals and integers.
pub mod ml {
    use std::cmp::Ordering;
    use std::fmt;

    /// Sign and magnitude; the magnitude is little-endian base 2^32 without
    /// leading zero limbs, and zero is never negative.
    #[derive(Clone, Debug, PartialEq, Eq, Hash)]
    pub struct Big {
        negative: bool,
        magnitude: Vec<u32>,
    }

    fn trim(mut magnitude: Vec<u32>) -> Vec<u32> {
        while magnitude.last() == Some(&0) {
            magnitude.pop();
        }
        magnitude
    }

    fn compare_magnitude(a: &[u32], b: &[u32]) -> Ordering {
        a.len().cmp(&b.len()).then_with(|| a.iter().rev().cmp(b.iter().rev()))
    }

    fn add_magnitude(a: &[u32], b: &[u32]) -> Vec<u32> {
        let mut out = Vec::with_capacity(a.len().max(b.len()) + 1);
        let mut carry = 0u64;
        for index in 0..a.len().max(b.len()) {
            let sum = u64::from(*a.get(index).unwrap_or(&0)) + u64::from(*b.get(index).unwrap_or(&0)) + carry;
            out.push(sum as u32);
            carry = sum >> 32;
        }
        if carry > 0 {
            out.push(carry as u32);
        }
        out
    }

    /// |a| - |b| where |a| >= |b|.
    fn sub_magnitude(a: &[u32], b: &[u32]) -> Vec<u32> {
        let mut out = Vec::with_capacity(a.len());
        let mut borrow = 0i64;
        for (index, limb) in a.iter().enumerate() {
            let mut difference = i64::from(*limb) - i64::from(*b.get(index).unwrap_or(&0)) - borrow;
            borrow = 0;
            if difference < 0 {
                difference += 1 << 32;
                borrow = 1;
            }
            out.push(difference as u32);
        }
        trim(out)
    }

    fn mul_magnitude(a: &[u32], b: &[u32]) -> Vec<u32> {
        let mut out = vec![0u32; a.len() + b.len()];
        for (i, x) in a.iter().enumerate() {
            let mut carry = 0u64;
            for (j, y) in b.iter().enumerate() {
                let product = u64::from(out[i + j]) + u64::from(*x) * u64::from(*y) + carry;
                out[i + j] = product as u32;
                carry = product >> 32;
            }
            let mut index = i + b.len();
            while carry > 0 {
                let sum = u64::from(out[index]) + carry;
                out[index] = sum as u32;
                carry = sum >> 32;
                index += 1;
            }
        }
        trim(out)
    }

    /// Quotient and remainder of magnitudes; the divisor is not zero.
    fn divmod_magnitude(a: &[u32], b: &[u32]) -> (Vec<u32>, Vec<u32>) {
        let mut quotient = vec![0u32; a.len()];
        if b.len() == 1 {
            let divisor = u64::from(b[0]);
            let mut remainder = 0u64;
            for index in (0..a.len()).rev() {
                let current = (remainder << 32) | u64::from(a[index]);
                quotient[index] = (current / divisor) as u32;
                remainder = current % divisor;
            }
            return (trim(quotient), trim(vec![remainder as u32]));
        }
        let mut remainder: Vec<u32> = Vec::new();
        for bit in (0..a.len() * 32).rev() {
            let mut carry = (a[bit / 32] >> (bit % 32)) & 1;
            for limb in remainder.iter_mut() {
                let next = *limb >> 31;
                *limb = (*limb << 1) | carry;
                carry = next;
            }
            if carry != 0 {
                remainder.push(carry);
            }
            if compare_magnitude(&remainder, b) != Ordering::Less {
                remainder = sub_magnitude(&remainder, b);
                quotient[bit / 32] |= 1 << (bit % 32);
            }
        }
        (trim(quotient), remainder)
    }

    impl Big {
        fn from_parts(negative: bool, magnitude: Vec<u32>) -> Self {
            let magnitude = trim(magnitude);
            Self { negative: negative && !magnitude.is_empty(), magnitude }
        }

        pub fn zero() -> Self {
            Self::from_parts(false, Vec::new())
        }

        pub fn from_i128(value: i128) -> Self {
            let mut big = Self::from_u128(value.unsigned_abs());
            big.negative = value < 0;
            big
        }

        pub fn from_u128(mut value: u128) -> Self {
            let mut magnitude = Vec::new();
            while value > 0 {
                magnitude.push(value as u32);
                value >>= 32;
            }
            Self::from_parts(false, magnitude)
        }

        /// A decimal literal with an optional leading minus sign.
        pub fn parse(text: &str) -> Self {
            let (negative, digits) = match text.strip_prefix('-') {
                Some(rest) => (true, rest),
                None => (false, text),
            };
            let ten = Self::from_i128(10);
            let mut value = Self::zero();
            for digit in digits.chars() {
                let digit = digit.to_digit(10).expect("decimal literal");
                value = value.mul(&ten).add(&Self::from_i128(i128::from(digit)));
            }
            if negative { value.neg() } else { value }
        }

        pub fn is_zero(&self) -> bool {
            self.magnitude.is_empty()
        }

        pub fn is_negative(&self) -> bool {
            self.negative
        }

        /// The array index this names, if it is one.
        pub fn to_index(&self) -> Option<usize> {
            if self.negative || self.magnitude.len() > 2 {
                return None;
            }
            let value = self.magnitude.iter().rev().fold(0u64, |acc, &digit| (acc << 32) | u64::from(digit));
            usize::try_from(value).ok()
        }

        pub fn neg(&self) -> Self {
            Self::from_parts(!self.negative, self.magnitude.clone())
        }

        pub fn add(&self, other: &Self) -> Self {
            if self.negative == other.negative {
                return Self::from_parts(self.negative, add_magnitude(&self.magnitude, &other.magnitude));
            }
            match compare_magnitude(&self.magnitude, &other.magnitude) {
                Ordering::Less => Self::from_parts(other.negative, sub_magnitude(&other.magnitude, &self.magnitude)),
                _ => Self::from_parts(self.negative, sub_magnitude(&self.magnitude, &other.magnitude)),
            }
        }

        pub fn sub(&self, other: &Self) -> Self {
            self.add(&other.neg())
        }

        pub fn mul(&self, other: &Self) -> Self {
            Self::from_parts(self.negative != other.negative, mul_magnitude(&self.magnitude, &other.magnitude))
        }

        /// Division rounding toward zero; the divisor is not zero.
        pub fn divmod_trunc(&self, other: &Self) -> (Self, Self) {
            let (quotient, remainder) = divmod_magnitude(&self.magnitude, &other.magnitude);
            (
                Self::from_parts(self.negative != other.negative, quotient),
                Self::from_parts(self.negative, remainder),
            )
        }
    }

    impl Ord for Big {
        fn cmp(&self, other: &Self) -> Ordering {
            match (self.negative, other.negative) {
                (false, true) => Ordering::Greater,
                (true, false) => Ordering::Less,
                (false, false) => compare_magnitude(&self.magnitude, &other.magnitude),
                (true, true) => compare_magnitude(&other.magnitude, &self.magnitude),
            }
        }
    }

    impl PartialOrd for Big {
        fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
            Some(self.cmp(other))
        }
    }

    impl fmt::Display for Big {
        fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
            if self.is_zero() {
                return formatter.write_str("0");
            }
            let billion = [1_000_000_000u32];
            let mut chunks = Vec::new();
            let mut rest = self.magnitude.clone();
            while !rest.is_empty() {
                let (quotient, remainder) = divmod_magnitude(&rest, &billion);
                chunks.push(remainder.first().copied().unwrap_or(0));
                rest = quotient;
            }
            let mut text = String::new();
            if self.negative {
                text.push('-');
            }
            text.push_str(&chunks.pop().unwrap_or(0).to_string());
            for chunk in chunks.iter().rev() {
                text.push_str(&format!("{chunk:09}"));
            }
            formatter.write_str(&text)
        }
    }

    /// Natural subtraction: truncated at zero.
    pub fn nat_sub(a: &Big, b: &Big) -> Big {
        if a > b { a.sub(b) } else { Big::zero() }
    }

    pub fn pred(a: &Big) -> Big {
        a.sub(&Big::from_i128(1))
    }

    /// Integer division with the source's rounding ("trunc", "floor" or
    /// "euclid"); by zero it aborts with the source's message or is total
    /// (x / 0 = 0, x % 0 = x).
    pub fn divide(a: &Big, b: &Big, rounding: &str, by_zero: Option<&str>, remainder: bool) -> Big {
        if b.is_zero() {
            if let Some(message) = by_zero {
                panic!("{message}");
            }
            return if remainder { a.clone() } else { Big::zero() };
        }
        let one = Big::from_i128(1);
        let (mut quotient, rest) = a.divmod_trunc(b);
        if !rest.is_zero() {
            if rounding == "floor" && rest.is_negative() != b.is_negative() {
                quotient = quotient.sub(&one);
            }
            if rounding == "euclid" && rest.is_negative() {
                quotient = if b.is_negative() { quotient.add(&one) } else { quotient.sub(&one) };
            }
        }
        if remainder { a.sub(&quotient.mul(b)) } else { quotient }
    }

    pub fn to_nat_checked(value: Big, message: &str) -> Big {
        if value.is_negative() {
            panic!("{message}");
        }
        value
    }

    pub fn clamp_nat(value: Big) -> Big {
        if value.is_negative() { Big::zero() } else { value }
    }

    /// Bounded domains for executable theorem checks.
    pub fn range(low: i128, high: i128) -> Vec<Big> {
        (low..=high).map(Big::from_i128).collect()
    }
}`;

const NUMBER_PRELUDE = `/// JavaScript's Number operations that Rust's f64 does not share.
pub mod ml_number {
    /// ECMAScript Number::toString: the shortest decimal that reads back as
    /// the value, the even one on a tie, laid out as JavaScript prints it.
    pub fn js_number(x: f64) -> String {
        if x.is_nan() {
            return String::from("NaN");
        }
        if x.is_infinite() {
            return String::from(if x > 0.0 { "Infinity" } else { "-Infinity" });
        }
        if x == 0.0 {
            return String::from("0");
        }
        let (mut digits, n) = decimal(&format!("{:e}", x.abs()));
        // Rust's shortest digits round a tie away from zero; ECMAScript takes the even neighbour.
        let (exact, _) = decimal(&format!("{:.800e}", x.abs()));
        let rest = &exact[digits.len().min(exact.len())..];
        if digits.len() > 1 && rest.starts_with('5') && rest[1..].bytes().all(|b| b == b'0') {
            let last = digits.as_bytes()[digits.len() - 1] - b'0';
            let down = exact[..digits.len()].to_string();
            let other = if digits == down { increment(&down) } else { Some(down) };
            if let Some(other) = other {
                let back = format!("{}.{}e{}", &other[..1], &other[1..], n - 1);
                if last % 2 == 1 && back.parse::<f64>() == Ok(x.abs()) {
                    digits = other.trim_end_matches('0').to_string();
                }
            }
        }
        let k = digits.len() as i32;
        let body = if k <= n && n <= 21 {
            format!("{digits}{}", "0".repeat((n - k) as usize))
        } else if 0 < n && n <= 21 {
            format!("{}.{}", &digits[..n as usize], &digits[n as usize..])
        } else if -6 < n && n <= 0 {
            format!("0.{}{digits}", "0".repeat((-n) as usize))
        } else {
            let sign = if n - 1 < 0 { '-' } else { '+' };
            let power = (n - 1).abs();
            if k == 1 {
                format!("{digits}e{sign}{power}")
            } else {
                format!("{}.{}e{sign}{power}", &digits[..1], &digits[1..])
            }
        };
        if x < 0.0 {
            format!("-{body}")
        } else {
            body
        }
    }

    /// What console.log prints: -0 as "-0", where String(-0) is "0".
    pub fn js_console(x: f64) -> String {
        if x == 0.0 && x.is_sign_negative() {
            String::from("-0")
        } else {
            js_number(x)
        }
    }

    /// SameValue, as Object.is and assert.strictEqual compare: NaN equals
    /// NaN, and 0 differs from -0.
    pub fn same_value(a: f64, b: f64) -> bool {
        if a.is_nan() || b.is_nan() {
            a.is_nan() && b.is_nan()
        } else {
            a.to_bits() == b.to_bits()
        }
    }

    /// A decimal digit string plus one, or None when it gains a digit.
    fn increment(digits: &str) -> Option<String> {
        let mut bytes = digits.as_bytes().to_vec();
        for index in (0..bytes.len()).rev() {
            if bytes[index] == b'9' {
                bytes[index] = b'0';
            } else {
                bytes[index] += 1;
                return String::from_utf8(bytes).ok();
            }
        }
        None
    }

    /// The significant digits without trailing zeros, and the exponent n with
    /// value 0.digits × 10^n, of Rust's {:e} text.
    fn decimal(text: &str) -> (String, i32) {
        let (mantissa, exponent) = text.split_once('e').expect("exponent");
        let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
        let digits = digits.trim_end_matches('0').to_string();
        let digits = if digits.is_empty() { String::from("0") } else { digits };
        (digits, exponent.parse::<i32>().expect("exponent") + 1)
    }
}`;

const MATH_PRELUDE = `/// The Math functions that Rust's f64 methods do not share with JavaScript.
pub mod ml_math {
    /// Math.round: the nearest integer, the one towards +Infinity on a tie,
    /// with the sign of a zero result from the argument.
    pub fn round(x: f64) -> f64 {
        if !x.is_finite() || x == 0.0 {
            return x;
        }
        if x > 0.0 && x < 0.5 {
            return 0.0;
        }
        if x < 0.0 && x >= -0.5 {
            return -0.0;
        }
        let floor = x.floor();
        if x - floor >= 0.5 {
            floor + 1.0
        } else {
            floor
        }
    }

    /// Math.sign, which keeps -0, 0 and NaN, where f64::signum does not.
    pub fn sign(x: f64) -> f64 {
        if x > 0.0 {
            1.0
        } else if x < 0.0 {
            -1.0
        } else {
            x
        }
    }

    /// Math.max of two Numbers: NaN when either is, and 0 above -0.
    pub fn max(a: f64, b: f64) -> f64 {
        if a > b {
            a
        } else if b > a {
            b
        } else if a == b {
            if a.is_sign_negative() {
                b
            } else {
                a
            }
        } else {
            f64::NAN
        }
    }

    /// Math.min of two Numbers: NaN when either is, and -0 below 0.
    pub fn min(a: f64, b: f64) -> f64 {
        if a < b {
            a
        } else if b < a {
            b
        } else if a == b {
            if a.is_sign_negative() {
                a
            } else {
                b
            }
        } else {
            f64::NAN
        }
    }

    pub fn max_of(values: &[f64]) -> f64 {
        values.iter().fold(f64::NEG_INFINITY, |a, &b| max(a, b))
    }

    pub fn min_of(values: &[f64]) -> f64 {
        values.iter().fold(f64::INFINITY, |a, &b| min(a, b))
    }

    pub fn is_integer(x: f64) -> bool {
        x.is_finite() && x.trunc() == x
    }

    pub fn is_safe_integer(x: f64) -> bool {
        is_integer(x) && x.abs() <= 9007199254740991.0
    }
}`;

const ARRAY_PRELUDE = `/// Reads of JavaScript arrays, which the portable core never mutates.
pub mod ml_array {
    /// The element at an index; a read outside the array, undefined in
    /// JavaScript, aborts.
    pub fn at<T: Clone>(values: &[T], index: Option<usize>) -> T {
        match index.and_then(|index| values.get(index)) {
            Some(value) => value.clone(),
            None => panic!("array index out of range"),
        }
    }

    /// The index a Number names: a non-negative integer, -0 included.
    pub fn number_index(index: f64) -> Option<usize> {
        if index >= 0.0 && index.fract() == 0.0 && index < 9007199254740992.0 {
            Some(index as usize)
        } else {
            None
        }
    }

    pub fn append<T>(mut left: Vec<T>, right: Vec<T>) -> Vec<T> {
        left.extend(right);
        left
    }
}`;

function ident(name) {
  let result = name.replace(/[^A-Za-z0-9_]/gu, '_');
  if (/^[0-9]/u.test(result) || result.startsWith('__') || result === '_' || result === '') result = `x${result}`;
  if (KEYWORDS.has(result)) result = `${result}_`;
  return result;
}

function snake(name) {
  return ident(name
    .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/gu, '$1_$2')
    .toLowerCase());
}

function camel(name) {
  const parts = name.split(/[^A-Za-z0-9]+|_/u).filter(Boolean);
  return ident(parts.map((part) => part[0].toUpperCase() + part.slice(1)).join('') || 'T');
}

const COPY = new Set(['bool', 'fixed', 'float', 'unit']);

export function emitRust(program) {
  const state = new EmitState(program, 'Rust', snake, KEYWORDS, {
    ctorStyle: 'data',
    typeName: camel,
    valueName: snake,
    ctorName: camel,
    moduleSegment: snake,
    typeSpace: true,
    modulesShareTypeSpace: true,
  });
  // A local may not shadow another item of the module that the program calls or reads.
  for (const external of program.externals ?? []) state.claimed.add(externalName(external.k, external.name));
  return new RustEmitter(program, state).file();
}

/** The Rust name of another item of the module: a function's in snake case, a constant's as it is written. */
function externalName(kind, name) {
  return kind === 'fn' ? snake(name) : name;
}

/**
 * A program whose only effect binds one top-level constant, as Rust items: a
 * Number, boolean or machine integer literal is a `const` of its type, a
 * string literal a `&str` const, and any other value a `static` computed once,
 * when it is first read, as a JavaScript module computes it once. Returns null
 * for a program with declarations or other effects.
 */
export function emitRustConstants(program) {
  const effects = program.main?.effects ?? [];
  const effect = effects[0];
  const legalName = effect && !effect.name.startsWith('ml_') && !KEYWORDS.has(effect.name) && /^[A-Za-z_][A-Za-z0-9_]*$/u.test(effect.name);
  if (!acceptConstantEmission(effect?.constant ?? false, effects.length, program.declarations.size, legalName ?? false)) return null;
  const state = new EmitState(program, 'Rust', snake, KEYWORDS, {
    ctorStyle: 'data', typeName: camel, valueName: snake, ctorName: camel, moduleSegment: snake, typeSpace: true, modulesShareTypeSpace: true,
  });
  for (const external of program.externals ?? []) state.claimed.add(externalName(external.k, external.name));
  const emitter = new RustEmitter(program, state);
  const [{ name, value }] = effects;
  const form = constantBindingForm(value.k, value.type.kind);
  const definition = renderConstantBinding(form, name,
    form === 'string' ? '&str' : emitter.type(value.type),
    form === 'string' ? rustString(String(value.value)) : emitter.expr(value));
  const preludes = [
    ...(emitter.usesBig ? [PRELUDE] : []),
    ...(emitter.usesNumber ? [NUMBER_PRELUDE] : []),
    ...(emitter.usesMath ? [MATH_PRELUDE] : []),
    ...(emitter.usesArray ? [ARRAY_PRELUDE] : []),
  ];
  return withParts({ language: 'Rust', text: [...preludes, definition].join('\n\n'), entry: null }, preludes, [definition]);
}

class RustEmitter {
  constructor(program, state) {
    this.program = program;
    this.state = state;
    // The other items of the module the program calls or reads, which it does not declare.
    this.externals = new Map((program.externals ?? []).filter(({ name }) => !program.declarations.has(name)).map((external) => [external.name, external]));
    this.temporaries = 0;
    this.theoremChecks = [];
    this.usesBig = false;
    this.usesNumber = false;
    this.usesArray = false;
    this.usesMath = false;
  }

  file() {
    const tree = { items: [], modules: new Map() };
    for (const entry of this.program.declarations.values()) {
      let node = tree;
      for (const segment of entry.modulePath) {
        if (!node.modules.has(segment)) node.modules.set(segment, { items: [], modules: new Map() });
        node = node.modules.get(segment);
      }
      node.items.push(entry);
    }
    const body = [...(this.program.imports ?? []).map((entry) => this.use(entry)), ...this.moduleBody(tree, [])];
    const main = this.program.main ? this.main(this.program.main) : null;
    const runner = this.theoremRunner();
    const entry = this.entry(Boolean(main));
    const text = [
      `// Translated from ${this.program.sourceLanguage} by meta-language: portable core, Rust target.`,
      '#![allow(unused, unreachable_patterns, non_snake_case, non_camel_case_types, invalid_nan_comparisons)]',
      '',
      ...(this.usesBig ? [PRELUDE, ''] : []),
      ...(this.usesNumber ? [NUMBER_PRELUDE, ''] : []),
      ...(this.usesMath ? [MATH_PRELUDE, ''] : []),
      ...(this.usesArray ? [ARRAY_PRELUDE, ''] : []),
      ...body.flatMap((block) => [block, '']),
      ...[main, runner, entry].filter(Boolean).flatMap((block) => [block, '']),
    ].join('\n');
    const preludes = [
      ...(this.usesBig ? [PRELUDE] : []),
      ...(this.usesNumber ? [NUMBER_PRELUDE] : []),
      ...(this.usesMath ? [MATH_PRELUDE] : []),
      ...(this.usesArray ? [ARRAY_PRELUDE] : []),
    ];
    return withParts({
      language: 'Rust',
      text,
      mappings: this.state.mappings,
      assumptions: this.state.assumptionList(),
      encodings: this.state.encodingList(),
      theorems: this.state.theorems,
      entry: main ? 'main' : null,
    }, preludes, body);
  }

  /**
   * An import of items of another module of the crate, `use crate::m::{a, b as c};`.
   * A function is named in snake case, as its own translation names it, and
   * any other item as it is written.
   */
  use({ module, names }) {
    const kinds = new Map((this.program.externals ?? []).map((external) => [external.name, external.k]));
    const items = names.map(({ imported, local }) => {
      const kind = kinds.get(local);
      const from = externalName(kind, imported);
      const to = externalName(kind, local);
      return from === to ? from : `${from} as ${to}`;
    });
    const path = ['crate', ...module.map(snake)].join('::');
    return items.length === 1 ? `use ${path}::${items[0]};` : `use ${path}::{${items.join(', ')}};`;
  }

  /** A call of another item of the module, or a read of one of its constants. */
  external(e, { k, literal }) {
    if (k === 'fn') return `${externalName(k, e.fn)}(${e.args.map((arg) => this.expr(arg)).join(', ')})`;
    // A literal Number, boolean or machine integer is a const, a literal string a &str const, and any other value a static.
    if (literal && COPY.has(e.type.kind)) return e.fn;
    if (literal && e.type.kind === 'string') return `String::from(${e.fn})`;
    return COPY.has(e.type.kind) ? `*${e.fn}` : `${e.fn}.clone()`;
  }

  moduleBody(node, path) {
    const blocks = node.items.map((entry) => this.declaration(entry));
    for (const [segment, child] of node.modules) {
      const inner = this.moduleBody(child, [...path, segment]);
      blocks.push(`pub mod ${this.state.moduleName([...path, segment])} {\n${indent(inner.join('\n\n'), 1)}\n}`);
    }
    return blocks;
  }

  declaration(entry) {
    if (entry.k === 'data') return this.data(entry);
    if (entry.k === 'fn') return this.fn(entry);
    return this.theorem(entry);
  }

  type(type) {
    switch (type.kind) {
      case 'nat':
      case 'int':
        this.usesBig = true;
        this.state.encode('unbounded-integers', 'naturals and integers are ml::Big, an arbitrary-precision integer defined in the translated program; naturals stay non-negative because natural subtraction truncates and conversions to naturals are checked');
        return 'crate::ml::Big';
      case 'fixed':
        return typeKey(type);
      case 'float':
        this.floats();
        return 'f64';
      case 'bool':
        return 'bool';
      case 'string':
        return 'String';
      case 'unit':
        return '()';
      case 'data':
        return `crate::${this.state.ref(type.name, '::')}`;
      case 'array':
        this.state.encode('arrays', 'a JavaScript array, which the portable core never mutates, is a Rust Vec; a read outside it panics');
        return `Vec<${this.type(type.element)}>`;
      default:
        throw new Error(`no Rust type for ${type.kind}`);
    }
  }

  fieldType(type) {
    return type.kind === 'data' ? `Box<${this.type(type)}>` : this.type(type);
  }

  data(entry) {
    const name = this.state.localName(entry.fullName);
    this.state.map(entry, name);
    this.state.encode('data', 'a data type is an enum with one tuple variant per constructor; data-typed fields are boxed, and values are compared structurally');
    const variants = entry.ctors.map((ctor) => {
      const local = this.state.ctorLocal(entry.fullName, ctor.name);
      if (!ctor.fields.length) return `    ${local},`;
      return `    ${local}(${ctor.fields.map((field) => this.fieldType(field.type)).join(', ')}),`;
    });
    // f64 is not `Eq`, so a data type that holds a Number, directly or through another data type, derives `PartialEq` alone.
    const derives = this.holdsFloat(entry.fullName) ? 'Clone, Debug, PartialEq' : 'Clone, Debug, PartialEq, Eq';
    return [`#[derive(${derives})]`, `pub enum ${name} {`, ...variants, '}'].join('\n');
  }

  holdsFloat(name, seen = new Set()) {
    if (seen.has(name)) return false;
    seen.add(name);
    const entry = this.program.declarations.get(name);
    const floats = (type) => type.kind === 'float' || (type.kind === 'array' && floats(type.element))
      || (type.kind === 'data' && this.holdsFloat(type.name, seen));
    return entry.ctors.some((ctor) => ctor.fields.some((field) => floats(field.type)));
  }

  fn(entry) {
    const { params, body } = renameFunction(entry, snake, this.state.localReserved());
    const name = this.state.localName(entry.fullName);
    this.state.map(entry, name);
    const loop = tailLoop(entry, body);
    if (loop) {
      // A lifted loop runs as a loop: each iteration assigns the parameters their next values.
      this.loopParams = params.map((param) => param.name);
      const text = this.expr(loop);
      this.loopParams = null;
      const binders = params.map((param) => `mut ${param.name}: ${this.type(param.type)}`).join(', ');
      return `pub fn ${name}(${binders}) -> ${this.type(entry.ret)} {\n${indent(`loop {\n${indent(`return ${text};`, 1)}\n}`, 1)}\n}`;
    }
    const binders = params.map((param) => `${param.name}: ${this.type(param.type)}`).join(', ');
    return `pub fn ${name}(${binders}) -> ${this.type(entry.ret)} {\n${indent(this.expr(body), 1)}\n}`;
  }

  theorem(entry) {
    const { binders, prop } = renameTheorem(entry, snake, this.state.localReserved());
    const name = this.state.localName(entry.fullName);
    this.state.map(entry, name);
    this.state.theorem(entry, name, { closedGoal: binders.length === 0, discharge: 'source-kernel', check: 'bounded' });
    this.theoremChecks.push({ ref: `crate::${this.state.ref(entry.fullName, '::')}`, binders, source: entry.fullName });
    const params = binders.map((binder) => `${binder.name}: ${this.type(binder.type)}`).join(', ');
    return `/// Executable form of theorem ${entry.fullName}.\npub fn ${name}(${params}) -> bool {\n${indent(this.prop(prop), 1)}\n}`;
  }

  theoremRunner() {
    if (!this.theoremChecks.length) return null;
    this.state.encode('theorem-properties', 'each theorem is an executable property; --ml-check-theorems evaluates it on every input of a bounded domain, and its proof remains checked by the source kernel');
    const checks = this.theoremChecks.map(({ ref, binders, source }) => {
      const call = `${ref}(${binders.map((binder) => this.own(binder.name, binder.type)).join(', ')})`;
      const holds = binders.reduceRight(
        (inner, binder) => `${this.domain(binder.type, 3)}.into_iter().all(|${binder.name}| ${inner})`,
        call,
      );
      return [
        `    if !(${holds}) {`,
        `        panic!("theorem ${formatEscape(source)} fails on a bounded input");`,
        '    }',
        `    println!("theorem ${formatEscape(source)}: holds on the bounded domain");`,
      ].join('\n');
    });
    return `fn ml_check_theorems() {\n${checks.join('\n')}\n}`;
  }

  entry(hasMain) {
    const run = this.theoremChecks.length
      ? (hasMain ? 'if check { ml_check_theorems() } else { ml_main() }' : 'if check { ml_check_theorems() }')
      : (hasMain ? 'ml_main()' : '');
    return [
      '// Deep recursion in the source is not bounded by a small native stack.',
      'fn main() {',
      '    let check = std::env::args().any(|argument| argument == "--ml-check-theorems");',
      '    let worker = std::thread::Builder::new()',
      '        .stack_size(1 << 28)',
      `        .spawn(move || { ${run} })`,
      '        .expect("spawn the program thread");',
      '    if worker.join().is_err() {',
      '        std::process::exit(101);',
      '    }',
      '}',
    ].join('\n');
  }

  /** Values of a type up to a constructor depth, as a Rust `Vec`. */
  domain(type, depth) {
    switch (type.kind) {
      case 'nat':
        this.usesBig = true;
        return depth >= 3 ? 'crate::ml::range(0, 6)' : 'crate::ml::range(0, 2)';
      case 'int':
        this.usesBig = true;
        return depth >= 3 ? 'crate::ml::range(-4, 4)' : 'crate::ml::range(-1, 1)';
      case 'fixed':
        return `vec![${(type.signed ? [-1, 0, 1] : [0, 1, 2]).map((value) => `${value}${typeKey(type)}`).join(', ')}]`;
      case 'bool':
        return 'vec![false, true]';
      case 'string':
        return 'vec![String::new(), String::from("a"), String::from("ab")]';
      case 'unit':
        return 'vec![()]';
      case 'data': {
        const entry = this.program.declarations.get(type.name);
        const lines = [`let mut values: Vec<${this.type(type)}> = Vec::new();`];
        for (const ctor of entry.ctors) {
          const recursive = ctor.fields.some((field) => field.type.kind === 'data');
          if (recursive && depth <= 1) continue;
          const names = ctor.fields.map((_, index) => `f${index}`);
          const args = ctor.fields.map((field, index) => (field.type.kind === 'data' ? `Box::new(${names[index]}.clone())` : `${names[index]}.clone()`));
          const head = `crate::${this.state.ctorRef(entry.fullName, ctor.name, '::')}`;
          let statement = `values.push(${args.length ? `${head}(${args.join(', ')})` : head});`;
          for (let index = ctor.fields.length - 1; index >= 0; index -= 1) {
            const field = ctor.fields[index];
            statement = `for ${names[index]} in ${this.domain(field.type, field.type.kind === 'data' ? depth - 1 : 1)} {\n${indent(statement, 1)}\n}`;
          }
          lines.push(statement);
        }
        lines.push('values');
        return `{\n${indent(lines.join('\n'), 1)}\n}`;
      }
      default:
        throw new Error(`no Rust domain for ${type.kind}`);
    }
  }

  prop(prop) {
    switch (prop.p) {
      case 'forall': {
        const body = this.prop(prop.body);
        return prop.binders.reduceRight(
          (inner, binder) => `${this.domain(binder.type, 3)}.into_iter().all(|${binder.name}| ${inner})`,
          body,
        );
      }
      case 'and':
        return `(${this.prop(prop.left)} && ${this.prop(prop.right)})`;
      case 'or':
        return `(${this.prop(prop.left)} || ${this.prop(prop.right)})`;
      case 'implies':
        return `(!${this.prop(prop.left)} || ${this.prop(prop.right)})`;
      case 'not':
        return `!${this.prop(prop.arg)}`;
      case 'bool':
        return this.expr(prop.expr);
      default: {
        if (prop.sameValue) {
          this.usesNumber = true;
          const same = `crate::ml_number::same_value(${this.expr(prop.left)}, ${this.expr(prop.right)})`;
          return prop.p === 'eq' ? same : `!${same}`;
        }
        const operator = { eq: '==', ne: '!=', lt: '<', le: '<=', gt: '>', ge: '>=' }[prop.p];
        // Comparisons take their operands by reference, so they read them in place.
        return `(${this.compared(prop.left)} ${operator} ${this.compared(prop.right)})`;
      }
    }
  }

  /** An owned copy of a variable. */
  own(name, type) {
    return COPY.has(type.kind) ? name : `${name}.clone()`;
  }

  /** An expression whose value is only read: variables are borrowed, not cloned. */
  borrow(e) {
    if (e.type?.kind === 'float') return this.expr(e);
    return e.k === 'var' ? `&${e.name}` : `&${this.expr(e)}`;
  }

  /** A comparison operand: read in place, a string literal as a `&str`. */
  compared(e) {
    if (e.k === 'lit' && e.type.kind === 'string') return rustString(String(e.value));
    if (e.k === 'call' && this.externals.get(e.fn)?.literal && e.type.kind === 'string') return e.fn;
    return this.receiver(e);
  }

  /** A method receiver: `&self` methods borrow a variable in place. */
  receiver(e) {
    return e.k === 'var' ? e.name : `(${this.expr(e)})`;
  }

  expr(e) {
    switch (e.k) {
      case 'lit':
        return this.literal(e);
      case 'unit':
        return '()';
      case 'var':
        return this.own(e.name, e.type);
      case 'call':
        if (this.externals.has(e.fn)) return this.external(e, this.externals.get(e.fn));
        return `crate::${this.state.ref(e.fn, '::')}(${e.args.map((arg) => this.expr(arg)).join(', ')})`;
      case 'ctor': {
        const entry = this.program.declarations.get(e.data);
        const ctor = entry.ctors.find((candidate) => candidate.name === e.ctor);
        const head = `crate::${this.state.ctorRef(e.data, e.ctor, '::')}`;
        if (!e.args.length) return head;
        const args = e.args.map((arg, index) => (ctor.fields[index].type.kind === 'data' ? `Box::new(${this.expr(arg)})` : this.expr(arg)));
        return `${head}(${args.join(', ')})`;
      }
      case 'unary':
        if (e.op === 'not') return `!${this.receiver(e.arg)}`;
        if (e.type.kind === 'fixed') return this.checked(`${this.receiver(e.arg)}.checked_neg()`, e.type, 'neg');
        if (e.type.kind === 'float') return `(-${this.receiver(e.arg)})`;
        return `${this.receiver(e.arg)}.neg()`;
      case 'binary':
        return this.binary(e);
      case 'if':
        return `if ${this.expr(e.cond)} {\n${indent(this.expr(e.then), 1)}\n} else {\n${indent(this.expr(e.else), 1)}\n}`;
      case 'let':
        return `{\n${indent(`let ${e.name} = ${this.expr(e.value)};\n${this.expr(e.body)}`, 1)}\n}`;
      case 'match':
        return this.match(e);
      case 'print':
        return `{\n${indent(`println!("{}", ${this.expr(e.text)});\n${this.expr(e.body)}`, 1)}\n}`;
      case 'toString':
        if (e.arg.type.kind === 'string') return this.expr(e.arg);
        if (e.arg.type.kind === 'data' || e.arg.type.kind === 'unit') {
          throw unsupported('output of structured values', `a ${e.arg.type.kind} value has no portable textual form`, e.arg.span);
        }
        if (e.arg.type.kind === 'float') {
          this.usesNumber = true;
          return `crate::ml_number::${e.console ? 'js_console' : 'js_number'}(${this.expr(e.arg)})`;
        }
        return `${this.receiver(e.arg)}.to_string()`;
      case 'stringMap':
        return renderStringMapExpression('Rust', e.op, this.receiver(e.string));
      case 'stringTest': {
        const search = e.search.k === 'lit' ? rustString(String(e.search.value)) : `${this.receiver(e.search)}.as_str()`;
        return renderStringTestExpression('Rust', e.op, this.receiver(e.string), search);
      }
      case 'cast':
        return this.cast(e);
      case 'abort':
        return `panic!("{}", ${rustString(e.message)})`;
      case 'array':
        return e.items.length ? `vec![${e.items.map((item) => this.expr(item)).join(', ')}]` : `Vec::<${this.type(e.type.element)}>::new()`;
      case 'append':
        this.usesArray = true;
        return `crate::ml_array::append(${this.expr(e.left)}, ${this.expr(e.right)})`;
      case 'index': {
        this.usesArray = true;
        this.state.arrayRead();
        const index = e.index.type.kind === 'float'
          ? `crate::ml_array::number_index(${this.expr(e.index)})`
          : `${this.receiver(e.index)}.to_index()`;
        return `crate::ml_array::at(${this.borrow(e.array)}, ${index})`;
      }
      case 'length':
        if (e.array.type.kind === 'string') return renderStringLengthExpression('Rust', this.receiver(e.array));
        if (e.type.kind === 'float') return `(${this.receiver(e.array)}.len() as f64)`;
        this.usesBig = true;
        return `crate::ml::Big::from_u128(${this.receiver(e.array)}.len() as u128)`;
      case 'math':
        return this.math(e);
      case 'recur': {
        // A variable the next iteration keeps as it is, an array most of all, is not copied.
        const kept = e.args.map((arg, index) => arg.k === 'var' && arg.name === this.loopParams[index]);
        const args = e.args.map((arg) => this.expr(arg)).filter((_, index) => !kept[index]);
        const names = this.loopParams.filter((_, index) => !kept[index]);
        const assign = names.length === 1 ? `${names[0]} = ${args[0]};\n` : names.length ? `(${names.join(', ')}) = (${args.join(', ')});\n` : '';
        return `{\n${indent(`${assign}continue;`, 1)}\n}`;
      }
      default:
        throw new Error(`no Rust expression for ${e.k}`);
    }
  }

  /** Math and Number functions: f64 methods where they agree with JavaScript, ml_math otherwise. */
  math(e) {
    this.floats();
    const [arg] = e.args;
    switch (e.op) {
      case 'abs':
      case 'floor':
      case 'ceil':
      case 'trunc':
      case 'sqrt':
        return `${this.receiver(arg)}.${e.op}()`;
      case 'isFinite':
        return `${this.receiver(arg)}.is_finite()`;
      case 'isNaN':
        return `${this.receiver(arg)}.is_nan()`;
      case 'max':
      case 'min':
        if (!e.args.length) return e.op === 'max' ? 'f64::NEG_INFINITY' : 'f64::INFINITY';
        this.usesMath = true;
        return e.args.map((value) => this.expr(value)).reduce((left, right) => `crate::ml_math::${e.op}(${left}, ${right})`);
      default: {
        this.usesMath = true;
        const name = { maxOf: 'max_of', minOf: 'min_of', isInteger: 'is_integer', isSafeInteger: 'is_safe_integer' }[e.op] ?? e.op;
        return `crate::ml_math::${name}(${e.op.endsWith('Of') ? this.borrow(arg) : this.expr(arg)})`;
      }
    }
  }

  literal(e) {
    switch (e.type.kind) {
      case 'nat':
      case 'int': {
        this.usesBig = true;
        const value = BigInt(e.value);
        const small = value >= -(1n << 126n) && value < (1n << 126n);
        return small ? `crate::ml::Big::from_i128(${e.value})` : `crate::ml::Big::parse("${e.value}")`;
      }
      case 'fixed':
        return e.value.startsWith('-') ? `(${e.value}${typeKey(e.type)})` : `${e.value}${typeKey(e.type)}`;
      case 'float':
        this.floats();
        return rustFloat(e.value);
      case 'bool':
        return String(e.value);
      case 'string':
        return `String::from(${rustString(String(e.value))})`;
      default:
        throw new Error(`no Rust literal for ${e.type.kind}`);
    }
  }

  /** A machine-integer result out of range panics, with Rust's own message. */
  checked(text, type, op) {
    this.machineInteger(type);
    return `${text}.expect(${rustString(overflowMessage(op))})`;
  }

  machineInteger(type) {
    this.state.encode(`machine-integer:${typeKey(type)}`, `${typeKey(type)} stays a Rust ${typeKey(type)}; its arithmetic is checked and panics where the source aborts, with the source's message`);
  }

  binary(e) {
    switch (e.op) {
      case 'and':
        return `(${this.expr(e.left)} && ${this.expr(e.right)})`;
      case 'or':
        return `(${this.expr(e.left)} || ${this.expr(e.right)})`;
      case 'concat':
        return `format!("{}{}", ${this.receiver(e.left)}, ${this.receiver(e.right)})`;
      case 'eq':
      case 'ne':
      case 'lt':
      case 'le':
      case 'gt':
      case 'ge': {
        const operator = { eq: '==', ne: '!=', lt: '<', le: '<=', gt: '>', ge: '>=' }[e.op];
        return `(${this.compared(e.left)} ${operator} ${this.compared(e.right)})`;
      }
      default:
        if (e.semantics === 'ieee') return this.floatArithmetic(e);
        return e.type.kind === 'fixed' ? this.fixedArithmetic(e) : this.bigArithmetic(e);
    }
  }

  floats() {
    this.state.encode('floats', 'a JavaScript Number is an f64 with the same IEEE-754 arithmetic; % on f64 is the same truncated remainder, and ml_number::js_number prints a value as JavaScript does');
  }

  /** f64 arithmetic is IEEE-754 binary64 arithmetic, as JavaScript's; Rust's `%` is fmod, as JavaScript's. */
  floatArithmetic(e) {
    const operator = { add: '+', sub: '-', mul: '*', div: '/', rem: '%' }[e.op];
    return `(${this.expr(e.left)} ${operator} ${this.expr(e.right)})`;
  }

  fixedArithmetic(e) {
    const left = this.receiver(e.left);
    const right = this.expr(e.right);
    if (e.op === 'div' || e.op === 'rem') {
      if (e.rounding !== 'trunc' && e.rounding !== 'euclid' && e.type.signed) {
        throw unsupported(`${e.rounding} division on ${typeKey(e.type)}`, 'Rust machine integers divide with truncating or Euclidean rounding only', e.span);
      }
      // Rust integer division always panics by zero and on overflow, with the source's messages.
      this.machineInteger(e.type);
      if (e.rounding === 'euclid') return `${left}.${e.op}_euclid(${right})`;
      return `(${left} ${e.op === 'div' ? '/' : '%'} ${right})`;
    }
    return this.checked(`${left}.checked_${e.op}(${right})`, e.type, e.op);
  }

  bigArithmetic(e) {
    const left = this.receiver(e.left);
    const right = this.borrow(e.right);
    switch (e.op) {
      case 'add':
        return `${left}.add(${right})`;
      case 'mul':
        return `${left}.mul(${right})`;
      case 'sub':
        if (e.semantics === 'truncated') return `crate::ml::nat_sub(${this.borrow(e.left)}, ${right})`;
        return `${left}.sub(${right})`;
      case 'div':
      case 'rem': {
        const zero = e.byZero === 'abort' ? `Some(${rustString(zeroDivisorMessage(e.op, e.type))})` : 'None';
        return `crate::ml::divide(${this.borrow(e.left)}, ${right}, "${e.rounding}", ${zero}, ${e.op === 'rem'})`;
      }
      default:
        throw new Error(`no Rust operator ${e.op}`);
    }
  }

  match(e) {
    const fallback = e.cases.find((kase) => kase.pattern.k === 'wild' || kase.pattern.k === 'bind');
    if (e.scrutinee.type.kind === 'data') {
      const entry = this.program.declarations.get(e.scrutinee.type.name);
      const arms = e.cases.map((kase) => {
        const { pattern } = kase;
        if (pattern.k === 'wild') return `_ => ${block(this.expr(kase.body))}`;
        if (pattern.k === 'bind') return `${pattern.name} => ${block(this.expr(kase.body))}`;
        const ctor = entry.ctors.find((candidate) => candidate.name === pattern.ctor);
        const head = `crate::${this.state.ctorRef(pattern.data, pattern.ctor, '::')}`;
        const binds = pattern.binds.map((bind) => bind ?? '_');
        const unbox = pattern.binds
          .map((bind, index) => (bind && ctor.fields[index].type.kind === 'data' ? `let ${bind} = *${bind};` : null))
          .filter(Boolean);
        const text = binds.length ? `${head}(${binds.join(', ')})` : head;
        return `${text} => ${block([...unbox, this.expr(kase.body)].join('\n'))}`;
      });
      return `match ${this.expr(e.scrutinee)} {\n${indent(arms.join('\n'), 1)}\n}`;
    }
    const natural = e.cases.some((kase) => kase.pattern.k === 'natZero' || kase.pattern.k === 'natSucc');
    if (e.scrutinee.type.kind !== 'nat' && !natural) {
      const kase = fallback;
      const pattern = kase.pattern.k === 'bind' ? kase.pattern.name : '_';
      return `match ${this.expr(e.scrutinee)} {\n${indent(`${pattern} => ${block(this.expr(kase.body))}`, 1)}\n}`;
    }
    let subject;
    const lines = [];
    if (e.scrutinee.k === 'var') subject = e.scrutinee.name;
    else {
      this.temporaries += 1;
      subject = `__subject${this.temporaries}`;
      lines.push(`let ${subject} = ${this.expr(e.scrutinee)};`);
    }
    const fallbackBody = (kase) => [
      ...(kase.pattern.k === 'bind' ? [`let ${kase.pattern.name} = ${subject}.clone();`] : []),
      this.expr(kase.body),
    ].join('\n');
    const zero = e.cases.find((kase) => kase.pattern.k === 'natZero');
    const succ = e.cases.find((kase) => kase.pattern.k === 'natSucc');
    const zeroText = zero ? this.expr(zero.body) : fallbackBody(fallback);
    const machine = e.scrutinee.type.kind === 'fixed';
    // On an unsigned machine integer the successor case holds a value of at least 1, so `- 1` cannot wrap.
    const predecessor = machine ? `${subject} - 1` : `crate::ml::pred(&${subject})`;
    const succText = succ
      ? `let ${succ.pattern.name} = ${predecessor};\n${this.expr(succ.body)}`
      : fallbackBody(fallback);
    lines.push(`if ${machine ? `${subject} == 0` : `${subject}.is_zero()`} {\n${indent(zeroText, 1)}\n} else {\n${indent(succText, 1)}\n}`);
    return lines.length === 1 ? lines[0] : `{\n${indent(lines.join('\n'), 1)}\n}`;
  }

  cast(e) {
    const arg = this.expr(e.arg);
    if (e.from.kind === 'fixed' && e.to.kind === 'fixed') return `${typeKey(e.to)}::from(${arg})`;
    if (e.flavor === 'exact') return arg;
    if (e.flavor === 'clamp') return `crate::ml::clamp_nat(${arg})`;
    return `crate::ml::to_nat_checked(${arg}, ${rustString(castMessage(e))})`;
  }

  main(main) {
    const { effects } = renameMain(main, snake, this.state.localReserved());
    const lines = [];
    let assertion = 0;
    for (const effect of effects) {
      if (effect.k === 'print') lines.push(`println!("{}", ${this.expr(effect.expr)});`);
      else if (effect.k === 'let') lines.push(`let ${effect.name} = ${this.expr(effect.value)};`);
      else {
        assertion += 1;
        lines.push(`assert!(${this.prop(effect.prop)}, "assertion ${assertion}");`);
        this.state.assertionTheorem(`assertion ${assertion}`, effect);
      }
    }
    if (main.sequentialAsync) this.state.encode('sequential-async', 'an async function is the function its body computes and await is its call: every call of one is awaited where it is made, so nothing runs concurrently and the output is the same, in the same order');
    this.state.encode('program-output', 'main prints the lines the source program prints, in order, with println!');
    return `fn ml_main() {\n${indent(lines.join('\n'), 1)}\n}`;
  }
}

/** A Number's canonical JavaScript text as an f64 expression. */
function rustFloat(value) {
  const special = { NaN: 'f64::NAN', Infinity: 'f64::INFINITY', '-Infinity': 'f64::NEG_INFINITY' }[value];
  if (special) return special;
  return value.startsWith('-') ? `(${value}f64)` : `${value}f64`;
}

function block(text) {
  return `{\n${indent(text, 1)}\n}`;
}

function rustEscape(text) {
  return [...text].map((char) => {
    const code = char.codePointAt(0);
    if (char === '"' || char === '\\') return `\\${char}`;
    if (char === '\n') return '\\n';
    if (char === '\r') return '\\r';
    if (char === '\t') return '\\t';
    if (code < 0x20 || code === 0x7f) return `\\u{${code.toString(16)}}`;
    return char;
  }).join('');
}

/** Text inside a `format!`-style literal, where braces are doubled. */
function formatEscape(text) {
  return rustEscape(text).replace(/\{/gu, '{{').replace(/\}/gu, '}}');
}

function rustString(text) {
  return `"${rustEscape(text)}"`;
}

function indent(text, depth) {
  const pad = '    '.repeat(depth);
  return text.split('\n').map((line) => (line ? `${pad}${line}` : line)).join('\n');
}

