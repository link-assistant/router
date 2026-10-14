import { constructMap } from './vendor/constructs.mjs';
import { camelFromSnake,snakeFromCamel,check } from './vendor/ir.mjs';
import { constantValue } from './vendor/constants.mjs';
import { optionalType, typescriptType } from './vendor/return-types.mjs';
import { classPattern } from './vendor/character-classes.mjs';
import {sequencePattern,sequenceStates,RUST_SEQUENCE_HELPER} from './vendor/sequence-patterns.mjs';
import { mapValueType } from './vendor/static-tables.mjs';
import { recordShape,errorShape,carriesValue,payloadBoundary } from './vendor/aggregates.mjs';
import { closedJsonValue,jsonResponseStatus } from './vendor/json-responses.mjs';
import {PAYLOAD_GUARD_HELPERS} from './vendor/payload-guards.mjs';

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

// Lossless passthrough capability: strings retain UTF-16 units and opaque
// payloads remain borrowed. No scalar observer or coercion is implemented.
export const PAYLOAD_HELPERS = `#[derive(Clone, Copy)]
pub enum JsPayload<'a> {
    String(&'a [u16]), Number(f64), Boolean(bool), Null, Undefined,
    Object(&'a dyn std::any::Any), Function(&'a dyn std::any::Any),
    BigInt(&'a dyn std::any::Any), Symbol(&'a dyn std::any::Any),
}
#[rustfmt::skip]
impl<'a> JsPayload<'a> {
    fn strict_primitive(self, other: Self) -> bool {
        match (self, other) {
            (Self::String(left), Self::String(right)) => left == right,
            (Self::Boolean(left), Self::Boolean(right)) => left == right,
            (Self::Number(left), Self::Number(right)) => left == right,
            (Self::Null, Self::Null) | (Self::Undefined, Self::Undefined) => true,
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

export const TABLE_HELPERS = `#[derive(Clone, Copy)]
pub enum JsLiteral { String(&'static str), Number(f64), Boolean(bool) }
#[rustfmt::skip]
impl JsLiteral {
    fn matches(self, value: JsValue<'_>) -> bool {
        match (self, value) {
            (Self::String(left), JsValue::String(right)) => left == right,
            (Self::Boolean(left), JsValue::Boolean(right)) => left == right,
            (Self::Number(left), JsValue::Number(right)) => left == right || left.is_nan() && right.is_nan(),
            _ => false,
        }
    }
    fn same_key(self, other: Self) -> bool {
        match other { Self::String(value) => self.matches(JsValue::String(value)), Self::Number(value) => self.matches(JsValue::Number(value)), Self::Boolean(value) => self.matches(JsValue::Boolean(value)) }
    }
}
#[derive(Clone, Copy)]
pub struct JsStaticSet { values: &'static [JsLiteral] }
#[rustfmt::skip]
impl JsStaticSet {
    fn has(&self, key: JsValue<'_>) -> bool { self.values.iter().any(|value| value.matches(key)) }
    fn size(&self) -> f64 { self.values.iter().enumerate().filter(|(index, value)| !self.values[..*index].iter().any(|earlier| earlier.same_key(**value))).count() as f64 }
}
#[derive(Clone, Copy)]
pub struct JsStaticMap<T: Copy + 'static> { entries: &'static [(JsLiteral, T)] }
#[rustfmt::skip]
impl<T: Copy + 'static> JsStaticMap<T> {
    fn has(&self, key: JsValue<'_>) -> bool { self.entries.iter().any(|entry| entry.0.matches(key)) }
    fn get(&self, key: JsValue<'_>) -> Option<T> { self.entries.iter().rev().find(|entry| entry.0.matches(key)).map(|entry| entry.1) }
    fn size(&self) -> f64 { self.entries.iter().enumerate().filter(|(index, entry)| !self.entries[..*index].iter().any(|earlier| earlier.0.same_key(entry.0))).count() as f64 }
}`;

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
  const globals=new Map(program.map(item=>[item.name,item]));
  const records=new Map();
  let payloadMode=false,losslessMode=false;
  const rustContract=(type,owned=true,lifetime="'a")=>{
    if(type==='entry-value')return `JsEntry<${lifetime}>`;
    if(type==='value')return `${payloadMode?'JsPayload':'JsValue'}<${lifetime}>`;
    if(type==='array-value')return `std::rc::Rc<std::cell::RefCell<Vec<JsPayload<${lifetime}>>>>`;
    const error=errorShape(type),shape=recordShape(type)??error;
    if(shape){if(!records.has(type))records.set(type,{name:`${error?'JsErrorProjection':'JsRecord'}${records.size}`,shape,error:Boolean(error)});return `std::rc::Rc<std::cell::RefCell<${records.get(type).name}${carriesValue(type)?`<${lifetime}>`:''}>>`;}
    return map.types.get(type)[owned?'rustOwned':'rust'];
  };
  const lift=expr=>{
    if(expr.type==='value')return expression(expr);
    if(expr.type==='utf16-string'&&expr.borrowed)return `JsPayload::String(${expression(expr)})`;
    if(expr.type==='null')return 'JsPayload::Null';if(expr.type==='undefined')return 'JsPayload::Undefined';
    if(expr.type==='string'){if(expr.kind!=='string')throw new Error('lossless UTF16 string lift requires a literal');return `JsPayload::String(&[${Array.from({length:expr.value.length},(_,index)=>expr.value.charCodeAt(index)).join(', ')}])`;}
    return `JsPayload::${expr.type==='number'?'Number':'Boolean'}(${expression(expr)})`;
  };
  const literal=value=>`JsLiteral::${{string:'String',number:'Number',boolean:'Boolean'}[value.type]}(${rustConstant(value)})`;
  const units=value=>`&[${Array.from({length:value.length},(_,index)=>value.charCodeAt(index)).join(', ')}]`;
  const converted = (expr, type) => {
    if(rust&&type==='value')return lift(expr);
    if(rust&&type==='utf16-string')return expr.borrowed?`${expression(expr)}.to_vec()`:expression(expr);
    const optional = optionalType(type);
    if (!rust || !optional || expr.type === type) return expression(expr);
    const wrapper = optional.absent === 'null' ? 'JsNullable' : 'JsOptional';
    return expr.type === optional.absent ? `${wrapper}::${optional.absent === 'null' ? 'Null' : 'Undefined'}` : `${wrapper}::Value(${optional.primitive==='utf16-string'&&expr.borrowed?expression(expr)+'.to_vec()':expression(expr)})`;
  };
  const expression = (expr) => {
    switch (expr.kind) {
      case 'number': return rust ? numberLiteral(expr.text) : expr.text;
      case 'string': return rust ? `${rustString(expr.value)}.to_string()` : JSON.stringify(expr.value);
      case 'boolean': return String(expr.value);
      case 'null': case 'undefined': return rust ? expr.kind === 'null' ? 'JsNull' : 'JsUndefined' : expr.kind;
      case 'variable': {
        if (!rust && expr.projection === 'number') return `(${name(expr.name)} as number)`;
        const value = `${name(expr.name)}${rust && expr.projection ? `.as_${expr.projection==='utf16-string'?'utf16':expr.projection}()` : ''}`;
        if(rust&&(expr.type==='array-value'||expr.type==='json-response'||optionalType(expr.type)?.primitive==='utf16-string'||recordShape(expr.type)||errorShape(expr.type)))return `${value}.clone()`;
        return rust && expr.type === 'string' ? `${value}.to_string()` : value;
      }
      case 'logical':return rust?`(if ${expression(expr.left)} { ${expr.op==='and'?lift(expr.right):'JsPayload::Boolean(true)'} } else { ${expr.op==='and'?'JsPayload::Boolean(false)':lift(expr.right)} })`:`(${expression(expr.left)} ${expr.op==='and'?'&&':'||'} ${expression(expr.right)})`;
      case 'binary': {
        if(rust&&expr.utf16Comparison)return `(${expr.left.kind==='string'?units(expr.left.value):expression(expr.left)} ${expr.op==='equal'?'==':'!='} ${expr.right.kind==='string'?units(expr.right.value):expression(expr.right)})`;
        if(rust&&expr.primitiveComparison)return `${expr.op==='not-equal'?'!':''}${lift(expr.left)}.strict_primitive(${lift(expr.right)})`;
        const left = expression(expr.left);
        const right = expression(expr.right);
        if (rust && expr.op === 'add' && expr.type === 'string') return `format!("{}{}", ${left}, ${right})`;
        return `(${left} ${map.operators.get(expr.op)[rust ? 'rust' : 'javascript']} ${right})`;
      }
      case 'unary': return `(${map.unaries.get(expr.op)[rust ? 'rust' : 'javascript']}${expression(expr.operand)})`;
      case 'typeof': return !rust ? `(typeof ${expression(expr.operand)})`
        : expr.operand.type === 'value' ? `${expression(expr.operand)}.type_name().to_string()`
          : `({ let _ = ${expression(expr.operand)}; "${expr.operand.type === 'null' ? 'object' : expr.operand.type==='utf16-string'?'string':expr.operand.type}".to_string() })`;
      case 'truthy': {
        if (!rust) return `!!(${expression(expr.operand)})`;
        if (expr.operand.type === 'boolean') return expression(expr.operand);
        if (['string','utf16-string'].includes(expr.operand.type)) return `!(${expression(expr.operand)}).is_empty()`;
        if (expr.operand.type === 'number') return `({ let observed = ${expression(expr.operand)}; observed != 0.0 && !observed.is_nan() })`;
        return `({ let _ = ${expression(expr.operand)}; false })`;
      }
      case 'primitive-membership':
      case 'includes': {
        if(!rust&&expr.kind==='primitive-membership')return `((observed: unknown) => ${expr.values.map(value=>`observed === ${expression(value)}`).join(' || ')||'false'})(${expression(expr.argument)})`;
        if (!rust) return `([${expr.values.map(expression).join(', ')}] as readonly unknown[]).includes(${expression(expr.argument)})`;
        if (['null', 'undefined'].includes(expr.argument.type)) return `({ let _ = ${expression(expr.argument)}; false })`;
        if(losslessMode) {
          const observed=expr.argument.type==='value'?'observed':expr.argument.type==='utf16-string'?'JsPayload::String(observed)':expr.argument.type==='string'?null:`JsPayload::${expr.argument.type==='number'?'Number':'Boolean'}(observed)`;
          if(observed===null)throw new Error('unimplemented scalar string membership in a lossless function');
          return `({ let observed = ${expression(expr.argument)}; ${expr.values.map(value=>`${lift(value)}.same_primitive(${observed})`).join(' || ')||'false'} })`;
        }
        const variant = type => ({ string: 'String', number: 'Number', boolean: 'Boolean' })[type];
        const observed = expr.argument.type === 'value' ? 'observed' : `JsValue::${variant(expr.argument.type)}(${expr.argument.type === 'string' ? '&' : ''}observed)`;
        const comparisons = expr.values.map(value => `JsValue::${variant(value.type)}(${rustConstant(value)}).same_primitive(${observed})`);
        return `({ let observed = ${expression(expr.argument)}; ${comparisons.join(' || ') || 'false'} })`;
      }
      case 'choose': return rust
        ? `(if ${expression(expr.cond)} { ${converted(expr.then, expr.type)} } else { ${converted(expr.else, expr.type)} })`
        : `(${expression(expr.cond)} ? ${expression(expr.then)} : ${expression(expr.else)})`;
      case 'array':return rust?`std::rc::Rc::new(std::cell::RefCell::new(vec![${expr.values.map(lift).join(', ')}]))`:`[${expr.values.map(expression).join(', ')}]`;
      case 'record': {
        if(!rust)return `({${expr.fields.map(field=>`${JSON.stringify(field.name)}: ${expression(field.value)}`).join(', ')}})`;
        rustContract(expr.type);
        return `std::rc::Rc::new(std::cell::RefCell::new(${records.get(expr.type).name} { ${expr.fields.map(field=>`${snakeFromCamel(field.name)}: ${converted(field.value,field.value.type)}`).join(', ')} }))`;
      }
      case 'json-response': {
        if(!rust)return `Response.json(${expression(expr.body)}${expr.options?', '+expression(expr.options):''})`;
        const text=JSON.stringify(closedJsonValue(expr.body));
        return `std::rc::Rc::new(std::cell::RefCell::new(JsonResponseProjection { status: ${jsonResponseStatus(expr.options)}, body_utf8: vec![${[...Buffer.from(text,'utf8')].join(', ')}], default_content_type: JsonResponseDefaultContentType::HostDefault }))`;
      }
      case 'json-string':return JSON.stringify(expr.value);
      case 'json-number':return expr.text;
      case 'json-boolean':return String(expr.value);
      case 'json-null':return 'null';
      case 'json-array':return `[${expr.values.map(expression).join(', ')}]`;
      case 'json-record': {
        // Closed duplicate expressions have no effects. Keep first key position
        // and final value, avoiding a duplicate-property TypeScript error.
        const fields=new Map(expr.fields.map(field=>[field.name,field.value]));
        return `{${[...fields].map(([name,value])=>`${JSON.stringify(name)}: ${expression(value)}`).join(', ')}}`;
      }
      case 'error': {
        if(!rust)return `Object.assign(new Error(${expression(expr.message)}), {${expr.fields.map(field=>`${JSON.stringify(field.name)}: ${expression(field.value)}`).join(', ')}})`;
        rustContract(expr.type);
        const message=expr.message.kind==='string'?units(expr.message.value):expression(expr.message);
        return `std::rc::Rc::new(std::cell::RefCell::new(${records.get(expr.type).name} { message: (${message}).to_vec()${expr.fields.length?', '+expr.fields.map(field=>`${snakeFromCamel(field.name)}: ${expression(field.value)}`).join(', '):''} }))`;
      }
      case 'call':return `${name(expr.name)}(${expr.args.map((arg,index)=>{
        if(!rust)return expression(arg);
        const callee=globals.get(expr.name),param=callee.params[index];
        if(param.type==='value'&&arg.type!=='value'&&!payloadBoundary(callee)&&arg.type!=='undefined')throw new Error('unimplemented scalar default argument lift');
        let value=param.type==='utf16-string'&&arg.kind==='string'?units(arg.value):param.type==='value'&&arg.type!=='value'?(payloadBoundary(callee)?lift(arg):'JsValue::Undefined'):`${arg.type==='string'?'&':''}${expression(arg)}`;
        if(param.default&&param.type!=='value')value=arg.type==='undefined'?'None':`Some(${value})`;
        return value;
      }).join(', ')})`;
      case 'builtin': return rust&&expr.name==='utf8-length'&&expr.args[0]?.type==='utf16-string'?`js_payload_utf8_length(${expression(expr.args[0])})`:rust && expr.args[0]?.type === 'value' && ['safe-integer', 'finite', 'nan'].includes(expr.name)
        ? `${expression(expr.args[0])}.${{ 'safe-integer': 'is_safe_integer', finite: 'is_finite', nan: 'is_nan' }[expr.name]}()`
        : `${map.builtins.get(expr.name)[rust ? 'rust' : 'javascript']}(${expr.args.map(argument=>`${rust && expr.name==='utf8-length'?'&':''}${expression(argument)}`).join(', ')})`;
      case 'method': {
        if(rust&&expr.receiver.type==='utf16-string') {
          const receiver=expression(expr.receiver),argument=expr.args[0],search=argument?.type==='string'?units(argument.value):argument?expression(argument):null;
          if(expr.name==='trim')return `js_payload_trim(${receiver})`;
          if(expr.name==='includes')return `({ let observed = ${receiver}; let search = ${search}; search.is_empty() || observed.windows(search.len()).any(|window| window == search) })`;
          return `${receiver}.${expr.name==='starts-with'?'starts_with':'ends_with'}(${search})`;
        }
        return rust && expr.name === 'trim' ? `js_trim(&${expression(expr.receiver)})`
        : `${expression(expr.receiver)}.${map.methods.get(expr.name)[rust ? 'rust' : 'javascript']}(${expr.args.map((arg) => `${rust && arg.type === 'string' ? '&' : ''}${expression(arg)}`).join(', ')})`;
      }
      case 'length': return rust ? expr.receiver.type==='utf16-string'?`(${expression(expr.receiver)}.len() as f64)`:`(${expression(expr.receiver)}.encode_utf16().count() as f64)` : `${expression(expr.receiver)}.length`;
      case 'codepoints': return rust ? expr.receiver.type==='utf16-string'?`(js_payload_points(${expression(expr.receiver)}).len() as f64)`:`(${expression(expr.receiver)}.chars().count() as f64)` : `[...${expression(expr.receiver)}].length`;
      case 'sequence-test': {
        if(!rust)return `/${sequencePattern(expr)}/${expr.unicode?'u':''}.test(${expression(expr.receiver)})`;
        const iterator=expr.receiver.type==='utf16-string'?expr.unicode?'js_payload_points(observed).into_iter()':'observed.iter().map(|unit| *unit as u32)':`observed.${expr.unicode?'chars()':'encode_utf16()'}.map(|unit| unit as u32)`;
        const some=value=>value===null?'None':`Some(${value})`;
        const states=sequenceStates(expr).map(state=>`(${state.negated}, &[${state.ranges.map(range=>`(${range.low}, ${range.high})`).join(', ')}], ${some(state.next)}, ${some(state.epsilon)})`).join(', ');
        return `({ let observed = ${expression(expr.receiver)}; js_sequence_test(${iterator}, &[${states}]) })`;
      }
      case 'class-test': {
        if (!rust) return `/${classPattern(expr)}/${expr.unicode?'u':''}.test(${expression(expr.receiver)})`;
        const within=expr.ranges.map(({low,high})=>low===high?`unit == ${low}`:`(unit >= ${low} && unit <= ${high})`).join(' || ')||'false';
        const accepted=`${expr.negated?'!':''}(${within})`;
        const iterator=expr.receiver.type==='utf16-string'?expr.unicode?'js_payload_points(observed).into_iter()':'observed.iter().map(|unit| *unit as u32)':`observed.${expr.unicode?'chars()':'encode_utf16()'}.map(|unit| unit as u32)`;
        const test=expr.anchored?'units.next().is_some_and(accepted) && units.next().is_none()':'units.any(accepted)';
        return `({ let observed = ${expression(expr.receiver)}; let mut units = ${iterator}; let accepted = |unit: u32| ${accepted}; ${test} })`;
      }
      case 'table-size':return rust?`${name(expr.name)}.size()`:`${name(expr.name)}.size`;
      case 'table-get':case 'table-has': {
        if(!rust)return `${name(expr.name)}.${expr.kind==='table-get'?'get':'has'}(${expression(expr.argument)})`;
        const missing=['null','undefined'].includes(expr.argument.type);
        const observed=expr.argument.type==='value'?'observed':`JsValue::${{string:'String',number:'Number',boolean:'Boolean'}[expr.argument.type]}(${expr.argument.type==='string'?'&':''}observed)`;
        if(expr.kind==='table-has')return `({ let ${missing?'_':'observed'} = ${expression(expr.argument)}; ${missing?'false':`${name(expr.name)}.has(${observed})`} })`;
        const valueType=mapValueType(globals.get(expr.name).type);
        const result=missing?'JsOptional::Undefined':`match ${name(expr.name)}.get(${observed}) { Some(value) => JsOptional::Value(value${valueType==='string'?'.to_string()':''}), None => JsOptional::Undefined }`;
        return `({ let ${missing?'_':'observed'} = ${expression(expr.argument)}; ${result} })`;
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
  const items = program.map((input,itemIndex) => {
    const item=input.kind==='closure'?check(input,globals):input;
    payloadMode=payloadBoundary(item);
    losslessMode=item.lossless===true;
    if (item.kind === 'constant') {
      const type = map.types.get(item.type);
      if(['table-set','table-map'].includes(item.value.kind)) {
        const set=item.value.kind==='table-set';
        const entries=item.value.entries.map(entry=>set?(rust?literal(entry):expression(entry)):rust?`(${literal(entry.key)}, ${rustConstant(entry.value)})`:`[${expression(entry.key)}, ${expression(entry.value)}]`).join(', ');
        const target=rust?set?`JsStaticSet { values: &[${entries}] }`:`JsStaticMap { entries: &[${entries}] }`:set?`new Set<unknown>([${entries}])`:`new Map<unknown, ${mapValueType(item.type)}>([${entries}])`;
        return rust?`#[rustfmt::skip]\n#[allow(non_upper_case_globals)]\nconst ${name(item.name)}: ${type.rust} = ${target};`:`const ${name(item.name)}: ${typescriptType(item.type)} = ${target};`;
      }
      // Rust constant strings are borrowed static literals, unlike local Strings.
      const value = rust ? rustConstant(item.value) : expression(item.value);
      return rust ? `#[rustfmt::skip]\n${/^[A-Z][A-Z0-9_]*$/u.test(item.name) ? '' : '#[allow(non_upper_case_globals)]\n'}${item.exported ? 'pub ' : ''}const ${item.name}: ${type.rust} = ${value};`
        : `${item.exported ? 'export ' : ''}const ${name(item.name)}: ${item.type} = ${value};`;
    }
    const lifetime=item.kind==='closure'||payloadMode&&item.params.some(param=>['value','entry-value'].includes(param.type)||param.rest)||carriesValue(item.returns);
    const parameters = item.params.map((param, index) => {
      let type=rust?param.rest?"Vec<JsPayload<'a>>":rustContract(param.type,false,lifetime?"'a":"'_"):typescriptType(param.type);
      if(rust&&param.default&&param.type!=='value')type=`Option<${type}>`;
      const optional=!rust&&!param.default&&!param.rest&&param.type==='value'&&item.params.slice(index+1).every(later=>later.type==='value'||later.default||later.rest);
      const binding=!rust&&param.bindings?`[${param.bindings.map(binding=>binding===null?'':name(binding)).join(', ')}${param.bindings.at(-1)===null?',':''}]`:name(param.name);
      return `${!rust&&param.rest?'...':''}${binding}${optional?'?':''}: ${type}${!rust&&param.default?' = '+expression(param.default):''}`;
    });
    if(item.kind==='closure') {
      const contract=typescriptType(item.returns),environmentName='JsClosureEnvironment'+itemIndex;
      const qualification='// Source-bound body draft; parent creation/effects remain refused; runtimeParity: false.';
      const conditional=item.conditionalCaptures?['// Conditional private body draft: original standard collection intrinsics required.', '// Original has/includes lookup stability and parent execution are unproved.']:[];
      if(!rust)return [qualification,...conditional,`function ${name(item.name)}(${item.captures.map(capture=>`${name(capture.name)}?: unknown`).join(', ')}): (${parameters.join(', ')}) => ${contract} {`,`    return (${parameters.join(', ')}): ${contract} => {`,...body(item.body,2,item.returns),'    };','}'].join('\n');
      const bindings=item.params.filter(param=>param.bindings).flatMap(param=>param.bindings.flatMap((binding,index)=>binding===null?[]:[`        let ${name(binding)} = ${name(param.name)}.${index===0?'key':'value'};`]));
      if(item.conditionalCaptures&&!item.captures.length)return [qualification,...conditional,`pub struct ${environmentName} {}`,`fn ${name(item.name)}() -> ${environmentName} {`,`    ${environmentName} {}`,'}',`impl ${environmentName} {`,`    pub fn call<'a>(&self${parameters.length?', '+parameters.join(', '):''}) -> ${rustContract(item.returns)} {`,...bindings,...body(item.body,2,item.returns),'    }','}'].join('\n');
      const fields=item.captures.map(capture=>`    ${name(capture.name)}: JsPayload<'env>,`);
      const environmentParameters=item.captures.map(capture=>`${name(capture.name)}: JsPayload<'env>`).join(', ');
      return [qualification,`pub struct ${environmentName}<'env> {`,...fields,'}',`fn ${name(item.name)}<'env>(${environmentParameters}) -> ${environmentName}<'env> {`,`    ${environmentName} { ${item.captures.map(capture=>name(capture.name)).join(', ')} }`,'}',`impl<'env> ${environmentName}<'env> {`,`    pub fn call<'a>(&self${parameters.length?', '+parameters.join(', '):''}) -> ${rustContract(item.returns)} where 'env: 'a {`,...item.captures.map(capture=>`        let ${name(capture.name)}: JsPayload<'a> = self.${name(capture.name)};`),...body(item.body,2,item.returns),'    }','}'].join('\n');
    }
    const signature = rust
      ? `${item.exported ? 'pub ' : ''}fn ${name(item.name)}${lifetime?"<'a>":''}(${parameters.join(', ')}) -> ${rustContract(item.returns)} {`
      : `${item.exported ? 'export ' : ''}function ${name(item.name)}(${parameters.join(', ')}): ${typescriptType(item.returns)} {`;
    const defaults=rust?item.params.filter(param=>param.default).map(param=>{
      if(param.type==='value') {
        const variant=payloadMode?'JsPayload':'JsValue';
        const fallback=payloadMode?lift(param.default):param.default.type==='undefined'?'JsValue::Undefined':param.default.type==='null'?'JsValue::Object':param.default.type==='string'?`JsValue::String(${rustString(constantValue(param.default))})`:`JsValue::${param.default.type==='number'?'Number':'Boolean'}(${expression(param.default)})`;
        return `    let ${name(param.name)} = if matches!(${name(param.name)}, ${variant}::Undefined) { ${fallback} } else { ${name(param.name)} };`;
      }
      const fallback=param.type==='utf16-string'?units(param.default.value):param.type==='string'?rustString(constantValue(param.default)):expression(param.default);
      return `    let ${name(param.name)} = ${name(param.name)}.unwrap_or(${fallback});`;
    }):[];
    return [...(item.conditionalInputs?['// Conditional private body draft: genuine unchanged producer/callback intrinsics required.', '// Producer lookup stability and original signature full-domain parity are unproved; runtimeParity: false.']:[]),...(rust ? ['#[rustfmt::skip]'] : []), signature,...defaults,...(rust?item.params.filter(param=>param.bindings).flatMap(param=>param.bindings.flatMap((binding,index)=>binding===null?[]:[`    let ${name(binding)} = ${name(param.name)}.${index===0?'key':'value'};`])):[]),...(rust?item.params.filter(param=>param.rest).map(param=>`    let ${name(param.name)} = std::rc::Rc::new(std::cell::RefCell::new(${name(param.name)}));`):[]), ...body(item.body, 1, item.returns), '}'].join('\n');
  });
  const serialized = JSON.stringify(program);
  payloadMode=true;
  const declarations=[];
  if(serialized.includes('"type":"json-response"'))declarations.push(`// Explicit host-qualified projection; runtimeParity: false.
#[derive(Clone, Copy)]
#[allow(non_camel_case_types)]
pub enum JsonResponseHost {
    Node20,
    Bun1_4_3,
}
#[derive(Clone, Copy)]
pub enum JsonResponseDefaultContentType {
    HostDefault,
}
#[derive(Clone)]
pub struct JsonResponseProjection {
    pub status: u16,
    pub body_utf8: Vec<u8>,
    pub default_content_type: JsonResponseDefaultContentType,
}
impl JsonResponseProjection {
    pub fn content_type_for(&self, host: JsonResponseHost) -> &'static str {
        match (self.default_content_type, host) {
            (JsonResponseDefaultContentType::HostDefault, JsonResponseHost::Node20) => "application/json",
            (JsonResponseDefaultContentType::HostDefault, JsonResponseHost::Bun1_4_3) => "application/json;charset=utf-8",
        }
    }
}`);
  for(const [type,record]of records)declarations.push(`#[derive(Clone)]\npub struct ${record.name}${carriesValue(type)?"<'a>":''} {\n${record.error?'    pub message: Vec<u16>,\n':''}${record.shape.map(([field,type])=>`    pub ${snakeFromCamel(field)}: ${rustContract(type)},`).join('\n')}\n}`);
  const helpers = rust ? [
    serialized.includes('\"kind\":\"sequence-test\"')?RUST_SEQUENCE_HELPER:'',
    program.some(payloadBoundary)?PAYLOAD_HELPERS:'',
    program.some(item=>item.lossless)?PAYLOAD_GUARD_HELPERS:'',
    program.some(item=>item.params?.some(param=>param.type==='entry-value'))?`#[derive(Clone, Copy)]\npub struct JsEntry<'a> { pub key: &'a [u16], pub value: JsPayload<'a> }`:'',
    serialized.match(/"name":"(?:min|max)"/) ? FLOAT_HELPERS : '',
    serialized.includes('"type":"value"') || serialized.includes('"kind":"includes"') || serialized.includes('"kind":"table-') || serialized.includes('array-value') ? VALUE_HELPERS : '',
    serialized.includes('"name":"trim"') ? TRIM_HELPER : '',
    serialized.includes('"name":"safe-integer"') ? SAFE_INTEGER_HELPER : '',
    serialized.includes('"name":"utf8-length"') ? UTF8_LENGTH_HELPER : '',
    serialized.includes('"kind":"null"') || serialized.includes('"kind":"undefined"') || serialized.includes('"kind":"table-get"') ? ABSENCE_HELPERS : '',
    serialized.includes('"kind":"table-set"') || serialized.includes('"kind":"table-map"') ? TABLE_HELPERS : '',
  ].filter(Boolean).map(helper => `${helper}\n\n`).join('') : '';
  return `${helpers}${rust&&declarations.length?declarations.join('\n\n')+'\n\n':''}${items.join('\n\n')}\n`;
}

export const emitRust = (program) => emitter(program, 'rust');
export const emitTypeScript = (program) => emitter(program, 'typescript');
