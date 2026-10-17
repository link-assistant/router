import { LinkType } from './primitives.js';
import { LinkQuery } from './query.js';
import {
  LinkRule,
  LinkRuleCaptures,
  LinkRuleMatch,
  LinkRuleParseError,
} from './query-algebra.js';

function normalizeCaptureName(name) {
  return String(name).replace(/^@+/, '');
}
// ---------------------------------------------------------------------------
// Text patterns
// ---------------------------------------------------------------------------

const PartKind = Object.freeze({ Literal: 'Literal', Placeholder: 'Placeholder' });

export class TextPattern {
  constructor(parts) {
    this.parts = parts;
  }

  static parse(source) {
    const parts = [];
    let rest = source;
    let start = rest.indexOf('{{');
    while (start !== -1) {
      if (start > 0) {
        parts.push({ kind: PartKind.Literal, value: rest.slice(0, start) });
      }
      const afterOpen = rest.slice(start + 2);
      const end = afterOpen.indexOf('}}');
      if (end === -1) {
        throw new LinkRuleParseError('unterminated text placeholder');
      }
      const name = afterOpen.slice(0, end).trim();
      if (name.length === 0) {
        throw new LinkRuleParseError('text placeholder is empty');
      }
      parts.push({ kind: PartKind.Placeholder, value: normalizeCaptureName(name) });
      rest = afterOpen.slice(end + 2);
      start = rest.indexOf('{{');
    }
    if (rest.length > 0) {
      parts.push({ kind: PartKind.Literal, value: rest });
    }
    if (parts.length === 0) {
      parts.push({ kind: PartKind.Literal, value: source });
    }
    return new TextPattern(parts);
  }

  matches(network) {
    // The JS lossless parser emits lossless source-token links (one per character)
    // rather than a `Document` hierarchy. Treat the ordered source
    // tokens of the whole network as a single document.
    const tokens = sourceTokens(network);
    if (tokens.length === 0) {
      return [];
    }
    const text = tokens.map((token) => token.term).join('');
    const captures = this.matchText(text, tokens);
    if (!captures) {
      return [];
    }
    return [new LinkRuleMatch(tokens[0].linkId, captures)];
  }

  matchText(text, tokens) {
    let captures = new LinkRuleCaptures();
    let position = 0;
    for (let index = 0; index < this.parts.length; index += 1) {
      const part = this.parts[index];
      if (part.kind === PartKind.Literal) {
        const remaining = text.slice(position);
        if (!remaining.startsWith(part.value)) {
          return undefined;
        }
        position += part.value.length;
      } else {
        const captureStart = position;
        const literal = nextLiteral(this.parts.slice(index + 1));
        let captureEnd;
        if (literal !== undefined) {
          const offset = text.slice(position).indexOf(literal);
          if (offset === -1) {
            return undefined;
          }
          captureEnd = position + offset;
        } else {
          captureEnd = text.length;
        }
        const capturedText = text.slice(captureStart, captureEnd);
        const linkIds = tokens
          .filter((token) => token.start >= captureStart && token.end <= captureEnd)
          .map((token) => token.linkId);
        captures = captures.withText(part.value, capturedText, linkIds);
        position = captureEnd;
      }
    }
    return position === text.length ? captures : undefined;
  }
}

function nextLiteral(parts) {
  for (const part of parts) {
    if (part.kind === PartKind.Literal && part.value.length > 0) {
      return part.value;
    }
  }
  return undefined;
}

function sourceTokens(network) {
  // Build character offsets from concatenation order so capture ranges line up
  // with the concatenated text, mirroring the Rust byte-range semantics.
  const tokens = network
    .links()
    .filter((link) => link.metadata().linkType === LinkType.SourceToken)
    .filter((link) => !link.metadata().flags.isMissing)
    .filter((link) => link.metadata().span !== undefined)
    .map((link) => ({
      linkId: link.id(),
      span: link.metadata().span,
      term: link.metadata().term ?? '',
    }));
  tokens.sort((left, right) => {
    if (left.span.byteRange.start !== right.span.byteRange.start) {
      return left.span.byteRange.start - right.span.byteRange.start;
    }
    return left.linkId.asU64() - right.linkId.asU64();
  });
  // Recompute contiguous offsets over the JS (UTF-16) text representation so
  // ranges match `String.prototype.indexOf` offsets used during matching.
  let offset = 0;
  for (const token of tokens) {
    token.start = offset;
    offset += token.term.length;
    token.end = offset;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// S-expression syntax parser
// ---------------------------------------------------------------------------

const TokenKind = Object.freeze({ LParen: 'LParen', RParen: 'RParen', Atom: 'Atom' });

export function parseRule(source) {
  const parser = new RuleParser(tokenize(source));
  const expression = parser.parseExpression();
  if (!parser.isAtEnd()) {
    throw new LinkRuleParseError('rule may contain only one root expression');
  }
  return ruleFromExpression(expression);
}

const LINK_TYPE_BY_NAME = Object.freeze({
  link: 'Link',
  reference: 'Reference',
  relation: LinkType.Relation,
  language: LinkType.Language,
  grammar: 'Grammar',
  type: 'Type',
  concept: LinkType.Concept,
  syntax: LinkType.Syntax,
  field: LinkType.Field,
  trivia: LinkType.Trivia,
  token: LinkType.Token,
  document: 'Document',
  semantic: LinkType.Semantic,
  region: 'Region',
  object: LinkType.Object,
});

function ruleFromExpression(expression) {
  if (expression.kind !== 'List') {
    throw new LinkRuleParseError('rule expression must be a list');
  }
  const items = expression.items;
  if (items.length === 0) {
    throw new LinkRuleParseError('rule expression is empty');
  }
  const head = items[0];
  const args = items.slice(1);
  const operator = atom(head);
  switch (operator) {
    case 'kind':
    case 'term':
      return LinkRule.kind(requiredAtom(args, 0, operator));
    case 'type':
      return LinkRule.linkType(parseLinkType(requiredAtom(args, 0, operator)));
    case 'language':
      return LinkRule.language(requiredAtom(args, 0, operator));
    case 'named':
      return LinkRule.namedFlag(parseBool(requiredAtom(args, 0, operator)));
    case 'query':
      return LinkRule.query(parseQuery(requiredAtom(args, 0, operator)));
    case 'capture':
      return LinkRule.capture(requiredAtom(args, 0, operator), ruleArg(args, 1, operator));
    case 'meta':
      return LinkRule.typedMetavariable(
        requiredAtom(args, 0, operator),
        requiredAtom(args, 1, operator),
      );
    case 'inside':
      return LinkRule.inside(ruleArg(args, 0, operator), ruleArg(args, 1, operator));
    case 'has':
      return LinkRule.has(ruleArg(args, 0, operator), ruleArg(args, 1, operator));
    case 'precedes':
      return LinkRule.precedes(ruleArg(args, 0, operator), ruleArg(args, 1, operator));
    case 'follows':
      return LinkRule.follows(ruleArg(args, 0, operator), ruleArg(args, 1, operator));
    case 'all':
      return LinkRule.all(args.map(ruleFromExpression));
    case 'any':
      return LinkRule.any(args.map(ruleFromExpression));
    case 'not':
      return LinkRule.negate(ruleArg(args, 0, operator));
    case 'ref':
      return LinkRule.named(requiredAtom(args, 0, operator));
    case 'ellipsis':
      return LinkRule.ellipsisGap(ruleArg(args, 0, operator), ruleArg(args, 1, operator));
    case 'text':
      return LinkRule.text(requiredAtom(args, 0, operator));
    default:
      throw new LinkRuleParseError(`unknown rule operator \`${operator}\``);
  }
}

function parseQuery(source) {
  try {
    return LinkQuery.fromSexpression(source);
  } catch (error) {
    throw new LinkRuleParseError(error.message);
  }
}

function atom(expression) {
  if (expression.kind === 'Atom') {
    return expression.value;
  }
  throw new LinkRuleParseError('expected atom');
}

function requiredAtom(args, index, operator) {
  if (index >= args.length) {
    throw new LinkRuleParseError(`\`${operator}\` is missing an argument`);
  }
  return atom(args[index]);
}

function ruleArg(args, index, operator) {
  if (index >= args.length) {
    throw new LinkRuleParseError(`\`${operator}\` is missing a rule argument`);
  }
  return ruleFromExpression(args[index]);
}

function parseBool(source) {
  if (source === 'true') {
    return true;
  }
  if (source === 'false') {
    return false;
  }
  throw new LinkRuleParseError('expected `true` or `false`');
}

function parseLinkType(source) {
  const linkType = LINK_TYPE_BY_NAME[source];
  if (linkType === undefined) {
    throw new LinkRuleParseError(`unknown link type \`${source}\``);
  }
  return linkType;
}

class RuleParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  parseExpression() {
    const token = this.advance();
    if (token === undefined) {
      throw new LinkRuleParseError('empty rule expression');
    }
    if (token.kind === TokenKind.Atom) {
      return { kind: 'Atom', value: token.value };
    }
    if (token.kind === TokenKind.LParen) {
      const items = [];
      while (!(this.peek() && this.peek().kind === TokenKind.RParen)) {
        if (this.isAtEnd()) {
          throw new LinkRuleParseError('unterminated rule expression');
        }
        items.push(this.parseExpression());
      }
      this.expectRParen();
      return { kind: 'List', items };
    }
    throw new LinkRuleParseError('unexpected `)`');
  }

  expectRParen() {
    const token = this.advance();
    if (!token || token.kind !== TokenKind.RParen) {
      throw new LinkRuleParseError('expected `)`');
    }
  }

  advance() {
    const token = this.tokens[this.position];
    if (token === undefined) {
      return undefined;
    }
    this.position += 1;
    return token;
  }

  peek() {
    return this.tokens[this.position];
  }

  isAtEnd() {
    return this.position >= this.tokens.length;
  }
}

function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
    } else if (character === '(') {
      tokens.push({ kind: TokenKind.LParen });
      index += 1;
    } else if (character === ')') {
      tokens.push({ kind: TokenKind.RParen });
      index += 1;
    } else if (character === '"') {
      const [value, next] = readString(source, index);
      tokens.push({ kind: TokenKind.Atom, value });
      index = next;
    } else {
      const [value, next] = readAtom(source, index);
      tokens.push({ kind: TokenKind.Atom, value });
      index = next;
    }
  }
  return tokens;
}

function readAtom(source, start) {
  let index = start;
  let atomValue = '';
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character) || character === '(' || character === ')' || character === '"') {
      break;
    }
    atomValue += character;
    index += 1;
  }
  return [atomValue, index];
}

function readString(source, start) {
  let index = start + 1;
  let literal = '';
  while (index < source.length) {
    const character = source[index];
    index += 1;
    if (character === '"') {
      return [literal, index];
    }
    if (character === '\\') {
      if (index >= source.length) {
        throw new LinkRuleParseError('unterminated string escape');
      }
      const escaped = source[index];
      index += 1;
      switch (escaped) {
        case 'n':
          literal += '\n';
          break;
        case 'r':
          literal += '\r';
          break;
        case 't':
          literal += '\t';
          break;
        default:
          literal += escaped;
          break;
      }
    } else {
      literal += character;
    }
  }
  throw new LinkRuleParseError('unterminated string literal');
}
