// Lossless serialization of a link network to and from Links Notation text.
//
// Mirrors `rust/src/lino_serialization.rs`: every link becomes one statement
//
//   (<id>: <ref> ... (meta: (t: <type>) (n: <0|1>) (term: <pct>) ...))
//
// keyed by its numeric id. String payloads (`term`, `def`, `lang`) are
// percent-encoded so they always form a single escape-free reference token.
// Both runtimes write byte-identical text for the same network and read each
// other's output back into the same links, terms and metadata.

import { Parser } from 'links-notation';

import {
  ByteRange,
  LinkFlags,
  LinkMetadata,
  LinkType,
  Point,
  SourceSpan,
} from './primitives.js';

import { LinoSerializationError, linkTypeFromToken, percentDecode, structureError } from './lino-serialization-write.js';
export { LinoSerializationError, linkTypeToken, linkTypeFromToken, percentEncode, percentDecode, encodeLinkStatement, encodeNetworkLino } from './lino-serialization-write.js';

/** Whether parsed Links Notation statements use the canonical `meta` sublink form. */
export function hasMetaSublinks(statements) {
  return statements.some((statement) => (
    (statement.values ?? []).some((value) => value.id === 'meta' && (value.values ?? []).length > 0)
  ));
}

/** Parses Links Notation text the way the canonical reader does (comments off). */
export function parseLinoStatements(source) {
  try {
    return new Parser({ comments: false }).parse(source);
  } catch (error) {
    throw new LinoSerializationError('parse', error.message);
  }
}

function parseNumber(value, message) {
  if (value === undefined || value === null || !/^\d+$/.test(String(value))) {
    throw structureError(message(value));
  }
  return Number(value);
}

/**
 * Decodes canonical statements into `{ id, references, metadata, registered }`
 * records. Throws `LinoSerializationError` on the same inputs Rust's
 * `LinkNetwork::from_lino` rejects.
 */
export function decodeCanonicalStatements(statements) {
  const records = [];
  for (const statement of statements) {
    if (statement.id === null || statement.id === undefined || statement.values.length === 0) {
      throw structureError('top-level statement must be an identified link');
    }
    const id = parseNumber(statement.id, (value) => `invalid link id \`${value}\``);
    const references = [];
    let metaFields;
    for (const value of statement.values) {
      if (value.values.length === 0 && value.id !== null) {
        references.push(parseNumber(value.id, (text) => `invalid link id \`${text}\``));
      } else if (value.id === 'meta') {
        metaFields = value.values;
      } else {
        throw structureError('statement values must be references or a meta sublink');
      }
    }
    if (!metaFields) {
      throw structureError('statement is missing its meta sublink');
    }
    const { metadata, registered } = decodeMeta(metaFields);
    records.push({ id, references, metadata, registered });
  }
  return records;
}

function decodeMeta(fields) {
  let metadata = LinkMetadata.new();
  let registered = false;
  let bits = 0;
  for (const field of fields) {
    if (field.id === null || field.id === undefined || field.values.length === 0) {
      throw structureError('meta field must be an identified link');
    }
    switch (field.id) {
      case 't':
        metadata = metadata.withLinkType(linkTypeFromToken(singleReference(field)));
        break;
      case 'n':
        metadata = metadata.withNamed(singleReference(field) === '1');
        break;
      case 'term':
        metadata = metadata.withTerm(percentDecode(singleReference(field)));
        break;
      case 'def':
        metadata = metadata.withDefinition(percentDecode(singleReference(field)));
        break;
      case 'lang':
        metadata = metadata.withLanguage(percentDecode(singleReference(field)));
        break;
      case 'span':
        metadata = metadata.withSpan(parseSpan(field.values));
        break;
      case 'flags': {
        const text = singleReference(field);
        bits = /^\d+$/.test(text) ? Number(text) : Number.NaN;
        if (!Number.isInteger(bits) || bits > 255) {
          throw structureError(`invalid flags value \`${text}\``);
        }
        break;
      }
      case 'reg':
        registered = true;
        break;
      default:
        throw structureError(`unknown meta field \`${field.id}\``);
    }
  }
  if (bits !== 0) {
    metadata = metadata.withFlags(new LinkFlags({
      isError: (bits & 0b0001) !== 0,
      hasError: (bits & 0b0111) !== 0,
      isMissing: (bits & 0b0100) !== 0,
      isExtra: (bits & 0b1000) !== 0,
    }));
  }
  return { metadata, registered };
}

function singleReference(field) {
  if (field.values.length !== 1 || field.values[0].values.length !== 0) {
    throw structureError('meta field must hold exactly one reference');
  }
  return field.values[0].id;
}

function parseSpan(values) {
  if (values.length !== 6) {
    throw structureError('span field requires six numbers');
  }
  const numbers = values.map((value) => {
    if (value.values.length !== 0) {
      throw structureError('span field values must be numbers');
    }
    return parseNumber(value.id, (text) => `invalid span number \`${text}\``);
  });
  return new SourceSpan(
    new ByteRange(numbers[0], numbers[1]),
    new Point(numbers[2], numbers[3]),
    new Point(numbers[4], numbers[5]),
  );
}
