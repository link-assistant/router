import type {
  LinkId,
  LinkNetwork,
  LinkQuery,
  LinkTypeValue,
  ParseConfiguration,
  QueryMatch,
} from './index.js';

export class LinkRuleParseError extends Error {
  constructor(message: string);
}

export class LinkRuleCapture {
  constructor(name: string, linkIds?: Array<LinkId | number>, text?: string);
  name(): string;
  linkIds(): LinkId[];
  text(): string | undefined;
}

export class LinkRuleCaptures {
  constructor(values?: LinkRuleCapture[]);
  values: LinkRuleCapture[];
  withLink(name: string, linkId: LinkId | number): LinkRuleCaptures;
  withText(name: string, text: string, linkIds: Array<LinkId | number>): LinkRuleCaptures;
  merged(other: LinkRuleCaptures): LinkRuleCaptures;
  first(name: string): LinkId | undefined;
  text(name: string): string | undefined;
  iter(): LinkRuleCapture[];
  [Symbol.iterator](): Iterator<LinkRuleCapture>;
}

export class LinkRuleMatch {
  constructor(linkId: LinkId | number, captures?: LinkRuleCaptures);
  static fromQueryMatch(queryMatch: QueryMatch): LinkRuleMatch;
  withLinkCapture(name: string, linkId: LinkId | number): LinkRuleMatch;
  merge(other: LinkRuleMatch): LinkRuleMatch | undefined;
  mergeAs(linkId: LinkId | number, other: LinkRuleMatch): LinkRuleMatch;
  linkId(): LinkId;
  captures(): LinkRuleCaptures;
}

export class LinkRule {
  static query(query: LinkQuery): LinkRule;
  static kind(kind: string): LinkRule;
  static linkType(linkType: LinkTypeValue): LinkRule;
  static link_type(linkType: LinkTypeValue): LinkRule;
  static language(language: string): LinkRule;
  static namedFlag(named: boolean): LinkRule;
  static named_flag(named: boolean): LinkRule;
  static capture(name: string, rule: LinkRule): LinkRule;
  static typedMetavariable(name: string, kind: string): LinkRule;
  static typed_metavariable(name: string, kind: string): LinkRule;
  static inside(rule: LinkRule, ancestor: LinkRule): LinkRule;
  static has(rule: LinkRule, descendant: LinkRule): LinkRule;
  static precedes(rule: LinkRule, following: LinkRule): LinkRule;
  static follows(rule: LinkRule, preceding: LinkRule): LinkRule;
  static all(rules: LinkRule[]): LinkRule;
  static any(rules: LinkRule[]): LinkRule;
  static negate(rule: LinkRule): LinkRule;
  static named(name: string): LinkRule;
  static ellipsisGap(before: LinkRule, after: LinkRule): LinkRule;
  static ellipsis_gap(before: LinkRule, after: LinkRule): LinkRule;
  static text(pattern: string): LinkRule;
  static fromSexpression(source: string): LinkRule;
  static from_sexpression(source: string): LinkRule;
  matches(network: LinkNetwork, registry: LinkRuleRegistry): LinkRuleMatch[];
}

export class LinkRuleRegistry {
  constructor();
  static new(): LinkRuleRegistry;
  rules: Map<string, LinkRule>;
  withRule(name: string, rule: LinkRule): LinkRuleRegistry;
  with_rule(name: string, rule: LinkRule): LinkRuleRegistry;
  insert(name: string, rule: LinkRule): void;
  get(name: string): LinkRule | undefined;
}

export class TraversalReport {
  constructor(iterations?: number, visited?: number, changed?: number);
  iterations(): number;
  visited(): number;
  changed(): number;
}

export class TraversalStrategy {
  static TopDown: TraversalStrategy;
  static BottomUp: TraversalStrategy;
  static Innermost: TraversalStrategy;
  static Fixpoint: (options: number | { maxIterations: number }) => TraversalStrategy;
  matches(network: LinkNetwork, rule: LinkRule, registry: LinkRuleRegistry): LinkRuleMatch[];
  applyMut(
    network: LinkNetwork,
    rule: LinkRule,
    registry: LinkRuleRegistry,
    visitor: (network: LinkNetwork, match: LinkRuleMatch) => boolean,
  ): TraversalReport;
  apply_mut(
    network: LinkNetwork,
    rule: LinkRule,
    registry: LinkRuleRegistry,
    visitor: (network: LinkNetwork, match: LinkRuleMatch) => boolean,
  ): TraversalReport;
}

export type LinkRuleSnapshotExpectationValue = 'Valid' | 'Invalid';
export const LinkRuleSnapshotExpectation: { Valid: 'Valid'; Invalid: 'Invalid' };

export class LinkRuleSnapshotCase {
  constructor(
    name: string,
    source: string,
    language: string,
    expectation: LinkRuleSnapshotExpectationValue,
  );
  static new(
    name: string,
    source: string,
    language: string,
    expectation: LinkRuleSnapshotExpectationValue,
  ): LinkRuleSnapshotCase;
  name(): string;
  source(): string;
  language(): string;
  expectation(): LinkRuleSnapshotExpectationValue;
}

export class LinkRuleSnapshotSuite {
  constructor(rule: LinkRule);
  static new(rule: LinkRule): LinkRuleSnapshotSuite;
  withCase(snapshotCase: LinkRuleSnapshotCase): LinkRuleSnapshotSuite;
  with_case(snapshotCase: LinkRuleSnapshotCase): LinkRuleSnapshotSuite;
  run(
    registry: LinkRuleRegistry,
    configuration?: ParseConfiguration,
    networkFactory?: (source: string, language: string, configuration?: ParseConfiguration) => LinkNetwork,
  ): LinkRuleSnapshotReport;
}

export class LinkRuleSnapshotReport {
  constructor(cases?: LinkRuleSnapshotResult[]);
  isSuccess(): boolean;
  is_success(): boolean;
  cases(): LinkRuleSnapshotResult[];
}

export class LinkRuleSnapshotResult {
  constructor(
    name: string,
    expectation: LinkRuleSnapshotExpectationValue,
    matched: boolean,
    matchCount: number,
    passed: boolean,
  );
  name(): string;
  expectation(): LinkRuleSnapshotExpectationValue;
  matched(): boolean;
  matchCount(): number;
  match_count(): number;
  passed(): boolean;
}
