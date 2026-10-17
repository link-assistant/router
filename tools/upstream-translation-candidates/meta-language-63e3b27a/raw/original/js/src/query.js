import { LinkId, LinkType } from './primitives.js';

// Structural S-expression queries over a link network.
//
// Mirrors `rust/src/query.rs`: a tree-sitter-query-like pattern with nested
// node patterns, `field:` constraints, `!field` negations, `.` anchors,
// `[...]` alternations, `?`/`*`/`+` quantifiers, `@capture` bindings and
// `(#predicate ...)` clauses. Matching backtracks over structural children
// and yields every capture combination in the same order as Rust.

export class QueryParseError extends SyntaxError {
  constructor(message) {
    super(message);
    this.name = 'QueryParseError';
  }
}

export class LinkQuery {
  constructor({
    linkType = undefined,
    term = undefined,
    language = undefined,
    named = undefined,
    sexpression = undefined,
  } = {}) {
    this.linkType = linkType;
    this.term = term;
    this.language = language;
    this.named = named;
    const parsed = sexpression === undefined ? undefined : parseSexpressionSpec(sexpression);
    this.sexpression = parsed?.sexpression;
    Object.defineProperty(this, 'pattern', { value: parsed?.pattern, enumerable: false });
    Object.defineProperty(this, 'predicates', { value: parsed?.predicates ?? [], enumerable: false });
  }

  static byType(linkType) {
    return new LinkQuery({ linkType });
  }

  static byTerm(term) {
    return new LinkQuery({ term });
  }

  /** Parses a tree-sitter-query-like S-expression query. */
  static fromSexpression(source) {
    return new LinkQuery({ sexpression: String(source) });
  }

  withLinkType(linkType) {
    return new LinkQuery({ ...this, linkType });
  }

  withTerm(term) {
    return new LinkQuery({ ...this, term });
  }

  withLanguage(language) {
    return new LinkQuery({ ...this, language });
  }

  withNamed(named = true) {
    return new LinkQuery({ ...this, named });
  }

  matchesMetadata(metadata) {
    if (this.linkType !== undefined && metadata.linkType !== this.linkType) {
      return false;
    }
    if (this.term !== undefined && metadata.term !== this.term) {
      return false;
    }
    if (this.language !== undefined && metadata.language !== this.language) {
      return false;
    }
    if (this.named !== undefined && metadata.named !== this.named) {
      return false;
    }
    // The root kind is checked again by the pattern; filtering here keeps
    // `queryLinks` consistent with `find` and skips hopeless roots early.
    if (this.pattern && !this.pattern.root.kind.wildcard && metadata.term !== this.pattern.root.kind.name) {
      return false;
    }
    return true;
  }

  /**
   * Returns every capture set the pattern binds at `link`, filtered by the
   * host's predicate verdicts. Without a pattern the query yields one empty
   * capture set, as in Rust.
   */
  matchesInNetwork(network, link, predicateHost = rejectPredicateHost, index = new QueryIndex(network)) {
    if (!this.matchesMetadata(link.metadata())) {
      return [];
    }
    const captureSets = this.pattern
      ? matchRoot(this.pattern, index, link.id())
      : [new QueryCaptures()];
    return captureSets.filter((captures) => (
      this.predicates.every((predicate) => predicateHost(predicate, captures, network))
    ));
  }
}

/** Ordered, multi-valued capture bindings; `get` returns the first binding. */
export class QueryCaptures {
  constructor(values = []) {
    this.values = values.map((value) => (
      value instanceof QueryCapture
        ? value
        : Array.isArray(value)
          ? new QueryCapture(value[0], value[1])
          : new QueryCapture(value.name, value.linkId)
    ));
  }

  /** Returns a copy with one more binding appended. */
  withCapture(name, linkId) {
    return new QueryCaptures([...this.values, new QueryCapture(name, linkId)]);
  }

  /** Appends a binding in place. */
  set(name, linkId) {
    this.values.push(new QueryCapture(name, linkId));
  }

  first(name) {
    return this.values.find((capture) => capture.name === name)?.linkId;
  }

  get(name) {
    return this.first(name);
  }

  has(name) {
    return this.values.some((capture) => capture.name === name);
  }

  /** Every link bound to `name`, in match order. */
  all(name) {
    return this.values.filter((capture) => capture.name === name).map((capture) => capture.linkId);
  }

  get size() {
    return this.values.length;
  }

  iter() {
    return this.values[Symbol.iterator]();
  }

  /** Iterates `[name, linkId]` pairs in match order. */
  *[Symbol.iterator]() {
    for (const capture of this.values) {
      yield [capture.name, capture.linkId];
    }
  }
}

export class QueryCapture {
  constructor(name, linkId) {
    this.name = name;
    this.linkId = linkId;
  }
}

export class QueryMatch {
  constructor(linkId, captures = new QueryCaptures()) {
    this.linkId = linkId;
    this.captures = captures;
  }
}

export function queryByConceptTerm(term) {
  return LinkQuery.byType(LinkType.Concept).withTerm(term);
}

/** Predicate host that rejects every predicate, like Rust's `RejectPredicateHost`. */
export function rejectPredicateHost() {
  return false;
}

/**
 * Predicate host for `#eq?`/`#not-eq?` over captured source text, like Rust's
 * `SourceTextPredicateHost`. `capturedText(network, linkId)` supplies the text.
 */
export function sourceTextPredicateHost(capturedText) {
  return (predicate, captures, network) => {
    const [captureArgument, literalArgument, ...rest] = predicate.arguments;
    if (rest.length > 0 || captureArgument?.capture === undefined || literalArgument?.literal === undefined) {
      return false;
    }
    const captured = captures.first(captureArgument.capture);
    if (captured === undefined) {
      return false;
    }
    const text = capturedText(network, captured);
    if (text === undefined) {
      return false;
    }
    switch (predicate.name) {
      case 'eq?':
        return text === literalArgument.literal;
      case 'not-eq?':
        return text !== literalArgument.literal;
      default:
        return false;
    }
  };
}

/**
 * Structural child and field lookups for one network state. `find` builds
 * one per call so matching does not rescan every link for every node.
 */
export class QueryIndex {
  constructor(network) {
    this.network = network;
    this._children = undefined;
    this._fields = undefined;
  }

  link(id) {
    return this.network.link(id);
  }

  structuralChildren(parent) {
    this._build();
    return this._children.get(idKey(parent)) ?? [];
  }

  fieldTargets(parent, label) {
    this._build();
    const targets = [];
    for (const { labelId, child } of this._fields.get(idKey(parent)) ?? []) {
      if (this.network.link(labelId)?.metadata().term === label) {
        targets.push(child);
      }
    }
    return targets;
  }

  _build() {
    if (this._children) {
      return;
    }
    this._children = new Map();
    this._fields = new Map();
    const links = [...this.network.links()];
    // The JavaScript parsers store a tree top-down: a Syntax link references
    // its children, tokens included. Rust stores it bottom-up: every child
    // references its parent first. Both orders hold the same children.
    const topDown = links.some((link) => link.metadata().linkType === LinkType.Syntax
      && link.references().some((reference) => (
        this.network.link(reference)?.metadata().linkType === LinkType.SourceToken
      )));
    for (const link of links) {
      const references = link.references();
      if (references.length === 0) {
        continue;
      }
      const linkType = link.metadata().linkType;
      if (linkType === LinkType.Field) {
        if (references.length === 3) {
          pushTo(this._fields, idKey(references[0]), { labelId: references[1], child: references[2] });
        }
      } else if (topDown) {
        if (linkType === LinkType.Syntax) {
          for (const reference of references) {
            const type = this.network.link(reference)?.metadata().linkType;
            if (type !== LinkType.Field && type !== LinkType.Trivia) {
              pushTo(this._children, idKey(link.id()), reference);
            }
          }
        }
      } else if (linkType !== LinkType.Trivia) {
        pushTo(this._children, idKey(references[0]), link.id());
      }
    }
  }
}

function pushTo(map, key, value) {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

function idKey(id) {
  return LinkId.from(id).asU64();
}

function parseSexpressionSpec(spec) {
  let source;
  if (typeof spec === 'string') {
    source = spec;
  } else if (typeof spec?.source === 'string') {
    ({ source } = spec);
  } else if (spec && typeof spec === 'object') {
    source = legacySexpressionSource(spec);
  } else {
    throw new QueryParseError('S-expression query must be a string');
  }
  const { pattern, predicates } = new QueryParser(tokenize(source)).parse();
  return {
    pattern,
    predicates,
    sexpression: {
      source,
      nodeType: pattern.root.kind.wildcard ? '_' : pattern.root.kind.name,
      capture: pattern.capture,
      predicates: predicates
        .filter(({ arguments: args }) => (
          args.length === 2 && args[0].capture !== undefined && args[1].literal !== undefined
        ))
        .map(({ name, arguments: args }) => ({
          operator: name,
          capture: args[0].capture,
          value: args[1].literal,
        })),
    },
  };
}

/** Rebuilds query text from the pre-pattern `{ nodeType, capture, predicates }` shape. */
function legacySexpressionSource({ nodeType, capture, predicates = [] }) {
  const clauses = predicates
    .map(({ operator, capture: name, value }) => ` (#${operator} @${name} ${quoteLiteral(value)})`)
    .join('');
  return `(${nodeType})${capture === undefined ? '' : ` @${capture}`}${clauses}`;
}

function quoteLiteral(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function matchRoot(pattern, index, linkId) {
  return matchNode(pattern.root, index, linkId, new QueryCaptures()).map((captures) => (
    pattern.capture === undefined ? captures : captures.withCapture(pattern.capture, linkId)
  ));
}

function matchNode(node, index, linkId, captures) {
  const link = index.link(linkId);
  if (!link) {
    return [];
  }
  if (!node.kind.wildcard && link.metadata().term !== node.kind.name) {
    return [];
  }
  for (const child of node.children) {
    if (child.type === 'negated-field' && index.fieldTargets(linkId, child.label).length > 0) {
      return [];
    }
  }
  const context = {
    index,
    parent: linkId,
    children: index.structuralChildren(linkId),
  };
  return matchChildPatterns(context, node.children, 0, 0, false, captures)
    .map(([, matched]) => matched);
}

function matchChildPatterns(context, patterns, patternIndex, childIndex, anchored, captures) {
  if (patternIndex >= patterns.length) {
    return [[childIndex, captures]];
  }
  const pattern = patterns[patternIndex];
  switch (pattern.type) {
    case 'anchor': {
      const rest = patterns.slice(patternIndex + 1);
      if (rest.every((candidate) => candidate.type === 'negated-field')
        && childIndex !== context.children.length) {
        return [];
      }
      return matchChildPatterns(context, patterns, patternIndex + 1, childIndex, true, captures);
    }
    case 'negated-field':
      return matchChildPatterns(context, patterns, patternIndex + 1, childIndex, anchored, captures);
    default:
      return matchQuantifiedExpression(context, pattern, patterns, patternIndex + 1, childIndex, anchored, captures);
  }
}

function matchQuantifiedExpression(context, expression, patterns, nextPattern, childIndex, anchored, captures) {
  switch (expression.quantifier) {
    case '?':
      return [
        ...matchChildPatterns(context, patterns, nextPattern, childIndex, anchored, captures),
        ...matchOneThenContinue(context, expression, patterns, nextPattern, childIndex, anchored, captures),
      ];
    case '*':
      return [
        ...matchChildPatterns(context, patterns, nextPattern, childIndex, anchored, captures),
        ...matchRepeatedExpression(context, expression, patterns, nextPattern, childIndex, anchored, captures),
      ];
    case '+':
      return matchRepeatedExpression(context, expression, patterns, nextPattern, childIndex, anchored, captures);
    default:
      return matchOneThenContinue(context, expression, patterns, nextPattern, childIndex, anchored, captures);
  }
}

function matchRepeatedExpression(context, expression, patterns, nextPattern, childIndex, anchored, captures) {
  const results = [];
  for (const [nextIndex, nextCaptures] of matchExpressionAtPositions(context, expression, childIndex, anchored, captures)) {
    results.push(...matchChildPatterns(context, patterns, nextPattern, nextIndex, false, nextCaptures));
    results.push(...matchRepeatedExpression(context, expression, patterns, nextPattern, nextIndex, true, nextCaptures));
  }
  return results;
}

function matchOneThenContinue(context, expression, patterns, nextPattern, childIndex, anchored, captures) {
  const results = [];
  for (const [nextIndex, nextCaptures] of matchExpressionAtPositions(context, expression, childIndex, anchored, captures)) {
    results.push(...matchChildPatterns(context, patterns, nextPattern, nextIndex, false, nextCaptures));
  }
  return results;
}

function matchExpressionAtPositions(context, expression, childIndex, anchored, captures) {
  const { children } = context;
  const last = anchored ? Math.min(childIndex + 1, children.length) : children.length;
  const results = [];
  for (let position = childIndex; position < last; position += 1) {
    for (const matched of matchExpression(context.index, context.parent, children[position], expression, captures)) {
      results.push([position + 1, matched]);
    }
  }
  return results;
}

function matchExpression(index, parent, child, expression, captures) {
  if (expression.field !== undefined) {
    const key = idKey(child);
    if (!index.fieldTargets(parent, expression.field).some((target) => idKey(target) === key)) {
      return [];
    }
  }
  const alternatives = expression.alternatives ?? [expression.node];
  const matches = [];
  for (const alternative of alternatives) {
    matches.push(...matchNode(alternative, index, child, captures));
  }
  return expression.capture === undefined
    ? matches
    : matches.map((matched) => matched.withCapture(expression.capture, child));
}

class QueryParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  parse() {
    let pattern;
    const predicates = [];
    while (!this.isAtEnd()) {
      if (this.nextIsPredicate()) {
        predicates.push(this.parsePredicate());
      } else if (pattern === undefined) {
        const root = this.parseNodePattern();
        pattern = { root, capture: this.parseOptionalCapture() };
      } else {
        throw new QueryParseError('query may contain one root pattern followed by predicates');
      }
    }
    if (pattern === undefined) {
      throw new QueryParseError('query is missing a root pattern');
    }
    return { pattern, predicates };
  }

  nextIsPredicate() {
    const next = this.peekNext();
    return this.peek()?.type === '(' && next?.type === 'ident' && next.value.startsWith('#');
  }

  parsePredicate() {
    this.expect('(');
    const nameToken = this.advance();
    if (nameToken?.type !== 'ident' || !nameToken.value.startsWith('#')) {
      throw new QueryParseError('predicate must start with #name');
    }
    const name = nameToken.value.replace(/^#+/, '');
    const args = [];
    while (this.peek()?.type !== ')') {
      const token = this.advance();
      if (token === undefined) {
        throw new QueryParseError('unterminated predicate');
      }
      if (token.type === 'capture') {
        args.push({ capture: token.value });
      } else if (token.type === 'literal' || token.type === 'ident') {
        args.push({ literal: token.value });
      } else {
        throw new QueryParseError('invalid predicate argument');
      }
    }
    this.expect(')');
    return { name, arguments: args };
  }

  parseNodePattern() {
    this.expect('(');
    const kindToken = this.advance();
    if (kindToken?.type !== 'ident') {
      throw new QueryParseError('node pattern is missing a kind');
    }
    const kind = kindToken.value === '_' ? { wildcard: true } : { wildcard: false, name: kindToken.value };
    const children = [];
    while (this.peek()?.type !== ')') {
      if (this.isAtEnd()) {
        throw new QueryParseError('unterminated node pattern');
      }
      children.push(this.parseChildPattern());
    }
    this.expect(')');
    return { kind, children };
  }

  parseChildPattern() {
    const next = this.peek();
    if (next?.type === '.') {
      this.advance();
      return { type: 'anchor' };
    }
    if (next?.type === '!') {
      this.advance();
      const label = this.advance();
      if (label?.type !== 'ident') {
        throw new QueryParseError('negated field is missing a label');
      }
      return { type: 'negated-field', label: label.value };
    }
    const field = this.parseOptionalField();
    const expression = this.peek()?.type === '['
      ? { alternatives: this.parseAlternation() }
      : { node: this.parseNodePattern() };
    let capture = this.parseOptionalCapture();
    let quantifier = this.parseOptionalQuantifier();
    if (capture === undefined) {
      capture = this.parseOptionalCapture();
    }
    if (quantifier === undefined) {
      quantifier = this.parseOptionalQuantifier();
    }
    return { type: 'pattern', field, ...expression, capture, quantifier };
  }

  parseAlternation() {
    this.expect('[');
    const alternatives = [];
    while (this.peek()?.type !== ']') {
      if (this.isAtEnd()) {
        throw new QueryParseError('unterminated alternation');
      }
      alternatives.push(this.parseNodePattern());
    }
    this.expect(']');
    if (alternatives.length === 0) {
      throw new QueryParseError('alternation must contain patterns');
    }
    return alternatives;
  }

  parseOptionalField() {
    if (this.peek()?.type !== 'ident' || this.peekNext()?.type !== ':') {
      return undefined;
    }
    const label = this.advance().value;
    this.expect(':');
    return label;
  }

  parseOptionalCapture() {
    if (this.peek()?.type === 'capture') {
      return this.advance().value;
    }
    return undefined;
  }

  parseOptionalQuantifier() {
    const type = this.peek()?.type;
    if (type === '?' || type === '*' || type === '+') {
      this.advance();
      return type;
    }
    return undefined;
  }

  expect(type) {
    const actual = this.advance();
    if (actual === undefined) {
      throw new QueryParseError('unexpected end of query');
    }
    if (actual.type !== type) {
      throw new QueryParseError('unexpected token in query');
    }
  }

  advance() {
    const token = this.tokens[this.position];
    if (token !== undefined) {
      this.position += 1;
    }
    return token;
  }

  peek() {
    return this.tokens[this.position];
  }

  peekNext() {
    return this.tokens[this.position + 1];
  }

  isAtEnd() {
    return this.position >= this.tokens.length;
  }
}

const SINGLE_TOKENS = new Set(['(', ')', '[', ']', ':', '.', '!', '?', '*', '+']);
const ATOM_BREAKS = new Set(['(', ')', '[', ']', ':', '!', '@', '"']);

function tokenize(source) {
  const characters = [...source];
  const tokens = [];
  let index = 0;
  const readAtom = () => {
    let atom = '';
    while (index < characters.length) {
      const character = characters[index];
      if (/\s/u.test(character) || ATOM_BREAKS.has(character)) {
        break;
      }
      atom += character;
      index += 1;
    }
    return atom;
  };
  while (index < characters.length) {
    const character = characters[index];
    if (/\s/u.test(character)) {
      index += 1;
    } else if (SINGLE_TOKENS.has(character)) {
      tokens.push({ type: character });
      index += 1;
    } else if (character === '@') {
      index += 1;
      tokens.push({ type: 'capture', value: readAtom() });
    } else if (character === '"') {
      index += 1;
      let literal = '';
      let closed = false;
      while (index < characters.length) {
        const next = characters[index];
        index += 1;
        if (next === '"') {
          closed = true;
          break;
        }
        if (next === '\\') {
          if (index >= characters.length) {
            throw new QueryParseError('unterminated string escape');
          }
          const escaped = characters[index];
          index += 1;
          literal += escaped === 'n' ? '\n' : escaped === 'r' ? '\r' : escaped === 't' ? '\t' : escaped;
        } else {
          literal += next;
        }
      }
      if (!closed) {
        throw new QueryParseError('unterminated string literal');
      }
      tokens.push({ type: 'literal', value: literal });
    } else {
      tokens.push({ type: 'ident', value: readAtom() });
    }
  }
  return tokens;
}
