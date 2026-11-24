import { idKey, LinkType } from './primitives.js';

const PLACEHOLDER =
  /^\{(\*?)([A-Za-z_][A-Za-z0-9_-]*|\.)(?::([a-z][A-Za-z0-9_-]*))?(?:\|([^}]*))?\}/;
const CONDITIONAL_OPEN = /^\{\?([A-Za-z_][A-Za-z0-9_-]*)\}/;
const SEPARATOR_ESCAPES = { n: '\n', s: ' ', t: '\t' };

export function renderRuleSet(ruleSet, network, targetLanguage, rootLinkId = undefined) {
  const renderer = new TranslationRenderer(ruleSet, network);
  if (rootLinkId !== undefined) {
    return renderer.render(rootLinkId, targetLanguage);
  }

  const roots = renderer.renderingRoots();
  if (
    roots.length === 0
    || !roots.some((root) => renderer.hasTemplate(root, targetLanguage))
  ) {
    return network.reconstructText();
  }
  return roots.map((root) => renderer.render(root, targetLanguage)).join('\n');
}

class TranslationRenderer {
  constructor(ruleSet, network) {
    this.ruleSet = ruleSet;
    this.network = network;
    this.matchesByLink = new Map();

    for (const rule of ruleSet.rules) {
      for (const match of network.queryMatches(rule.query)) {
        const key = idKey(match.linkId);
        if (!this.matchesByLink.has(key)) {
          this.matchesByLink.set(key, { match, rule });
        }
      }
    }
  }

  renderingRoots() {
    const childMatches = new Set();
    for (const rootKey of this.matchesByLink.keys()) {
      const pending = [...(this.network.link(rootKey)?.references() ?? [])];
      const visited = new Set();
      while (pending.length > 0) {
        const childKey = idKey(pending.pop());
        if (visited.has(childKey) || childKey === rootKey) {
          continue;
        }
        visited.add(childKey);
        if (this.matchesByLink.has(childKey)) {
          childMatches.add(childKey);
        }
        pending.push(...(this.network.link(childKey)?.references() ?? []));
      }
    }

    const roots = [...this.matchesByLink.keys()].filter((key) => !childMatches.has(key));
    return (roots.length > 0 ? roots : [...this.matchesByLink.keys()])
      .sort((left, right) => left - right);
  }

  hasTemplate(linkId, targetLanguage) {
    const claimed = this.matchesByLink.get(idKey(linkId));
    return claimed !== undefined && this.templateFor(claimed.rule, targetLanguage) !== undefined;
  }

  render(linkId, targetLanguage, visiting = new Set()) {
    const key = idKey(linkId);
    if (visiting.has(key)) {
      return this.renderUnclaimed(linkId, targetLanguage);
    }

    const claimed = this.matchesByLink.get(key);
    if (!claimed) {
      return this.renderUnclaimed(linkId, targetLanguage);
    }
    const template = this.templateFor(claimed.rule, targetLanguage);
    if (!template) {
      return this.renderUnclaimed(linkId, targetLanguage);
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(key);
    return this.expand(
      template.text,
      claimed.rule,
      claimed.match,
      targetLanguage,
      nextVisiting,
    );
  }

  templateFor(rule, targetLanguage) {
    const pending = [targetLanguage];
    const visited = new Set();
    while (pending.length > 0) {
      const candidate = pending.shift();
      if (visited.has(candidate)) {
        continue;
      }
      visited.add(candidate);
      const template = rule.templateFor(candidate);
      if (template) {
        return template;
      }
      pending.push(...(this.ruleSet.languageFallbacks[candidate] ?? []));
    }
    return undefined;
  }

  resolve(rule, match, name) {
    if (name === '.') {
      return match.linkId;
    }
    if (match.captures?.has(name)) {
      return match.captures.get(name);
    }
    const referenceIndex = rule.referenceCaptures[name];
    if (referenceIndex === undefined) {
      return undefined;
    }
    return this.network.link(match.linkId)?.references()[referenceIndex];
  }

  renderMode(linkId, mode, targetLanguage, visiting) {
    if (mode === undefined) {
      return this.render(linkId, targetLanguage, visiting);
    }
    if (mode === 'text' || mode === 'source') {
      return this.network.capturedText(linkId);
    }
    if (mode === 'term') {
      return this.network.link(linkId)?.metadata().term ?? String(linkId);
    }
    if (mode === 'concept') {
      const link = this.network.link(linkId);
      return link ? conceptIdForLink(this.network, link) ?? link.metadata().term ?? String(linkId) : '';
    }
    if (mode === 'language') {
      return this.renderUnclaimed(linkId, targetLanguage);
    }
    return this.render(linkId, contextualLanguage(targetLanguage, mode), visiting);
  }

  expand(source, rule, match, targetLanguage, visiting) {
    let output = '';
    let index = 0;
    while (index < source.length) {
      const rest = source.slice(index);
      if (rest.startsWith('{{')) {
        output += '{';
        index += 2;
        continue;
      }
      if (rest.startsWith('}}')) {
        output += '}';
        index += 2;
        continue;
      }

      const conditional = CONDITIONAL_OPEN.exec(rest);
      if (conditional) {
        const name = conditional[1];
        const closeToken = `{/${name}}`;
        const close = source.indexOf(closeToken, index + conditional[0].length);
        const bodyEnd = close === -1 ? source.length : close;
        if (this.resolve(rule, match, name) !== undefined) {
          output += this.expand(
            source.slice(index + conditional[0].length, bodyEnd),
            rule,
            match,
            targetLanguage,
            visiting,
          );
        }
        index = close === -1 ? source.length : close + closeToken.length;
        continue;
      }

      const placeholder = PLACEHOLDER.exec(rest);
      if (placeholder) {
        const [matched, variadic, name, mode, separator] = placeholder;
        const target = this.resolve(rule, match, name);
        if (target !== undefined) {
          let value;
          if (variadic) {
            const children = this.network.link(target)?.references() ?? [];
            value = children
              .map((child) => this.renderMode(child, mode, targetLanguage, visiting))
              .join(decodeSeparator(separator));
          } else {
            value = this.renderMode(target, mode, targetLanguage, visiting);
          }
          output += indentContinuation(value, currentIndent(output));
        }
        index += matched.length;
        continue;
      }

      output += source[index];
      index += 1;
    }
    return output;
  }

  renderUnclaimed(linkId, targetLanguage) {
    const link = this.network.link(linkId);
    if (!link) {
      return '';
    }
    const concept = conceptIdForLink(this.network, link);
    const reconstructed = reconstructConcept(this.network, concept, targetLanguage);
    if (reconstructed !== undefined) {
      return reconstructed;
    }
    if (
      link.metadata().linkType === LinkType.SourceToken
      || link.metadata().linkType === LinkType.Syntax
    ) {
      return this.network.capturedText(linkId);
    }
    return link.metadata().term ?? this.network.capturedText(linkId) ?? '';
  }
}

function contextualLanguage(targetLanguage, mode) {
  const base = targetLanguage.split(':', 1)[0];
  return `${base}:${mode}`;
}

function decodeSeparator(separator) {
  if (separator === undefined) {
    return '';
  }
  return separator.replace(
    /\\(.)/g,
    (match, character) => SEPARATOR_ESCAPES[character] ?? character,
  );
}

function currentIndent(output) {
  const line = output.slice(output.lastIndexOf('\n') + 1);
  return /^[ \t]*$/.test(line) ? line : '';
}

function indentContinuation(value, indent) {
  if (indent === '' || !value.includes('\n')) {
    return value;
  }
  return value
    .split('\n')
    .map((line, position) => (position === 0 || line === '' ? line : indent + line))
    .join('\n');
}

function conceptIdForLink(network, link) {
  if (link.metadata().linkType === LinkType.Concept) {
    return link.metadata().term;
  }
  if (link.metadata().term?.startsWith('concept:')) {
    return link.metadata().term.slice('concept:'.length);
  }
  const firstReference = link.references()[0];
  const concept = firstReference ? network.link(firstReference) : undefined;
  return concept?.metadata().linkType === LinkType.Concept ? concept.metadata().term : undefined;
}

function reconstructConcept(network, concept, language) {
  if (!concept) {
    return undefined;
  }
  for (const candidate of [language, canonicalReconstructionLanguage(language)]) {
    if (!candidate) {
      continue;
    }
    const mapped = network.reconstructConcept?.(concept, candidate);
    if (mapped !== undefined) {
      return mapped;
    }
    const found = network.links().find((link) => (
      link.metadata().term === `concept:${concept}` && link.metadata().language === candidate
    ));
    if (found) {
      return network.capturedText(found.id());
    }
  }
  return undefined;
}

function canonicalReconstructionLanguage(language) {
  switch (language.toLowerCase()) {
    case 'english':
    case 'en':
      return 'English';
    case 'russian':
    case 'ru':
      return 'Russian';
    default:
      return undefined;
  }
}
