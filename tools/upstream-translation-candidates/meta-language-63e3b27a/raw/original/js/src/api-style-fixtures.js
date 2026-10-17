import { LinkNetwork } from './network.js';
import { LinkMetadata, LinkType, ParseConfiguration } from './primitives.js';
import { LinkQuery } from './query.js';
import { SubstitutionRule } from './substitution.js';
import { ReplacementRule } from './transform.js';
import { TranslationRule, TranslationRuleSet } from './translation.js';

export const ApiOperation = Object.freeze({
  Parse: 'parse',
  Query: 'query',
  Transform: 'transform',
  Substitute: 'substitute',
  Serialize: 'serialize',
  Snapshot: 'snapshot',
  Translate: 'translate',
  Verify: 'verify',
});

export const ApiStyle = Object.freeze({
  DirectMethod: 'DirectMethod',
  FluentChain: 'FluentChain',
  LinkCliSubstitutionText: 'LinkCliSubstitutionText',
  SexpressionOrLinoText: 'SexpressionOrLinoText',
  ALL: ['DirectMethod', 'FluentChain', 'LinkCliSubstitutionText', 'SexpressionOrLinoText'],
});

export const ApiStyleFixtureKind = Object.freeze({
  Executable: 'Executable',
  NotApplicable: 'NotApplicable',
});

export class ApiStyleFixture {
  constructor(kind, value) {
    this.kind = kind;
    this.value = value;
  }

  static executable(name) {
    return new ApiStyleFixture(ApiStyleFixtureKind.Executable, name);
  }

  static notApplicable(reason) {
    return new ApiStyleFixture(ApiStyleFixtureKind.NotApplicable, reason);
  }
}

export class ApiStyleCell {
  constructor(style, fixture) {
    this.styleName = style;
    this.fixture = fixture;
  }

  style() {
    return this.styleName;
  }
}

export class ApiOperationEntry {
  constructor(operation, styles) {
    this.operation = operation;
    this._styles = styles;
  }

  name() {
    return this.operation;
  }

  styles() {
    return [...this._styles];
  }

  style(style) {
    return this._styles.find((cell) => cell.style() === style);
  }
}

const LINK_CLI_PARSE_NA =
  'link-cli substitution text mutates existing links; it is not a source parser';
const LINK_CLI_SERIALIZE_NA =
  'link-cli substitution text is an operation command, not a network serializer';
const LINK_CLI_SNAPSHOT_NA =
  'link-cli substitution text has no immutable versioning primitive';
const LINK_CLI_TRANSLATE_NA =
  'link-cli substitution text rewrites links and does not select target languages';
const LINK_CLI_VERIFY_NA =
  'link-cli substitution text has no diagnostic verification primitive';
const TEXT_SNAPSHOT_NA =
  'snapshots carry runtime version provenance and are not a standalone text DSL';
const TEXT_VERIFY_NA =
  'verification consumes an existing network rather than a standalone text DSL';

export const API_OPERATIONS = Object.freeze([
  new ApiOperationEntry(ApiOperation.Parse, [
    executable(ApiStyle.DirectMethod, 'parse.direct'),
    executable(ApiStyle.FluentChain, 'parse.fluent'),
    notApplicable(ApiStyle.LinkCliSubstitutionText, LINK_CLI_PARSE_NA),
    executable(ApiStyle.SexpressionOrLinoText, 'parse.lino_text'),
  ]),
  new ApiOperationEntry(ApiOperation.Query, [
    executable(ApiStyle.DirectMethod, 'query.direct'),
    executable(ApiStyle.FluentChain, 'query.fluent'),
    executable(ApiStyle.LinkCliSubstitutionText, 'query.link_cli_read_identity'),
    executable(ApiStyle.SexpressionOrLinoText, 'query.sexpression'),
  ]),
  new ApiOperationEntry(ApiOperation.Transform, [
    executable(ApiStyle.DirectMethod, 'transform.direct'),
    executable(ApiStyle.FluentChain, 'transform.fluent'),
    executable(ApiStyle.LinkCliSubstitutionText, 'transform.link_cli_update'),
    executable(ApiStyle.SexpressionOrLinoText, 'transform.sexpression'),
  ]),
  new ApiOperationEntry(ApiOperation.Substitute, [
    executable(ApiStyle.DirectMethod, 'substitute.direct'),
    executable(ApiStyle.FluentChain, 'substitute.fluent'),
    executable(ApiStyle.LinkCliSubstitutionText, 'substitute.link_cli_crud'),
    executable(ApiStyle.SexpressionOrLinoText, 'substitute.lino_text'),
  ]),
  new ApiOperationEntry(ApiOperation.Serialize, [
    executable(ApiStyle.DirectMethod, 'serialize.direct'),
    executable(ApiStyle.FluentChain, 'serialize.fluent'),
    notApplicable(ApiStyle.LinkCliSubstitutionText, LINK_CLI_SERIALIZE_NA),
    executable(ApiStyle.SexpressionOrLinoText, 'serialize.lino_roundtrip'),
  ]),
  new ApiOperationEntry(ApiOperation.Snapshot, [
    executable(ApiStyle.DirectMethod, 'snapshot.direct'),
    executable(ApiStyle.FluentChain, 'snapshot.fluent'),
    notApplicable(ApiStyle.LinkCliSubstitutionText, LINK_CLI_SNAPSHOT_NA),
    notApplicable(ApiStyle.SexpressionOrLinoText, TEXT_SNAPSHOT_NA),
  ]),
  new ApiOperationEntry(ApiOperation.Translate, [
    executable(ApiStyle.DirectMethod, 'translate.direct'),
    executable(ApiStyle.FluentChain, 'translate.fluent'),
    notApplicable(ApiStyle.LinkCliSubstitutionText, LINK_CLI_TRANSLATE_NA),
    executable(ApiStyle.SexpressionOrLinoText, 'translate.lino_rules'),
  ]),
  new ApiOperationEntry(ApiOperation.Verify, [
    executable(ApiStyle.DirectMethod, 'verify.direct'),
    executable(ApiStyle.FluentChain, 'verify.fluent'),
    notApplicable(ApiStyle.LinkCliSubstitutionText, LINK_CLI_VERIFY_NA),
    notApplicable(ApiStyle.SexpressionOrLinoText, TEXT_VERIFY_NA),
  ]),
]);

export function runApiStyleFixture(name) {
  switch (name) {
    case 'parse.direct':
      return ensure(
        LinkNetwork.parse('alpha', 'txt', ParseConfiguration.default()).reconstructText() === 'alpha',
        'direct parse did not round-trip',
      );
    case 'parse.fluent':
      return ensure(
        LinkNetwork.parseFluent('alpha', 'txt', ParseConfiguration.default()).reconstruct() ===
          'alpha',
        'fluent parse did not round-trip',
      );
    case 'parse.lino_text':
      return ensure(
        LinkNetwork.parse('(1: 1 1)', 'LiNo', ParseConfiguration.default())
          .links()
          .some((link) => link.metadata().linkType === LinkType.Relation),
        'LiNo text parse did not create a relation',
      );
    case 'query.direct': {
      const network = queryFixtureNetwork();
      return ensure(
        network.queryLinks(LinkQuery.byType(LinkType.Concept).withTerm('needle')).length === 1,
        'direct query did not find the concept',
      );
    }
    case 'query.fluent': {
      const pipeline = queryFixtureNetwork().intoFluent().find(
        LinkQuery.byType(LinkType.Concept).withTerm('needle'),
      );
      return ensure(pipeline.matches.length === 1, 'fluent query did not retain one match');
    }
    case 'query.link_cli_read_identity': {
      const network = linkCliIdentityNetwork();
      const report = network.applyLinkCliSubstitutionText('((1: 1 1)) ((1: 1 1))');
      return ensure(
        report.updated().map((id) => id.asU64()).join(',') === '1',
        'link-cli read identity did not echo the matched link',
      );
    }
    case 'query.sexpression':
      return ensure(
        LinkNetwork.parse('const value = 1;\n', 'JavaScript', ParseConfiguration.default()).find(
          LinkQuery.fromSexpression('(identifier) @name'),
        ).length > 0,
        'S-expression query did not match identifiers',
      );
    case 'transform.direct':
      return ensure(
        directTransformOutput() === 'const renamed = call(renamed);\n',
        'direct transform output mismatch',
      );
    case 'transform.fluent':
      return ensure(
        fluentTransformOutput() === 'const renamed = call(renamed);\n',
        'fluent transform output mismatch',
      );
    case 'transform.link_cli_update': {
      const network = linkCliIdentityNetwork();
      const report = network.applyLinkCliSubstitutionText('((1: 1 1)) ((1: 1 2))');
      return ensure(
        report.updated().map((id) => id.asU64()).join(',') === '1' &&
          network.link(1).references().map((id) => id.asU64()).join(',') === '1,2',
        'link-cli update did not rewrite the matched link',
      );
    }
    case 'transform.sexpression':
      return runApiStyleFixture('transform.direct');
    case 'substitute.direct':
      return directSubstitutionFixture(false);
    case 'substitute.fluent':
      return directSubstitutionFixture(true);
    case 'substitute.link_cli_crud':
    case 'substitute.lino_text':
      return linkCliCrudFixture();
    case 'serialize.direct':
    case 'serialize.lino_roundtrip': {
      const network = LinkNetwork.parse('alpha', 'txt', ParseConfiguration.default());
      const lino = network.toLino();
      return ensure(LinkNetwork.fromLino(lino).toLino() === lino, 'LiNo round-trip failed');
    }
    case 'serialize.fluent':
      return ensure(
        LinkNetwork.fromLino(
          LinkNetwork.parse('alpha', 'txt', ParseConfiguration.default()).intoFluent().serialize(),
        ),
        'fluent serialization did not produce loadable LiNo',
      );
    case 'snapshot.direct': {
      const snapshot = LinkNetwork.parse('alpha', 'txt', ParseConfiguration.default()).snapshot(
        1,
        'fixture',
      );
      return ensure(
        snapshot.version() === 1 && snapshot.network().reconstructText() === 'alpha',
        'direct snapshot did not preserve the network',
      );
    }
    case 'snapshot.fluent': {
      const snapshot = LinkNetwork.parse('alpha', 'txt', ParseConfiguration.default())
        .intoFluent()
        .snapshot(1, 'fixture');
      return ensure(
        snapshot.version() === 1 && snapshot.network().reconstructText() === 'alpha',
        'fluent snapshot did not preserve the network',
      );
    }
    case 'translate.direct': {
      const [network, rules] = translationFixture();
      return ensure(
        network.reconstructTextAsWithRules('Spanish', ParseConfiguration.default(), rules) ===
          'hola',
        'direct translation fixture failed',
      );
    }
    case 'translate.fluent': {
      const [network, rules] = translationFixture();
      return ensure(
        network
          .intoFluent()
          .translate('Spanish', ParseConfiguration.default(), rules) === 'hola',
        'fluent translation fixture failed',
      );
    }
    case 'translate.lino_rules': {
      const [, rules] = translationFixture();
      return ensure(
        JSON.stringify(TranslationRuleSet.fromLino(rules.toLino())) === JSON.stringify(rules),
        'LiNo translation rules did not round-trip',
      );
    }
    case 'verify.direct':
      return ensure(
        LinkNetwork.parse('alpha', 'txt', ParseConfiguration.default()).verifyFullMatch().isClean(),
        'direct verification reported a clean fixture as invalid',
      );
    case 'verify.fluent':
      return ensure(
        LinkNetwork.parse('alpha', 'txt', ParseConfiguration.default())
          .intoFluent()
          .verify()
          .isClean(),
        'fluent verification reported a clean fixture as invalid',
      );
    default:
      throw new Error(`unknown API-style fixture ${name}`);
  }
}

function executable(style, name) {
  return new ApiStyleCell(style, ApiStyleFixture.executable(name));
}

function notApplicable(style, reason) {
  return new ApiStyleCell(style, ApiStyleFixture.notApplicable(reason));
}

function queryFixtureNetwork() {
  const network = new LinkNetwork();
  network.insertPoint('needle');
  return network;
}

function linkCliIdentityNetwork() {
  const network = new LinkNetwork();
  network.insertLinkWithOptionalId(
    1,
    [1, 1],
    LinkMetadata.new().withLinkType(LinkType.Relation),
  );
  return network;
}

function transformFixtureNetwork() {
  return LinkNetwork.parse(
    'const oldName = call(oldName);\n',
    'JavaScript',
    ParseConfiguration.default(),
  );
}

function transformQuery() {
  return LinkQuery.fromSexpression(`
    (identifier) @target
    (#eq? @target "oldName")
  `);
}

function directTransformOutput() {
  const network = transformFixtureNetwork();
  const report = network.replace(
    network.find(transformQuery()),
    ReplacementRule.capturedText('target', 'renamed'),
  );
  ensure(!report.isEmpty(), 'direct transform made no replacements');
  return network.reconstructText();
}

function fluentTransformOutput() {
  return transformFixtureNetwork()
    .intoFluent()
    .find(transformQuery())
    .replace(ReplacementRule.capturedText('target', 'renamed'))
    .reconstruct();
}

function directSubstitutionFixture(fluent) {
  const network = new LinkNetwork();
  const one = network.insertPoint('1');
  const two = network.insertPoint('2');
  const relation = network.insertLink(
    [one, one],
    LinkMetadata.new().withLinkType(LinkType.Relation),
  );
  const rule = new SubstitutionRule([one, one], [one, two]);
  const report = fluent
    ? network.intoFluent().substitute(rule).lastReport().substitution()
    : network.applySubstitution(rule);
  return ensure(
    report.updated().map((id) => id.asU64()).join(',') === String(relation.asU64()),
    'structural substitution did not update the relation',
  );
}

function linkCliCrudFixture() {
  const network = new LinkNetwork();
  const create = network.applyLinkCliSubstitutionText('() ((1 1))');
  const relation = create.created()[0];
  const update = network.applyLinkCliSubstitutionText('((1: 1 1)) ((1: 1 2))');
  const deletion = network.applyLinkCliSubstitutionText('((1 2)) ()');
  return ensure(
    relation.asU64() === 1 &&
      update.updated().map((id) => id.asU64()).join(',') === '1' &&
      deletion.deleted().map((id) => id.asU64()).join(',') === '1',
    'link-cli create/update/delete fixture failed',
  );
}

function translationFixture() {
  const network = new LinkNetwork();
  const concept = network.insertConceptExpression('greeting', 'English', 'hello');
  network.insertLink(
    [concept],
    LinkMetadata.new()
      .withLinkType(LinkType.Semantic)
      .withNamed(true)
      .withTerm('proposition:greeting'),
  );
  const rules = new TranslationRuleSet('greeting').withRule(
    new TranslationRule(
      'spanish greeting',
      LinkQuery.byType(LinkType.Semantic).withTerm('proposition:greeting'),
    ).withTemplate('Spanish', 'hola'),
  );
  return [network, rules];
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
