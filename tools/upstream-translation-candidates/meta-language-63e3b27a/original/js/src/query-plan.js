export const QUERY_PLAN_VERSION = 1;

export const QueryOperation = Object.freeze({
  Select: 'select',
  Insert: 'insert',
  Update: 'update',
  Delete: 'delete',
});

export const QueryAuthorization = Object.freeze({
  Required: 'Required',
});

export const SqlAdapterErrorKind = Object.freeze({
  UnsupportedLanguage: 'UnsupportedLanguage',
  InvalidConcreteSyntax: 'InvalidConcreteSyntax',
  Syntax: 'Syntax',
  Semantic: 'Semantic',
  Registry: 'Registry',
});

export class SqlAdapterError extends Error {
  constructor(kind, message, offset = undefined) {
    super(offset === undefined ? message : `${message} at byte ${offset}`);
    this.name = 'SqlAdapterError';
    this.kind = kind;
    this.offset = offset;
  }
}

export const QueryComparisonOperator = Object.freeze({
  Equal: 'eq',
  NotEqual: 'neq',
  LessThan: 'lt',
  LessThanOrEqual: 'lte',
  GreaterThan: 'gt',
  GreaterThanOrEqual: 'gte',
  In: 'in',
  NotIn: 'not-in',
  Like: 'like',
  IsNull: 'is-null',
});

export const QuerySortDirection = Object.freeze({
  Ascending: 'asc',
  Descending: 'desc',
});

export const QueryAggregateFunction = Object.freeze({
  Count: 'count',
  Sum: 'sum',
  Average: 'avg',
  Minimum: 'min',
  Maximum: 'max',
  PopulationVariance: 'variance-population',
  PopulationStandardDeviation: 'stddev-population',
});

export class QuerySourceEvidence {
  constructor(role, span) {
    this._role = String(role);
    this._span = span;
  }

  role() {
    return this._role;
  }

  span() {
    return this._span;
  }
}

export class QueryPlan {
  constructor(operation, resource) {
    if (!Object.values(QueryOperation).includes(operation)) {
      throw new TypeError(`unsupported query operation ${operation}`);
    }
    if (!resource) {
      throw new TypeError('query plan resource must not be empty');
    }
    this.operation = operation;
    this.resource = String(resource);
    this.projection = [];
    this.filter = null;
    this.order = [];
    this.limit = null;
    this.offset = null;
    this.groupBy = [];
    this.aggregates = [];
    this.mutation = {};
    this._sourceEvidence = [];
  }

  sourceEvidence() {
    return [...this._sourceEvidence];
  }

  authorization() {
    return QueryAuthorization.Required;
  }

  toCanonicalObject() {
    return {
      version: QUERY_PLAN_VERSION,
      operation: this.operation,
      resource: this.resource,
      projection: [...this.projection],
      filter: this.filter === null ? null : canonicalFilter(this.filter),
      order: this.order.map(({ field, direction }) => ({ field, direction })),
      limit: canonicalPagination(this.limit, 'limit'),
      offset: canonicalPagination(this.offset, 'offset'),
      groupBy: [...this.groupBy],
      aggregates: this.aggregates.map(({ function: aggregate, field, alias }) => ({
        function: aggregate,
        field: field ?? null,
        alias: alias ?? null,
      })),
      mutation: sortObject(this.mutation),
    };
  }

  canonicalJson() {
    return JSON.stringify(this.toCanonicalObject());
  }
}

export class LoweredQueryPlan {
  constructor(plan, network, rootLink) {
    this._plan = plan;
    this._network = network;
    this._rootLink = rootLink;
  }

  plan() {
    return this._plan;
  }

  network() {
    return this._network;
  }

  rootLink() {
    return this._rootLink;
  }
}

function canonicalPagination(value, role) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`query plan ${role} must be a non-negative exact integer`);
  }
  return value;
}

function canonicalFilter(filter) {
  if (filter?.compare) {
    const { field, operator, value } = filter.compare;
    return { compare: { field, operator, value: sortObject(value) } };
  }
  for (const operator of ['and', 'or']) {
    if (Array.isArray(filter?.[operator])) {
      return { [operator]: filter[operator].map(canonicalFilter) };
    }
  }
  if (filter?.not) {
    return { not: canonicalFilter(filter.not) };
  }
  throw new TypeError('query plan filter must use compare, and, or, or not');
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareUtf8(left, right))
        .map(([key, child]) => [key, sortObject(child)]),
    );
  }
  if (typeof value === 'number'
      && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) {
    throw new TypeError('query plan numbers must be finite and integers must be exact');
  }
  return value;
}

function compareUtf8(left, right) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    if (leftBytes[index] !== rightBytes[index]) {
      return leftBytes[index] - rightBytes[index];
    }
  }
  return leftBytes.length - rightBytes.length;
}
