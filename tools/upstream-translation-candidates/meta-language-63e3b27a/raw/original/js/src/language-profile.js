import { currentConceptId } from './concept-records.js';
import { LinkMetadata, LinkType } from './primitives.js';

const PROFILE_TERM = 'language-profile';
const PROFILE_LINK_TYPE_TERM = 'language-profile:link-type';
const PROFILE_CONCEPT_TERM = 'language-profile:concept';
const PROFILE_TRANSLATION_RULE_TERM = 'language-profile:translation-rule';

// Rust `LinkType` carries a richer enum than the JS primitives currently expose.
// We map the JS members that have a Rust counterpart and emit the Rust
// `Display` spelling (lowercased) for capability definitions and diagnostics so
// declared/validated networks stay byte-compatible with the Rust port.
const LINK_TYPE_DISPLAY = Object.freeze({
  [LinkType.Concept]: 'concept',
  [LinkType.Dynamic]: 'dynamic',
  [LinkType.Field]: 'field',
  [LinkType.Language]: 'language',
  [LinkType.Object]: 'object',
  [LinkType.Relation]: 'relation',
  [LinkType.Semantic]: 'semantic',
  [LinkType.SourceToken]: 'token',
  [LinkType.Syntax]: 'syntax',
  [LinkType.Trivia]: 'trivia',
});

function linkTypeDisplay(linkType) {
  return LINK_TYPE_DISPLAY[linkType] ?? String(linkType).toLowerCase();
}

// Stable ordering key for a link type, mirroring Rust's `BTreeSet<LinkType>`
// iteration by emitting a deterministic (here: display-name) order.
function linkTypeKey(linkType) {
  return linkTypeDisplay(linkType);
}

function sortedStrings(values) {
  return [...values].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function sortedLinkTypes(values) {
  return [...values].sort((left, right) => {
    const leftKey = linkTypeKey(left);
    const rightKey = linkTypeKey(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

// Profile and capability links are identified by their `definition`, mirroring
// the Rust profile's `with_definition`/`definition()`. The JS `LinkMetadata`
// (primitives.js) carries a first-class `definition` field for full parity.
function buildCapabilityMetadata(term, language, definition) {
  return LinkMetadata.new()
    .withLinkType(LinkType.Semantic)
    .withNamed(true)
    .withTerm(term)
    .withLanguage(language)
    .withDefinition(definition);
}

function metadataDefinition(metadata) {
  return metadata.definition;
}

function sameReferences(references, expected) {
  if (references.length !== expected.length) {
    return false;
  }
  return references.every((reference, index) => reference.equals(expected[index]));
}

function isProfileControlTerm(term) {
  return (
    term.startsWith('language-profile') ||
    term.startsWith('translation-rule:') ||
    term === 'translation-rule' ||
    term === 'translation-rule-set'
  );
}

/// Per-language capability profile for restricting transforms to supported features.
export class LanguageProfile {
  constructor(name, language) {
    this._name = String(name);
    this._language = String(language);
    this._linkTypes = new Set();
    this._concepts = new Set();
    this._translationRules = new Set();
    this._fallbacks = new Map();
  }

  /// Creates an empty profile for a target language.
  static new(name, language) {
    return new LanguageProfile(name, language);
  }

  /// Built-in JavaScript same-language profile.
  static javascript() {
    let profile = new LanguageProfile('JavaScript', 'JavaScript');
    for (const linkType of [
      LinkType.Relation,
      LinkType.Language,
      LinkType.Concept,
      LinkType.Syntax,
      LinkType.Field,
      LinkType.Trivia,
      LinkType.Token,
      LinkType.Semantic,
      LinkType.Object,
    ]) {
      profile = profile.withLinkType(linkType);
    }
    return profile;
  }

  /// Looks up a built-in profile by name.
  static builtin(name) {
    switch (String(name).toLowerCase()) {
      case 'javascript':
      case 'js':
        return LanguageProfile.javascript();
      default:
        return undefined;
    }
  }

  /// Computes a profile domain from a translation rule set.
  static fromRuleSet(name, language, ruleSet) {
    let profile = new LanguageProfile(name, language);
    for (const rule of ruleSet.rules) {
      profile = profile.withTranslationRule(rule.name);
      const query = rule.query;
      if (query && query.linkType !== undefined) {
        profile = profile.withLinkType(query.linkType);
      }
      if (query && query.term !== undefined) {
        profile = profile.withConcept(query.term);
      }
    }
    return profile;
  }

  static from_rule_set(name, language, ruleSet) {
    return LanguageProfile.fromRuleSet(name, language, ruleSet);
  }

  _clone() {
    const copy = new LanguageProfile(this._name, this._language);
    copy._linkTypes = new Set(this._linkTypes);
    copy._concepts = new Set(this._concepts);
    copy._translationRules = new Set(this._translationRules);
    copy._fallbacks = new Map(this._fallbacks);
    return copy;
  }

  /// Profile name.
  name() {
    return this._name;
  }

  /// Target language this profile constrains.
  language() {
    return this._language;
  }

  /// Supported link types (deterministic order, mirroring Rust `BTreeSet`).
  linkTypes() {
    return sortedLinkTypes(this._linkTypes);
  }

  link_types() {
    return this.linkTypes();
  }

  /// Supported concept or feature terms (sorted).
  concepts() {
    return sortedStrings(this._concepts);
  }

  /// Supported translation rule names (sorted).
  translationRules() {
    return sortedStrings(this._translationRules);
  }

  translation_rules() {
    return this.translationRules();
  }

  /// Unsupported concepts mapped to their documented lossy fallback (sorted by key).
  fallbacks() {
    return new Map(sortedStrings(this._fallbacks.keys()).map((key) => [key, this._fallbacks.get(key)]));
  }

  /// Returns a copy with a supported link type.
  withLinkType(linkType) {
    const copy = this._clone();
    copy._linkTypes.add(linkType);
    return copy;
  }

  with_link_type(linkType) {
    return this.withLinkType(linkType);
  }

  /// Returns a copy with a supported concept or feature term.
  withConcept(concept) {
    const copy = this._clone();
    copy._concepts.add(String(concept));
    return copy;
  }

  with_concept(concept) {
    return this.withConcept(concept);
  }

  /// Returns a copy with a supported translation rule name.
  withTranslationRule(rule) {
    const copy = this._clone();
    copy._translationRules.add(String(rule));
    return copy;
  }

  with_translation_rule(rule) {
    return this.withTranslationRule(rule);
  }

  /// Returns a copy that records an unsupported concept and its lossy fallback.
  withConceptFallback(concept, fallback) {
    const copy = this._clone();
    copy._fallbacks.set(String(concept), String(fallback));
    return copy;
  }

  with_concept_fallback(concept, fallback) {
    return this.withConceptFallback(concept, fallback);
  }

  /// The documented lossy fallback for a concept, or undefined. A former
  /// concept identity resolves to the concept that replaced it.
  conceptFallback(concept) {
    return this._fallbacks.get(concept) ?? this._fallbacks.get(currentConceptId(concept));
  }

  concept_fallback(concept) {
    return this.conceptFallback(concept);
  }

  /// Whether this profile supports a link type.
  supportsLinkType(linkType) {
    return this._linkTypes.has(linkType);
  }

  supports_link_type(linkType) {
    return this.supportsLinkType(linkType);
  }

  /// Whether this profile supports a concept or feature term. A former
  /// concept identity resolves to the concept that replaced it.
  supportsConcept(concept) {
    return this._concepts.has(concept) || this._concepts.has(currentConceptId(concept));
  }

  supports_concept(concept) {
    return this.supportsConcept(concept);
  }

  /// Whether this profile supports a translation rule name.
  supportsTranslationRule(rule) {
    return this._translationRules.has(rule);
  }

  supports_translation_rule(rule) {
    return this.supportsTranslationRule(rule);
  }

  /// Declares this profile as queryable links inside a network.
  declareIn(network) {
    const profile =
      this._profileLink(network) ??
      network.insertLink([], buildCapabilityMetadata(PROFILE_TERM, this._language, this._name));

    const capabilities = [];

    for (const linkType of this.linkTypes()) {
      capabilities.push(
        this._ensureCapabilityLink(network, profile, PROFILE_LINK_TYPE_TERM, linkTypeDisplay(linkType)),
      );
    }
    for (const concept of this.concepts()) {
      capabilities.push(this._ensureCapabilityLink(network, profile, PROFILE_CONCEPT_TERM, concept));
    }
    for (const rule of this.translationRules()) {
      capabilities.push(
        this._ensureCapabilityLink(network, profile, PROFILE_TRANSLATION_RULE_TERM, rule),
      );
    }

    return new LanguageProfileLinks(profile, capabilities);
  }

  declare_in(network) {
    return this.declareIn(network);
  }

  /// Validates that all typed links in a network stay inside this profile.
  validateNetwork(network) {
    for (const link of network.links()) {
      const metadata = link.metadata();
      const linkType = metadata.linkType;
      if (linkType !== undefined && !this.supportsLinkType(linkType)) {
        throw new LanguageProfileViolation(
          `link type \`${linkTypeDisplay(linkType)}\``,
          `Profile \`${this._name}\` for \`${this._language}\` does not support link type \`${linkTypeDisplay(linkType)}\`.`,
        );
      }

      if (
        this._concepts.size === 0 ||
        !(linkType === LinkType.Concept || linkType === LinkType.Semantic)
      ) {
        continue;
      }
      const term = metadata.term;
      if (term === undefined) {
        continue;
      }
      if (isProfileControlTerm(term) || this.supportsConcept(term)) {
        continue;
      }
      throw new LanguageProfileViolation(
        `concept \`${term}\``,
        `Profile \`${this._name}\` for \`${this._language}\` does not support concept \`${term}\`.`,
      );
    }
  }

  validate_network(network) {
    return this.validateNetwork(network);
  }

  _profileLink(network) {
    const found = network.links().find((link) => {
      const metadata = link.metadata();
      return (
        metadata.linkType === LinkType.Semantic &&
        metadata.term === PROFILE_TERM &&
        metadata.language === this._language &&
        metadataDefinition(metadata) === this._name
      );
    });
    return found?.id();
  }

  _ensureCapabilityLink(network, profile, term, definition) {
    const existing = network.links().find((link) => {
      const metadata = link.metadata();
      return (
        sameReferences(link.references(), [profile]) &&
        metadata.linkType === LinkType.Semantic &&
        metadata.term === term &&
        metadata.language === this._language &&
        metadataDefinition(metadata) === definition
      );
    });
    if (existing) {
      return existing.id();
    }

    return network.insertLink(
      [profile],
      buildCapabilityMetadata(term, this._language, definition),
    );
  }
}

/// Links inserted when a language profile is declared in a network.
export class LanguageProfileLinks {
  constructor(profile, capabilities = []) {
    this._profile = profile;
    this._capabilities = capabilities;
  }

  /// Root profile link.
  profile() {
    return this._profile;
  }

  /// Capability child links.
  capabilities() {
    return [...this._capabilities];
  }
}

/// A profile validation failure that can be recorded as a diagnostic link.
export class LanguageProfileViolation extends Error {
  constructor(feature, message) {
    super(`${message} Unsupported feature: ${feature}.`);
    this.name = 'LanguageProfileViolation';
    this._feature = feature;
    this._message = message;
  }

  /// Unsupported feature that caused the violation.
  feature() {
    return this._feature;
  }

  toString() {
    return this.message;
  }
}
