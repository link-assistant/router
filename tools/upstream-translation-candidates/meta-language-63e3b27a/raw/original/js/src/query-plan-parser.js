import {
  SqlAdapterError,
  SqlAdapterErrorKind,
} from './query-plan.js';

export function parseSqlOperation(source) {
  const parser = new Parser(lex(source), source.length);
  const operation = parser.parseStatement();
  if (parser.consumeSymbol(';') && parser.consumeSymbol(';')) {
    throw parser.syntax('only one SQL statement may be lowered');
  }
  if (!parser.done()) {
    throw parser.syntax('unexpected input after complete SQL statement');
  }
  return operation;
}

function lex(source) {
  const tokens = [];
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (/\s/u.test(character)) {
      cursor += 1;
    } else if (source.startsWith('--', cursor)) {
      cursor += 2;
      while (cursor < source.length && source[cursor] !== '\n') cursor += 1;
    } else if (source.startsWith('/*', cursor)) {
      const start = cursor;
      const end = source.indexOf('*/', cursor + 2);
      if (end === -1) throw syntaxError('unterminated SQL block comment', start);
      cursor = end + 2;
    } else if (character === "'") {
      const [token, end] = readString(source, cursor);
      tokens.push(token);
      cursor = end;
    } else if (character === '"' || character === '`' || character === '[') {
      const [token, end] = readQuotedIdentifier(source, cursor);
      tokens.push(token);
      cursor = end;
    } else if (/\d/u.test(character)) {
      const start = cursor;
      cursor += 1;
      while (/\d/u.test(source[cursor] ?? '')) cursor += 1;
      if (source[cursor] === '.' && /\d/u.test(source[cursor + 1] ?? '')) {
        cursor += 1;
        while (/\d/u.test(source[cursor] ?? '')) cursor += 1;
      }
      tokens.push({ kind: 'number', value: source.slice(start, cursor), offset: start });
    } else if (/[A-Za-z_\p{L}]/u.test(character)) {
      const start = cursor;
      cursor += 1;
      while (/[A-Za-z0-9_$\p{L}]/u.test(source[cursor] ?? '')) cursor += 1;
      tokens.push({
        kind: 'word',
        value: source.slice(start, cursor),
        quoted: false,
        offset: start,
      });
    } else if (character === '?') {
      tokens.push({ kind: 'parameter', value: '?', offset: cursor });
      cursor += 1;
    } else if ('$:@'.includes(character)) {
      const start = cursor;
      cursor += 1;
      while (/[A-Za-z0-9_$\p{L}]/u.test(source[cursor] ?? '')) cursor += 1;
      if (cursor === start + 1) {
        throw syntaxError('SQL parameter marker is missing a name or index', start);
      }
      tokens.push({ kind: 'parameter', value: source.slice(start, cursor), offset: start });
    } else if ('<>!='.includes(character)) {
      const start = cursor;
      cursor += 1;
      const candidate = source.slice(start, cursor + 1);
      if (['<=', '>=', '<>', '!='].includes(candidate)) cursor += 1;
      tokens.push({ kind: 'operator', value: source.slice(start, cursor), offset: start });
    } else if ('+-*/'.includes(character)) {
      tokens.push({ kind: 'operator', value: character, offset: cursor });
      cursor += 1;
    } else if ('(),.;'.includes(character)) {
      tokens.push({ kind: 'symbol', value: character, offset: cursor });
      cursor += 1;
    } else {
      throw syntaxError('unsupported character in SQL statement', cursor);
    }
  }
  return tokens;
}

function readString(source, start) {
  let cursor = start + 1;
  let value = '';
  while (cursor < source.length) {
    if (source[cursor] === "'") {
      if (source[cursor + 1] === "'") {
        value += "'";
        cursor += 2;
      } else {
        return [{ kind: 'string', value, offset: start }, cursor + 1];
      }
    } else {
      value += source[cursor];
      cursor += 1;
    }
  }
  throw syntaxError('unterminated SQL string literal', start);
}

function readQuotedIdentifier(source, start) {
  const closer = source[start] === '[' ? ']' : source[start];
  const end = source.indexOf(closer, start + 1);
  if (end === -1) throw syntaxError('unterminated quoted SQL identifier', start);
  return [
    {
      kind: 'word',
      value: source.slice(start + 1, end),
      quoted: true,
      offset: start,
    },
    end + 1,
  ];
}

class Parser {
  constructor(tokens, sourceLength) {
    this.tokens = tokens;
    this.cursor = 0;
    this.sourceLength = sourceLength;
  }

  parseStatement() {
    if (this.atKeyword('SELECT')) return this.parseSelect();
    if (this.atKeyword('INSERT')) return this.parseInsert();
    if (this.atKeyword('UPDATE')) return this.parseUpdate();
    if (this.atKeyword('DELETE')) return this.parseDelete();
    throw this.syntax('expected SELECT, INSERT, UPDATE, or DELETE');
  }

  parseSelect() {
    this.expectKeyword('SELECT');
    const distinct = this.consumeKeyword('DISTINCT');
    const projection = [];
    do {
      if (this.done() || this.atKeyword('FROM')) {
        throw this.syntax('SELECT projection must not be empty');
      }
      projection.push({
        expression: this.parseExpression(0),
        alias: this.parseOptionalAlias(),
      });
    } while (this.consumeSymbol(','));

    const from = this.consumeKeyword('FROM') ? this.parseSource(true) : null;
    const filter = this.consumeKeyword('WHERE') ? this.parseExpression(0) : null;
    let groupBy = [];
    if (this.consumeKeyword('GROUP')) {
      this.expectKeyword('BY');
      groupBy = this.parseExpressionList();
    }
    let orderBy = [];
    if (this.consumeKeyword('ORDER')) {
      this.expectKeyword('BY');
      orderBy = this.parseOrderList();
    }
    const limit = this.consumeKeyword('LIMIT') ? this.parseInteger('LIMIT') : null;
    const offset = this.consumeKeyword('OFFSET') ? this.parseInteger('OFFSET') : null;
    return { kind: 'select', distinct, projection, from, filter, groupBy, orderBy, limit, offset };
  }

  parseInsert() {
    this.expectKeyword('INSERT');
    this.expectKeyword('INTO');
    const into = this.parseSource(false);
    let columns = [];
    if (this.consumeSymbol('(')) {
      columns = this.parseIdentifierList();
      this.expectSymbol(')');
    }
    this.expectKeyword('VALUES');
    const rows = [];
    do {
      this.expectSymbol('(');
      const row = this.parseExpressionList();
      this.expectSymbol(')');
      if (columns.length > 0 && row.length !== columns.length) {
        throw this.semantic('INSERT row value count must match the declared column count');
      }
      rows.push(row);
    } while (this.consumeSymbol(','));
    return { kind: 'insert', into, columns, rows };
  }

  parseUpdate() {
    this.expectKeyword('UPDATE');
    const table = this.parseSource(true);
    this.expectKeyword('SET');
    const assignments = [];
    do {
      if (this.atKeyword('WHERE') || this.done()) {
        throw this.syntax('UPDATE SET must contain an assignment');
      }
      const column = this.parseIdentifierPath();
      this.expectOperator('=');
      assignments.push({ column, value: this.parseExpression(0) });
    } while (this.consumeSymbol(','));
    const filter = this.consumeKeyword('WHERE') ? this.parseExpression(0) : null;
    return { kind: 'update', table, assignments, filter };
  }

  parseDelete() {
    this.expectKeyword('DELETE');
    this.expectKeyword('FROM');
    const from = this.parseSource(true);
    const filter = this.consumeKeyword('WHERE') ? this.parseExpression(0) : null;
    return { kind: 'delete', from, filter };
  }

  parseSource(allowAlias) {
    return {
      path: this.parseIdentifierPath(),
      alias: allowAlias ? this.parseOptionalAlias() : null,
    };
  }

  parseExpressionList() {
    const expressions = [this.parseExpression(0)];
    while (this.consumeSymbol(',')) expressions.push(this.parseExpression(0));
    return expressions;
  }

  parseOrderList() {
    const expressions = [];
    do {
      const expression = this.parseExpression(0);
      let direction = 'ascending';
      if (this.consumeKeyword('DESC')) direction = 'descending';
      else this.consumeKeyword('ASC');
      expressions.push({ expression, direction });
    } while (this.consumeSymbol(','));
    return expressions;
  }

  parseExpression(minimumPrecedence) {
    let left = this.parsePrefix();
    let infix = this.infixOperator();
    while (infix !== undefined && infix.precedence >= minimumPrecedence) {
      this.cursor += infix.count;
      const right = this.parseExpression(infix.precedence + 1);
      left = { kind: 'binary', operator: infix.operator, left, right };
      infix = this.infixOperator();
    }
    return left;
  }

  parsePrefix() {
    if (this.consumeKeyword('NOT')) {
      return { kind: 'unary', operator: 'not', operand: this.parseExpression(6) };
    }
    if (this.consumeOperator('-')) {
      return { kind: 'unary', operator: 'negate', operand: this.parseExpression(6) };
    }
    if (this.consumeOperator('+')) {
      return { kind: 'unary', operator: 'positive', operand: this.parseExpression(6) };
    }
    if (this.consumeSymbol('(')) {
      const expression = this.parseExpression(0);
      this.expectSymbol(')');
      return expression;
    }
    const token = this.advance();
    if (token === undefined) throw this.syntax('expected SQL expression');
    if (token.kind === 'number') return literal('number', token.value);
    if (token.kind === 'string') return literal('string', token.value);
    if (token.kind === 'parameter') return { kind: 'parameter', name: token.value };
    if (token.kind === 'operator' && token.value === '*') return { kind: 'wildcard' };
    if (token.kind !== 'word') throw syntaxError('expected SQL expression', token.offset);

    if (!token.quoted && token.value.toUpperCase() === 'NULL') return { kind: 'literal', value: { kind: 'null' } };
    if (!token.quoted && token.value.toUpperCase() === 'TRUE') return literal('boolean', true);
    if (!token.quoted && token.value.toUpperCase() === 'FALSE') return literal('boolean', false);
    const identifier = canonicalIdentifier(token.value, token.quoted);
    if (this.consumeSymbol('(')) return this.parseFunction(identifier);
    const path = [identifier];
    while (this.consumeSymbol('.')) path.push(this.expectIdentifier());
    return { kind: 'column', path };
  }

  parseFunction(name) {
    const distinct = this.consumeKeyword('DISTINCT');
    let arguments_ = [];
    if (!this.consumeSymbol(')')) {
      arguments_ = this.parseExpressionList();
      this.expectSymbol(')');
    }
    const aggregate = aggregateFunction(name);
    if (aggregate !== undefined) {
      if (arguments_.length !== 1) {
        throw this.semantic('aggregate functions require exactly one argument');
      }
      if (aggregate !== 'count' && arguments_[0].kind === 'wildcard') {
        throw this.semantic('only COUNT accepts a wildcard argument');
      }
      return {
        kind: 'aggregate',
        function: aggregate,
        expression: arguments_[0],
        distinct,
      };
    }
    if (distinct) {
      throw this.semantic(
        'DISTINCT function arguments are only canonicalized for supported aggregates',
      );
    }
    return { kind: 'function', name, arguments: arguments_ };
  }

  infixOperator() {
    if (this.atKeyword('OR')) return infix('or', 1);
    if (this.atKeyword('AND')) return infix('and', 2);
    if (this.atKeyword('IS') && this.peekKeyword(1, 'NOT')) return infix('is_not', 3, 2);
    if (this.atKeyword('IS')) return infix('is', 3);
    if (this.atKeyword('NOT') && this.peekKeyword(1, 'LIKE')) return infix('not_like', 3, 2);
    if (this.atKeyword('LIKE')) return infix('like', 3);
    return {
      '=': infix('equal', 3),
      '!=': infix('not_equal', 3),
      '<>': infix('not_equal', 3),
      '<': infix('less_than', 3),
      '<=': infix('less_than_or_equal', 3),
      '>': infix('greater_than', 3),
      '>=': infix('greater_than_or_equal', 3),
      '+': infix('add', 4),
      '-': infix('subtract', 4),
      '*': infix('multiply', 5),
      '/': infix('divide', 5),
    }[this.current()?.kind === 'operator' ? this.current().value : ''];
  }

  parseOptionalAlias() {
    if (this.consumeKeyword('AS')) return this.expectIdentifier();
    const token = this.current();
    if (token?.kind !== 'word' || (!token.quoted && isClauseKeyword(token.value))) return null;
    this.cursor += 1;
    return canonicalIdentifier(token.value, token.quoted);
  }

  parseIdentifierList() {
    const values = [this.expectIdentifier()];
    while (this.consumeSymbol(',')) values.push(this.expectIdentifier());
    return values;
  }

  parseIdentifierPath() {
    const values = [this.expectIdentifier()];
    while (this.consumeSymbol('.')) values.push(this.expectIdentifier());
    return values;
  }

  parseInteger(clause) {
    const token = this.advance();
    if (token?.kind !== 'number' || token.value.includes('.')) {
      throw new SqlAdapterError(
        SqlAdapterErrorKind.Semantic,
        `${clause} requires a non-negative integer`,
        token?.offset ?? this.sourceLength,
      );
    }
    const value = Number(token.value);
    if (!Number.isSafeInteger(value)) {
      throw new SqlAdapterError(
        SqlAdapterErrorKind.Semantic,
        `${clause} integer is out of range`,
        token.offset,
      );
    }
    return value;
  }

  expectIdentifier() {
    const token = this.advance();
    if (token?.kind !== 'word') throw this.syntax('expected SQL identifier');
    return canonicalIdentifier(token.value, token.quoted);
  }

  expectKeyword(keyword) {
    if (!this.consumeKeyword(keyword)) throw this.syntax(`expected ${keyword}`);
  }

  expectSymbol(symbol) {
    if (!this.consumeSymbol(symbol)) throw this.syntax(`expected \`${symbol}\``);
  }

  expectOperator(operator) {
    if (!this.consumeOperator(operator)) throw this.syntax(`expected \`${operator}\``);
  }

  consumeKeyword(keyword) {
    if (!this.atKeyword(keyword)) return false;
    this.cursor += 1;
    return true;
  }

  consumeSymbol(symbol) {
    if (this.current()?.kind !== 'symbol' || this.current().value !== symbol) return false;
    this.cursor += 1;
    return true;
  }

  consumeOperator(operator) {
    if (this.current()?.kind !== 'operator' || this.current().value !== operator) return false;
    this.cursor += 1;
    return true;
  }

  atKeyword(keyword) {
    return this.peekKeyword(0, keyword);
  }

  peekKeyword(lookahead, keyword) {
    const token = this.tokens[this.cursor + lookahead];
    return token?.kind === 'word'
      && !token.quoted
      && token.value.toUpperCase() === keyword;
  }

  current() {
    return this.tokens[this.cursor];
  }

  advance() {
    const token = this.current();
    if (token !== undefined) this.cursor += 1;
    return token;
  }

  done() {
    return this.cursor === this.tokens.length;
  }

  syntax(message) {
    return new SqlAdapterError(
      SqlAdapterErrorKind.Syntax,
      message,
      this.current()?.offset ?? this.sourceLength,
    );
  }

  semantic(message) {
    return new SqlAdapterError(
      SqlAdapterErrorKind.Semantic,
      message,
      this.current()?.offset ?? this.sourceLength,
    );
  }
}

function literal(kind, value) {
  return { kind: 'literal', value: { kind, value } };
}

function canonicalIdentifier(value, quoted) {
  return quoted ? value : value.toLowerCase();
}

function isClauseKeyword(value) {
  return [
    'FROM', 'WHERE', 'GROUP', 'ORDER', 'LIMIT', 'OFFSET', 'ASC', 'DESC', 'SET', 'VALUES',
    'AND', 'OR', 'IS', 'NOT', 'LIKE',
  ].includes(value.toUpperCase());
}

function aggregateFunction(name) {
  return {
    COUNT: 'count',
    SUM: 'sum',
    AVG: 'avg',
    MIN: 'min',
    MAX: 'max',
    VAR_POP: 'variance_population',
    VARIANCE_POP: 'variance_population',
    STDDEV_POP: 'standard_deviation_population',
  }[name.toUpperCase()];
}

function infix(operator, precedence, count = 1) {
  return { operator, precedence, count };
}

function syntaxError(message, offset) {
  return new SqlAdapterError(SqlAdapterErrorKind.Syntax, message, offset);
}
