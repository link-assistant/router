import { Parser } from 'links-notation';

import { LinkId, idKey } from './primitives.js';

export const LinkCliSubstitutionKind = Object.freeze({
  Create: 'Create',
  ReadIdentity: 'ReadIdentity',
  Update: 'Update',
  Delete: 'Delete',
});

export class SubstitutionRule {
  constructor(patternReferences, replacementReferences) {
    this.patternReferences = patternReferences.map((reference) => LinkId.from(reference));
    this.replacementReferences = replacementReferences.map((reference) => LinkId.from(reference));
  }
}

export class SubstitutionReport {
  constructor({ created = [], updated = [], deleted = [] } = {}) {
    this._created = created.map((id) => LinkId.from(id));
    this._updated = updated.map((id) => LinkId.from(id));
    this._deleted = deleted.map((id) => LinkId.from(id));
  }

  created() {
    return [...this._created];
  }

  updated() {
    return [...this._updated];
  }

  deleted() {
    return [...this._deleted];
  }

  isEmpty() {
    return this._created.length === 0 && this._updated.length === 0 && this._deleted.length === 0;
  }
}

export class LinkCliSubstitution {
  constructor(pattern, replacement) {
    this.pattern = pattern;
    this.replacement = replacement;
  }

  static linkId(value) {
    return LinkId.from(value);
  }

  static parse(source) {
    const parsed = new Parser({ comments: false }).parse(source);
    const [patternSide, replacementSide] = normalizeTwoSidedCommand(parsed);
    return new LinkCliSubstitution(parseSide(patternSide), parseSide(replacementSide));
  }

  kind() {
    if (this.pattern.length === 0 && this.replacement.length > 0) {
      return LinkCliSubstitutionKind.Create;
    }
    if (this.pattern.length > 0 && this.replacement.length === 0) {
      return LinkCliSubstitutionKind.Delete;
    }
    if (JSON.stringify(this.pattern) === JSON.stringify(this.replacement)) {
      return LinkCliSubstitutionKind.ReadIdentity;
    }
    return LinkCliSubstitutionKind.Update;
  }

  apply(network) {
    const kind = this.kind();
    const created = [];
    const updated = [];
    const deleted = [];

    if (kind === LinkCliSubstitutionKind.Create) {
      for (const replacement of this.replacement) {
        created.push(network.insertLinkWithOptionalId(replacement.id, replacement.references));
      }
      return new SubstitutionReport({ created });
    }

    const matches = findPatternMatches(network, this.pattern);

    if (kind === LinkCliSubstitutionKind.Delete) {
      for (const link of matches) {
        network.deleteLink(link.id());
        deleted.push(link.id());
      }
      return new SubstitutionReport({ deleted });
    }

    for (const link of matches) {
      const patternIndex = this.pattern.findIndex((pattern) => patternMatchesLink(pattern, link));
      const replacement = this.replacement[patternIndex] ?? this.replacement[0];
      if (kind === LinkCliSubstitutionKind.Update) {
        link.setReferences(replacement.references);
      }
      updated.push(link.id());
    }

    return new SubstitutionReport({ updated });
  }
}

function normalizeTwoSidedCommand(parsed) {
  if (parsed.length === 2) {
    return parsed;
  }
  if (parsed.length === 1 && parsed[0].id === null && parsed[0].values.length === 2) {
    return parsed[0].values;
  }
  throw new SyntaxError('link-cli substitution requires exactly two LiNo sides');
}

function parseSide(side) {
  if (side.id === null && side.values.length === 0) {
    return [];
  }
  if (side.id === null) {
    return side.values.map((value) => parsePatternLink(value));
  }
  return [parsePatternLink(side)];
}

function parsePatternLink(link) {
  const id = link.id === null ? undefined : Number(link.id);
  return {
    id: Number.isFinite(id) ? id : undefined,
    references: link.values.map((value) => LinkId.from(value.id)),
  };
}

function findPatternMatches(network, patterns) {
  const matches = [];
  for (const pattern of patterns) {
    for (const link of network.links()) {
      if (patternMatchesLink(pattern, link)) {
        matches.push(link);
      }
    }
  }
  return uniqueLinks(matches);
}

function patternMatchesLink(pattern, link) {
  if (pattern.id !== undefined && idKey(link.id()) !== pattern.id) {
    return false;
  }
  const references = link.references();
  if (pattern.references.length !== references.length) {
    return false;
  }
  return pattern.references.every((reference, index) => idKey(reference) === idKey(references[index]));
}

function uniqueLinks(links) {
  const seen = new Set();
  const unique = [];
  for (const link of links) {
    const key = idKey(link.id());
    if (!seen.has(key)) {
      unique.push(link);
      seen.add(key);
    }
  }
  return unique;
}
