import {matchesSequence} from './vendor/sequence-patterns.mjs';
// Independent evaluator for the semantic IR. Used alongside authored fixtures
// and execution of the authoritative source; neither emitter is consulted.
import {check} from './vendor/ir.mjs';
import { constructMap } from './vendor/constructs.mjs';

export function evaluate(program, functionName, arguments_) {
  const table = new Map(program.map((item) => [item.name, item]));
  const map = constructMap();
  const tables=new Map();
  const expression = (expr, env) => {
    const get = (value) => expression(value, env);
    switch (expr.kind) {
      case 'json-response':return Response.json(get(expr.body),expr.options===null?undefined:get(expr.options));
      case 'json-array':return expr.values.map(get);
      case 'json-record':return Object.fromEntries(expr.fields.map(field=>[field.name,get(field.value)]));
      case 'json-string':case 'json-boolean':return expr.value;
      case 'json-number':return Number(expr.text);
      case 'json-null':return null;
      case 'array':return expr.values.map(get);
      case 'record':return Object.fromEntries(expr.fields.map(field=>[field.name,get(field.value)]));
      case 'error':return Object.assign(new Error(get(expr.message)),Object.fromEntries(expr.fields.map(field=>[field.name,get(field.value)])));
      case 'number': return Number(expr.text);
      case 'string': case 'boolean': return expr.value;
      case 'null': return null;
      case 'undefined': return undefined;
      case 'variable': return env.has(expr.name) ? env.get(expr.name) : get(table.get(expr.name).value);
      case 'unary': return expr.op === 'not' ? !get(expr.operand) : -get(expr.operand);
      case 'typeof': return typeof get(expr.operand);
      case 'truthy': return Boolean(get(expr.operand));
      case 'primitive-membership': {
        const argument=get(expr.argument);
        // Closed finite literals exclude NaN; strict equality is exactly the
        // retained SameValueZero cases, including both signed zero values.
        return expr.values.some(value=>get(value)===argument);
      }
      case 'includes': {
        const values = expr.values.map(get), argument = get(expr.argument);
        return values.includes(argument);
      }
      case 'logical': {const left=get(expr.left);return expr.op==='and'?left&&get(expr.right):left||get(expr.right);}
      case 'binary': {
        const left = get(expr.left);
        if (expr.op === 'and') return left && get(expr.right);
        if (expr.op === 'or') return left || get(expr.right);
        const right = get(expr.right);
        switch (expr.op) {
          case 'add': return left + right;
          case 'subtract': return left - right;
          case 'multiply': return left * right;
          case 'divide': return left / right;
          case 'remainder': return left % right;
          case 'equal': return left === right;
          case 'not-equal': return left !== right;
          case 'less': return left < right;
          case 'less-equal': return left <= right;
          case 'greater': return left > right;
          case 'greater-equal': return left >= right;
          default: throw new Error(expr.op);
        }
      }
      case 'choose': return get(expr.cond) ? get(expr.then) : get(expr.else);
      case 'call': if(table.get(expr.name)?.kind==='closure')throw Error('unlowered closure call boundary');return invoke(expr.name, expr.args.map(get));
      case 'builtin': {
        const [namespace, method] = map.builtins.get(expr.name).javascript.split('.');
        return ({ Math, Number, Buffer })[namespace][method](...expr.args.map(get));
      }
      case 'method': return get(expr.receiver)[map.methods.get(expr.name).javascript](...expr.args.map(get));
      case 'length': return get(expr.receiver).length;
      case 'codepoints': return [...get(expr.receiver)].length;
      case 'sequence-test':return matchesSequence(expr,get(expr.receiver));
      case 'class-test': {
        const receiver=get(expr.receiver);
        const units=expr.unicode?[...receiver].map(character=>character.codePointAt(0)):Array.from({length:receiver.length},(_,index)=>receiver.charCodeAt(index));
        const accepted=unit=>expr.negated!==expr.ranges.some(range=>unit>=range.low && unit<=range.high);
        return expr.anchored?units.length===1 && accepted(units[0]):units.some(accepted);
      }
      case 'table-get':case 'table-has':case 'table-size': {
        if(!tables.has(expr.name)) {
          const value=table.get(expr.name).value;
          tables.set(expr.name,value.kind==='table-set'?new Set(value.entries.map(get)):new Map(value.entries.map(entry=>[get(entry.key),get(entry.value)])));
        }
        const receiver=tables.get(expr.name);
        if(expr.kind==='table-size')return receiver.size;
        const argument=get(expr.argument);
        return expr.kind==='table-has'?receiver.has(argument):receiver.get(argument);
      }
      default: throw new Error(`unhandled IR expression ${expr.kind}`);
    }
  };
  const block = (statements, env) => {
    const local = new Map();
    const scope = new Proxy(env, { get(target, method) {
      if (method === 'has') return (key) => local.has(key) || target.has(key);
      if (method === 'get') return (key) => local.has(key) ? local.get(key) : target.get(key);
      if (method === 'set') return (key, value) => local.has(key) ? local.set(key, value) : target.set(key, value);
      return Reflect.get(target, method);
    } });
    for (const statement of statements) {
      if (statement.kind === 'let') local.set(statement.name, expression(statement.value, scope));
      else if (statement.kind === 'assign') scope.set(statement.name, expression(statement.value, scope));
      else if (statement.kind === 'return') return { returned: true, value: expression(statement.value, scope) };
      else if (statement.kind === 'if') {
        const result = block(expression(statement.cond, scope) ? statement.then : statement.else ?? [], scope);
        if (result.returned) return result;
      } else if (statement.kind === 'while') {
        let iterations = 0;
        while (expression(statement.cond, scope)) {
          if (++iterations > 100000) throw new Error('fixture interpreter exceeded its iteration limit');
          const result = block(statement.body, scope);
          if (result.returned) return result;
        }
      }
    }
    return { returned: false };
  };
  const invoke = (name, args) => {
    const fn = table.get(name);
    if(fn?.kind==='closure') {
      const closure=check(fn,table),captured=new Map(closure.captures.map((capture,index)=>[capture.name,args[index]]));
      return (...values)=>{
        const environment=new Map(captured);closure.params.forEach((param,index)=>environment.set(param.name,values[index]));
        bindEntries(closure,environment);
        const result=block(closure.body,environment);if(!result.returned)throw Error('closure returned no value');return result.value;
      };
    }
    if (!fn || fn.kind !== 'function') throw new Error(`unknown function ${name}`);
    const environment=new Map(fn.params.map((param,index)=>[param.name,param.rest?args.slice(index):args[index]===undefined&&param.default?expression(param.default,new Map()):args[index]]));
    bindEntries(fn,environment);
    const result = block(fn.body, environment);
    if (!result.returned) throw new Error(`function ${name} returned no value`);
    return result.value;
  };
  const bindEntries=(fn,environment)=>{
    for(const param of fn.params)if(param.bindings){const argument=environment.get(param.name),slots=param.bindings;let values;if(slots.length===1)values=slots[0]===null?(([,])=>[])(argument):(([key])=>[key])(argument);else if(slots[0]===null)values=slots[1]===null?(([, ,])=>[])(argument):(([,value])=>[undefined,value])(argument);else values=slots[1]===null?(([key,,])=>[key])(argument):(([key,value])=>[key,value])(argument);slots.forEach((name,index)=>{if(name!==null)environment.set(name,values[index]);});}
  };
  return invoke(functionName, arguments_);
}
