import { Parser } from 'links-notation';

import { decoratorSet } from './decorators.js';
import { LinkMetadata, LinkType } from './primitives.js';
import { LinkQuery } from './query.js';
import { renderRuleSet } from './translation-renderer.js';

const RULE_SET_TERM = 'translation-rule-set';
const RULE_TERM = 'translation-rule';
const MATCH_TERM = 'translation-rule-match';
const REFERENCE_CAPTURE_LANGUAGE = 'translation-rule-reference-capture';
const LANGUAGE_FALLBACK_LANGUAGE = 'translation-rule-language-fallback';
const TEMPLATE_DEFINITION = 'translation-rule-template';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

export class TranslationTemplate {
  constructor(language, text) {
    this.language = language;
    this.text = text;
  }
}

export class TranslationRule {
  constructor(name, query, referenceCaptures = {}) {
    this.name = name;
    this.query = query;
    this.referenceCaptures = { ...referenceCaptures };
    this.templates = [];
  }

  withReferenceCapture(name, referenceIndex) {
    this.referenceCaptures[name] = referenceIndex;
    return this;
  }

  with_reference_capture(name, referenceIndex) {
    return this.withReferenceCapture(name, referenceIndex);
  }

  withTemplate(language, text) {
    this.templates.push(new TranslationTemplate(language, text));
    return this;
  }

  templateFor(language) {
    return this.templates.find((template) => template.language === language);
  }
}

export class TranslationRuleSet {
  constructor(name, rules = [], languageFallbacks = {}) {
    this.name = name;
    this.rules = rules;
    this.languageFallbacks = Object.fromEntries(
      sortedEntries(languageFallbacks).map(([language, fallbacks]) => [
        language,
        [...fallbacks],
      ]),
    );
  }

  withRule(rule) {
    this.rules.push(rule);
    return this;
  }

  withLanguageFallback(language, fallback) {
    const fallbacks = this.languageFallbacks[language] ?? [];
    if (!fallbacks.includes(fallback)) {
      fallbacks.push(fallback);
    }
    this.languageFallbacks[language] = fallbacks;
    return this;
  }

  with_language_fallback(language, fallback) {
    return this.withLanguageFallback(language, fallback);
  }

  /**
   * Renders `network` in `targetLanguage`. `options.decorators` holds
   * `translation-rule` decorators, applied as `decorated` applies them.
   */
  render(targetLanguage, network, rootLinkId = undefined, options = {}) {
    return renderRuleSet(this.decorated(options.decorators), network, targetLanguage, rootLinkId);
  }

  /**
   * The rule set the `translation-rule` decorators of `decorators` make of
   * this one, which is not changed. They see each template as `{ rule,
   * language, text }`: setting `text` rewrites the template and `drop`
   * removes it, so the language falls back as if the rule had no template.
   */
  decorated(decorators) {
    const set = decoratorSet(decorators);
    if (!set.has('translation-rule')) return this;
    const rules = this.rules.map((rule) => {
      const copy = new TranslationRule(rule.name, rule.query, rule.referenceCaptures);
      for (const template of rule.templates) {
        const decorated = set.decorate('translation-rule', { rule: rule.name, language: template.language, text: template.text });
        if (decorated !== null) copy.withTemplate(template.language, decorated.text);
      }
      return copy;
    });
    return new TranslationRuleSet(this.name, rules, this.languageFallbacks);
  }

  toLino() {
    const lines = [];
    let nextId = 1;
    const root = nextId;
    nextId += 1;
    lines.push(canonicalLine(root, [], {
      linkType: LinkType.Semantic,
      named: true,
      term: RULE_SET_TERM,
      definition: this.name,
    }));

    for (const [language, fallbacks] of sortedEntries(this.languageFallbacks)) {
      for (const fallback of fallbacks) {
        lines.push(canonicalLine(nextId, [root], {
          linkType: LinkType.Semantic,
          named: true,
          term: language,
          language: LANGUAGE_FALLBACK_LANGUAGE,
          definition: fallback,
        }));
        nextId += 1;
      }
    }

    for (const rule of this.rules) {
      const ruleId = nextId;
      nextId += 1;
      lines.push(canonicalLine(ruleId, [root], {
        linkType: LinkType.Semantic,
        named: true,
        term: RULE_TERM,
        definition: rule.name,
      }));
      lines.push(canonicalLine(nextId, [ruleId], {
        linkType: LinkType.Semantic,
        named: true,
        term: MATCH_TERM,
        definition: queryToRuleSpec(rule.query),
      }));
      nextId += 1;

      for (const [capture, referenceIndex] of sortedEntries(rule.referenceCaptures)) {
        lines.push(canonicalLine(nextId, [ruleId], {
          linkType: LinkType.Semantic,
          named: true,
          term: capture,
          language: REFERENCE_CAPTURE_LANGUAGE,
          definition: String(referenceIndex),
        }));
        nextId += 1;
      }

      for (const template of [...rule.templates].sort((left, right) => (
        left.language.localeCompare(right.language)
      ))) {
        lines.push(canonicalLine(nextId, [ruleId], {
          linkType: LinkType.Semantic,
          named: true,
          term: template.text,
          language: template.language,
          definition: TEMPLATE_DEFINITION,
        }));
        nextId += 1;
      }
    }

    return `${lines.join('\n')}\n`;
  }

  toJson() {
    return JSON.stringify({
      name: this.name,
      languageFallbacks: this.languageFallbacks,
      rules: this.rules.map((rule) => ({
        name: rule.name,
        query: {
          linkType: rule.query.linkType,
          term: rule.query.term,
          language: rule.query.language,
          named: rule.query.named,
          sexpression: rule.query.sexpression,
        },
        referenceCaptures: rule.referenceCaptures,
        templates: rule.templates,
      })),
    });
  }

  static fromLino(source) {
    if (source.trimStart().startsWith('{')) {
      return TranslationRuleSet.fromJson(source);
    }

    const links = parseCanonicalNetwork(source);
    const root = [...links.values()].find((link) => (
      link.metadata.linkType === LinkType.Semantic && link.metadata.term === RULE_SET_TERM
    ));
    if (!root) {
      throw new Error('translation rule structure error: missing translation-rule-set root');
    }

    const rules = [...links.values()]
      .filter((link) => (
        link.references[0] === root.id && link.metadata.term === RULE_TERM
      ))
      .sort((left, right) => left.id - right.id)
      .map((ruleLink) => loadRule(links, ruleLink));

    const languageFallbacks = {};
    for (const link of [...links.values()].sort((left, right) => left.id - right.id)) {
      if (
        link.references[0] !== root.id
        || link.metadata.language !== LANGUAGE_FALLBACK_LANGUAGE
      ) {
        continue;
      }
      const language = link.metadata.term;
      const fallback = link.metadata.definition;
      if (language === undefined || fallback === undefined) {
        throw new Error('translation rule structure error: invalid language fallback');
      }
      (languageFallbacks[language] ??= []).push(fallback);
    }

    return new TranslationRuleSet(
      root.metadata.definition ?? RULE_SET_TERM,
      rules,
      languageFallbacks,
    );
  }

  static fromJson(source) {
    const parsed = typeof source === 'string' ? JSON.parse(source) : source;
    return new TranslationRuleSet(
      parsed.name,
      parsed.rules.map((rule) => {
        const query = queryFromJson(rule.query);
        const restored = new TranslationRule(rule.name, query, rule.referenceCaptures);
        for (const template of rule.templates) {
          restored.withTemplate(template.language, template.text);
        }
        return restored;
      }),
      parsed.languageFallbacks ?? parsed.language_fallbacks ?? {},
    );
  }
}

function loadRule(links, ruleLink) {
  const name = ruleLink.metadata.definition;
  if (!name) {
    throw new Error('translation rule structure error: rule is missing a name');
  }
  const children = [...links.values()]
    .filter((link) => link.references[0] === ruleLink.id)
    .sort((left, right) => left.id - right.id);
  const match = children.find((link) => link.metadata.term === MATCH_TERM);
  const querySource = match?.metadata.definition;
  if (!querySource) {
    throw new Error('translation rule structure error: rule is missing a match query');
  }

  let rule = new TranslationRule(name, queryFromRuleSpec(querySource));
  for (const child of children) {
    if (child.metadata.term === MATCH_TERM) {
      continue;
    }
    if (child.metadata.language === REFERENCE_CAPTURE_LANGUAGE) {
      const capture = child.metadata.term;
      const referenceIndex = Number(child.metadata.definition);
      if (!capture) {
        throw new Error('translation rule structure error: reference capture is missing a capture name');
      }
      if (!Number.isInteger(referenceIndex)) {
        throw new Error('translation rule structure error: invalid reference capture index');
      }
      rule = rule.withReferenceCapture(capture, referenceIndex);
    } else if (child.metadata.definition === TEMPLATE_DEFINITION) {
      const target = child.metadata.language;
      const template = child.metadata.term;
      if (!target) {
        throw new Error('translation rule structure error: template is missing a target');
      }
      if (template === undefined) {
        throw new Error('translation rule structure error: template is missing source text');
      }
      rule = rule.withTemplate(target, template);
    }
  }

  return rule;
}

function parseCanonicalNetwork(source) {
  const links = new Map();
  for (const statement of new Parser({ comments: false }).parse(source)) {
    const id = numericId(statement.id, 'top-level statement must be an identified link');
    const references = [];
    let metadata;
    for (const value of statement.values) {
      if (value.id === 'meta') {
        metadata = decodeMetadata(value.values);
      } else if (value.values.length === 0) {
        references.push(numericId(value.id, 'statement reference must be a numeric link id'));
      } else {
        throw new Error('serialization structure error: statement values must be references or a meta sublink');
      }
    }
    if (!metadata) {
      throw new Error('serialization structure error: statement is missing its meta sublink');
    }
    links.set(id, { id, references, metadata });
  }
  return links;
}

function decodeMetadata(fields) {
  let metadata = LinkMetadata.new();
  for (const field of fields) {
    switch (field.id) {
      case 't':
        metadata = metadata.withLinkType(parseLinkType(singleValue(field)));
        break;
      case 'n':
        metadata = metadata.withNamed(singleValue(field) === '1');
        break;
      case 'term':
        metadata = metadata.withTerm(percentDecode(singleValue(field)));
        break;
      case 'def':
        metadata = metadata.withDefinition(percentDecode(singleValue(field)));
        break;
      case 'lang':
        metadata = metadata.withLanguage(percentDecode(singleValue(field)));
        break;
      case 'span':
      case 'flags':
      case 'reg':
        break;
      default:
        throw new Error(`serialization structure error: unknown meta field \`${field.id}\``);
    }
  }
  return metadata;
}

function singleValue(field) {
  if (field.values.length !== 1 || field.values[0].values.length !== 0) {
    throw new Error('serialization structure error: meta field must hold exactly one reference');
  }
  return field.values[0].id;
}

function canonicalLine(id, references, metadata) {
  const refs = references.length === 0 ? '' : ` ${references.join(' ')}`;
  const fields = [];
  if (metadata.linkType) {
    fields.push(` (t: ${linkTypeToToken(metadata.linkType)})`);
  }
  fields.push(` (n: ${metadata.named ? 1 : 0})`);
  if (metadata.term !== undefined) {
    fields.push(` (term: ${percentEncode(metadata.term)})`);
  }
  if (metadata.definition !== undefined) {
    fields.push(` (def: ${percentEncode(metadata.definition)})`);
  }
  if (metadata.language !== undefined) {
    fields.push(` (lang: ${percentEncode(metadata.language)})`);
  }
  return `(${id}:${refs} (meta:${fields.join('')}))`;
}

function queryToRuleSpec(query) {
  const entries = [];
  if (query.linkType !== undefined) {
    entries.push(['link_type', linkTypeToToken(query.linkType)]);
  }
  if (query.term !== undefined) {
    entries.push(['term', query.term]);
  }
  if (query.language !== undefined) {
    entries.push(['language', query.language]);
  }
  if (query.named !== undefined) {
    entries.push(['named', query.named]);
  }
  if (query.sexpression !== undefined) {
    entries.push(['sexpression', sexpressionSource(query.sexpression)]);
  }

  return JSON.stringify(Object.fromEntries(entries.sort(([left], [right]) => (
    left.localeCompare(right)
  ))));
}

function queryFromRuleSpec(source) {
  const parsed = JSON.parse(source);
  return queryFromJson({
    linkType: parsed.link_type,
    term: parsed.term,
    language: parsed.language,
    named: parsed.named,
    sexpression: parsed.sexpression,
  });
}

function queryFromJson(query) {
  let restored;
  if (typeof query.sexpression === 'string') {
    restored = LinkQuery.fromSexpression(query.sexpression);
  } else {
    restored = new LinkQuery({ sexpression: query.sexpression });
  }
  const linkType = query.link_type ?? query.linkType;
  if (linkType !== undefined) {
    restored = new LinkQuery({
      ...restored,
      linkType: parseLinkType(linkType),
    });
  }
  if (query.term !== undefined) {
    restored = restored.withTerm(query.term);
  }
  if (query.language !== undefined) {
    restored = restored.withLanguage(query.language);
  }
  if (query.named !== undefined) {
    restored = restored.withNamed(query.named);
  }
  return restored;
}

function parseLinkType(token) {
  const normalized = String(token).toLowerCase();
  const aliases = {
    concept: LinkType.Concept,
    document: LinkType.Document,
    dynamic: LinkType.Dynamic,
    field: LinkType.Field,
    grammar: LinkType.Grammar,
    language: LinkType.Language,
    link: LinkType.Dynamic,
    object: LinkType.Object,
    reference: LinkType.Reference,
    region: LinkType.Region,
    relation: LinkType.Relation,
    semantic: LinkType.Semantic,
    sourcetoken: LinkType.SourceToken,
    source_token: LinkType.SourceToken,
    syntax: LinkType.Syntax,
    token: LinkType.Token,
    trivia: LinkType.Trivia,
    type: LinkType.Type,
  };
  return aliases[normalized] ?? token;
}

function linkTypeToToken(linkType) {
  const normalized = String(linkType);
  const tokens = {
    [LinkType.Concept]: 'concept',
    [LinkType.Dynamic]: 'link',
    [LinkType.Field]: 'field',
    [LinkType.Language]: 'language',
    [LinkType.Object]: 'object',
    [LinkType.Relation]: 'relation',
    [LinkType.Semantic]: 'semantic',
    [LinkType.SourceToken]: 'token',
    [LinkType.Syntax]: 'syntax',
    [LinkType.Trivia]: 'trivia',
  };
  return tokens[normalized] ?? normalized.toLowerCase();
}

function sexpressionSource(sexpression) {
  if (typeof sexpression === 'string') {
    return sexpression;
  }
  if (sexpression.source) {
    return sexpression.source;
  }
  const predicates = (sexpression.predicates ?? [])
    .map((predicate) => (
      `\n(#${predicate.operator} @${predicate.capture} "${escapeSexpressionString(predicate.value)}")`
    ))
    .join('');
  return `(${sexpression.nodeType}) @${sexpression.capture}${predicates}`;
}

function numericId(value, message) {
  if (value === undefined || value === null || !/^\d+$/.test(String(value))) {
    throw new Error(`serialization structure error: ${message}`);
  }
  return Number(value);
}

function sortedEntries(object = {}) {
  return Object.entries(object).sort(([left], [right]) => left.localeCompare(right));
}

function percentEncode(value) {
  const source = String(value);
  if (source.length === 0) {
    return '%';
  }
  let encoded = '';
  for (const byte of textEncoder.encode(source)) {
    const character = String.fromCharCode(byte);
    if (/[A-Za-z0-9_.-]/.test(character)) {
      encoded += character;
    } else {
      encoded += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }
  return encoded;
}

function percentDecode(value) {
  if (value === '%') {
    return '';
  }
  const bytes = [];
  for (let index = 0; index < value.length;) {
    if (value[index] === '%') {
      const hex = value.slice(index + 1, index + 3);
      if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
        throw new Error('serialization structure error: invalid percent escape');
      }
      bytes.push(Number.parseInt(hex, 16));
      index += 3;
    } else {
      bytes.push(value.charCodeAt(index));
      index += 1;
    }
  }
  return textDecoder.decode(Uint8Array.from(bytes));
}

function escapeSexpressionString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
