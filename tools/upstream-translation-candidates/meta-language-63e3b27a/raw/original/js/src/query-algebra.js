import { LinkId, LinkType, idKey } from './primitives.js';
import { LinkNetwork } from './network.js';
import { TextPattern, parseRule } from './query-algebra-syntax.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class LinkRuleParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LinkRuleParseError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeCaptureName(name) {
  return String(name).replace(/^@+/, '');
}

function ancestors(network, linkId) {
  const result = [];
  const visited = new Set();
  let current = LinkId.from(linkId);
  while (!visited.has(idKey(current))) {
    visited.add(idKey(current));
    const link = network.link(current);
    const references = link ? link.references() : [];
    const parent = references.length > 0 ? references[0] : undefined;
    if (parent === undefined) {
      break;
    }
    if (idKey(parent) === idKey(current)) {
      break;
    }
    result.push(LinkId.from(parent));
    current = LinkId.from(parent);
  }
  return result;
}

function depth(network, linkId) {
  return ancestors(network, linkId).length;
}

function isDescendant(network, descendant, ancestor) {
  return ancestors(network, descendant).some((id) => idKey(id) === idKey(ancestor));
}

function orderKey(network, linkId) {
  const link = network.link(linkId);
  const span = link ? link.metadata().span : undefined;
  const start = span ? span.byteRange.start : Number.MAX_SAFE_INTEGER;
  return [start, LinkId.from(linkId).asU64()];
}

function compareOrderKey(left, right) {
  if (left[0] !== right[0]) {
    return left[0] - right[0];
  }
  return left[1] - right[1];
}

function structuralChildren(network, parent) {
  const parentKey = idKey(parent);
  const children = network
    .links()
    .filter((link) => {
      const references = link.references();
      return references.length > 0 && idKey(references[0]) === parentKey;
    })
    .filter((link) => {
      const type = link.metadata().linkType;
      return type !== LinkType.Field && type !== LinkType.Trivia;
    })
    .map((link) => link.id());
  children.sort((left, right) =>
    compareOrderKey(orderKey(network, left), orderKey(network, right)),
  );
  return children;
}

// ---------------------------------------------------------------------------
// Captures
// ---------------------------------------------------------------------------

/** One rule capture. */
export class LinkRuleCapture {
  constructor(name, linkIds = [], text = undefined) {
    this._name = normalizeCaptureName(name);
    this._linkIds = linkIds.map((id) => LinkId.from(id));
    this._text = text;
  }

  /** Capture name without leading `@`. */
  name() {
    return this._name;
  }

  /** Captured link ids. */
  linkIds() {
    return [...this._linkIds];
  }

  /** Captured text when available. */
  text() {
    return this._text;
  }
}

/** Ordered captures created by a LinkRule. */
export class LinkRuleCaptures {
  constructor(values = []) {
    this.values = values;
  }

  withLink(name, linkId) {
    return new LinkRuleCaptures([
      ...this.values,
      new LinkRuleCapture(name, [linkId], undefined),
    ]);
  }

  withText(name, text, linkIds) {
    return new LinkRuleCaptures([
      ...this.values,
      new LinkRuleCapture(name, linkIds, text),
    ]);
  }

  merged(other) {
    return new LinkRuleCaptures([...this.values, ...other.values]);
  }

  /** Returns the first captured link id for `name`. */
  first(name) {
    const normalized = normalizeCaptureName(name);
    const capture = this.values.find((entry) => entry.name() === normalized);
    if (!capture) {
      return undefined;
    }
    const ids = capture.linkIds();
    return ids.length > 0 ? ids[0] : undefined;
  }

  /** Returns captured text for `name` when the capture came from text matching. */
  text(name) {
    const normalized = normalizeCaptureName(name);
    const capture = this.values.find((entry) => entry.name() === normalized);
    return capture ? capture.text() : undefined;
  }

  /** Iterates capture bindings in match order. */
  iter() {
    return [...this.values];
  }

  [Symbol.iterator]() {
    return this.values[Symbol.iterator]();
  }
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

/** One rule match. */
export class LinkRuleMatch {
  constructor(linkId, captures = new LinkRuleCaptures()) {
    this._linkId = LinkId.from(linkId);
    this._captures = captures;
  }

  static fromQueryMatch(queryMatch) {
    let captures = new LinkRuleCaptures();
    for (const [name, linkId] of queryMatch.captures) {
      captures = captures.withLink(name, linkId);
    }
    return new LinkRuleMatch(queryMatch.linkId, captures);
  }

  withLinkCapture(name, linkId) {
    return new LinkRuleMatch(this._linkId, this._captures.withLink(name, linkId));
  }

  merge(other) {
    if (idKey(this._linkId) !== idKey(other._linkId)) {
      return undefined;
    }
    return new LinkRuleMatch(this._linkId, this._captures.merged(other._captures));
  }

  mergeAs(linkId, other) {
    return new LinkRuleMatch(linkId, this._captures.merged(other._captures));
  }

  /** Selected link id. */
  linkId() {
    return this._linkId;
  }

  /** Capture bindings. */
  captures() {
    return this._captures;
  }
}

// ---------------------------------------------------------------------------
// Internal rule kinds
// ---------------------------------------------------------------------------

const Kind = Object.freeze({
  Query: 'Query',
  Kind: 'Kind',
  LinkType: 'LinkType',
  Language: 'Language',
  Named: 'Named',
  Capture: 'Capture',
  TypedMetavariable: 'TypedMetavariable',
  Inside: 'Inside',
  Has: 'Has',
  Precedes: 'Precedes',
  Follows: 'Follows',
  All: 'All',
  Any: 'Any',
  Not: 'Not',
  Ref: 'Ref',
  Ellipsis: 'Ellipsis',
  Text: 'Text',
});

// ---------------------------------------------------------------------------
// LinkRule
// ---------------------------------------------------------------------------

/** Composable rule over links. */
export class LinkRule {
  constructor(kind) {
    this.kind = kind;
  }

  /** Wraps an existing structural query as a composable rule. */
  static query(query) {
    return new LinkRule({ type: Kind.Query, query });
  }

  /** Matches links by metadata term/kind. */
  static kind(kind) {
    return new LinkRule({ type: Kind.Kind, kind: String(kind) });
  }

  /** Matches links by link type. */
  static linkType(linkType) {
    return new LinkRule({ type: Kind.LinkType, linkType });
  }

  /** Matches links by language. */
  static language(language) {
    return new LinkRule({ type: Kind.Language, language: String(language) });
  }

  /** Matches links by named flag (used by the `(named true|false)` surface). */
  static namedFlag(named) {
    return new LinkRule({ type: Kind.Named, named: Boolean(named) });
  }

  /** Captures links selected by `rule`. */
  static capture(name, rule) {
    return new LinkRule({
      type: Kind.Capture,
      name: normalizeCaptureName(name),
      rule,
    });
  }

  /** Captures links whose kind matches `kind`. */
  static typedMetavariable(name, kind) {
    return new LinkRule({
      type: Kind.TypedMetavariable,
      name: normalizeCaptureName(name),
      kind: String(kind),
    });
  }

  /** Matches `rule` only when selected links are inside `ancestor`. */
  static inside(rule, ancestor) {
    return new LinkRule({ type: Kind.Inside, rule, ancestor });
  }

  /** Matches `rule` only when selected links contain a descendant. */
  static has(rule, descendant) {
    return new LinkRule({ type: Kind.Has, rule, descendant });
  }

  /** Matches `rule` only when selected links precede `following`. */
  static precedes(rule, following) {
    return new LinkRule({ type: Kind.Precedes, rule, following });
  }

  /** Matches `rule` only when selected links follow `preceding`. */
  static follows(rule, preceding) {
    return new LinkRule({ type: Kind.Follows, rule, preceding });
  }

  /** Intersects rules by selected link id. */
  static all(rules) {
    return new LinkRule({ type: Kind.All, rules: [...rules] });
  }

  /** Unions rules by selected link id. */
  static any(rules) {
    return new LinkRule({ type: Kind.Any, rules: [...rules] });
  }

  /** Selects links not selected by `rule`. */
  static negate(rule) {
    return new LinkRule({ type: Kind.Not, rule });
  }

  /** Refers to a named rule in a LinkRuleRegistry. */
  static named(name) {
    return new LinkRule({ type: Kind.Ref, name: String(name) });
  }

  /** Matches a parent whose ordered children contain `before ... after`. */
  static ellipsisGap(before, after) {
    return new LinkRule({ type: Kind.Ellipsis, before, after });
  }

  /** Matches a full document's plain source text with `{{capture}}` holes. */
  static text(pattern) {
    return new LinkRule({ type: Kind.Text, pattern: TextPattern.parse(String(pattern)) });
  }

  /** Parses the documented rule-algebra S-expression surface. */
  static fromSexpression(source) {
    return parseRule(source);
  }

  /** Returns matches for this rule using `registry` for named sub-rules. */
  matches(network, registry) {
    const context = { network, registry };
    return dedupeMatches(this.evaluate(context, []));
  }

  evaluate(context, stack) {
    const { network, registry } = context;
    switch (this.kind.type) {
      case Kind.Query:
        return network
          .find(this.kind.query)
          .map((queryMatch) => LinkRuleMatch.fromQueryMatch(queryMatch));
      case Kind.Kind:
        return network
          .links()
          .filter((link) => link.metadata().term === this.kind.kind)
          .map((link) => new LinkRuleMatch(link.id()));
      case Kind.LinkType:
        return network
          .links()
          .filter((link) => link.metadata().linkType === this.kind.linkType)
          .map((link) => new LinkRuleMatch(link.id()));
      case Kind.Language:
        return network
          .links()
          .filter((link) => link.metadata().language === this.kind.language)
          .map((link) => new LinkRuleMatch(link.id()));
      case Kind.Named:
        return network
          .links()
          .filter((link) => link.metadata().named === this.kind.named)
          .map((link) => new LinkRuleMatch(link.id()));
      case Kind.Capture:
        return this.kind.rule.evaluate(context, stack).map((ruleMatch) =>
          ruleMatch.withLinkCapture(this.kind.name, ruleMatch.linkId()),
        );
      case Kind.TypedMetavariable:
        return network
          .links()
          .filter((link) => link.metadata().term === this.kind.kind)
          .map((link) =>
            new LinkRuleMatch(link.id()).withLinkCapture(this.kind.name, link.id()),
          );
      case Kind.Inside: {
        const ancestorIds = new Set(
          this.kind.ancestor
            .evaluate(context, stack)
            .map((ruleMatch) => idKey(ruleMatch.linkId())),
        );
        return this.kind.rule
          .evaluate(context, stack)
          .filter((ruleMatch) =>
            ancestors(network, ruleMatch.linkId()).some((ancestor) =>
              ancestorIds.has(idKey(ancestor)),
            ),
          );
      }
      case Kind.Has: {
        const descendants = this.kind.descendant.evaluate(context, stack);
        const result = [];
        for (const outer of this.kind.rule.evaluate(context, stack)) {
          for (const inner of descendants) {
            if (isDescendant(network, inner.linkId(), outer.linkId())) {
              result.push(outer.mergeAs(outer.linkId(), inner));
            }
          }
        }
        return result;
      }
      case Kind.Precedes: {
        const following = this.kind.following.evaluate(context, stack);
        const result = [];
        for (const left of this.kind.rule.evaluate(context, stack)) {
          for (const right of following) {
            if (
              compareOrderKey(
                orderKey(network, left.linkId()),
                orderKey(network, right.linkId()),
              ) < 0
            ) {
              result.push(left.mergeAs(left.linkId(), right));
            }
          }
        }
        return result;
      }
      case Kind.Follows: {
        const preceding = this.kind.preceding.evaluate(context, stack);
        const result = [];
        for (const right of this.kind.rule.evaluate(context, stack)) {
          for (const left of preceding) {
            if (
              compareOrderKey(
                orderKey(network, left.linkId()),
                orderKey(network, right.linkId()),
              ) < 0
            ) {
              result.push(right.mergeAs(right.linkId(), left));
            }
          }
        }
        return result;
      }
      case Kind.All: {
        const rules = this.kind.rules;
        if (rules.length === 0) {
          return [];
        }
        let acc = rules[0].evaluate(context, stack);
        for (let index = 1; index < rules.length; index += 1) {
          const matches = rules[index].evaluate(context, stack);
          acc = intersectMatches(acc, matches);
        }
        return acc;
      }
      case Kind.Any: {
        const matches = [];
        for (const rule of this.kind.rules) {
          matches.push(...rule.evaluate(context, stack));
        }
        return dedupeMatches(matches);
      }
      case Kind.Not: {
        const rejected = new Set(
          this.kind.rule
            .evaluate(context, stack)
            .map((ruleMatch) => idKey(ruleMatch.linkId())),
        );
        return network
          .links()
          .filter((link) => !rejected.has(idKey(link.id())))
          .map((link) => new LinkRuleMatch(link.id()));
      }
      case Kind.Ref: {
        const name = this.kind.name;
        if (stack.some((entry) => entry === name)) {
          return [];
        }
        const rule = registry.get(name);
        if (!rule) {
          return [];
        }
        stack.push(name);
        const matches = rule.evaluate(context, stack);
        stack.pop();
        return matches;
      }
      case Kind.Ellipsis:
        return ellipsisMatches(context, this.kind.before, this.kind.after, stack);
      case Kind.Text:
        return this.kind.pattern.matches(network);
      default:
        return [];
    }
  }
}

// snake_case aliases following the semantics.js precedent.
LinkRule.link_type = LinkRule.linkType;
LinkRule.typed_metavariable = LinkRule.typedMetavariable;
LinkRule.ellipsis_gap = LinkRule.ellipsisGap;
LinkRule.from_sexpression = LinkRule.fromSexpression;
// `named(name)` refers to a registry rule (matching Rust `LinkRule::named`);
// `namedFlag(bool)` matches the metadata named flag via the `(named ...)` surface.
LinkRule.named_flag = LinkRule.namedFlag;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** Named reusable rule registry. */
export class LinkRuleRegistry {
  constructor() {
    this.rules = new Map();
  }

  static new() {
    return new LinkRuleRegistry();
  }

  /** Returns a registry with `name` bound to `rule`. */
  withRule(name, rule) {
    this.insert(name, rule);
    return this;
  }

  /** Inserts or replaces a named reusable rule. */
  insert(name, rule) {
    this.rules.set(String(name), rule);
  }

  /** Looks up a named reusable rule. */
  get(name) {
    return this.rules.get(String(name));
  }
}

LinkRuleRegistry.prototype.with_rule = LinkRuleRegistry.prototype.withRule;

// ---------------------------------------------------------------------------
// Combinators / helpers
// ---------------------------------------------------------------------------

function ellipsisMatches(context, before, after, stack) {
  const { network } = context;
  const beforeMatches = before.evaluate(context, stack);
  const afterMatches = after.evaluate(context, stack);
  const beforeById = matchesById(beforeMatches);
  const afterById = matchesById(afterMatches);
  const matches = [];

  for (const parent of network.links()) {
    const children = structuralChildren(network, parent.id());
    for (let leftIndex = 0; leftIndex < children.length; leftIndex += 1) {
      const left = children[leftIndex];
      const leftMatches = beforeById.get(idKey(left));
      if (!leftMatches) {
        continue;
      }
      for (let rightIndex = leftIndex + 1; rightIndex < children.length; rightIndex += 1) {
        const right = children[rightIndex];
        const rightMatches = afterById.get(idKey(right));
        if (!rightMatches) {
          continue;
        }
        for (const leftMatch of leftMatches) {
          for (const rightMatch of rightMatches) {
            matches.push(leftMatch.mergeAs(parent.id(), rightMatch));
          }
        }
      }
    }
  }

  return matches;
}

function intersectMatches(left, right) {
  const rightById = matchesById(right);
  const result = [];
  for (const leftMatch of left) {
    const rightMatches = rightById.get(idKey(leftMatch.linkId()));
    if (!rightMatches) {
      continue;
    }
    for (const rightMatch of rightMatches) {
      const merged = leftMatch.merge(rightMatch);
      if (merged) {
        result.push(merged);
      }
    }
  }
  return result;
}

function matchesById(matches) {
  const byId = new Map();
  for (const ruleMatch of matches) {
    const key = idKey(ruleMatch.linkId());
    if (!byId.has(key)) {
      byId.set(key, []);
    }
    byId.get(key).push(ruleMatch);
  }
  return byId;
}

function dedupeMatches(matches) {
  const seen = new Set();
  const deduped = [];
  for (const ruleMatch of matches) {
    const key = idKey(ruleMatch.linkId());
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(ruleMatch);
    }
  }
  return deduped;
}

// ---------------------------------------------------------------------------
// Traversal
// ---------------------------------------------------------------------------

/** Summary from mutable traversal. */
export class TraversalReport {
  constructor(iterations = 0, visited = 0, changed = 0) {
    this._iterations = iterations;
    this._visited = visited;
    this._changed = changed;
  }

  iterations() {
    return this._iterations;
  }

  visited() {
    return this._visited;
  }

  changed() {
    return this._changed;
  }
}

const StrategyTag = Object.freeze({
  TopDown: 'TopDown',
  BottomUp: 'BottomUp',
  Innermost: 'Innermost',
  Fixpoint: 'Fixpoint',
});

/** Traversal ordering for rule matches. */
export class TraversalStrategy {
  constructor(tag, options = {}) {
    this.tag = tag;
    this.maxIterations = options.maxIterations;
  }

  static fixpoint(maxIterations) {
    return new TraversalStrategy(StrategyTag.Fixpoint, { maxIterations });
  }

  /** Returns rule matches ordered by this strategy. */
  matches(network, rule, registry) {
    let matches = rule.matches(network, registry);
    switch (this.tag) {
      case StrategyTag.TopDown:
      case StrategyTag.Fixpoint:
        matches.sort((left, right) =>
          compareDepthThenOrder(network, left, right, false),
        );
        break;
      case StrategyTag.BottomUp:
        matches.sort((left, right) =>
          compareDepthThenOrder(network, left, right, true),
        );
        break;
      case StrategyTag.Innermost: {
        const all = [...matches];
        matches = matches.filter(
          (candidate) =>
            !all.some(
              (other) =>
                idKey(other.linkId()) !== idKey(candidate.linkId()) &&
                isDescendant(network, other.linkId(), candidate.linkId()),
            ),
        );
        matches.sort((left, right) =>
          compareDepthThenOrder(network, left, right, true),
        );
        break;
      }
      default:
        break;
    }
    return matches;
  }

  /**
   * Visits matches according to this strategy. `Fixpoint` repeats until the
   * visitor returns no changes.
   */
  applyMut(network, rule, registry, visitor) {
    if (this.tag === StrategyTag.Fixpoint) {
      let iterations = 0;
      let visited = 0;
      let changed = 0;
      for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
        const matches = TraversalStrategy.TopDown.matches(network, rule, registry);
        if (matches.length === 0) {
          break;
        }
        iterations += 1;
        let changedThisIteration = 0;
        for (const ruleMatch of matches) {
          visited += 1;
          if (visitor(network, ruleMatch)) {
            changed += 1;
            changedThisIteration += 1;
          }
        }
        if (changedThisIteration === 0) {
          break;
        }
      }
      return new TraversalReport(iterations, visited, changed);
    }

    const matches = this.matches(network, rule, registry);
    let visited = 0;
    let changed = 0;
    const iterations = matches.length > 0 ? 1 : 0;
    for (const ruleMatch of matches) {
      visited += 1;
      if (visitor(network, ruleMatch)) {
        changed += 1;
      }
    }
    return new TraversalReport(iterations, visited, changed);
  }
}

TraversalStrategy.prototype.apply_mut = TraversalStrategy.prototype.applyMut;

TraversalStrategy.TopDown = new TraversalStrategy(StrategyTag.TopDown);
TraversalStrategy.BottomUp = new TraversalStrategy(StrategyTag.BottomUp);
TraversalStrategy.Innermost = new TraversalStrategy(StrategyTag.Innermost);
TraversalStrategy.Fixpoint = (options) =>
  new TraversalStrategy(StrategyTag.Fixpoint, {
    maxIterations: typeof options === 'number' ? options : options.maxIterations,
  });

function compareDepthThenOrder(network, left, right, reverseDepth) {
  const leftDepth = depth(network, left.linkId());
  const rightDepth = depth(network, right.linkId());
  if (leftDepth !== rightDepth) {
    return reverseDepth ? rightDepth - leftDepth : leftDepth - rightDepth;
  }
  return compareOrderKey(
    orderKey(network, left.linkId()),
    orderKey(network, right.linkId()),
  );
}

// ---------------------------------------------------------------------------
// Snapshot suite
// ---------------------------------------------------------------------------

/** Expected outcome for a rule snapshot case. */
export const LinkRuleSnapshotExpectation = Object.freeze({
  Valid: 'Valid',
  Invalid: 'Invalid',
});

/** One valid/invalid source case for a rule suite. */
export class LinkRuleSnapshotCase {
  constructor(name, source, language, expectation) {
    this._name = String(name);
    this._source = String(source);
    this._language = String(language);
    this._expectation = expectation;
  }

  static new(name, source, language, expectation) {
    return new LinkRuleSnapshotCase(name, source, language, expectation);
  }

  name() {
    return this._name;
  }

  source() {
    return this._source;
  }

  language() {
    return this._language;
  }

  expectation() {
    return this._expectation;
  }
}

/** Valid/invalid rule snapshot suite. */
export class LinkRuleSnapshotSuite {
  constructor(rule) {
    this._rule = rule;
    this._cases = [];
  }

  static new(rule) {
    return new LinkRuleSnapshotSuite(rule);
  }

  /** Adds a case. */
  withCase(snapshotCase) {
    this._cases.push(snapshotCase);
    return this;
  }

  /** Runs all cases against freshly parsed sources. */
  run(registry, configuration, networkFactory = LinkNetwork.parse) {
    const cases = this._cases.map((snapshotCase) => {
      const network = networkFactory(
        snapshotCase.source(),
        snapshotCase.language(),
        configuration,
      );
      const matches = this._rule.matches(network, registry);
      const hasMatch = matches.length > 0;
      const passed =
        snapshotCase.expectation() === LinkRuleSnapshotExpectation.Valid
          ? hasMatch
          : !hasMatch;
      return new LinkRuleSnapshotResult(
        snapshotCase.name(),
        snapshotCase.expectation(),
        hasMatch,
        matches.length,
        passed,
      );
    });
    return new LinkRuleSnapshotReport(cases);
  }
}

LinkRuleSnapshotSuite.prototype.with_case = LinkRuleSnapshotSuite.prototype.withCase;

/** Snapshot suite result. */
export class LinkRuleSnapshotReport {
  constructor(cases = []) {
    this._cases = cases;
  }

  isSuccess() {
    return this._cases.every((snapshotCase) => snapshotCase.passed());
  }

  cases() {
    return [...this._cases];
  }
}

LinkRuleSnapshotReport.prototype.is_success = LinkRuleSnapshotReport.prototype.isSuccess;

/** One snapshot case result. */
export class LinkRuleSnapshotResult {
  constructor(name, expectation, matched, matchCount, passed) {
    this._name = name;
    this._expectation = expectation;
    this._matched = matched;
    this._matchCount = matchCount;
    this._passed = passed;
  }

  name() {
    return this._name;
  }

  expectation() {
    return this._expectation;
  }

  matched() {
    return this._matched;
  }

  matchCount() {
    return this._matchCount;
  }

  passed() {
    return this._passed;
  }
}

LinkRuleSnapshotResult.prototype.match_count =
  LinkRuleSnapshotResult.prototype.matchCount;
