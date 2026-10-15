import { parseLinoStatements, percentDecode, percentEncode } from './lino-serialization.js';

/**
 * The pipeline levels a decorator extends, in pipeline order. Each level
 * shows a decorator its items as records, objects of string fields, and reads
 * the decorated records back (docs/decorators.md lists the fields and what
 * `drop` means at each level).
 */
export const DECORATOR_LEVELS = Object.freeze([
  'importer',
  'grammar-rule',
  'merge-decision',
  'concept-mapping',
  'executor',
  'recovery',
  'cst-to-ast',
  'transformation',
  'emitter',
  'translation-rule',
]);

const ACTIONS = new Set(['set', 'replace', 'drop']);

export class DecoratorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DecoratorError';
  }
}

const isName = (value) => typeof value === 'string' && /^[A-Za-z0-9._-]+$/u.test(value);

/**
 * Checks and freezes one decorator `{ id, level, order, when, actions }`:
 * `when` is `[[field, value]]`, every pair of which a record must have for
 * the decorator to apply, and `actions` is a list of `{ op: 'set', field,
 * value }`, `{ op: 'replace', field, from, to }` (every occurrence of the
 * non-empty text `from`) and `{ op: 'drop' }`, applied in order.
 */
export function decorator({ id, level, order = 0, when = [], actions = [] }) {
  if (!isName(id)) throw new DecoratorError(`invalid decorator id ${JSON.stringify(id)}`);
  if (!DECORATOR_LEVELS.includes(level)) throw new DecoratorError(`decorator ${id} names unknown level ${JSON.stringify(level)}`);
  if (!Number.isSafeInteger(order)) throw new DecoratorError(`decorator ${id} has a non-integer order`);
  const conditions = when.map(([field, value]) => {
    if (!isName(field) || typeof value !== 'string') throw new DecoratorError(`decorator ${id} has an invalid condition`);
    return Object.freeze([field, value]);
  });
  if (actions.length === 0) throw new DecoratorError(`decorator ${id} has no action`);
  const checked = actions.map((action) => {
    if (!ACTIONS.has(action.op)) throw new DecoratorError(`decorator ${id} has unknown action ${JSON.stringify(action.op)}`);
    if (action.op === 'drop') return Object.freeze({ op: 'drop' });
    if (!isName(action.field)) throw new DecoratorError(`decorator ${id} has an action without a field`);
    if (action.op === 'set') {
      if (typeof action.value !== 'string') throw new DecoratorError(`decorator ${id} sets ${action.field} to a non-string`);
      return Object.freeze({ op: 'set', field: action.field, value: action.value });
    }
    if (typeof action.from !== 'string' || action.from === '' || typeof action.to !== 'string') {
      throw new DecoratorError(`decorator ${id} replaces an empty or non-string text in ${action.field}`);
    }
    return Object.freeze({ op: 'replace', field: action.field, from: action.from, to: action.to });
  });
  return Object.freeze({ id, level, order, when: Object.freeze(conditions), actions: Object.freeze(checked) });
}

const compareDecorators = (left, right) => left.order - right.order || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

/**
 * An immutable set of decorators. The decorators of a level compose in a
 * defined order, by `order` and then by id, each one decorating what the one
 * before it produced; `add` and `remove` return new sets, so removing a
 * decorator gives exactly the output of the set without it.
 */
export class DecoratorSet {
  constructor(decorators = []) {
    const checked = decorators.map((entry) => (Object.isFrozen(entry) && entry.actions ? entry : decorator(entry)));
    const ids = new Set();
    for (const { id } of checked) {
      if (ids.has(id)) throw new DecoratorError(`duplicate decorator id ${id}`);
      ids.add(id);
    }
    this.decorators = Object.freeze([...checked].sort(compareDecorators));
    Object.freeze(this);
  }

  static empty() {
    return EMPTY;
  }

  /** Reads the decorators of a Links Notation document (see `toLino`). */
  static fromLino(text) {
    return new DecoratorSet(parseLinoStatements(text).map(readDecorator));
  }

  get size() {
    return this.decorators.length;
  }

  ids() {
    return this.decorators.map(({ id }) => id);
  }

  add(...decorators) {
    return new DecoratorSet([...this.decorators, ...decorators]);
  }

  remove(id) {
    if (!this.decorators.some((entry) => entry.id === id)) throw new DecoratorError(`no decorator ${id} to remove`);
    return new DecoratorSet(this.decorators.filter((entry) => entry.id !== id));
  }

  /** The decorators of `level`, in the order they compose. */
  forLevel(level) {
    if (!DECORATOR_LEVELS.includes(level)) throw new DecoratorError(`unknown level ${JSON.stringify(level)}`);
    return this.decorators.filter((entry) => entry.level === level);
  }

  has(level) {
    return this.decorators.some((entry) => entry.level === level);
  }

  /**
   * The record the decorators of `level` make of `record`, or null when one
   * of them drops it. The input record is never changed.
   */
  decorate(level, record) {
    let current = { ...record };
    for (const entry of this.forLevel(level)) {
      if (!entry.when.every(([field, value]) => (current[field] ?? '') === value)) continue;
      for (const action of entry.actions) {
        if (action.op === 'drop') return null;
        if (action.op === 'set') current[action.field] = action.value;
        else current[action.field] = (current[action.field] ?? '').split(action.from).join(action.to);
      }
    }
    return current;
  }

  /** Decorates every record of `records`, leaving out the dropped ones. */
  decorateAll(level, records) {
    return records.map((record) => this.decorate(level, record)).filter((record) => record !== null);
  }

  /** The canonical Links Notation of the set, one decorator per line. */
  toLino() {
    return this.decorators.map(renderDecorator).join('\n') + (this.decorators.length > 0 ? '\n' : '');
  }
}

const EMPTY = new DecoratorSet();

// Values are percent-encoded as grammar links texts are, so any text survives.
const quote = percentEncode;

function unquote(text, id) {
  try {
    return percentDecode(text);
  } catch {
    throw new DecoratorError(`decorator ${id} has a malformed percent-encoded value ${text}`);
  }
}

function renderDecorator({ id, level, order, when, actions }) {
  const parts = [`decorator ${id}`, `(level ${level})`, `(order ${order})`];
  if (when.length > 0) parts.push(`(when ${when.map(([field, value]) => `(${field} ${quote(value)})`).join(' ')})`);
  for (const action of actions) {
    if (action.op === 'drop') parts.push('(drop)');
    else if (action.op === 'set') parts.push(`(set ${action.field} ${quote(action.value)})`);
    else parts.push(`(replace ${action.field} ${quote(action.from)} ${quote(action.to)})`);
  }
  return `(${parts.join(' ')})`;
}

const words = (link) => (link.values ?? []).map((value) => {
  if ((value.values ?? []).length > 0) throw new DecoratorError('a decorator field holds a nested link where a word belongs');
  return value.id ?? '';
});

function readDecorator(statement) {
  const [head, name, ...rest] = statement.values ?? [];
  if (statement.id || head?.id !== 'decorator' || (head.values ?? []).length > 0 || !name || (name.values ?? []).length > 0) {
    throw new DecoratorError('a decorator statement must read (decorator <id> (level <level>) …)');
  }
  const spec = { id: name.id, actions: [], when: [] };
  for (const part of rest) {
    const [keyword, ...args] = part.values ?? [];
    switch (keyword?.id) {
      case 'level': [spec.level] = words({ values: args }); break;
      case 'order': {
        const [text] = words({ values: args });
        if (!/^-?\d+$/.test(text ?? '')) throw new DecoratorError(`decorator ${spec.id} has a non-integer order`);
        spec.order = Number(text);
        break;
      }
      case 'when':
        for (const pair of args) {
          const [field, value, extra] = words(pair);
          if (field === undefined || value === undefined || extra !== undefined) throw new DecoratorError(`decorator ${spec.id} has an invalid condition`);
          spec.when.push([field, unquote(value, spec.id)]);
        }
        break;
      case 'set': {
        const [field, value] = words({ values: args });
        spec.actions.push({ op: 'set', field, value: value === undefined ? value : unquote(value, spec.id) });
        break;
      }
      case 'replace': {
        const [field, from, to] = words({ values: args });
        spec.actions.push({ op: 'replace', field, from: from === undefined ? from : unquote(from, spec.id), to: to === undefined ? to : unquote(to, spec.id) });
        break;
      }
      case 'drop': spec.actions.push({ op: 'drop' }); break;
      default: throw new DecoratorError(`decorator ${spec.id} has an unknown part ${JSON.stringify(keyword?.id ?? null)}`);
    }
  }
  return decorator(spec);
}

/** The set `decorators` names: a DecoratorSet, an array of decorators or nothing. */
export function decoratorSet(decorators) {
  if (decorators === undefined || decorators === null) return EMPTY;
  if (decorators instanceof DecoratorSet) return decorators;
  if (Array.isArray(decorators)) return new DecoratorSet(decorators);
  throw new DecoratorError('decorators must be a DecoratorSet or an array of decorators');
}
