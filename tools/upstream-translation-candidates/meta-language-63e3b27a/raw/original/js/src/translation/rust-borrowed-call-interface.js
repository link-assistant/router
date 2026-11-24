// This opt-in interface changes actual checked calls, never source strings.
// Immutable reference parameters expose primitive copies in the closed value
// model; local borrows re-establish the retained target header at each call.
import { readRuntimeProjectData } from '../project-data-loader.js';
import { unsupported } from './diagnostics.js';
import { typeKey } from './types.js';
import { readRustPrimitiveSourceHeaders, validateRustPrimitiveValueExpressions } from './rust-source-header-emission.js';
import { renderRustSourceHeaderCopy } from './rust-source-header-emission-rules.js';
import { acceptRustBorrowedCallInterfaceModel, acceptRustBorrowedCallTarget,
  acceptRustBorrowedCallShape, acceptRustBorrowedCallInventory,
  acceptRustBorrowedCallType, renderRustBorrowedCallReference,
  renderRustBorrowedCallInvocation, renderRustBorrowedCallBlock } from './rust-borrowed-call-interface-rules.js';

export const RUST_BORROWED_CALL_INTERFACE_POLICY = readRuntimeProjectData(new URL('./data/rust-borrowed-call-interface.lino', import.meta.url));
const fail = detail => { throw unsupported('Rust borrowed call interface', detail); };

/** Admit actual complete-program headers and checked caller/leaf identities. */
export function readRustBorrowedCallInterface(program, model) {
  const policy = RUST_BORROWED_CALL_INTERFACE_POLICY;
  if (!acceptRustBorrowedCallInterfaceModel(model)) throw unsupported('Rust source header emission model', `select ${policy.model}`);
  const headers = readRustPrimitiveSourceHeaders(program);
  const leaves = new Set(); const callers = [];
  for (const [key, declaration] of program.declarations) {
    if (key !== declaration.fullName) fail('the target must be an actual owned declaration identity');
    if (declaration.body?.k === policy.callerKind) callers.push(declaration);
    else { validateRustPrimitiveValueExpressions([declaration.body]); leaves.add(key); }
  }
  if (!acceptRustBorrowedCallInventory(callers.length > 0)) fail('the closed interface requires an actual direct caller');
  const targets = new Map();
  for (const declaration of callers) {
    const call = declaration.body;
    const target = program.declarations.get(call.fn);
    const signature = headers.get(call.fn);
    const staticLifetime = signature?.parameters.some(position => position.lifetimes.some(lifetime => policy.forbiddenTargetLifetimes.includes(lifetime))) ?? false;
    if (!acceptRustBorrowedCallTarget(Boolean(target && target.fullName === call.fn && signature), leaves.has(call.fn), staticLifetime)) fail('every caller must target an owned pure leaf without a static borrowed input');
    const unrepresented = Object.keys(call).some(field => !policy.callFields.includes(field));
    if (!acceptRustBorrowedCallShape(call.k, unrepresented, Array.isArray(call.args) && call.args.length === target.params.length)) fail('the actual checked call must retain its ordered arguments without unrepresented fields');
    validateRustPrimitiveValueExpressions(call.args);
    const argumentTypes = call.args.every((argument, index) => typeKey(argument.type) === typeKey(target.params[index].type));
    const resultTypes = typeKey(call.type) === typeKey(target.ret) && typeKey(declaration.ret) === typeKey(target.ret);
    if (!acceptRustBorrowedCallType(argumentTypes, resultTypes)) fail('the caller and target must retain their checked primitive argument and result types');
    targets.set(call.fn, signature);
  }
  return { headers, targets };
}

/** Materialize every argument once in source order before borrowing copies. */
export function renderRustBorrowedCall(signature, head, argumentsText, names, indent) {
  const bindings = argumentsText.map((value, index) => renderRustSourceHeaderCopy(names[index], value));
  const arguments_ = names.map((name, index) => {
    let value = name;
    for (const _wrapper of signature.parameters[index].wrappers) value = renderRustBorrowedCallReference(value);
    return value;
  });
  const invocation = renderRustBorrowedCallInvocation(head, arguments_.join(', '));
  return renderRustBorrowedCallBlock(indent([...bindings, invocation].join('\n'), 1));
}
