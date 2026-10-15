import { LinkNetwork } from './network.js';
import { ParseConfiguration } from './primitives.js';

/** Case-insensitive parser extension registry matching the Rust runtime. */
export class ParserRegistry {
  constructor(fallback = undefined) {
    this.parsers = new Map();
    this.fallback = fallback ?? ((text, language, configuration) =>
      LinkNetwork.parse(text, language, configuration));
  }

  register(language, parser) {
    this.parsers.set(normalize(language), parser);
    return this;
  }

  withParser(language, parser) {
    return this.register(language, parser);
  }

  with_parser(language, parser) {
    return this.withParser(language, parser);
  }

  parserFor(language) {
    return this.parsers.get(normalize(language));
  }

  parser_for(language) {
    return this.parserFor(language);
  }

  isRegistered(language) {
    return this.parsers.has(normalize(language));
  }

  is_registered(language) {
    return this.isRegistered(language);
  }

  size() {
    return this.parsers.size;
  }

  len() {
    return this.size();
  }

  isEmpty() {
    return this.parsers.size === 0;
  }

  is_empty() {
    return this.isEmpty();
  }

  parse(text, language, configuration = ParseConfiguration.default()) {
    const parser = this.parserFor(language);
    if (!parser) {
      return this.fallback(text, language, configuration);
    }
    if (typeof parser === 'function') {
      return parser(text, language, configuration);
    }
    if (typeof parser.parseSource === 'function') {
      return parser.parseSource(text, language, configuration);
    }
    throw new TypeError('registered parser must be a function or expose parseSource()');
  }
}

function normalize(language) {
  return String(language).toLowerCase();
}
