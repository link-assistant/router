// Trigram language identification shared with Rust's
// `language_identification.rs`: franc's algorithm over the generated
// `language-trigrams.js` data, counted in Unicode scalar values so both
// runtimes reach the same verdict for the same text.
import { LANGUAGE_TRIGRAMS } from './language-trigrams.js';

const MAX_LENGTH = 2048;
const MAX_DIFFERENCE = 300;

const SCRIPTS = LANGUAGE_TRIGRAMS.scripts;
const MODELS = new Map(
  LANGUAGE_TRIGRAMS.models.map(({ script, languages }) => [
    script,
    languages.map(({ code, trigrams }) => [
      code,
      new Map(trigrams.split('|').map((trigram, rank) => [trigram, rank])),
    ]),
  ]),
);
const LANGUAGES = new Map(Object.entries(LANGUAGE_TRIGRAMS.languages));

// ECMAScript `\s`, spelled out so Rust can match it exactly.
const WHITESPACE = new Set([
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004,
  0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
  0xfeff,
]);

/** Engine term recorded on identification annotations. */
export const LANGUAGE_IDENTIFIER_TERM = 'identifier:trigram';

/**
 * Returns the canonical name of the supported natural language the text is
 * written in, or `undefined` when the text carries no usable evidence.
 */
export function identifyLanguage(text) {
  const characters = [...text].slice(0, MAX_LENGTH);
  if (characters.length === 0) return undefined;

  const script = topScript(characters);
  if (script === undefined) return undefined;
  const models = MODELS.get(script);
  if (models === undefined) return LANGUAGES.get(script);
  if (models.length === 0) return undefined;

  const trigrams = trigramCounts(characters);
  let best;
  for (const [code, model] of models) {
    const distance = trigramDistance(trigrams, model);
    if (best === undefined || distance < best.distance) best = { code, distance };
  }
  // A distance of MAX_DIFFERENCE per character means no trigram matched.
  if (best.distance >= characters.length * MAX_DIFFERENCE) return undefined;
  return LANGUAGES.get(best.code);
}

function topScript(characters) {
  let top;
  let topCount = 0;
  for (const { name, ranges } of SCRIPTS) {
    let count = 0;
    for (const character of characters) {
      if (inRanges(character.codePointAt(0), ranges)) count += 1;
    }
    if (count > topCount) {
      top = name;
      topCount = count;
    }
  }
  return top;
}

function inRanges(codePoint, ranges) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const [start, end] = ranges[middle];
    if (codePoint < start) high = middle - 1;
    else if (codePoint > end) low = middle + 1;
    else return true;
  }
  return false;
}

// franc's `clean`: ASCII punctuation and digits become spaces, whitespace
// runs collapse to one space, the result is trimmed and lowercased.
function cleanCharacters(characters) {
  const cleaned = [];
  for (const character of characters) {
    const codePoint = character.codePointAt(0);
    const space = (codePoint >= 0x21 && codePoint <= 0x40) || WHITESPACE.has(codePoint);
    if (space) {
      if (cleaned.length > 0 && cleaned.at(-1) !== ' ') cleaned.push(' ');
    } else {
      cleaned.push(character);
    }
  }
  if (cleaned.at(-1) === ' ') cleaned.pop();
  return [...cleaned.join('').toLowerCase()];
}

// Trigram counts in first-occurrence order, stably sorted by count.
function trigramCounts(characters) {
  const padded = [' ', ...cleanCharacters(characters), ' '];
  const counts = new Map();
  for (let index = 0; index + 3 <= padded.length; index += 1) {
    const trigram = padded.slice(index, index + 3).join('');
    counts.set(trigram, (counts.get(trigram) ?? 0) + 1);
  }
  return [...counts].sort((left, right) => left[1] - right[1]);
}

function trigramDistance(trigrams, model) {
  let distance = 0;
  for (const [trigram, count] of trigrams) {
    const rank = model.get(trigram);
    distance += rank === undefined ? MAX_DIFFERENCE : Math.abs(count - rank - 1);
  }
  return distance;
}
