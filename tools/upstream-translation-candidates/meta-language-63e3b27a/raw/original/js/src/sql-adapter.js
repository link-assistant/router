import {
  ByteRange,
  LinkMetadata,
  LinkType,
  Point,
  SourceSpan,
} from './primitives.js';
import { LinkNetwork } from './network.js';
import { parseSqlOperation } from './query-plan-parser.js';
import {
  LoweredQueryPlan,
  QueryAggregateFunction,
  QueryComparisonOperator,
  QueryOperation,
  QueryPlan,
  QuerySortDirection,
  QuerySourceEvidence,
  SqlAdapterError,
  SqlAdapterErrorKind,
} from './query-plan.js';

export const SQL_DIALECT_PROFILES = Object.freeze([
  Object.freeze({ key: 'sql-ansi', vendor: 'ANSI SQL' }),
  Object.freeze({ key: 'sql-postgres', vendor: 'PostgreSQL' }),
  Object.freeze({ key: 'sql-mysql', vendor: 'MySQL' }),
  Object.freeze({ key: 'sql-sqlite', vendor: 'SQLite' }),
  Object.freeze({ key: 'sql-server', vendor: 'SQL Server' }),
  Object.freeze({ key: 'sql-oracle', vendor: 'Oracle' }),
  Object.freeze({ key: 'sql-bigquery', vendor: 'BigQuery' }),
  Object.freeze({ key: 'sql-snowflake', vendor: 'Snowflake' }),
]);

export class SqlRelationMapping {
  constructor(sourceRelation, resource) {
    this.sourceRelation = String(sourceRelation);
    this.resource = String(resource);
    this.fields = new Map();
  }

  withField(sourceName, canonicalField) {
    this.fields.set(String(sourceName), String(canonicalField));
    return this;
  }

  mappedField(source) {
    const matches = [...this.fields.entries()]
      .filter(([name]) => name.toLowerCase() === String(source).toLowerCase())
      .map(([, canonical]) => canonical);
    if (matches.length === 1) return matches[0];
    if (matches.length === 0) {
      throw semantic(
        `unmapped SQL field ${JSON.stringify(source)} for relation ${JSON.stringify(this.sourceRelation)}`,
      );
    }
    throw registryError(
      `ambiguous SQL field mapping ${JSON.stringify(source)} for relation ${JSON.stringify(this.sourceRelation)}`,
    );
  }
}

export class SqlSchemaRegistry {
  constructor() {
    this.relations = new Map();
  }

  registerRelation(mapping) {
    validateMapping(mapping);
    const duplicate = [...this.relations.keys()]
      .some((name) => name.toLowerCase() === mapping.sourceRelation.toLowerCase());
    if (duplicate) {
      throw registryError(
        `duplicate or case-ambiguous SQL relation mapping ${JSON.stringify(mapping.sourceRelation)}`,
      );
    }
    this.relations.set(mapping.sourceRelation, mapping);
    return this;
  }

  relation(path) {
    const source = path.join('.');
    const matches = [...this.relations.entries()]
      .filter(([name]) => name.toLowerCase() === source.toLowerCase())
      .map(([, mapping]) => mapping);
    if (matches.length === 1) return matches[0];
    if (matches.length === 0) {
      throw semantic(`unmapped SQL relation ${JSON.stringify(source)}`);
    }
    throw registryError(`ambiguous SQL relation mapping ${JSON.stringify(source)}`);
  }

  static fromJson(value) {
    if (!value || !Array.isArray(value.relations)) {
      throw registryError('registry.relations must be an array');
    }
    const registry = new SqlSchemaRegistry();
    for (const relation of value.relations) {
      for (const field of ['sourceRelation', 'resource']) {
        if (typeof relation?.[field] !== 'string') {
          throw registryError(`registry field ${JSON.stringify(field)} must be a string`);
        }
      }
      if (!relation.fields || Array.isArray(relation.fields)
          || typeof relation.fields !== 'object') {
        throw registryError('relation.fields must be an object');
      }
      let mapping = new SqlRelationMapping(relation.sourceRelation, relation.resource);
      for (const [source, canonical] of Object.entries(relation.fields)) {
        if (typeof canonical !== 'string') {
          throw registryError('canonical SQL fields must be strings');
        }
        mapping = mapping.withField(source, canonical);
      }
      registry.registerRelation(mapping);
    }
    return registry;
  }
}

export function lowerSql(source, language, registry) {
  if (!(registry instanceof SqlSchemaRegistry)) {
    throw new TypeError('lowerSql requires a SqlSchemaRegistry');
  }
  ensureProfile(language);
  const text = String(source);
  const operation = parseSqlOperation(text);
  const plan = lowerOperation(operation, registry);
  const span = sourceSpan(text);
  plan._sourceEvidence.push(new QuerySourceEvidence(`statement:${language}`, span));

  const network = LinkNetwork.parse(text, language);
  const tokens = network.links()
    .filter((link) => link.metadata().linkType === LinkType.SourceToken)
    .map((link) => link.id());
  const cstRoot = network.insertSyntaxNode(language, operation.kind, tokens, span);
  const rootLink = attachPlanLinks(network, plan, cstRoot, language);
  return new LoweredQueryPlan(plan, network, rootLink);
}

export const lowerSQL = lowerSql;
export const lower_sql = lowerSql;

function lowerOperation(operation, registry) {
  switch (operation.kind) {
    case 'select':
      return lowerSelect(operation, registry);
    case 'insert':
      return lowerInsert(operation, registry);
    case 'update':
      return lowerUpdate(operation, registry);
    case 'delete':
      return lowerDelete(operation, registry);
    default:
      throw semantic(`unsupported SQL operation ${JSON.stringify(operation.kind)}`);
  }
}

function lowerSelect(operation, registry) {
  if (operation.distinct) {
    throw semantic('SELECT DISTINCT requires an explicit query-plan extension');
  }
  if (operation.from === null) {
    throw semantic('SELECT without FROM has no canonical resource');
  }
  const mapping = registry.relation(operation.from.path);
  const plan = new QueryPlan(QueryOperation.Select, mapping.resource);
  for (const projection of operation.projection) {
    lowerProjection(projection, mapping, operation.from, plan);
  }
  if (plan.projection.length === 0 && plan.aggregates.length === 0) {
    throw semantic('SELECT requires a mapped projection or aggregate');
  }
  plan.filter = operation.filter === null
    ? null
    : lowerFilter(operation.filter, mapping, operation.from);
  plan.groupBy = operation.groupBy.map(
    (expression) => mappedColumn(expression, mapping, operation.from),
  );
  plan.order = operation.orderBy.map(({ expression, direction }) => ({
    field: mappedColumn(expression, mapping, operation.from),
    direction: direction === 'ascending'
      ? QuerySortDirection.Ascending
      : QuerySortDirection.Descending,
  }));
  plan.limit = operation.limit;
  plan.offset = operation.offset;
  return plan;
}

function lowerProjection(projection, mapping, source, plan) {
  const { expression } = projection;
  if (expression.kind === 'column') {
    if (projection.alias !== null) {
      throw semantic('non-aggregate projection aliases are not represented by the query plan');
    }
    const field = mappedPath(expression.path, mapping, source);
    if (!plan.projection.includes(field)) plan.projection.push(field);
    return;
  }
  if (expression.kind !== 'aggregate') {
    throw semantic('SQL projection expression is outside the shared query-plan subset');
  }
  if (expression.distinct) {
    throw semantic('DISTINCT aggregates require an explicit query-plan extension');
  }
  let field;
  if (expression.expression.kind === 'wildcard' && expression.function === 'count') {
    field = null;
  } else {
    field = mappedColumn(expression.expression, mapping, source);
  }
  plan.aggregates.push({
    function: aggregateFunction(expression.function),
    field,
    alias: projection.alias,
  });
}

function lowerInsert(operation, registry) {
  const mapping = registry.relation(operation.into.path);
  if (operation.rows.length !== 1) {
    throw semantic('multi-row INSERT requires an explicit query-plan extension');
  }
  if (operation.columns.length === 0) {
    throw semantic('INSERT requires an explicit mapped column list');
  }
  const plan = new QueryPlan(QueryOperation.Insert, mapping.resource);
  for (let index = 0; index < operation.columns.length; index += 1) {
    plan.mutation[mapping.mappedField(operation.columns[index])] = lowerValue(
      operation.rows[0][index],
    );
  }
  return plan;
}

function lowerUpdate(operation, registry) {
  const mapping = registry.relation(operation.table.path);
  const plan = new QueryPlan(QueryOperation.Update, mapping.resource);
  for (const assignment of operation.assignments) {
    plan.mutation[mappedPath(assignment.column, mapping, operation.table)] = lowerValue(
      assignment.value,
    );
  }
  plan.filter = operation.filter === null
    ? null
    : lowerFilter(operation.filter, mapping, operation.table);
  return plan;
}

function lowerDelete(operation, registry) {
  const mapping = registry.relation(operation.from.path);
  const plan = new QueryPlan(QueryOperation.Delete, mapping.resource);
  plan.filter = operation.filter === null
    ? null
    : lowerFilter(operation.filter, mapping, operation.from);
  return plan;
}

function lowerFilter(expression, mapping, source) {
  if (expression.kind === 'unary' && expression.operator === 'not') {
    return { not: lowerFilter(expression.operand, mapping, source) };
  }
  if (expression.kind !== 'binary') {
    throw semantic('SQL predicate is outside the shared query-plan subset');
  }
  if (expression.operator === 'and' || expression.operator === 'or') {
    return {
      [expression.operator]: [
        lowerFilter(expression.left, mapping, source),
        lowerFilter(expression.right, mapping, source),
      ],
    };
  }
  const field = mappedColumn(expression.left, mapping, source);
  const [operator, value] = comparison(expression.operator, expression.right);
  return { compare: { field, operator, value } };
}

function comparison(operator, right) {
  const operators = {
    equal: QueryComparisonOperator.Equal,
    not_equal: QueryComparisonOperator.NotEqual,
    less_than: QueryComparisonOperator.LessThan,
    less_than_or_equal: QueryComparisonOperator.LessThanOrEqual,
    greater_than: QueryComparisonOperator.GreaterThan,
    greater_than_or_equal: QueryComparisonOperator.GreaterThanOrEqual,
    like: QueryComparisonOperator.Like,
  };
  if (operator === 'is' || operator === 'is_not') {
    if (right.kind !== 'literal' || right.value.kind !== 'null') {
      throw semantic('only IS NULL and IS NOT NULL are in the shared query-plan subset');
    }
    return [QueryComparisonOperator.IsNull, operator === 'is'];
  }
  if (!(operator in operators)) {
    throw semantic('SQL comparison requires an explicit query-plan extension');
  }
  return [operators[operator], lowerValue(right)];
}

function mappedColumn(expression, mapping, source) {
  if (expression.kind !== 'column') {
    throw semantic('query-plan fields must be direct mapped SQL columns');
  }
  return mappedPath(expression.path, mapping, source);
}

function mappedPath(path, mapping, source) {
  const field = path.at(-1);
  if (field === undefined) throw semantic('SQL column path is empty');
  if (path.length > 1) {
    const qualifier = path.slice(0, -1).join('.').toLowerCase();
    const sourceName = source.path.join('.').toLowerCase();
    const sourceTail = source.path.at(-1).toLowerCase();
    const alias = source.alias?.toLowerCase();
    if (![sourceName, sourceTail, alias].includes(qualifier)) {
      throw semantic(
        `SQL column qualifier ${JSON.stringify(qualifier)} does not identify the mapped relation`,
      );
    }
  }
  return mapping.mappedField(field);
}

function lowerValue(expression) {
  if (expression.kind === 'literal') {
    switch (expression.value.kind) {
      case 'null': return null;
      case 'boolean':
      case 'string': return expression.value.value;
      case 'number': return parseNumber(expression.value.value);
      default: throw semantic('unsupported SQL literal');
    }
  }
  if (expression.kind === 'unary'
      && ['negate', 'positive'].includes(expression.operator)) {
    const value = lowerValue(expression.operand);
    if (typeof value !== 'number') {
      throw semantic('numeric unary operators require a numeric SQL literal');
    }
    return expression.operator === 'negate' ? -value : value;
  }
  throw semantic('query-plan values must be bounded SQL literals');
}

function parseNumber(source) {
  const value = Number(source);
  if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
    throw semantic('SQL number is outside the cross-language safe range');
  }
  return value;
}

function aggregateFunction(source) {
  const aggregates = {
    count: QueryAggregateFunction.Count,
    sum: QueryAggregateFunction.Sum,
    avg: QueryAggregateFunction.Average,
    min: QueryAggregateFunction.Minimum,
    max: QueryAggregateFunction.Maximum,
    variance_population: QueryAggregateFunction.PopulationVariance,
    standard_deviation_population: QueryAggregateFunction.PopulationStandardDeviation,
  };
  return aggregates[source];
}

function validateMapping(mapping) {
  if (!(mapping instanceof SqlRelationMapping)) {
    throw new TypeError('registry entries must be SqlRelationMapping instances');
  }
  if (!mapping.sourceRelation.trim() || !mapping.resource.trim()) {
    throw registryError('SQL relation and canonical resource names must not be empty');
  }
  if (mapping.fields.size === 0) {
    throw registryError('SQL relation mappings require at least one explicit field');
  }
  const names = [...mapping.fields.keys()];
  for (const [index, name] of names.entries()) {
    if (!name.trim() || !mapping.fields.get(name).trim()) {
      throw registryError('SQL field mapping names must not be empty');
    }
    if (names.slice(index + 1).some((other) => other.toLowerCase() === name.toLowerCase())) {
      throw registryError(`case-ambiguous SQL field mapping ${JSON.stringify(name)}`);
    }
  }
}

function ensureProfile(language) {
  const supported = SQL_DIALECT_PROFILES
    .some(({ key }) => key.toLowerCase() === String(language).toLowerCase());
  if (!supported) {
    throw new SqlAdapterError(
      SqlAdapterErrorKind.UnsupportedLanguage,
      `unsupported SQL profile ${JSON.stringify(language)}`,
    );
  }
}

function attachPlanLinks(network, plan, cstRoot, language) {
  const planConcept = network.insertPoint('executable-query-plan');
  const references = [planConcept];
  for (const evidence of plan._sourceEvidence) {
    const concept = network.insertPoint(evidence.role());
    const child = network.insertLink(
      [concept, cstRoot],
      LinkMetadata.new()
        .withLinkType(LinkType.Semantic)
        .withNamed(true)
        .withTerm(evidence.role())
        .withLanguage(language)
        .withSpan(evidence.span()),
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
      .withLanguage(language)
      .withSpan(plan._sourceEvidence[0].span()),
  );
}

function sourceSpan(source) {
  const encoder = new TextEncoder();
  const lines = source.split('\n');
  return new SourceSpan(
    new ByteRange(0, encoder.encode(source).length),
    new Point(0, 0),
    new Point(lines.length - 1, encoder.encode(lines.at(-1)).length),
  );
}

function semantic(message) {
  return new SqlAdapterError(SqlAdapterErrorKind.Semantic, message);
}

function registryError(message) {
  return new SqlAdapterError(SqlAdapterErrorKind.Registry, message);
}
