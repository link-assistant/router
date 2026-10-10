import { constructMap } from './vendor/constructs.mjs';
import { camelFromSnake } from './vendor/ir.mjs';

const numberLiteral = (text) => text.includes('.') || /e/i.test(text) ? text : `${text}.0`;
function rustString(value) {
  if (/\p{Surrogate}/u.test(value)) throw new Error('unpaired UTF-16 surrogate literals cannot be represented by Rust String');
  return `"${value.replace(/[\\"\u0000-\u001f\u007f]/gu, (char) => {
    const escapes = { '\\': '\\\\', '"': '\\"', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\0': '\\0' };
    return escapes[char] ?? `\\u{${char.codePointAt(0).toString(16)}}`;
  })}"`;
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

function emitter(program, target) {
  const rust = target === 'rust';
  const map = constructMap();
  const name = (value) => rust ? value : camelFromSnake(value);
  const expression = (expr) => {
    switch (expr.kind) {
      case 'number': return rust ? numberLiteral(expr.text) : expr.text;
      case 'string': return rust ? `${rustString(expr.value)}.to_string()` : JSON.stringify(expr.value);
      case 'boolean': return String(expr.value);
      case 'variable': return rust && expr.type === 'string' ? `${name(expr.name)}.to_string()` : name(expr.name);
      case 'binary': {
        const left = expression(expr.left);
        const right = expression(expr.right);
        if (rust && expr.op === 'add' && expr.type === 'string') return `format!("{}{}", ${left}, ${right})`;
        return `(${left} ${map.operators.get(expr.op)[rust ? 'rust' : 'javascript']} ${right})`;
      }
      case 'unary': return `(${map.unaries.get(expr.op)[rust ? 'rust' : 'javascript']}${expression(expr.operand)})`;
      case 'choose': return rust
        ? `(if ${expression(expr.cond)} { ${expression(expr.then)} } else { ${expression(expr.else)} })`
        : `(${expression(expr.cond)} ? ${expression(expr.then)} : ${expression(expr.else)})`;
      case 'call': return `${name(expr.name)}(${expr.args.map((arg) => `${rust && arg.type === 'string' ? '&' : ''}${expression(arg)}`).join(', ')})`;
      case 'builtin': return `${map.builtins.get(expr.name)[rust ? 'rust' : 'javascript']}(${expr.args.map(expression).join(', ')})`;
      case 'method': return `${expression(expr.receiver)}.${map.methods.get(expr.name)[rust ? 'rust' : 'javascript']}(${expr.args.map((arg) => `${rust && arg.type === 'string' ? '&' : ''}${expression(arg)}`).join(', ')})`;
      case 'length': return rust ? `(${expression(expr.receiver)}.encode_utf16().count() as f64)` : `${expression(expr.receiver)}.length`;
      default: throw new Error(`missing ${target} expression emitter: ${expr.kind}`);
    }
  };
  const body = (statements, depth) => {
    const pad = '    '.repeat(depth);
    const lines = [];
    for (const statement of statements) {
      if (statement.kind === 'let') {
        lines.push(`${pad}${rust ? `let ${statement.mutable ? 'mut ' : ''}` : statement.mutable ? 'let ' : 'const '}${name(statement.name)} = ${expression(statement.value)};`);
      } else if (statement.kind === 'assign') {
        lines.push(`${pad}${name(statement.name)} = ${expression(statement.value)};`);
      } else if (statement.kind === 'return') {
        lines.push(`${pad}return ${expression(statement.value)};`);
      } else if (statement.kind === 'while') {
        lines.push(`${pad}while ${rust ? expression(statement.cond) : `(${expression(statement.cond)})`} {`, ...body(statement.body, depth + 1), `${pad}}`);
      } else if (statement.kind === 'if') {
        lines.push(`${pad}if ${rust ? expression(statement.cond) : `(${expression(statement.cond)})`} {`, ...body(statement.then, depth + 1));
        if (statement.else !== null) lines.push(`${pad}} else {`, ...body(statement.else, depth + 1));
        lines.push(`${pad}}`);
      } else throw new Error(`missing ${target} statement emitter: ${statement.kind}`);
    }
    return lines;
  };
  const items = program.map((item) => {
    if (item.kind === 'constant') {
      const type = map.types.get(item.type);
      // Rust constant strings are borrowed static literals, unlike local Strings.
      const value = rust && item.type === 'string' ? rustString(item.value.value) : expression(item.value);
      return rust ? `#[rustfmt::skip]\n${item.exported ? 'pub ' : ''}const ${item.name}: ${type.rust} = ${value};`
        : `${item.exported ? 'export ' : ''}const ${item.name}: ${item.type} = ${value};`;
    }
    const parameters = item.params.map((param) => `${name(param.name)}: ${rust ? map.types.get(param.type).rust : param.type}`);
    const signature = rust
      ? `${item.exported ? 'pub ' : ''}fn ${name(item.name)}(${parameters.join(', ')}) -> ${map.types.get(item.returns).rustOwned} {`
      : `${item.exported ? 'export ' : ''}function ${name(item.name)}(${parameters.join(', ')}): ${item.returns} {`;
    return [...(rust ? ['#[rustfmt::skip]'] : []), signature, ...body(item.body, 1), '}'].join('\n');
  });
  const helpers = rust && JSON.stringify(program).match(/"name":"(?:min|max)"/) ? `${FLOAT_HELPERS}\n\n` : '';
  return `${helpers}${items.join('\n\n')}\n`;
}

export const emitRust = (program) => emitter(program, 'rust');
export const emitTypeScript = (program) => emitter(program, 'typescript');
