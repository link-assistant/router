// The checked source owner proof selects a linked expression template. Both
// runtime adapters instantiate that same template, never a custom method body.
import { readRuntimeProjectData } from '../project-data-loader.js';
export const RUST_FLOAT_PREDICATE_POLICY = readRuntimeProjectData(new URL('./data/rust-float-predicates.lino', import.meta.url));

export function createRustFloatPredicateExpression(method, receiver, span) {
  if (!Object.hasOwn(RUST_FLOAT_PREDICATE_POLICY.templates, method)) throw new TypeError('unknown Rust float predicate template');
  return createRustFloatTemplateExpression(RUST_FLOAT_PREDICATE_POLICY.templates[method], receiver, span);
}

export function createRustFloatOperationExpression(method, receiver, span) {
  if (!Object.hasOwn(RUST_FLOAT_PREDICATE_POLICY.operationTemplates, method)) throw new TypeError('unknown Rust float operation template');
  return createRustFloatTemplateExpression(RUST_FLOAT_PREDICATE_POLICY.operationTemplates[method], receiver, span);
}

export function createRustFloatConstantExpression(name, span) {
  if (!Object.hasOwn(RUST_FLOAT_PREDICATE_POLICY.constantTemplates, name)) throw new TypeError('unknown Rust float constant template');
  return createRustFloatTemplateExpression(RUST_FLOAT_PREDICATE_POLICY.constantTemplates[name], null, span);
}

function createRustFloatTemplateExpression(template, receiver, span) {
  const instantiate = value => {
    if (value?.slot === 'receiver') return receiver;
    if (Array.isArray(value)) return value.map(instantiate);
    if (value && typeof value === 'object') {
      const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, instantiate(child)]));
      if (result.k) result.span = span;
      return result;
    }
    return value;
  };
  return instantiate(template);
}
