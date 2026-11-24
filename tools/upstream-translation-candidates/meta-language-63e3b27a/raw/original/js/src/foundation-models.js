import { readRuntimeProjectData } from './project-data-loader.js';

/**
 * The foundations meta-language knows, as data: integer, overflow, universe,
 * effect, proof and logic models, the models each language uses, and the
 * explicit correspondences between distinct models. Generated from
 * parity/foundation-models.json by js/scripts/build-foundation-models.mjs;
 * the Rust runtime embeds the same file. No model is the universal logic
 * every other model reduces to: a consumer brings its own foundation and
 * proof authority and relates it to these models through correspondences.
 */
export const FOUNDATION_MODELS = deepFreeze(
  readRuntimeProjectData(new URL('./data/foundation-models.lino', import.meta.url)),
);

/** The kinds of correspondence between two distinct models; none of them claims the models are the same. */
export const CORRESPONDENCE_KINDS = Object.freeze(['embedding', 'conditional', 'encoding', 'restatement']);

/**
 * The families whose models are logics or proof authorities. A model of one
 * of them that every other model of its family embeds into, or (beyond the
 * booleans every language has) that every language is made to use, would be
 * a hard-coded universal logic.
 */
export const LOGIC_FAMILIES = Object.freeze(['logic-model', 'proof-system', 'universe-model']);

const FIELDS = Object.freeze({
  file: ['description', 'families', 'models', 'correspondences', 'distinctions', 'languages'],
  family: ['id', 'definition'],
  model: ['id', 'family', 'definition', 'properties', 'sourceAliases'],
  correspondence: ['from', 'to', 'kind', 'condition', 'translationEncodings'],
  distinction: ['models', 'reason', 'translationEncodings'],
  language: ['language', 'models'],
});

/** Every foundation model, in register order. */
export function foundationModels() {
  return FOUNDATION_MODELS.models;
}

/** The model named `id`, or `undefined`. */
export function foundationModel(id) {
  return FOUNDATION_MODELS.models.find((model) => model.id === id);
}

/** The models `language` (such as `Rust` or `Lean`) uses, optionally of one family. */
export function languageFoundationModels(language, family) {
  const entry = FOUNDATION_MODELS.languages.find((candidate) => candidate.language === language);
  if (!entry) return [];
  return entry.models.map(foundationModel).filter((model) => family === undefined || model.family === family);
}

/** The recorded correspondences from model `from` to model `to`, in either direction. */
export function foundationCorrespondences(from, to) {
  return FOUNDATION_MODELS.correspondences.filter(
    (entry) => (entry.from === from && entry.to === to) || (entry.from === to && entry.to === from),
  );
}

/** The correspondences and distinctions that justify a translation encoding or assumption id. */
export function foundationJustifications(encoding) {
  return [...FOUNDATION_MODELS.correspondences, ...FOUNDATION_MODELS.distinctions].filter((entry) =>
    (entry.translationEncodings ?? []).includes(encoding),
  );
}

/**
 * Checks that a foundation register keeps foundations neutral: every model is
 * data in a declared family, distinct models are not merged or claimed equal,
 * every correspondence states its condition, every language names its own
 * models, and no model is a universal logic. Returns the problems found, each
 * `{ kind, subject, message }`; an empty list means the register is neutral.
 */
export function checkFoundationModels(register) {
  const problems = [];
  const report = (kind, subject, message) => problems.push({ kind, subject, message });
  const fields = (kind, subject, value) => {
    for (const field of Object.keys(value ?? {})) {
      if (!FIELDS[kind].includes(field)) {
        report('unknown-field', subject, `${subject} declares ${field}, which the runtimes do not read; a foundation cannot be marked universal or authoritative`);
      }
    }
  };
  fields('file', 'the register', register);
  const families = new Map();
  for (const family of register.families ?? []) {
    fields('family', family.id, family);
    if (families.has(family.id)) report('duplicate', family.id, `family ${family.id} is declared twice`);
    families.set(family.id, family);
  }
  const models = new Map();
  for (const model of register.models ?? []) {
    fields('model', model.id, model);
    if (models.has(model.id)) report('duplicate', model.id, `model ${model.id} is declared twice`);
    models.set(model.id, model);
    if (!families.has(model.family)) report('unknown-family', model.id, `${model.id} belongs to undeclared family ${model.family}`);
    else if (!model.id.startsWith(`${model.family}.`)) report('identity', model.id, `${model.id} is not named under its family ${model.family}`);
    if (!model.definition) report('definition', model.id, `${model.id} has no definition`);
    if (!model.properties || Object.keys(model.properties).length === 0) {
      report('properties', model.id, `${model.id} records no properties, so its distinctness cannot be checked`);
    }
  }
  const all = [...models.values()];
  for (const [index, model] of all.entries()) {
    for (const other of all.slice(index + 1)) {
      if (model.family === other.family && canonicalJson(model.properties) === canonicalJson(other.properties)) {
        report('indistinct-models', model.id, `${model.id} and ${other.id} record the same properties: one meaning must be one model with source aliases`);
      }
    }
  }
  const pairs = new Set();
  for (const entry of register.correspondences ?? []) {
    const subject = `${entry.from} -> ${entry.to}`;
    fields('correspondence', subject, entry);
    for (const end of [entry.from, entry.to]) {
      if (!models.has(end)) report('unknown-model', subject, `${subject} names undeclared model ${end}`);
    }
    if (entry.from === entry.to) report('self-correspondence', subject, `${subject} relates a model to itself`);
    if (!CORRESPONDENCE_KINDS.includes(entry.kind)) {
      report('correspondence-kind', subject, `${subject} has kind ${entry.kind}; two distinct models never correspond exactly, and the same meaning must be one model`);
    }
    if (typeof entry.condition !== 'string' || entry.condition.trim().length < 20) {
      report('unconditioned-correspondence', subject, `${subject} does not state the condition under which the models agree`);
    }
    const key = [entry.from, entry.to].sort().join('\u0000');
    if (pairs.has(key)) report('duplicate', subject, `${subject} is recorded twice`);
    pairs.add(key);
  }
  for (const entry of register.distinctions ?? []) {
    const subject = (entry.models ?? []).join(' / ');
    fields('distinction', subject, entry);
    if (entry.models?.length !== 2) report('distinction', subject, 'a distinction names exactly two models');
    for (const id of entry.models ?? []) {
      if (!models.has(id)) report('unknown-model', subject, `distinction ${subject} names undeclared model ${id}`);
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 20) report('distinction', subject, `distinction ${subject} gives no reason`);
  }
  const languages = register.languages ?? [];
  for (const entry of languages) {
    fields('language', entry.language, entry);
    const used = new Set();
    for (const id of entry.models ?? []) {
      const model = models.get(id);
      if (!model) report('unknown-model', entry.language, `${entry.language} uses undeclared model ${id}`);
      else used.add(model.family);
    }
    for (const family of families.keys()) {
      if (!used.has(family)) report('language-family', entry.language, `${entry.language} does not record its ${family}`);
    }
  }
  for (const family of LOGIC_FAMILIES.filter((id) => families.has(id))) {
    const members = all.filter((model) => model.family === family);
    if (members.length < 2) continue;
    for (const model of members) {
      const others = members.filter((other) => other !== model);
      const reached = others.filter((other) =>
        (register.correspondences ?? []).some((entry) => entry.kind === 'embedding' && entry.from === other.id && entry.to === model.id),
      );
      if (reached.length === others.length) {
        report('universal-model', model.id, `every other ${family} embeds into ${model.id}, which makes it a hard-coded universal logic`);
      }
      if (languages.length > 1 && languages.every((entry) => (entry.models ?? []).includes(model.id)) && family !== 'logic-model') {
        report('universal-model', model.id, `every language is made to use ${model.id}, which makes it a hard-coded universal foundation`);
      }
    }
  }
  return problems;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
