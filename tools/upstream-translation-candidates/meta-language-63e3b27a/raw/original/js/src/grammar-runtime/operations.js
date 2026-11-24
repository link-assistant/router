// The operation language of external scanners, semantic actions and
// predicates (docs/grammar/feature-union.md#operation-language): a small,
// deterministic statement language over the parser state, interpreted here.
// The forms are declared in grammar-feature-forms.js; the operations are data
// in the grammar, never host callbacks, `eval` or source text.

/** The single failure signal of the operation language: the match it guards fails. */
export class OperationFailed {}

const FAILED = new OperationFailed();

/** Fails the running operation. */
export function failOperation() {
  throw FAILED;
}

// The parser state threaded through every match: the mode stack, the named
// integer or text stacks and the named variables. A state is immutable and
// carries a canonical `key`, so equal states are interchangeable in memo keys.
function canonicalKey(modes, stacks, variables) {
  return JSON.stringify([modes, stacks, variables]);
}

/** Builds an immutable state from its mode stack and its `[name, value]` lists. */
export function freezeState(modes, stacks, variables) {
  const sortedStacks = Object.entries(stacks)
    .filter(([, values]) => values.length > 0)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  const sortedVariables = Object.entries(variables)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return Object.freeze({
    modes: Object.freeze([...modes]),
    stacks: Object.freeze(Object.fromEntries(sortedStacks.map(([name, values]) => [name, Object.freeze([...values])]))),
    variables: Object.freeze(Object.fromEntries(sortedVariables)),
    key: canonicalKey(modes, sortedStacks, sortedVariables),
  });
}

/** The state every parse starts in: the `default` mode, no stacks and no variables. */
export const INITIAL_STATE = freezeState(['default'], {}, {});

/** A mutable working copy of `state` for one run of operations. */
export function workingState(state) {
  return {
    modes: [...state.modes],
    stacks: Object.fromEntries(Object.entries(state.stacks).map(([name, values]) => [name, [...values]])),
    variables: { ...state.variables },
  };
}

/** Freezes a working copy back into a state. */
export function settleState(working) {
  return freezeState(working.modes, working.stacks, working.variables);
}

function integer(value) {
  if (typeof value !== 'number') failOperation();
  return value;
}

function checked(value) {
  if (!Number.isSafeInteger(value)) failOperation();
  return value;
}

/**
 * Evaluates a value operation. `machine` supplies `state` (a working copy),
 * `step()`, and for the values that read the input or the node, `column()`,
 * `matched()`, `attribute(field, name)`, `attributes(field, name)` and
 * `fieldText(field)`.
 */
export function evaluateValue(value, machine) {
  machine.step();
  const { state } = machine;
  switch (value.operation) {
    case 'integer': return value.value;
    case 'text': return value.value;
    case 'variable': return state.variables[value.name] ?? 0;
    case 'top': {
      const stack = state.stacks[value.stack] ?? [];
      return stack.length > 0 ? stack[stack.length - 1] : 0;
    }
    case 'depth': return (state.stacks[value.stack] ?? []).length;
    case 'column': return machine.column();
    case 'matched': return machine.matched();
    case 'mode': return state.modes[state.modes.length - 1];
    case 'attribute': return machine.attribute(value.field, value.attribute);
    case 'sumOf':
      return machine.attributes(value.field, value.attribute).reduce((sum, item) => checked(sum + integer(item)), 0);
    case 'fieldText': return machine.fieldText(value.field);
    case 'uppercase': {
      const text = evaluateValue(value.value, machine);
      if (typeof text !== 'string') failOperation();
      // Wide-character scanner case conversion maps one scalar to one scalar.
      // Keep a character whose full uppercase spelling would expand it.
      return [...text].map((character) => {
        const upper = character.toUpperCase();
        return [...upper].length === 1 ? upper : character;
      }).join('');
    }
    case 'length': {
      const text = evaluateValue(value.value, machine);
      if (typeof text !== 'string') failOperation();
      return [...text].length;
    }
    case 'number': {
      const text = evaluateValue(value.value, machine);
      if (typeof text === 'number') return text;
      if (!/^-?[0-9]{1,15}$/u.test(text)) failOperation();
      return Number(text);
    }
    case 'add': return checked(integer(evaluateValue(value.left, machine)) + integer(evaluateValue(value.right, machine)));
    case 'subtract':
      return checked(integer(evaluateValue(value.left, machine)) - integer(evaluateValue(value.right, machine)));
    case 'multiply':
      return checked(integer(evaluateValue(value.left, machine)) * integer(evaluateValue(value.right, machine)));
    default: throw new TypeError(`unknown value operation ${value.operation}`);
  }
}

/**
 * Evaluates a condition operation to a boolean; `machine` adds `requested`,
 * `expected(expression)`, `lookahead(expression)` and `atEnd()`.
 */
export function evaluateCondition(condition, machine) {
  machine.step();
  switch (condition.operation) {
    case 'valid': return machine.requested === condition.token;
    case 'expected': return machine.expected(condition.item);
    case 'next': return machine.lookahead(condition.item);
    case 'atEnd': return machine.atEnd();
    case 'equal': {
      const left = evaluateValue(condition.left, machine);
      const right = evaluateValue(condition.right, machine);
      return typeof left === typeof right && left === right;
    }
    case 'less': return integer(evaluateValue(condition.left, machine)) < integer(evaluateValue(condition.right, machine));
    case 'greater':
      return integer(evaluateValue(condition.left, machine)) > integer(evaluateValue(condition.right, machine));
    case 'all': return condition.conditions.every((item) => evaluateCondition(item, machine));
    case 'some': return condition.conditions.some((item) => evaluateCondition(item, machine));
    case 'not': return !evaluateCondition(condition.condition, machine);
    default: throw new TypeError(`unknown condition operation ${condition.operation}`);
  }
}

/**
 * Runs a statement list. Returns `{ emit: TOKEN }` when an `emit` ends the
 * run and `null` when the list runs out; throws `OperationFailed` on `fail`
 * or on any operation that cannot complete. `machine` adds, for scanners,
 * `advance()`, `consume(expression)`, `skip(expression)` and `mark()`, and for
 * actions, `setAttribute(name, value)` and `buildNode(kind)`.
 */
export function runStatements(statements, machine) {
  for (const statement of statements) {
    machine.step();
    const { state } = machine;
    switch (statement.operation) {
      case 'advance': machine.advance(); break;
      case 'consume': machine.consume(statement.item); break;
      case 'skip': machine.skip(statement.item); break;
      case 'mark': machine.mark(); break;
      case 'emit': return { emit: statement.token };
      case 'fail': failOperation(); break;
      case 'if': {
        const branch = evaluateCondition(statement.condition, machine) ? statement.consequent : statement.alternative;
        const signal = runStatements(branch ?? [], machine);
        if (signal) return signal;
        break;
      }
      case 'while':
        while (evaluateCondition(statement.condition, machine)) {
          const signal = runStatements(statement.body, machine);
          if (signal) return signal;
        }
        break;
      case 'push': {
        const value = evaluateValue(statement.value, machine);
        (state.stacks[statement.stack] ??= []).push(value);
        break;
      }
      case 'pop': {
        const stack = state.stacks[statement.stack] ?? [];
        if (stack.length === 0) failOperation();
        stack.pop();
        break;
      }
      case 'set': state.variables[statement.variable] = evaluateValue(statement.value, machine); break;
      case 'pushMode': state.modes.push(statement.mode); break;
      case 'popMode':
        if (state.modes.length <= 1) failOperation();
        state.modes.pop();
        break;
      case 'setMode': state.modes[state.modes.length - 1] = statement.mode; break;
      case 'setAttribute': machine.setAttribute(statement.attribute, evaluateValue(statement.value, machine)); break;
      case 'buildNode': machine.buildNode(statement.kind); break;
      default: throw new TypeError(`unknown statement operation ${statement.operation}`);
    }
  }
  return null;
}

/** The operations each context may use; load.js rejects any other. */
export const OPERATION_CONTEXTS = Object.freeze({
  scanner: new Set([
    'advance', 'consume', 'skip', 'mark', 'emit', 'fail', 'if', 'while', 'push', 'pop', 'set', 'pushMode', 'popMode',
    'setMode', 'valid', 'expected', 'next', 'atEnd', 'equal', 'less', 'greater', 'all', 'some', 'not', 'integer', 'text', 'variable',
    'top', 'depth', 'column', 'matched', 'mode', 'length', 'uppercase', 'number', 'add', 'subtract', 'multiply',
  ]),
  action: new Set([
    'fail', 'if', 'while', 'push', 'pop', 'set', 'pushMode', 'popMode', 'setMode', 'setAttribute', 'buildNode', 'atEnd',
    'equal', 'less', 'greater', 'all', 'some', 'not', 'integer', 'text', 'variable', 'top', 'depth', 'column', 'matched',
    'mode', 'attribute', 'sumOf', 'fieldText', 'length', 'uppercase', 'number', 'add', 'subtract', 'multiply',
  ]),
  predicate: new Set([
    'atEnd', 'equal', 'less', 'greater', 'all', 'some', 'not', 'integer', 'text', 'variable', 'top', 'depth', 'column',
    'matched', 'mode', 'length', 'uppercase', 'number', 'add', 'subtract', 'multiply',
  ]),
});
