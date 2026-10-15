// Syntax-driven binding extents for the four-language program analyzer: the
// binders the token declarers cannot see (Rust patterns, closures, macro
// metavariables; Lean and Rocq binder groups, `fun` and quantifiers), the
// source window each declaration is visible in, qualified Rust paths, and the
// identifiers that interpolated strings expose to name resolution.
// The Rust twin is rust/src/program_representation/analysis/extents.rs.

const RUST_ITEMS = new Set(['struct', 'enum', 'trait', 'type', 'const', 'static', 'mod', 'union', 'function', 'import']);
const RUST_PATH_ROOTS = new Set(['self', 'super', 'crate']);
const FORMAT_MACROS = new Set([
  'format', 'format_args', 'print', 'println', 'eprint', 'eprintln', 'panic', 'unreachable', 'todo', 'unimplemented',
]);
const PROOF_EXTENTS = Object.freeze({
  Lean: new Set(['fun', 'quantifier', 'definition', 'example', 'constructor']),
  Rocq: new Set(['lambda_function', 'quantifier_term', 'sentence']),
});
const PROOF_BINDER_NODES = Object.freeze({
  Lean: new Set(['explicit_binder', 'implicit_binder', 'instance_binder', 'strict_implicit_binder']),
  Rocq: new Set(['binder']),
});
const OPENERS = new Set(['(', '[', '{', '⦃']);
const CLOSERS = new Set([')', ']', '}', '⦄']);

export function identifierStart(character, language) {
  return /[_$\p{L}]/u.test(character) && !(language !== 'JavaScript' && character === '$');
}

export function identifierContinue(character, language) {
  return /[_$'\p{L}\p{N}\p{M}‌‍]/u.test(character) &&
    !(language === 'Rust' && character === "'") &&
    !(language !== 'JavaScript' && character === '$');
}

/**
 * Re-exposes identifiers that name bindings from inside string literals: Lean
 * `s!`/`m!`/`f!` interpolations and inline arguments of Rust format macros.
 */
export function unmaskInterpolations(mask, source, language, syntax) {
  if (language === 'Lean') {
    for (const { term, start, end } of syntax) {
      if (term === 'interpolation' && end - start >= 2) mark(mask, start + 1, end - 1, true);
    }
    return;
  }
  if (language !== 'Rust') return;
  const literals = new Map(syntax
    .filter(({ term }) => term === 'string_literal')
    .map((fact) => [fact.start, fact]));
  for (const { term, start } of syntax) {
    if (term !== 'macro_invocation') continue;
    let offset = start;
    while (offset < source.length && /[A-Za-z0-9_]/u.test(source[offset])) offset += 1;
    if (!FORMAT_MACROS.has(source.slice(start, offset))) continue;
    offset = skipSpace(source, offset);
    if (source[offset] !== '!') continue;
    offset = skipSpace(source, offset + 1);
    if (source[offset] !== '(') continue;
    const literal = literals.get(skipSpace(source, offset + 1));
    if (literal && source[literal.start] === '"') {
      unmaskFormatArguments(mask, source, literal.start + 1, literal.end - 1);
    }
  }
}

function unmaskFormatArguments(mask, source, start, end) {
  for (let offset = start; offset < end;) {
    if (source.startsWith('{{', offset) || source.startsWith('}}', offset)) {
      offset += 2;
    } else if (source[offset] === '{') {
      let nameEnd = offset + 1;
      while (nameEnd < end && source[nameEnd] !== '}' && source[nameEnd] !== ':') nameEnd += 1;
      if (isIdentifier(source.slice(offset + 1, nameEnd), 'Rust')) mark(mask, offset + 1, nameEnd, true);
      offset = nameEnd;
    } else {
      offset += 1;
    }
  }
}

/** Declares binders that only the concrete syntax tree delimits. */
export function declareSyntaxBinders(tokens, syntax, language, declare) {
  const tokenAt = new Map(tokens.map((token, index) => [token.start, index]));
  for (const fact of syntax) {
    const first = tokenAt.get(fact.start);
    if (first === undefined) continue;
    if (language === 'JavaScript') {
      if (fact.term === 'arrow_function') {
        const [open, close] = arrowParameters(tokens, first);
        for (let index = open; index <= close; index += 1) {
          const token = tokens[index];
          const previous = tokens[index - 1]?.text;
          if (token.kind === 'identifier' && (index === open || previous === '(' || previous === ',' || previous === '...')) {
            declare(index, 'parameter');
          }
        }
      }
    } else if (language === 'Rust') {
      if (fact.term === 'token_binding_pattern') {
        const name = tokenAt.get(fact.start + 1);
        if (name !== undefined && tokens[first].text === '$') declare(name, 'metavariable');
      } else if (fact.term === 'let_declaration' || fact.term === 'let_condition') {
        declareRustPattern(tokens, first + 1, fact.end, 'let', declare, (token) => ['=', ';', 'else'].includes(token.text));
      } else if (fact.term === 'for_expression') {
        declareRustPattern(tokens, first + 1, fact.end, 'for', declare, (token) => token.text === 'in');
      } else if (fact.term === 'closure_parameters') {
        declareRustPattern(tokens, first + 1, fact.end - 1, 'parameter', declare, () => false);
      }
    } else if (PROOF_BINDER_NODES[language]?.has(fact.term)) {
      for (let index = first; index < tokens.length && tokens[index].start < fact.end; index += 1) {
        if (tokens[index].text === ':') break;
        if (tokens[index].kind === 'identifier' && tokens[index].text !== '_') declare(index, 'parameter');
      }
    } else if (language === 'Lean' && (fact.term === 'fun' || fact.term === 'quantifier') && tokens[first].end < fact.end) {
      for (let index = first + 1; index < tokens.length && tokens[index].start < fact.end;) {
        const token = tokens[index];
        if (token.kind === 'identifier') {
          if (token.text !== '_') declare(index, 'binder');
          index += 1;
        } else if (OPENERS.has(token.text)) {
          index = closingIndex(tokens, index) + 1;
        } else {
          break;
        }
      }
    }
  }
}

// Pattern bindings: identifiers in binding position up to the pattern end,
// skipping type annotations, constructor paths, and struct field names.
function declareRustPattern(tokens, first, end, kind, declare, stops) {
  let depth = 0;
  let annotation = false;
  for (let index = first; index < tokens.length && tokens[index].start < end; index += 1) {
    const token = tokens[index];
    if (depth === 0 && stops(token)) return;
    if (OPENERS.has(token.text)) {
      depth += 1;
    } else if (CLOSERS.has(token.text)) {
      depth -= 1;
      if (depth < 0) return;
    } else if (depth === 0 && token.text === ':') {
      annotation = true;
    } else if (depth === 0 && token.text === ',') {
      annotation = false;
    } else if (
      !annotation &&
      token.kind === 'identifier' &&
      token.text !== '_' &&
      !['(', '{', '::', '!'].includes(tokens[index + 1]?.text) &&
      !(depth > 0 && tokens[index + 1]?.text === ':') &&
      !['::', '.'].includes(tokens[index - 1]?.text)
    ) {
      declare(index, kind);
    }
  }
}

/**
 * Sets the source window `[from, until)` each declaration is visible in, the
 * body scope of Rust modules, and the scope of proof-language binder groups.
 */
export function applyBindingExtents(declarations, tokens, syntax, language, braceScopes) {
  const tokenAt = new Map(tokens.map((token, index) => [token.start, index]));
  for (const declaration of declarations) {
    const token = tokens[declaration.tokenIndex];
    declaration.from = token.start;
    declaration.until = Infinity;
    declaration.sigil = false;
    if (language === 'JavaScript') {
      declaration.from = 0;
      const arrow = declaration.kind === 'parameter' &&
        smallest(syntax, (term) => term === 'arrow_function', token, (fact) => {
          const [, close] = arrowParameters(tokens, tokenAt.get(fact.start));
          return declaration.tokenIndex <= close;
        });
      if (arrow) declaration.until = arrow.end;
    } else if (language === 'Rust') {
      rustExtent(declaration, token, tokens, syntax, braceScopes);
    } else {
      proofExtent(declaration, token, tokens, syntax, language, tokenAt);
    }
  }
}

function rustExtent(declaration, token, tokens, syntax, braceScopes) {
  const { kind, tokenIndex } = declaration;
  if (RUST_ITEMS.has(kind)) {
    declaration.from = 0;
    if (kind === 'mod' && tokens[tokenIndex + 1]?.text === '{') {
      const body = braceScopes.get(tokenIndex + 1);
      if (body) declaration.body = body;
    }
  } else if (kind === 'let') {
    const statement = smallest(syntax, (term) => term === 'let_declaration' || term === 'let_condition', token);
    if (statement) {
      declaration.from = statement.end;
      if (statement.term === 'let_condition') {
        const owner = smallest(syntax, (term) => term === 'if_expression' || term === 'while_expression', statement);
        if (owner) declaration.until = owner.end;
      }
    }
  } else if (kind === 'for') {
    const loop = smallest(syntax, (term) => term === 'for_expression', token);
    if (loop) {
      const body = syntax.find(({ term, end }) => term === 'block' && end === loop.end);
      declaration.from = body?.start ?? loop.end;
      declaration.until = loop.end;
    }
  } else if (kind === 'parameter') {
    const parameters = smallest(syntax, (term) => term === 'closure_parameters', token);
    const closure = parameters && smallest(syntax, (term) => term === 'closure_expression', parameters);
    if (closure) {
      declaration.from = parameters.end;
      declaration.until = closure.end;
    }
  } else if (kind === 'metavariable') {
    const rule = smallest(syntax, (term) => term === 'macro_rule', token);
    if (rule) declaration.until = rule.end;
    declaration.sigil = true;
  }
}

function proofExtent(declaration, token, tokens, syntax, language, tokenAt) {
  if (declaration.kind === 'let') {
    const letTerm = language === 'Lean' ? 'let' : 'let_expression';
    const expression = smallest(syntax, (term) => term === letTerm, token, (fact) => fact.start < token.start);
    if (expression) {
      declaration.from = language === 'Lean'
        ? leanLetValueEnd(tokens, syntax, expression)
        : rocqLetBodyStart(tokens, expression, tokenAt);
      declaration.until = expression.end;
    }
    return;
  }
  if (declaration.kind !== 'parameter' && declaration.kind !== 'binder') return;
  const group = smallest(syntax, (term) => PROOF_BINDER_NODES[language].has(term), token);
  if (!group && declaration.kind !== 'binder') return;
  const extent = smallest(syntax, (term) => PROOF_EXTENTS[language].has(term), token);
  if (extent) declaration.until = extent.end;
  const anchor = tokenAt.get((extent ?? group).start);
  if (anchor !== undefined) declaration.scope = tokens[anchor].scope;
}

// Token range of an arrow function's parameter list: a bare identifier, or
// the tokens inside its parentheses, after an optional `async`.
function arrowParameters(tokens, first) {
  let open = first;
  if (tokens[open]?.text === 'async' && tokens[open + 1]?.text !== '=>') open += 1;
  if (tokens[open]?.text !== '(') return [open, open];
  const close = closingIndex(tokens, open);
  return [open + 1, close - 1];
}

function leanLetValueEnd(tokens, syntax, expression) {
  const assign = tokens.findIndex(({ start, text }) => start > expression.start && text === ':=');
  const value = tokens[assign + 1];
  if (assign < 0 || !value || value.start >= expression.end) return expression.end;
  let end = value.end;
  for (const fact of syntax) {
    if (fact.start === value.start && fact.end < expression.end && fact.end > end) end = fact.end;
  }
  return end;
}

function rocqLetBodyStart(tokens, expression, tokenAt) {
  let depth = 0;
  for (let index = tokenAt.get(expression.start) + 1; index < tokens.length && tokens[index].start < expression.end; index += 1) {
    if (tokens[index].text === 'let') depth += 1;
    if (tokens[index].text === 'in') {
      if (depth === 0) return tokens[index].end;
      depth -= 1;
    }
  }
  return expression.end;
}

/** Candidate order: deepest scope, then the latest declaration before the use, then the earliest after it. */
export function preferBinding(left, right, token, depthOf) {
  const depth = depthOf(left.scope) - depthOf(right.scope);
  if (depth) return depth;
  const leftBefore = left.declaration.start <= token.start;
  const rightBefore = right.declaration.start <= token.start;
  if (leftBefore !== rightBefore) return leftBefore ? 1 : -1;
  return leftBefore
    ? left.declaration.start - right.declaration.start
    : right.declaration.start - left.declaration.start;
}

/**
 * Resolves the last segment of a Rust `a::b::name` path through module
 * bodies; `crate`, `self`, and `super` name the root, enclosing, and parent
 * modules. Returns undefined for paths outside the analyzed modules.
 */
export function resolveRustPath(tokens, index, { lexical, member, nearestModule, parentModule }) {
  const segments = [index];
  let cursor = index;
  while (
    tokens[cursor - 1]?.text === '::' &&
    (tokens[cursor - 2]?.kind === 'identifier' || RUST_PATH_ROOTS.has(tokens[cursor - 2]?.text))
  ) {
    cursor -= 2;
    segments.unshift(cursor);
  }
  if (segments.length < 2 || tokens[cursor - 1]?.text === '::') return undefined;
  const head = tokens[segments[0]];
  let module;
  if (head.text === 'crate') module = 'scope:0';
  else if (head.text === 'self') module = nearestModule(head.scope);
  else if (head.text === 'super') module = parentModule(nearestModule(head.scope));
  else if (head.kind === 'identifier') module = lexical(segments[0])?.body;
  for (const segment of segments.slice(1, -1)) {
    if (!module) return undefined;
    module = tokens[segment].text === 'super' ? parentModule(module) : member(module, tokens[segment].text)?.body;
  }
  return module ? member(module, tokens[index].text) : undefined;
}

/** Rust `use a::b::name;` declarations that bring one item into scope. */
export function rustUseAliases(tokens, syntax) {
  const tokenAt = new Map(tokens.map((token, index) => [token.start, index]));
  const aliases = [];
  for (const { term, start, end } of syntax) {
    if (term !== 'use_declaration') continue;
    const last = tokens.findLastIndex((token) => token.start >= start && token.end < end && token.kind === 'identifier');
    const first = tokenAt.get(start);
    if (last < 0 || first === undefined || tokens[last - 1]?.text !== '::' || tokens[last + 1]?.text !== ';') continue;
    if (tokens.slice(first, last).some(({ text }) => ['{', '*', 'as'].includes(text))) continue;
    aliases.push(last);
  }
  return aliases;
}

export function isRustItem(kind) {
  return RUST_ITEMS.has(kind);
}

function isIdentifier(value, language) {
  const characters = [...value];
  return characters.length > 0 &&
    identifierStart(characters[0], language) &&
    characters.slice(1).every((character) => identifierContinue(character, language));
}

function smallest(syntax, accepts, range, extra = () => true) {
  let best;
  for (const fact of syntax) {
    if (!accepts(fact.term) || fact.start > range.start || fact.end < range.end || !extra(fact)) continue;
    if (fact.start === range.start && fact.end === range.end && fact.term === range.term) continue;
    if (!best || fact.end - fact.start < best.end - best.start) best = fact;
  }
  return best;
}

function closingIndex(tokens, open) {
  let depth = 0;
  for (let index = open; index < tokens.length; index += 1) {
    if (OPENERS.has(tokens[index].text)) depth += 1;
    if (CLOSERS.has(tokens[index].text) && --depth === 0) return index;
  }
  return tokens.length;
}

function skipSpace(source, offset) {
  let cursor = offset;
  while (cursor < source.length && /\s/u.test(source[cursor])) cursor += 1;
  return cursor;
}

function mark(mask, start, end, value) {
  for (let index = start; index < end; index += 1) mask[index] = value;
}
