import { constructMap } from './vendor/constructs.mjs';
import { camelFromSnake } from './vendor/ir.mjs';
import { constantValue } from './vendor/constants.mjs';
import { optionalType, typescriptType } from './vendor/return-types.mjs';
import { classPattern } from './vendor/character-classes.mjs';

const numberLiteral = (text) => text.includes('.') || /e/i.test(text) ? text : `${text}.0`;
function rustString(value) {
  if (/\p{Surrogate}/u.test(value)) throw new Error('unpaired UTF-16 surrogate literals cannot be represented by Rust String');
  return `"${value.replace(/[\\"\u0000-\u001f\u007f]/gu, (char) => {
    const escapes = { '\\': '\\\\', '"': '\\"', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\0': '\\0' };
    return escapes[char] ?? `\\u{${char.codePointAt(0).toString(16)}}`;
  })}"`;
}

function rustConstant(expr) {
  const value = constantValue(expr);
  return expr.type === 'string' ? rustString(value) : expr.type === 'boolean' ? String(value)
    : Number.isNaN(value) ? 'f64::NAN' : value === Infinity ? 'f64::INFINITY'
      : value === -Infinity ? 'f64::NEG_INFINITY' : Object.is(value, -0) ? '-0.0' : numberLiteral(String(value));
}

// JavaScript Math.min/max propagate NaN and distinguish both signed zeros.
// f64::min/max alone discard NaN, so they do not implement these IR operations.
export const FLOAT_HELPERS = `#[rustfmt::skip]
fn js_min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == 0.0 && b == 0.0 {
        return if a.is_sign_negative() || b.is_sign_negative() { -0.0 } else { 0.0 };
    }
    if a < b { a } else { b }
}

#[rustfmt::skip]
fn js_max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == 0.0 && b == 0.0 {
        return if a.is_sign_positive() || b.is_sign_positive() { 0.0 } else { -0.0 };
    }
    if a > b { a } else { b }
}`;

// Opaque categories carry only their observable typeof tag. These predicates
// cannot inspect object/function/bigint/symbol data or invoke a coercion hook.
export const VALUE_HELPERS = `#[derive(Clone, Copy)]
pub enum JsValue<'a> {
    String(&'a str), Number(f64), Boolean(bool), Undefined,
    Object, Function, BigInt, Symbol,
}

#[rustfmt::skip]
impl<'a> JsValue<'a> {
    fn type_name(self) -> &'static str {
        match self {
            Self::String(_) => "string", Self::Number(_) => "number",
            Self::Boolean(_) => "boolean", Self::Undefined => "undefined",
            Self::Object => "object", Self::Function => "function",
            Self::BigInt => "bigint", Self::Symbol => "symbol",
        }
    }
    fn as_string(self) -> &'a str { if let Self::String(value) = self { value } else { unreachable!("checked typeof guard") } }
    fn as_number(self) -> f64 { if let Self::Number(value) = self { value } else { unreachable!("checked typeof guard") } }
    fn as_boolean(self) -> bool { if let Self::Boolean(value) = self { value } else { unreachable!("checked typeof guard") } }
    fn is_finite(self) -> bool { matches!(self, Self::Number(value) if value.is_finite()) }
    fn is_nan(self) -> bool { matches!(self, Self::Number(value) if value.is_nan()) }
    fn is_safe_integer(self) -> bool {
        matches!(self, Self::Number(value) if value.is_finite() && value.fract() == 0.0 && value.abs() <= 9007199254740991.0)
    }
    fn same_primitive(self, other: Self) -> bool {
        match (self, other) {
            (Self::String(left), Self::String(right)) => left == right,
            (Self::Boolean(left), Self::Boolean(right)) => left == right,
            (Self::Number(left), Self::Number(right)) => left == right || left.is_nan() && right.is_nan(),
            _ => false,
        }
    }
}`;

export const SAFE_INTEGER_HELPER = `#[rustfmt::skip]
fn js_safe_integer(value: f64) -> bool {
    value.is_finite() && value.fract() == 0.0 && value.abs() <= 9007199254740991.0
}`;

export const UTF8_LENGTH_HELPER = `#[rustfmt::skip]
fn js_utf8_length(value: &str) -> f64 { value.len() as f64 }`;

export const ABSENCE_HELPERS = `#[derive(Clone, Copy, PartialEq)]
pub struct JsNull;
#[derive(Clone, Copy, PartialEq)]
pub struct JsUndefined;
#[derive(Clone, Copy, PartialEq)]
pub enum JsNullable<T> { Null, Value(T) }
#[derive(Clone, Copy, PartialEq)]
pub enum JsOptional<T> { Undefined, Value(T) }`;

export const TRIM_HELPER = `#[rustfmt::skip]
fn js_trim(value: &str) -> String {
    value.trim_matches(|ch: char| matches!(ch,
        '\\u{9}'..='\\u{d}' | '\\u{20}' | '\\u{a0}' | '\\u{1680}' | '\\u{2000}'..='\\u{200a}' |
        '\\u{2028}' | '\\u{2029}' | '\\u{202f}' | '\\u{205f}' | '\\u{3000}' | '\\u{feff}'
    )).to_string()
}`;

function emitter(program, target) {
  const rust = target === 'rust';
  const map = constructMap();
  const name = (value) => rust ? value : camelFromSnake(value);
  const converted = (expr, type) => {
    const optional = optionalType(type);
    if (!rust || !optional || expr.type === type) return expression(expr);
    const wrapper = optional.absent === 'null' ? 'JsNullable' : 'JsOptional';
    return expr.type === optional.absent ? `${wrapper}::${optional.absent === 'null' ? 'Null' : 'Undefined'}` : `${wrapper}::Value(${expression(expr)})`;
  };
  const expression = (expr) => {
    switch (expr.kind) {
      case 'number': return rust ? numberLiteral(expr.text) : expr.text;
      case 'string': return rust ? `${rustString(expr.value)}.to_string()` : JSON.stringify(expr.value);
      case 'boolean': return String(expr.value);
      case 'null': case 'undefined': return rust ? expr.kind === 'null' ? 'JsNull' : 'JsUndefined' : expr.kind;
      case 'variable': {
        if (!rust && expr.projection === 'number') return `(${name(expr.name)} as number)`;
        const value = `${name(expr.name)}${rust && expr.projection ? `.as_${expr.projection}()` : ''}`;
        return rust && expr.type === 'string' ? `${value}.to_string()` : value;
      }
      case 'binary': {
        const left = expression(expr.left);
        const right = expression(expr.right);
        if (rust && expr.op === 'add' && expr.type === 'string') return `format!("{}{}", ${left}, ${right})`;
        return `(${left} ${map.operators.get(expr.op)[rust ? 'rust' : 'javascript']} ${right})`;
      }
      case 'unary': return `(${map.unaries.get(expr.op)[rust ? 'rust' : 'javascript']}${expression(expr.operand)})`;
      case 'typeof': return !rust ? `(typeof ${expression(expr.operand)})`
        : expr.operand.type === 'value' ? `${expression(expr.operand)}.type_name().to_string()`
          : `({ let _ = ${expression(expr.operand)}; "${expr.operand.type === 'null' ? 'object' : expr.operand.type}".to_string() })`;
      case 'truthy': {
        if (!rust) return `!!(${expression(expr.operand)})`;
        if (expr.operand.type === 'boolean') return expression(expr.operand);
        if (expr.operand.type === 'string') return `!(${expression(expr.operand)}).is_empty()`;
        if (expr.operand.type === 'number') return `({ let observed = ${expression(expr.operand)}; observed != 0.0 && !observed.is_nan() })`;
        return `({ let _ = ${expression(expr.operand)}; false })`;
      }
      case 'includes': {
        if (!rust) return `([${expr.values.map(expression).join(', ')}] as readonly unknown[]).includes(${expression(expr.argument)})`;
        if (['null', 'undefined'].includes(expr.argument.type)) return `({ let _ = ${expression(expr.argument)}; false })`;
        const variant = type => ({ string: 'String', number: 'Number', boolean: 'Boolean' })[type];
        const observed = expr.argument.type === 'value' ? 'observed' : `JsValue::${variant(expr.argument.type)}(${expr.argument.type === 'string' ? '&' : ''}observed)`;
        const comparisons = expr.values.map(value => `JsValue::${variant(value.type)}(${rustConstant(value)}).same_primitive(${observed})`);
        return `({ let observed = ${expression(expr.argument)}; ${comparisons.join(' || ') || 'false'} })`;
      }
      case 'choose': return rust
        ? `(if ${expression(expr.cond)} { ${converted(expr.then, expr.type)} } else { ${converted(expr.else, expr.type)} })`
        : `(${expression(expr.cond)} ? ${expression(expr.then)} : ${expression(expr.else)})`;
      case 'call': return `${name(expr.name)}(${expr.args.map((arg) => `${rust && arg.type === 'string' ? '&' : ''}${expression(arg)}`).join(', ')})`;
      case 'builtin': return rust && expr.args[0]?.type === 'value' && ['safe-integer', 'finite', 'nan'].includes(expr.name)
        ? `${expression(expr.args[0])}.${{ 'safe-integer': 'is_safe_integer', finite: 'is_finite', nan: 'is_nan' }[expr.name]}()`
        : `${map.builtins.get(expr.name)[rust ? 'rust' : 'javascript']}(${expr.args.map(argument=>`${rust && expr.name==='utf8-length'?'&':''}${expression(argument)}`).join(', ')})`;
      case 'method': return rust && expr.name === 'trim' ? `js_trim(&${expression(expr.receiver)})`
        : `${expression(expr.receiver)}.${map.methods.get(expr.name)[rust ? 'rust' : 'javascript']}(${expr.args.map((arg) => `${rust && arg.type === 'string' ? '&' : ''}${expression(arg)}`).join(', ')})`;
      case 'length': return rust ? `(${expression(expr.receiver)}.encode_utf16().count() as f64)` : `${expression(expr.receiver)}.length`;
      case 'codepoints': return rust ? `(${expression(expr.receiver)}.chars().count() as f64)` : `[...${expression(expr.receiver)}].length`;
      case 'class-test': {
        if (!rust) return `/${classPattern(expr)}/${expr.unicode?'u':''}.test(${expression(expr.receiver)})`;
        const within=expr.ranges.map(({low,high})=>low===high?`unit == ${low}`:`(unit >= ${low} && unit <= ${high})`).join(' || ')||'false';
        const accepted=`${expr.negated?'!':''}(${within})`;
        const iterator=`observed.${expr.unicode?'chars()':'encode_utf16()'}.map(|unit| unit as u32)`;
        const test=expr.anchored?'units.next().is_some_and(accepted) && units.next().is_none()':'units.any(accepted)';
        return `({ let observed = ${expression(expr.receiver)}; let mut units = ${iterator}; let accepted = |unit: u32| ${accepted}; ${test} })`;
      }
      default: throw new Error(`missing ${target} expression emitter: ${expr.kind}`);
    }
  };
  const body = (statements, depth, returnType) => {
    const pad = '    '.repeat(depth);
    const lines = [];
    for (const statement of statements) {
      if (statement.kind === 'let') {
        lines.push(`${pad}${rust ? `let ${statement.mutable ? 'mut ' : ''}` : statement.mutable ? 'let ' : 'const '}${name(statement.name)} = ${expression(statement.value)};`);
      } else if (statement.kind === 'assign') {
        lines.push(`${pad}${name(statement.name)} = ${expression(statement.value)};`);
      } else if (statement.kind === 'return') {
        lines.push(`${pad}return ${converted(statement.value, returnType)};`);
      } else if (statement.kind === 'while') {
        lines.push(`${pad}while ${rust ? expression(statement.cond) : `(${expression(statement.cond)})`} {`, ...body(statement.body, depth + 1, returnType), `${pad}}`);
      } else if (statement.kind === 'if') {
        lines.push(`${pad}if ${rust ? expression(statement.cond) : `(${expression(statement.cond)})`} {`, ...body(statement.then, depth + 1, returnType));
        if (statement.else !== null) lines.push(`${pad}} else {`, ...body(statement.else, depth + 1, returnType));
        lines.push(`${pad}}`);
      } else throw new Error(`missing ${target} statement emitter: ${statement.kind}`);
    }
    return lines;
  };
  const items = program.map((item) => {
    if (item.kind === 'constant') {
      const type = map.types.get(item.type);
      // Rust constant strings are borrowed static literals, unlike local Strings.
      const value = rust ? rustConstant(item.value) : expression(item.value);
      return rust ? `#[rustfmt::skip]\n${/^[A-Z][A-Z0-9_]*$/u.test(item.name) ? '' : '#[allow(non_upper_case_globals)]\n'}${item.exported ? 'pub ' : ''}const ${item.name}: ${type.rust} = ${value};`
        : `${item.exported ? 'export ' : ''}const ${name(item.name)}: ${item.type} = ${value};`;
    }
    const parameters = item.params.map((param, index) => `${name(param.name)}${!rust && param.type === 'value' && item.params.slice(index + 1).every(later => later.type === 'value') ? '?' : ''}: ${rust ? map.types.get(param.type).rust : typescriptType(param.type)}`);
    const signature = rust
      ? `${item.exported ? 'pub ' : ''}fn ${name(item.name)}(${parameters.join(', ')}) -> ${map.types.get(item.returns).rustOwned} {`
      : `${item.exported ? 'export ' : ''}function ${name(item.name)}(${parameters.join(', ')}): ${typescriptType(item.returns)} {`;
    return [...(rust ? ['#[rustfmt::skip]'] : []), signature, ...body(item.body, 1, item.returns), '}'].join('\n');
  });
  const serialized = JSON.stringify(program);
  const helpers = rust ? [
    serialized.match(/"name":"(?:min|max)"/) ? FLOAT_HELPERS : '',
    serialized.includes('"type":"value"') || serialized.includes('"kind":"includes"') ? VALUE_HELPERS : '',
    serialized.includes('"name":"trim"') ? TRIM_HELPER : '',
    serialized.includes('"name":"safe-integer"') ? SAFE_INTEGER_HELPER : '',
    serialized.includes('"name":"utf8-length"') ? UTF8_LENGTH_HELPER : '',
    serialized.includes('"kind":"null"') || serialized.includes('"kind":"undefined"') ? ABSENCE_HELPERS : '',
  ].filter(Boolean).map(helper => `${helper}\n\n`).join('') : '';
  return `${helpers}${items.join('\n\n')}\n`;
}

export const emitRust = (program) => emitter(program, 'rust');
export const emitTypeScript = (program) => emitter(program, 'typescript');
