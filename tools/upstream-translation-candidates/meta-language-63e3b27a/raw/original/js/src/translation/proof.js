// Portable proof plans. A source proof keeps its structure (which variable
// is split by induction or case analysis, the names of fields and induction
// hypotheses) and its hints (definitions to unfold, lemmas and hypotheses to
// use, whether arithmetic or computation closes a goal). Each target emits
// its own tactics from the plan and its kernel re-checks the result, so a
// proof is never copied as text into a language that cannot check it.

import { typeError, unsupported } from './diagnostics.js';
import { typeKey } from './types.js';

const NAT_CTORS = {
  zero: 'zero', O: 'zero', 'Nat.zero': 'zero',
  succ: 'succ', S: 'succ', 'Nat.succ': 'succ',
};

/**
 * @param {object} proof surface proof `{ steps, source, sourceLanguage }`
 * @param {object} theorem checked theorem entry (binders already hoisted)
 * @param {object} context `{ lookup(name) -> entry | undefined, dataEntry(name) }`
 */
export function normaliseProof(proof, theorem, context) {
  const hints = emptyHints();
  const locals = new Map(theorem.binders.map((binder) => [binder.name, binder.type]));
  const plan = sequence(proof.steps, hints, locals, theorem, context, proof.sourceLanguage);
  return {
    plan,
    source: proof.source ?? '',
    sourceLanguage: proof.sourceLanguage,
  };
}

function emptyHints() {
  return { unfold: [], lemmas: [], hyps: [], library: [], arith: false, compute: false };
}

function mergeHints(into, from) {
  for (const key of ['unfold', 'lemmas', 'hyps', 'library']) {
    for (const value of from[key]) if (!into[key].includes(value)) into[key].push(value);
  }
  into.arith ||= from.arith;
  into.compute ||= from.compute;
  return into;
}

function sequence(steps, hints, locals, theorem, context, language) {
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    switch (step.t) {
      case 'intro':
        // Leading binders are hoisted into the theorem's parameters, where the
        // target introduces them; later `intro`s have nothing left to name.
        if (step.names.some((name) => !locals.has(name))) {
          throw unsupported('intro', 'introducing hypotheses beyond the theorem binders is outside the portable proof model', undefined);
        }
        break;
      case 'unfold':
        for (const name of step.names) addRule(hints, name, locals, theorem, context, false);
        break;
      case 'rewrite':
      case 'simp':
        for (const rule of step.rules) addRule(hints, rule.name, locals, theorem, context, rule.reverse);
        if (step.t === 'simp') hints.compute = true;
        break;
      case 'compute':
        hints.compute = true;
        break;
      case 'arith':
        hints.arith = true;
        break;
      case 'induction':
      case 'cases': {
        const trailing = steps.slice(index + 1);
        return split(step, trailing, hints, locals, theorem, context, language);
      }
      default:
        throw unsupported(`proof step ${step.t}`, 'outside the portable proof model', undefined);
    }
  }
  return { k: 'close', hints };
}

function addRule(hints, name, locals, theorem, context, reverse) {
  if (locals.has(name)) {
    if (!hints.hyps.includes(name)) hints.hyps.push(name);
    return;
  }
  const entry = context.lookup(name);
  if (entry?.k === 'fn') {
    if (!hints.unfold.includes(entry.fullName)) hints.unfold.push(entry.fullName);
    return;
  }
  if (entry?.k === 'theorem') {
    if (entry.fullName === theorem.fullName) throw typeError(`${name} uses itself`, undefined);
    if (!hints.lemmas.includes(entry.fullName)) hints.lemmas.push(entry.fullName);
    return;
  }
  // Library facts such as `Nat.mul_add` or `Nat.add_comm`: every target
  // closes arithmetic with its own decision procedure, so the name is kept
  // for provenance only.
  if (!hints.library.includes(name)) hints.library.push(reverse ? `<-${name}` : name);
  hints.arith = true;
}

function split(step, trailing, hints, locals, theorem, context, language) {
  const type = locals.get(step.variable);
  if (!type) throw unsupported(`${step.t} on ${step.variable}`, 'only theorem binders can be split', undefined);
  const ctors = constructorsOf(type, context);
  if (!ctors) throw unsupported(`${step.t} on ${typeKey(type)}`, 'only natural numbers and data types can be split', undefined);
  const induction = step.t === 'induction';
  // Rocq names cases by position (`as [| k ih]` and one bullet per
  // subgoal, in constructor order); Lean names them by constructor.
  if (step.positional && step.cases.length > ctors.length) {
    throw typeError(`${step.t} on ${step.variable} has ${step.cases.length} cases but ${typeKey(type)} has ${ctors.length} constructors`, undefined);
  }
  const cases = ctors.map((ctor, ctorIndex) => {
    const written = step.positional
      ? step.cases[ctorIndex]
      : step.cases.find((kase) => canonicalCtor(kase.ctor, type) === ctor.name);
    const recursive = ctor.fields.map((field) => typeKey(field.type) === typeKey(type));
    const { fields, ihs } = assignBinds(written?.binds ?? [], ctor, recursive, induction, language);
    const inner = new Map(locals);
    ctor.fields.forEach((field, fieldIndex) => inner.set(fields[fieldIndex], field.type));
    for (const ih of ihs) inner.set(ih, { kind: 'hypothesis' });
    const caseHints = mergeHints(emptyHints(), hints);
    const steps = [...(written?.steps ?? []), ...trailing];
    const plan = sequence(steps, caseHints, inner, theorem, context, language);
    return { ctor: ctor.name, fields, ihs, recursive, plan };
  });
  for (const kase of step.positional ? [] : step.cases) {
    if (!ctors.some((ctor) => ctor.name === canonicalCtor(kase.ctor, type))) {
      throw typeError(`${typeKey(type)} has no constructor ${kase.ctor}`, undefined);
    }
  }
  return { k: induction ? 'induction' : 'cases', variable: step.variable, type, cases };
}

function canonicalCtor(name, type) {
  if (type.kind === 'nat') return NAT_CTORS[name] ?? name;
  return name.split('.').at(-1);
}

function constructorsOf(type, context) {
  if (type.kind === 'nat') {
    return [{ name: 'zero', fields: [] }, { name: 'succ', fields: [{ name: 'pred', type }] }];
  }
  if (type.kind === 'data') return context.dataEntry(type.name).ctors;
  return undefined;
}

/**
 * Lean lists all fields first and then one hypothesis per recursive field;
 * Rocq's `as` patterns put each hypothesis right after its field.
 */
function assignBinds(binds, ctor, recursive, induction, language) {
  const fields = [];
  const ihs = [];
  let cursor = 0;
  const take = (fallback) => {
    const name = binds[cursor];
    cursor += 1;
    return name && name !== '_' ? name : fallback;
  };
  let fresh = 0;
  const generated = (prefix) => {
    fresh += 1;
    return `ml_${prefix}${fresh}`;
  };
  if (language === 'Rocq') {
    ctor.fields.forEach((_, index) => {
      fields.push(take(generated('x')));
      if (induction && recursive[index]) ihs.push(take(generated('ih')));
    });
  } else {
    ctor.fields.forEach(() => fields.push(take(generated('x'))));
    if (induction) recursive.forEach((isRecursive) => { if (isRecursive) ihs.push(take(generated('ih'))); });
  }
  if (cursor < binds.length) throw typeError(`${ctor.name} case names ${binds.length} variables`, undefined);
  return { fields, ihs };
}

/** Functions, in first-use order, that a proposition mentions. */
export function propFunctions(prop, into = []) {
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.k === 'call' && !into.includes(node.fn)) into.push(node.fn);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'domain') continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(prop);
  return into;
}
