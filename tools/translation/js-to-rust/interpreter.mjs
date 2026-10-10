// Independent evaluator for the semantic IR. Used alongside authored fixtures
// and execution of the authoritative source; neither emitter is consulted.
import { constructMap } from './vendor/constructs.mjs';

export function evaluate(program, functionName, arguments_) {
  const table = new Map(program.map((item) => [item.name, item]));
  const map = constructMap();
  const expression = (expr, env) => {
    const get = (value) => expression(value, env);
    switch (expr.kind) {
      case 'number': return Number(expr.text);
      case 'string': case 'boolean': return expr.value;
      case 'variable': return env.has(expr.name) ? env.get(expr.name) : get(table.get(expr.name).value);
      case 'unary': return expr.op === 'not' ? !get(expr.operand) : -get(expr.operand);
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
      case 'call': return invoke(expr.name, expr.args.map(get));
      case 'builtin': {
        const [namespace, method] = map.builtins.get(expr.name).javascript.split('.');
        return ({ Math, Number })[namespace][method](...expr.args.map(get));
      }
      case 'method': return get(expr.receiver)[map.methods.get(expr.name).javascript](...expr.args.map(get));
      case 'length': return get(expr.receiver).length;
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
    if (!fn || fn.kind !== 'function') throw new Error(`unknown function ${name}`);
    const result = block(fn.body, new Map(fn.params.map((param, index) => [param.name, args[index]])));
    if (!result.returned) throw new Error(`function ${name} returned no value`);
    return result.value;
  };
  return invoke(functionName, arguments_);
}
