import {
  ByteRange,
  LinkMetadata,
  LinkType,
  Point,
  SourceSpan,
} from './primitives.js';
import { LinkNetwork } from './network.js';
import {
  LoweredQueryPlan,
  QueryAggregateFunction,
  QueryComparisonOperator,
  QueryOperation,
  QueryPlan,
  QuerySortDirection,
  QuerySourceEvidence,
} from './query-plan.js';

export const GraphQlOperationType = Object.freeze({
  Query: 'query',
  Mutation: 'mutation',
});

export const GraphQlArgumentRole = Object.freeze({
  Filter: 'filter',
  Order: 'order',
  Limit: 'limit',
  Offset: 'offset',
  Group: 'group',
  MutationInput: 'mutation-input',
});

const comparisonOperators = Object.freeze({
  eq: QueryComparisonOperator.Equal,
  neq: QueryComparisonOperator.NotEqual,
  ne: QueryComparisonOperator.NotEqual,
  lt: QueryComparisonOperator.LessThan,
  lte: QueryComparisonOperator.LessThanOrEqual,
  gt: QueryComparisonOperator.GreaterThan,
  gte: QueryComparisonOperator.GreaterThanOrEqual,
  in: QueryComparisonOperator.In,
  notIn: QueryComparisonOperator.NotIn,
  like: QueryComparisonOperator.Like,
  isNull: QueryComparisonOperator.IsNull,
});

export class GraphQlAdapterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GraphQlAdapterError';
  }
}

export class GraphQlRootMapping {
  constructor(sourceOperation, sourceField, operation, resource) {
    this.sourceOperation = sourceOperation;
    this.sourceField = String(sourceField);
    this.operation = operation;
    this.resource = String(resource);
    this.arguments = new Map();
    this.fields = new Map();
    this.aggregates = new Map();
  }

  withArgument(sourceName, role) {
    this.arguments.set(String(sourceName), role);
    return this;
  }

  withField(sourceName, canonicalField) {
    this.fields.set(String(sourceName), String(canonicalField));
    return this;
  }

  withAggregate(sourceName, aggregate) {
    this.aggregates.set(String(sourceName), aggregate);
    return this;
  }

  mappedField(source) {
    const canonical = this.fields.get(source);
    if (canonical === undefined) {
      throw new GraphQlAdapterError(`unmapped GraphQL field ${JSON.stringify(source)}`);
    }
    return canonical;
  }

  mappedSymbol(source) {
    const matches = [...this.fields.entries()]
      .filter(([name]) => name.toLowerCase() === source.toLowerCase())
      .map(([, canonical]) => canonical);
    if (matches.length === 0) {
      throw new GraphQlAdapterError(`unmapped GraphQL field symbol ${JSON.stringify(source)}`);
    }
    if (matches.length > 1) {
      throw new GraphQlAdapterError(`ambiguous GraphQL field symbol ${JSON.stringify(source)}`);
    }
    return matches[0];
  }
}

export class GraphQlSchemaRegistry {
  constructor() {
    this.roots = new Map();
  }

  registerRoot(mapping) {
    validateMapping(mapping);
    const key = `${mapping.sourceOperation}\u0000${mapping.sourceField}`;
    if (this.roots.has(key)) {
      throw new GraphQlAdapterError(
        `duplicate GraphQL ${mapping.sourceOperation} root mapping ${JSON.stringify(mapping.sourceField)}`,
      );
    }
    this.roots.set(key, mapping);
    return this;
  }

  root(operation, sourceField) {
    const mapping = this.roots.get(`${operation}\u0000${sourceField}`);
    if (!mapping) {
      throw new GraphQlAdapterError(
        `unmapped GraphQL ${operation} root field ${JSON.stringify(sourceField)}`,
      );
    }
    return mapping;
  }

  static fromJson(value) {
    if (!value || !Array.isArray(value.roots)) {
      throw new GraphQlAdapterError('registry.roots must be an array');
    }
    const registry = new GraphQlSchemaRegistry();
    for (const root of value.roots) {
      for (const field of ['sourceOperation', 'sourceField', 'operation', 'resource']) {
        if (typeof root[field] !== 'string') {
          throw new GraphQlAdapterError(`registry root ${JSON.stringify(field)} must be a string`);
        }
      }
      const mapping = new GraphQlRootMapping(
        root.sourceOperation,
        root.sourceField,
        root.operation,
        root.resource,
      );
      addMappings(mapping, root.arguments, GraphQlArgumentRole, 'argument role', 'withArgument');
      addMappings(mapping, root.fields, undefined, 'canonical field', 'withField');
      addMappings(
        mapping,
        root.aggregates,
        QueryAggregateFunction,
        'aggregate',
        'withAggregate',
      );
      registry.registerRoot(mapping);
    }
    return registry;
  }
}

export function lowerGraphQl(source, registry) {
  if (!(registry instanceof GraphQlSchemaRegistry)) {
    throw new TypeError('lowerGraphQl requires a GraphQlSchemaRegistry');
  }
  const document = parseDocument(source);
  if (document.rootFields.length !== 1) {
    throw new GraphQlAdapterError('exactly one GraphQL root field is required');
  }
  const root = document.rootFields[0];
  if (root.alias !== null) {
    throw new GraphQlAdapterError('GraphQL root aliases are not represented by the query plan');
  }
  const mapping = registry.root(document.operation, root.name);
  const plan = new QueryPlan(mapping.operation, mapping.resource);
  plan._sourceEvidence.push(evidence(source, 'root', root.span));
  lowerArguments(source, root, mapping, plan);
  lowerSelection(source, root, mapping, plan);
  validatePlan(plan);

  const network = LinkNetwork.parse(source, 'GraphQL');
  const tokens = network.links()
    .filter((link) => link.metadata().linkType === LinkType.SourceToken)
    .map((link) => link.id());
  const cstRoot = network.insertSyntaxNode('GraphQL', 'source_file', tokens);
  const rootLink = attachPlanLinks(network, plan, cstRoot);
  return new LoweredQueryPlan(plan, network, rootLink);
}

export const lowerGraphQL = lowerGraphQl;
export const lowerGraphql = lowerGraphQl;

function validateMapping(mapping) {
  if (!(mapping instanceof GraphQlRootMapping)) {
    throw new TypeError('registry entries must be GraphQlRootMapping instances');
  }
  if (!Object.values(GraphQlOperationType).includes(mapping.sourceOperation)) {
    throw new GraphQlAdapterError(`unsupported GraphQL operation mapping ${mapping.sourceOperation}`);
  }
  if (!Object.values(QueryOperation).includes(mapping.operation)) {
    throw new GraphQlAdapterError(`unsupported canonical operation ${mapping.operation}`);
  }
  if (!mapping.sourceField || !mapping.resource) {
    throw new GraphQlAdapterError('GraphQL root and canonical resource names must not be empty');
  }
  if ([...mapping.arguments.keys(), ...mapping.fields.keys(), ...mapping.aggregates.keys()]
    .some((name) => !name)
      || [...mapping.fields.values()].some((name) => !name)) {
    throw new GraphQlAdapterError('GraphQL mapping names and canonical fields must not be empty');
  }
  if (mapping.sourceOperation === GraphQlOperationType.Query
      && mapping.operation !== QueryOperation.Select) {
    throw new GraphQlAdapterError('GraphQL query roots must map to the select operation');
  }
  if (mapping.sourceOperation === GraphQlOperationType.Mutation
      && mapping.operation === QueryOperation.Select) {
    throw new GraphQlAdapterError('GraphQL mutation roots must map to insert, update, or delete');
  }
  if (new Set(mapping.arguments.values()).size !== mapping.arguments.size) {
    throw new GraphQlAdapterError('a GraphQL root mapping cannot assign the same semantic role twice');
  }
  const caseInsensitiveFields = [...mapping.fields.keys()].map((name) => name.toLowerCase());
  if (new Set(caseInsensitiveFields).size !== caseInsensitiveFields.length) {
    throw new GraphQlAdapterError('GraphQL field symbol mappings must not be case-ambiguous');
  }
  if ([...mapping.aggregates.keys()].some((name) => mapping.fields.has(name))) {
    throw new GraphQlAdapterError(
      'a GraphQL selection cannot map to both a field and an aggregate',
    );
  }
}

function addMappings(mapping, object, allowed, label, method) {
  if (object === undefined) {
    return;
  }
  if (!object || Array.isArray(object) || typeof object !== 'object') {
    throw new GraphQlAdapterError(`GraphQL ${label} mappings must be an object`);
  }
  for (const [name, value] of Object.entries(object)) {
    if (typeof value !== 'string') {
      throw new GraphQlAdapterError(`GraphQL ${label} mappings must be strings`);
    }
    if (allowed && !Object.values(allowed).includes(value)) {
      throw new GraphQlAdapterError(`unsupported ${label} ${JSON.stringify(value)}`);
    }
    mapping[method](name, value);
  }
}

function lowerArguments(source, root, mapping, plan) {
  for (const argument of root.arguments) {
    const role = mapping.arguments.get(argument.name);
    if (!role) {
      throw new GraphQlAdapterError(`unmapped GraphQL argument ${JSON.stringify(argument.name)}`);
    }
    switch (role) {
      case GraphQlArgumentRole.Filter:
        plan.filter = lowerFilter(argument.value, mapping);
        break;
      case GraphQlArgumentRole.Order:
        plan.order = lowerOrder(argument.value, mapping);
        break;
      case GraphQlArgumentRole.Limit:
        plan.limit = nonNegativeInteger(argument.value, 'limit');
        break;
      case GraphQlArgumentRole.Offset:
        plan.offset = nonNegativeInteger(argument.value, 'offset');
        break;
      case GraphQlArgumentRole.Group:
        plan.groupBy = lowerGroup(argument.value, mapping);
        break;
      case GraphQlArgumentRole.MutationInput:
        plan.mutation = lowerMutation(argument.value, mapping);
        break;
      default:
        throw new GraphQlAdapterError(`unsupported GraphQL argument role ${role}`);
    }
    plan._sourceEvidence.push(evidence(source, `argument:${role}`, argument.value.span));
  }
}

function lowerSelection(source, root, mapping, plan) {
  if (root.selection.length === 0) {
    throw new GraphQlAdapterError('a mapped GraphQL root must have a projection selection');
  }
  for (const field of root.selection) {
    if (field.selection.length !== 0) {
      throw new GraphQlAdapterError(
        `nested projection field ${JSON.stringify(field.name)} has no explicit mapping`,
      );
    }
    const aggregate = mapping.aggregates.get(field.name);
    if (aggregate) {
      const fieldName = aggregateField(field, mapping);
      if (aggregate !== QueryAggregateFunction.Count && fieldName === null) {
        throw new GraphQlAdapterError(
          `aggregate ${JSON.stringify(field.name)} requires a mapped field argument`,
        );
      }
      plan.aggregates.push({
        function: aggregate,
        field: fieldName,
        alias: field.alias,
      });
      plan._sourceEvidence.push(evidence(source, `aggregate:${aggregate}`, field.span));
      continue;
    }
    if (field.arguments.length !== 0) {
      throw new GraphQlAdapterError(
        `non-aggregate projection ${JSON.stringify(field.name)} cannot have arguments`,
      );
    }
    if (field.alias !== null) {
      throw new GraphQlAdapterError(
        `projection alias on ${JSON.stringify(field.name)} is not represented by the query plan`,
      );
    }
    const canonical = mapping.mappedField(field.name);
    if (!plan.projection.includes(canonical)) {
      plan.projection.push(canonical);
    }
    plan._sourceEvidence.push(evidence(source, `projection:${canonical}`, field.span));
  }
}

function aggregateField(field, mapping) {
  if (field.arguments.length === 0) {
    return null;
  }
  if (field.arguments.length !== 1 || field.arguments[0].name !== 'field') {
    throw new GraphQlAdapterError(
      `aggregate ${JSON.stringify(field.name)} accepts only an optional field argument`,
    );
  }
  return mapping.mappedSymbol(symbol(field.arguments[0].value));
}

function lowerFilter(node, mapping) {
  if (node.kind !== 'object') {
    throw new GraphQlAdapterError('filter arguments must be objects');
  }
  const clauses = [];
  for (const [name, value] of node.value) {
    if (name === 'and' || name === 'or') {
      const children = filterList(value, mapping);
      clauses.push({ [name]: children });
    } else if (name === 'not') {
      clauses.push({ not: lowerFilter(value, mapping) });
    } else {
      clauses.push(...fieldFilter(name, value, mapping));
    }
  }
  return collapseAnd(clauses, 'empty filter objects are unsupported');
}

function filterList(node, mapping) {
  if (node.kind !== 'list' || node.value.length === 0) {
    throw new GraphQlAdapterError('GraphQL and/or filter values must be non-empty lists');
  }
  return node.value.map((value) => lowerFilter(value, mapping));
}

function fieldFilter(sourceField, node, mapping) {
  const field = mapping.mappedField(sourceField);
  if (node.kind !== 'object') {
    return [{ compare: { field, operator: QueryComparisonOperator.Equal, value: queryValue(node) } }];
  }
  if (node.value.length === 0) {
    throw new GraphQlAdapterError('empty comparison objects are unsupported');
  }
  return node.value.map(([name, value]) => {
    const operator = comparisonOperators[name];
    if (!operator) {
      throw new GraphQlAdapterError(`unsupported filter operator ${JSON.stringify(name)}`);
    }
    if (operator === QueryComparisonOperator.IsNull && value.kind !== 'boolean') {
      throw new GraphQlAdapterError('isNull requires a boolean value');
    }
    if ([QueryComparisonOperator.In, QueryComparisonOperator.NotIn].includes(operator)
        && value.kind !== 'list') {
      throw new GraphQlAdapterError('in/notIn requires a list value');
    }
    return { compare: { field, operator, value: queryValue(value) } };
  });
}

function collapseAnd(clauses, emptyMessage) {
  if (clauses.length === 0) {
    throw new GraphQlAdapterError(emptyMessage);
  }
  return clauses.length === 1 ? clauses[0] : { and: clauses };
}

function lowerOrder(node, mapping) {
  const entries = node.kind === 'list' ? node.value : [node];
  if (entries.length === 0 || entries.some((entry) => entry.kind !== 'object')) {
    throw new GraphQlAdapterError('order arguments must be objects or non-empty lists of objects');
  }
  return entries.map((entry) => {
    if (entry.value.length !== 2) {
      throw new GraphQlAdapterError('order entries support only field and direction');
    }
    return {
      field: mapping.mappedSymbol(symbol(objectField(entry.value, 'field'))),
      direction: sortDirection(objectField(entry.value, 'direction')),
    };
  });
}

function lowerGroup(node, mapping) {
  const values = node.kind === 'list' ? node.value : [node];
  if (values.length === 0) {
    throw new GraphQlAdapterError('group lists must not be empty');
  }
  return values.map((value) => mapping.mappedSymbol(symbol(value)));
}

function lowerMutation(node, mapping) {
  if (node.kind !== 'object' || node.value.length === 0) {
    throw new GraphQlAdapterError('mutation input arguments must be non-empty objects');
  }
  return Object.fromEntries(
    node.value.map(([field, value]) => [mapping.mappedField(field), queryValue(value)]),
  );
}

function queryValue(node) {
  if (node.kind === 'list') {
    return node.value.map(queryValue);
  }
  if (node.kind === 'object') {
    throw new GraphQlAdapterError(
      'nested GraphQL input objects require explicit field mappings',
    );
  }
  return node.value;
}

function nonNegativeInteger(node, role) {
  if (node.kind !== 'integer' || !Number.isSafeInteger(node.value) || node.value < 0) {
    throw new GraphQlAdapterError(`GraphQL ${role} must be a non-negative integer`);
  }
  return node.value;
}

function symbol(node) {
  if (node.kind !== 'enum' && node.kind !== 'string') {
    throw new GraphQlAdapterError(
      'canonical field references must be GraphQL enums or strings',
    );
  }
  return node.value;
}

function sortDirection(node) {
  const value = symbol(node).toLowerCase();
  if (value === 'asc') {
    return QuerySortDirection.Ascending;
  }
  if (value === 'desc') {
    return QuerySortDirection.Descending;
  }
  throw new GraphQlAdapterError(`unsupported sort direction ${JSON.stringify(value)}`);
}

function objectField(fields, name) {
  const entry = fields.find(([field]) => field === name);
  if (!entry) {
    throw new GraphQlAdapterError(`missing object field ${JSON.stringify(name)}`);
  }
  return entry[1];
}

function validatePlan(plan) {
  if (plan.projection.length === 0 && plan.aggregates.length === 0) {
    throw new GraphQlAdapterError('a query plan requires a projection or aggregate');
  }
  if ([QueryOperation.Insert, QueryOperation.Update].includes(plan.operation)
      && Object.keys(plan.mutation).length === 0) {
    throw new GraphQlAdapterError('insert/update mutations require a mapped mutation input');
  }
  if ([QueryOperation.Select, QueryOperation.Delete].includes(plan.operation)
      && Object.keys(plan.mutation).length !== 0) {
    throw new GraphQlAdapterError('select/delete operations cannot contain mutation assignments');
  }
}

function attachPlanLinks(network, plan, cstRoot) {
  const planConcept = network.insertPoint('executable-query-plan');
  const references = [planConcept];
  for (const sourceEvidence of plan._sourceEvidence) {
    const concept = network.insertPoint(sourceEvidence.role());
    const child = network.insertLink(
      [concept, cstRoot],
      LinkMetadata.new()
        .withLinkType(LinkType.Semantic)
        .withNamed(true)
        .withTerm(sourceEvidence.role())
        .withLanguage('GraphQL')
        .withSpan(sourceEvidence.span()),
    );
    references.push(child);
  }
  references.push(cstRoot);
  return network.insertLink(
    references,
    LinkMetadata.new()
      .withLinkType(LinkType.Semantic)
      .withNamed(true)
      .withTerm('executable-query-plan')
      .withLanguage('GraphQL')
      .withSpan(plan._sourceEvidence[0].span()),
  );
}

function evidence(source, role, span) {
  return new QuerySourceEvidence(role, sourceSpan(source, span));
}

function sourceSpan(source, span) {
  const encoder = new TextEncoder();
  return new SourceSpan(
    new ByteRange(
      encoder.encode(source.slice(0, span.start)).length,
      encoder.encode(source.slice(0, span.end)).length,
    ),
    pointAt(source, span.start),
    pointAt(source, span.end),
  );
}

function pointAt(source, offset) {
  const prefix = source.slice(0, offset);
  const lines = prefix.split('\n');
  return new Point(lines.length - 1, new TextEncoder().encode(lines.at(-1)).length);
}

function parseDocument(source) {
  const parser = new Parser(lex(source));
  return parser.parseDocument();
}

function lex(source) {
  const tokens = [];
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (/\s|,/.test(character)) {
      cursor += 1;
    } else if (character === '#') {
      const newline = source.indexOf('\n', cursor);
      cursor = newline === -1 ? source.length : newline + 1;
    } else if (/[A-Za-z_]/.test(character)) {
      const start = cursor;
      cursor += 1;
      while (/[A-Za-z0-9_]/.test(source[cursor] ?? '')) {
        cursor += 1;
      }
      tokens.push({ kind: 'name', value: source.slice(start, cursor), span: { start, end: cursor } });
    } else if (character === '"') {
      const start = cursor;
      if (source.startsWith('"""', cursor)) {
        throw new GraphQlAdapterError(`GraphQL block strings are not supported at byte ${cursor}`);
      }
      cursor = stringEnd(source, cursor);
      let value;
      try {
        value = JSON.parse(source.slice(start, cursor));
      } catch (error) {
        throw new GraphQlAdapterError(`invalid GraphQL string at byte ${start}: ${error.message}`);
      }
      tokens.push({ kind: 'string', value, span: { start, end: cursor } });
    } else if (character === '-' || /\d/.test(character)) {
      const start = cursor;
      cursor += 1;
      while (/[-+.eE\d]/.test(source[cursor] ?? '')) {
        cursor += 1;
      }
      const raw = source.slice(start, cursor);
      if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)) {
        throw new GraphQlAdapterError(`invalid GraphQL number at byte ${start}`);
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new GraphQlAdapterError(`invalid GraphQL number at byte ${start}`);
      }
      if (!/[.eE]/.test(raw) && !Number.isSafeInteger(value)) {
        throw new GraphQlAdapterError(`GraphQL integer is outside the safe range at byte ${start}`);
      }
      tokens.push({
        kind: /[.eE]/.test(raw) ? 'float' : 'integer',
        value,
        span: { start, end: cursor },
      });
    } else if ('!$():=@[]{|}'.includes(character)) {
      tokens.push({ kind: 'punctuation', value: character, span: { start: cursor, end: cursor + 1 } });
      cursor += 1;
    } else {
      throw new GraphQlAdapterError(
        `unsupported GraphQL token ${JSON.stringify(character)} at byte ${cursor}`,
      );
    }
  }
  tokens.push({ kind: 'end', span: { start: source.length, end: source.length } });
  return tokens;
}

function stringEnd(source, start) {
  let escaped = false;
  for (let cursor = start + 1; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '"') {
      return cursor + 1;
    } else if (character === '\n' || character === '\r') {
      break;
    }
  }
  throw new GraphQlAdapterError(`unterminated GraphQL string at byte ${start}`);
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.cursor = 0;
  }

  parseDocument() {
    let operation;
    if (this.takeName('query')) {
      operation = GraphQlOperationType.Query;
    } else if (this.takeName('mutation')) {
      operation = GraphQlOperationType.Mutation;
    } else if (this.atPunctuation('{')) {
      operation = GraphQlOperationType.Query;
    } else {
      this.error('expected query, mutation, or shorthand selection');
    }
    if (this.current().kind === 'name') {
      this.cursor += 1;
    }
    if (this.atPunctuation('(')) {
      this.error('GraphQL variables are not supported; bind literal values first');
    }
    const rootFields = this.parseSelectionSet();
    if (this.current().kind !== 'end') {
      this.error('multiple operations, fragments, and trailing tokens are unsupported');
    }
    return { operation, rootFields };
  }

  parseSelectionSet() {
    this.expectPunctuation('{');
    const fields = [];
    while (!this.atPunctuation('}')) {
      if (this.current().kind === 'end') {
        this.error('unterminated selection set');
      }
      fields.push(this.parseField());
    }
    this.expectPunctuation('}');
    if (fields.length === 0) {
      this.error('empty selection sets are unsupported');
    }
    return fields;
  }

  parseField() {
    const first = this.expectName();
    const start = first.span.start;
    let alias = null;
    let name = first.value;
    if (this.takePunctuation(':')) {
      alias = name;
      name = this.expectName().value;
    }
    const args = [];
    if (this.takePunctuation('(')) {
      while (!this.atPunctuation(')')) {
        if (this.current().kind === 'end') {
          this.error('unterminated field arguments');
        }
        const argumentName = this.expectName().value;
        this.expectPunctuation(':');
        const value = this.parseValue();
        if (args.some((argument) => argument.name === argumentName)) {
          this.error('duplicate field argument');
        }
        args.push({ name: argumentName, value });
      }
      this.expectPunctuation(')');
    }
    const selection = this.atPunctuation('{') ? this.parseSelectionSet() : [];
    return {
      alias,
      name,
      arguments: args,
      selection,
      span: { start, end: this.tokens[this.cursor - 1].span.end },
    };
  }

  parseValue() {
    const token = this.current();
    if (['string', 'integer', 'float'].includes(token.kind)) {
      this.cursor += 1;
      return token;
    }
    if (token.kind === 'name') {
      this.cursor += 1;
      if (token.value === 'null') return { ...token, kind: 'null', value: null };
      if (token.value === 'true') return { ...token, kind: 'boolean', value: true };
      if (token.value === 'false') return { ...token, kind: 'boolean', value: false };
      return { ...token, kind: 'enum' };
    }
    if (this.takePunctuation('[')) {
      const values = [];
      while (!this.atPunctuation(']')) {
        if (this.current().kind === 'end') this.error('unterminated list value');
        values.push(this.parseValue());
      }
      const end = this.expectPunctuation(']').span.end;
      return { kind: 'list', value: values, span: { start: token.span.start, end } };
    }
    if (this.takePunctuation('{')) {
      const fields = [];
      while (!this.atPunctuation('}')) {
        if (this.current().kind === 'end') this.error('unterminated object value');
        const name = this.expectName().value;
        this.expectPunctuation(':');
        const value = this.parseValue();
        if (fields.some(([field]) => field === name)) this.error('duplicate object field');
        fields.push([name, value]);
      }
      const end = this.expectPunctuation('}').span.end;
      return { kind: 'object', value: fields, span: { start: token.span.start, end } };
    }
    this.error('expected a literal GraphQL value');
  }

  current() {
    return this.tokens[this.cursor];
  }

  atPunctuation(value) {
    return this.current().kind === 'punctuation' && this.current().value === value;
  }

  takePunctuation(value) {
    if (!this.atPunctuation(value)) return false;
    this.cursor += 1;
    return true;
  }

  expectPunctuation(value) {
    if (!this.atPunctuation(value)) this.error(`expected ${JSON.stringify(value)}`);
    const token = this.current();
    this.cursor += 1;
    return token;
  }

  takeName(value) {
    if (this.current().kind !== 'name' || this.current().value !== value) return false;
    this.cursor += 1;
    return true;
  }

  expectName() {
    if (this.current().kind !== 'name') this.error('expected a GraphQL name');
    const token = this.current();
    this.cursor += 1;
    return token;
  }

  error(message) {
    throw new GraphQlAdapterError(`${message} at byte ${this.current().span.start}`);
  }
}
