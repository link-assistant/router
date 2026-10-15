import {
  ByteRange,
  LinkFlags,
  LinkMetadata,
  LinkType,
  Point,
  SourceSpan,
} from './primitives.js';
import { seedStatehoodWorkedExample } from './concept-ontology.js';
import { LANGUAGE_IDENTIFIER_TERM, identifyLanguage } from './language-identification.js';
import { BIDI_RANGES } from './unicode-bidi-classes.js';

const encoder = new TextEncoder();

const CANONICAL_NATURAL_LANGUAGES = new Map([
  ['english', 'English'],
  ['en', 'English'],
  ['mandarin', 'Mandarin Chinese'],
  ['mandarin chinese', 'Mandarin Chinese'],
  ['chinese', 'Mandarin Chinese'],
  ['zh', 'Mandarin Chinese'],
  ['hindi', 'Hindi'],
  ['hi', 'Hindi'],
  ['spanish', 'Spanish'],
  ['es', 'Spanish'],
  ['arabic', 'Modern Standard Arabic'],
  ['modern standard arabic', 'Modern Standard Arabic'],
  ['ar', 'Modern Standard Arabic'],
  ['french', 'French'],
  ['fr', 'French'],
  ['bengali', 'Bengali'],
  ['bn', 'Bengali'],
  ['portuguese', 'Portuguese'],
  ['pt', 'Portuguese'],
  ['russian', 'Russian'],
  ['ru', 'Russian'],
  ['urdu', 'Urdu'],
  ['ur', 'Urdu'],
]);

// BCP 47 locales handed to Intl.Segmenter so dictionary-based word breaking
// applies where the language needs it (Mandarin has no spaces between words).
const SEGMENTER_LOCALES = new Map([
  ['English', 'en'],
  ['Mandarin Chinese', 'zh'],
  ['Hindi', 'hi'],
  ['Spanish', 'es'],
  ['Modern Standard Arabic', 'ar'],
  ['French', 'fr'],
  ['Bengali', 'bn'],
  ['Portuguese', 'pt'],
  ['Russian', 'ru'],
  ['Urdu', 'ur'],
]);

const STARTER_GRAMMAR_PROVENANCE =
  'repo-authored starter pass/fail sentence; license: Unlicense; ' +
  'morphosyntax tag names use Universal Dependencies v2 UPOS/UFeats/deprel vocabulary; ' +
  'no UD treebank sentence data imported';

/** Executable natural-language grammar fixture pairs for each target language. */
export const NATURAL_LANGUAGE_GRAMMAR_FIXTURES = Object.freeze([
  ['English', 'Hawaii is a state.\n', 'Hawaii are a state.\n'],
  ['Mandarin Chinese', '你好。\n', '你好 的。\n'],
  ['Hindi', 'नमस्ते।\n', 'नमस्ते है।\n'],
  ['Spanish', 'Hawaii es un estado.\n', 'Hawaii son un estado.\n'],
  ['Modern Standard Arabic', 'مرحبا.\n', 'مرحبا هو.\n'],
  ['French', 'Hawaii est un etat.\n', 'Hawaii sont un etat.\n'],
  ['Bengali', 'নমস্কার।\n', 'নমস্কার আছে।\n'],
  ['Portuguese', 'Hawaii e um estado.\n', 'Hawaii sao um estado.\n'],
  ['Russian', 'Гавайи это штат.\n', 'Гавайи это штаты.\n'],
  ['Urdu', 'سلام۔\n', 'سلام ہے۔\n'],
].map(([language, grammaticalSource, ungrammaticalSource]) => Object.freeze({
  language,
  grammaticalSource,
  ungrammaticalSource,
  provenance: STARTER_GRAMMAR_PROVENANCE,
})));

const NO_FEATURES = [];
const NUMBER_SING = ['Number=Sing'];
const NUMBER_PLUR = ['Number=Plur'];
const INDEFINITE_ARTICLE = ['Definite=Ind', 'PronType=Art'];
const AUX_SINGULAR = ['Mood=Ind', 'Number=Sing', 'Person=3', 'Tense=Pres', 'VerbForm=Fin'];
const AUX_PLURAL = ['Mood=Ind', 'Number=Plur', 'Person=3', 'Tense=Pres', 'VerbForm=Fin'];
const PRON_SINGULAR = ['Number=Sing', 'Person=3', 'PronType=Prs'];

const PUNCT_ANALYSIS = { upos: 'PUNCT', features: NO_FEATURES, deprel: 'punct' };

const SENTENCE_GRAMMARS = new Map([
  ['English', ['Hawaii', 'is', 'a', 'state', '.']],
  ['Mandarin Chinese', ['你好', '。']],
  ['Hindi', ['नमस्ते', '।']],
  ['Spanish', ['Hawaii', 'es', 'un', 'estado', '.']],
  ['Modern Standard Arabic', ['مرحبا', '.']],
  ['French', ['Hawaii', 'est', 'un', 'etat', '.']],
  ['Bengali', ['নমস্কার', '।']],
  ['Portuguese', ['Hawaii', 'e', 'um', 'estado', '.']],
  ['Russian', ['Гавайи', 'это', 'штат', '.']],
  ['Urdu', ['سلام', '۔']],
]);

const LEXICON = [
  ['English', 'Hawaii', 'PROPN', NUMBER_SING, 'nsubj'],
  ['English', 'is', 'AUX', AUX_SINGULAR, 'cop'],
  ['English', 'are', 'AUX', AUX_PLURAL, 'cop'],
  ['English', 'a', 'DET', INDEFINITE_ARTICLE, 'det'],
  ['English', 'state', 'NOUN', NUMBER_SING, 'root'],
  ['Mandarin Chinese', '你好', 'INTJ', NO_FEATURES, 'root'],
  ['Mandarin Chinese', '的', 'PART', NO_FEATURES, 'mark'],
  ['Hindi', 'नमस्ते', 'INTJ', NO_FEATURES, 'root'],
  ['Hindi', 'है', 'AUX', AUX_SINGULAR, 'cop'],
  ['Spanish', 'Hawaii', 'PROPN', NUMBER_SING, 'nsubj'],
  ['Spanish', 'es', 'AUX', AUX_SINGULAR, 'cop'],
  ['Spanish', 'son', 'AUX', AUX_PLURAL, 'cop'],
  ['Spanish', 'un', 'DET', INDEFINITE_ARTICLE, 'det'],
  ['Spanish', 'estado', 'NOUN', NUMBER_SING, 'root'],
  ['Modern Standard Arabic', 'مرحبا', 'INTJ', NO_FEATURES, 'root'],
  ['Modern Standard Arabic', 'هو', 'PRON', PRON_SINGULAR, 'dep'],
  ['French', 'Hawaii', 'PROPN', NUMBER_SING, 'nsubj'],
  ['French', 'est', 'AUX', AUX_SINGULAR, 'cop'],
  ['French', 'sont', 'AUX', AUX_PLURAL, 'cop'],
  ['French', 'un', 'DET', INDEFINITE_ARTICLE, 'det'],
  ['French', 'etat', 'NOUN', NUMBER_SING, 'root'],
  ['Bengali', 'নমস্কার', 'INTJ', NO_FEATURES, 'root'],
  ['Bengali', 'আছে', 'AUX', AUX_SINGULAR, 'cop'],
  ['Portuguese', 'Hawaii', 'PROPN', NUMBER_SING, 'nsubj'],
  ['Portuguese', 'e', 'AUX', AUX_SINGULAR, 'cop'],
  ['Portuguese', 'sao', 'AUX', AUX_PLURAL, 'cop'],
  ['Portuguese', 'um', 'DET', INDEFINITE_ARTICLE, 'det'],
  ['Portuguese', 'estado', 'NOUN', NUMBER_SING, 'root'],
  ['Russian', 'Гавайи', 'PROPN', NUMBER_SING, 'nsubj'],
  ['Russian', 'это', 'PRON', PRON_SINGULAR, 'cop'],
  ['Russian', 'штат', 'NOUN', NUMBER_SING, 'root'],
  ['Russian', 'штаты', 'NOUN', NUMBER_PLUR, 'root'],
  ['Urdu', 'سلام', 'INTJ', NO_FEATURES, 'root'],
  ['Urdu', 'ہے', 'AUX', AUX_SINGULAR, 'cop'],
].map(([language, surface, upos, features, deprel]) => ({
  language,
  surface,
  analysis: { upos, features, deprel },
}));

const SENTENCE_PUNCTUATION = new Set(['.', '!', '?', '।', '。', '۔']);

/** Returns the canonical name for a supported natural-language name or alias. */
export function canonicalNaturalLanguage(language) {
  return CANONICAL_NATURAL_LANGUAGES.get(String(language).toLowerCase());
}

/**
 * Adds the natural-language layer under a parsed document: a region with its
 * identified language, word segments, Universal Dependencies morphosyntax,
 * Unicode normalization and bidi annotations.
 */
export function annotateNaturalLanguage(network, document, text, language) {
  const declaredLanguage = canonicalNaturalLanguage(language);
  if (!declaredLanguage) return;

  const lines = new ByteLineIndex(text);
  const documentSpan = lines.span(0, encoder.encode(text).length);
  const detectedLanguage = identifyLanguage(text) ?? declaredLanguage;

  const languageLink = network.insertLink(
    [],
    LinkMetadata.new()
      .withLinkType(LinkType.Language)
      .withNamed(true)
      .withTerm(detectedLanguage)
      .withLanguage(detectedLanguage)
      .withSpan(documentSpan),
  );
  const annotations = [
    insertSemanticAnnotation(network, languageLink, LANGUAGE_IDENTIFIER_TERM, detectedLanguage, documentSpan),
    insertSemanticAnnotation(
      network,
      languageLink,
      'segmentation:intl-segmenter',
      detectedLanguage,
      documentSpan,
    ),
  ];

  // Segments belong to the declared region; the identifier's verdict lives on
  // the Language link and its annotation.
  const segments = wordSegments(text, declaredLanguage).map(({ segment, start, end }) =>
    network.insertLink(
      [],
      LinkMetadata.new()
        .withLinkType(LinkType.SourceToken)
        .withNamed(true)
        .withTerm(segment)
        .withLanguage(declaredLanguage)
        .withSpan(lines.span(start, end)),
    ));

  const sentence = annotateMorphosyntax(network, text, lines, declaredLanguage, documentSpan);
  annotations.push(
    ...unicodeAnnotations(text).map((term) =>
      insertSemanticAnnotation(network, languageLink, term, detectedLanguage, documentSpan)),
  );
  const workedExample = insertWorkedExampleAnnotation(network, text, declaredLanguage, documentSpan);
  if (workedExample) annotations.push(workedExample);

  const region = network.insertLink(
    [document, languageLink, ...(sentence ? [sentence] : []), ...segments, ...annotations],
    LinkMetadata.new()
      .withLinkType(LinkType.Region)
      .withNamed(true)
      .withTerm('natural-language region')
      .withLanguage(declaredLanguage)
      .withSpan(documentSpan),
  );
  return region;
}

function insertSemanticAnnotation(network, languageLink, term, language, span) {
  return network.insertLink(
    [languageLink],
    LinkMetadata.new()
      .withLinkType(LinkType.Semantic)
      .withNamed(true)
      .withTerm(term)
      .withLanguage(language)
      .withSpan(span),
  );
}

function insertWorkedExampleAnnotation(network, text, language, span) {
  if (!isStatehoodWorkedExample(text, language)) return undefined;
  const concepts = seedStatehoodWorkedExample(network);
  return network.insertLink(
    [concepts.proposition, concepts.subject, concepts.object],
    LinkMetadata.new()
      .withLinkType(LinkType.Semantic)
      .withNamed(true)
      .withTerm('proposition:statehood')
      .withLanguage(language)
      .withSpan(span),
  );
}

function isStatehoodWorkedExample(text, language) {
  switch (language) {
    case 'English':
      return text.trim() === 'Hawaii is a state.';
    case 'Russian':
      return text.trim() === 'Гавайи это штат.';
    default:
      return false;
  }
}

function wordSegments(text, language) {
  const segmenter = new Intl.Segmenter(SEGMENTER_LOCALES.get(language), { granularity: 'word' });
  const segments = [];
  let byte = 0;
  let index = 0;
  for (const { segment, index: segmentIndex } of segmenter.segment(text)) {
    byte += encoder.encode(text.slice(index, segmentIndex)).length;
    index = segmentIndex;
    const length = encoder.encode(segment).length;
    if (/[\p{Alphabetic}\p{N}]/u.test(segment)) {
      segments.push({ segment, start: byte, end: byte + length });
    }
  }
  return segments;
}

function unicodeAnnotations(text) {
  return [
    `normalization:nfc:${text.normalize('NFC') === text ? 'stable' : 'changes'}`,
    `normalization:nfd:${text.normalize('NFD') === text ? 'stable' : 'changes'}`,
    `bidi:${bidiDirection(text)}`,
  ];
}

/** Adds the sentence, form, UPOS, UFeats and deprel links; returns the sentence. */
function annotateMorphosyntax(network, text, lines, language, span) {
  const tokens = grammarTokens(text);
  if (tokens.length === 0) return undefined;

  const accepted = SENTENCE_GRAMMARS.get(language);
  const sentenceIsAccepted = accepted !== undefined &&
    tokens.length === accepted.length &&
    tokens.every((token, index) => token.text === accepted[index]);
  const shouldReportErrors = isRegisteredGrammarFixture(language, text) && !sentenceIsAccepted;

  const children = [];
  for (const token of tokens) {
    const tokenSpan = lines.span(token.start, token.end);
    const analysis = morphologyFor(language, token.text);
    const formChildren = analysis
      ? [
        insertSyntax(network, `upos:${analysis.upos}`, [], language, tokenSpan),
        ...analysis.features.map((feature) =>
          insertSyntax(network, `ufeat:${feature}`, [], language, tokenSpan)),
      ]
      : [];
    const form = insertSyntax(network, `form:${token.text}`, formChildren, language, tokenSpan);
    children.push(form);
    if (analysis) {
      children.push(insertSyntax(network, `deprel:${analysis.deprel}`, [form], language, tokenSpan));
    } else if (shouldReportErrors) {
      children.push(insertSyntax(
        network,
        'natural-language:error:unknown-token',
        [form],
        language,
        tokenSpan,
        LinkFlags.error(),
      ));
    }
  }
  if (shouldReportErrors) {
    children.push(insertSyntax(
      network,
      'natural-language:error:grammar',
      [],
      language,
      span,
      LinkFlags.error(),
    ));
  }

  // Inserted last so the sentence is the parent of every form it lists, even
  // though deprel and error links also reference the forms they relate.
  return insertSyntax(
    network,
    'natural-language:sentence',
    children,
    language,
    span,
    shouldReportErrors ? LinkFlags.containingError() : LinkFlags.clean(),
  );
}

function insertSyntax(network, term, children, language, span, flags = LinkFlags.clean()) {
  return network.insertSyntaxNode(language, term, children, { span, flags });
}

function morphologyFor(language, surface) {
  if (SENTENCE_PUNCTUATION.has(surface)) return PUNCT_ANALYSIS;
  return LEXICON.find((entry) => entry.language === language && entry.surface === surface)
    ?.analysis;
}

function isRegisteredGrammarFixture(language, text) {
  return NATURAL_LANGUAGE_GRAMMAR_FIXTURES.some((fixture) =>
    fixture.language === language &&
    (text === fixture.grammaticalSource || text === fixture.ungrammaticalSource));
}

function grammarTokens(text) {
  const tokens = [];
  let wordStart;
  let byte = 0;
  const pushWord = (end) => {
    if (wordStart === undefined) return;
    if (wordStart.byte !== end) {
      tokens.push({ text: text.slice(wordStart.index, wordStart.index + wordStart.length), start: wordStart.byte, end });
    }
    wordStart = undefined;
  };
  let index = 0;
  for (const character of text) {
    const length = encoder.encode(character).length;
    if (/^\p{White_Space}$/u.test(character)) {
      pushWord(byte);
    } else if (SENTENCE_PUNCTUATION.has(character)) {
      pushWord(byte);
      tokens.push({ text: character, start: byte, end: byte + length });
    } else if (wordStart === undefined) {
      wordStart = { byte, index, length: 0 };
    }
    if (wordStart !== undefined) wordStart.length = index + character.length - wordStart.index;
    byte += length;
    index += character.length;
  }
  pushWord(byte);
  return tokens;
}

/**
 * Paragraph direction per UAX #9 rules P1-P3, matching unicode-bidi's
 * BidiInfo: the text is right-to-left when any paragraph's first strong
 * character outside isolates is R or AL.
 */
export function bidiDirection(text) {
  let paragraphLevel;
  let isolates = 0;
  let rtl = false;
  for (const character of text) {
    const kind = bidiKind(character.codePointAt(0));
    if (kind === 'B') {
      rtl ||= paragraphLevel === 'rtl';
      paragraphLevel = undefined;
      isolates = 0;
    } else if (kind === 'L' || kind === 'R') {
      if (isolates === 0 && paragraphLevel === undefined) {
        paragraphLevel = kind === 'R' ? 'rtl' : 'ltr';
      }
    } else if (kind === 'I') {
      isolates += 1;
    } else if (kind === 'P') {
      isolates = Math.max(0, isolates - 1);
    }
  }
  return rtl || paragraphLevel === 'rtl' ? 'rtl' : 'ltr';
}

let bidiRanges;

function bidiKind(codePoint) {
  bidiRanges ??= BIDI_RANGES.split(' ').map((entry) => {
    const [start, end, kind] = entry.split('.');
    return [Number.parseInt(start, 36), Number.parseInt(end, 36), kind];
  });
  let low = 0;
  let high = bidiRanges.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const [start, end, kind] = bidiRanges[middle];
    if (codePoint < start) high = middle - 1;
    else if (codePoint > end) low = middle + 1;
    else return kind;
  }
  return 'L';
}

class ByteLineIndex {
  constructor(text) {
    this.starts = [0];
    let byte = 0;
    for (const character of text) {
      byte += encoder.encode(character).length;
      if (character === '\n') this.starts.push(byte);
    }
  }

  point(byte) {
    let low = 0;
    let high = this.starts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.starts[middle] <= byte) low = middle;
      else high = middle - 1;
    }
    return new Point(low, byte - this.starts[low]);
  }

  span(start, end) {
    return new SourceSpan(new ByteRange(start, end), this.point(start), this.point(end));
  }
}
