import {
  ByteRange,
  LinkMetadata,
  LinkNetwork,
  LinkQuery,
  LinkType,
  ParseConfiguration,
  Point,
  Probability,
  ProbabilisticTruthValue,
  ReplacementRule,
  SourceSpan,
  SubstitutionRule,
  TranslationRule,
  TranslationRuleSet,
  TruthValue,
} from '#meta-language';
import { rewriteJavaScriptIdentifier } from './rml-js-rename.mjs';
import { evaluate, parseLino } from './rml-links.mjs';
import { attachRmlStructure, rmlStructuredForms, rmlRepresentationStages } from './rml-meta-structure.mjs';
export * from './rml-meta-structure.mjs';

const RML_META_LANGUAGE = 'RML';
const JAVA_SCRIPT_LANGUAGE = 'JavaScript';

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function defaultConfiguration(configuration) {
  return configuration ?? ParseConfiguration.default();
}

function linkIdValue(id) {
  return typeof id?.asU64 === 'function' ? id.asU64() : Number(id);
}

/**
 * Preserve source tokens and attach the registered RML syntax extension.
 */
function parseRmlToMetaLanguage(source, options = {}) {
  const language = options.language ?? RML_META_LANGUAGE;
  const network = LinkNetwork.parse(String(source), language, defaultConfiguration(options.configuration));
  attachRmlStructure(network, String(source), language);
  return network;
}

/**
 * Render the source a meta-language network holds, every character in order.
 *
 * meta-language 0.46 flags an unmatched "(" itself as missing, so
 * `reconstructText()` drops it, even inside a quoted reference or a comment;
 * the Rust crate adds a separate missing ")" instead and keeps the "(".
 * Rendering every source token keeps the round trip lossless in both.
 */
function reconstructRmlFromMetaLanguage(network, language = RML_META_LANGUAGE) {
  return network.renderSource(language);
}

function parseRmlLinksViaMetaLanguage(source, options = {}) {
  return rmlStructuredForms(parseRmlToMetaLanguage(source, options), options.language ?? RML_META_LANGUAGE);
}

function rmlMetaLanguageParityReport(source, options = {}) {
  const text = String(source);
  const language = options.language ?? RML_META_LANGUAGE;
  const network = parseRmlToMetaLanguage(text, options);
  const reconstructed = reconstructRmlFromMetaLanguage(network, language);
  const directLinks = parseLino(text);
  const metaLinks = rmlStructuredForms(network, language);
  const direct = evaluate(text, options.evaluationOptions ?? {});
  const meta = evaluate(reconstructed, options.evaluationOptions ?? {});

  return {
    language,
    stages: rmlRepresentationStages(network, language),
    reconstructed,
    networkLinkCount: network.len(),
    roundTripOk: reconstructed === text,
    directLinks,
    metaLinks,
    linkParityOk: sameJson(directLinks, metaLinks),
    directResults: direct.results,
    metaResults: meta.results,
    directDiagnostics: direct.diagnostics,
    metaDiagnostics: meta.diagnostics,
    evaluationParityOk: sameJson(direct.results, meta.results) &&
      sameJson(direct.diagnostics, meta.diagnostics),
  };
}

function rewriteJavaScriptIdentifierViaMetaLanguage(source, from, to) {
  const network = LinkNetwork.parse(String(source), JAVA_SCRIPT_LANGUAGE, ParseConfiguration.default());
  return rewriteJavaScriptIdentifier(network.renderSource(JAVA_SCRIPT_LANGUAGE), from, to);
}

function metaLanguageSubstitutionSmoke() {
  const network = new LinkNetwork();
  const a = network.insertPoint('a');
  const b = network.insertPoint('b');
  const relation = network.insertLink(
    [a],
    LinkMetadata.new().withLinkType(LinkType.Relation),
  );
  const report = network.applySubstitution(new SubstitutionRule([a], [b]));
  const changed = network.link(relation)
    ?.references()
    .some(reference => linkIdValue(reference) === linkIdValue(b)) ?? false;

  return {
    updated: report.updated().length,
    changed,
  };
}

function renderMetaLanguageTranslationSmoke(source = '(namespace self)') {
  const network = parseRmlToMetaLanguage(source);
  const rules = new TranslationRuleSet('rml-smoke').withRule(
    new TranslationRule(
      'any-source-token',
      LinkQuery.byType(LinkType.SourceToken).withTerm('('),
    ).withTemplate('text', 'translated'),
  );

  return network.reconstructTextAsWithRules('text', ParseConfiguration.default(), rules);
}

function metaLanguageTruthSmoke() {
  const half = ProbabilisticTruthValue.fromRatio(1, 2);

  return {
    conjunction: TruthValue.True.and(TruthValue.Unknown).toString(),
    probabilityBasisPoints: Probability.fromRatio(1, 4).basisPoints(),
    probabilisticAndBasisPoints: half.and(half).trueProbability().basisPoints(),
  };
}

function metaLanguageFeatureReport(source = '(namespace self)\n(? (a = a))\n') {
  return {
    packageName: 'meta-language',
    rml: rmlMetaLanguageParityReport(source),
    substitution: metaLanguageSubstitutionSmoke(),
    translation: renderMetaLanguageTranslationSmoke('(namespace self)'),
    truth: metaLanguageTruthSmoke(),
  };
}

export {
  ByteRange,
  LinkMetadata,
  LinkNetwork,
  LinkQuery,
  LinkType,
  ParseConfiguration,
  Point,
  Probability,
  ProbabilisticTruthValue,
  ReplacementRule,
  SourceSpan,
  SubstitutionRule,
  TranslationRule,
  TranslationRuleSet,
  TruthValue,
  metaLanguageFeatureReport,
  metaLanguageSubstitutionSmoke,
  metaLanguageTruthSmoke,
  parseRmlLinksViaMetaLanguage,
  parseRmlToMetaLanguage,
  reconstructRmlFromMetaLanguage,
  renderMetaLanguageTranslationSmoke,
  rewriteJavaScriptIdentifierViaMetaLanguage,
  rmlMetaLanguageParityReport,
};

export * from './rml-upstream-language.mjs';
