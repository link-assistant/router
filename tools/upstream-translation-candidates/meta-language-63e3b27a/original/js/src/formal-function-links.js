// A function definition is its declared interface and actual recursive closure.
// Public names, source-language context and primitive semantics stay meaningful.
import { encodeFormalConceptDefinition } from './formal-concept-definition.js';
import { acceptFormalFunctionDeclaration, acceptFormalFunctionDependency, includeFormalFunctionRelation } from './formal-function-rules.js';
import { decodeTypedProgramLinks, encodeTypedProgramLinks, TYPED_PROGRAM_LINKS_SCHEMA } from './typed-program-links.js';
import { LinkNetwork } from './network.js';
import { LinkId } from './primitives.js';

const entryName = 'selected_function_definition';
const key = id => LinkId.from(id).asU64();
const fail = message => { throw new TypeError(`formal function: ${message}`); };

function relations(network) {
  const result = new Map();
  for (const relation of network.fieldRelations()) {
    const id = key(relation.parent);
    if (!result.has(id)) result.set(id, []);
    result.get(id).push(relation);
  }
  return result;
}

function directory(network, root, fields) {
  const body = network.link(root).references()[0];
  const declarations = fields.get(key(body)).find(relation => relation.label === TYPED_PROGRAM_LINKS_SCHEMA.fields.declarations).child;
  const result = new Map();
  for (const id of network.link(declarations).references()) {
    const pair = network.link(id).references();
    result.set(network.link(pair[0]).metadata().definition, pair[1]);
  }
  return { body, declarations: result };
}

function reachable(network, root, fields, redirects = new Map(), semantic = false) {
  const seen = new Set();
  const pending = [root];
  for (let at = 0; at < pending.length; at += 1) {
    const id = key(pending[at]);
    if (seen.has(id) || redirects.has(id)) continue;
    if (seen.size >= 100000 || pending.length > 100000) fail('reference resource limit exceeded');
    seen.add(id);
    pending.push(...network.link(id).references());
    for (const relation of fields.get(id) ?? []) if (!semantic || includeFormalFunctionRelation(relation.label)) pending.push(relation.child);
  }
  return seen;
}

// Reuse original declaration roots and their binding/call identities. Only the
// generated entry wrapper and its small root containers are imported anew.
function importSelection(original, generated, root, redirects) {
  const fields = relations(generated);
  const selected = reachable(generated, root, fields, redirects);
  const ids = new Map(redirects);
  const network = LinkNetwork.fromLino(original.toLino());
  for (const id of selected) ids.set(id, network.insertLink([], generated.link(id).metadata().clone()));
  for (const id of selected) {
    network.link(ids.get(id)).setReferences(generated.link(id).references().map(reference => ids.get(key(reference))));
    for (const relation of fields.get(id) ?? []) network.insertFieldRelation(ids.get(id), relation.label, ids.get(key(relation.child)));
  }
  return { network, root: ids.get(key(root)) };
}

function redirectSignature(original, chosen, generated, wrapper, redirects) {
  const first = relations(original); const second = relations(generated);
  const field = (fields, id, name) => fields.get(key(id)).find(relation => relation.label === (TYPED_PROGRAM_LINKS_SCHEMA.fields[name] ?? name)).child;
  const redirect = (from, to) => {
    if (redirects.has(key(from)) && key(redirects.get(key(from))) !== key(to)) fail('the generated signature changes shared type identity');
    redirects.set(key(from), to);
  };
  const ret = field(first, chosen, 'ret');
  redirect(field(second, wrapper, 'ret'), ret);
  const body = field(second, wrapper, 'body');
  redirect(field(second, body, 'type'), ret);
  const originalParams = original.link(field(first, chosen, 'params')).references();
  const generatedParams = generated.link(field(second, wrapper, 'params')).references();
  const argumentsList = generated.link(field(second, body, 'args')).references();
  for (const [index, parameter] of originalParams.entries()) {
    for (const name of ['type', 'guard', 'default']) {
      const label = TYPED_PROGRAM_LINKS_SCHEMA.fields[name] ?? name;
      const target = first.get(key(parameter)).find(relation => relation.label === label);
      const origin = second.get(key(generatedParams[index])).find(relation => relation.label === label);
      if (target && origin) redirect(origin.child, target.child);
    }
    redirect(field(second, argumentsList[index], 'type'), field(first, parameter, 'type'));
  }
}

/**
 * Select a flat owned function by qualified name or actual declaration link ID.
 * Its complete supported dependency closure retains original reference IDs.
 * A checked call wrapper identifies the entry under the existing primitive
 * model; unrelated declarations and main effects do not enter its meaning.
 */
export function encodeFormalFunctionDefinition(value, declaration, { provenance } = {}) {
  const network = value?.network ?? (typeof value?.links === 'string' ? LinkNetwork.fromLino(value.links) : null);
  if (!(network instanceof LinkNetwork)) fail('a checked linked program is required');
  const root = LinkId.from(value.root);
  // Preserve all existing unsupported/unknown formal-basis outcomes.
  encodeFormalConceptDefinition({ network, root });
  const program = decodeTypedProgramLinks(network, root);
  if (program.imports?.length) fail('imported declaration contexts are unsupported');
  const fields = relations(network);
  const input = directory(network, root, fields);
  const name = typeof declaration === 'string' ? declaration
    : [...input.declarations].find(([, id]) => key(id) === key(declaration))?.[0];
  const chosen = program.declarations.get(name);
  if (!chosen || !acceptFormalFunctionDeclaration(chosen.k)) fail('the selected identity is not an owned function declaration');
  if (program.declarations.has(entryName)) fail('the reserved function definition entry name is already declared');
  if (chosen.params.some(parameter => parameter.guard != null || parameter.default != null)) fail('parameter guards and defaults need a separate wrapper context proof');
  const selected = reachable(network, input.declarations.get(name), fields, new Map(), true);
  const externalField = fields.get(key(input.body)).find(relation => relation.label === (TYPED_PROGRAM_LINKS_SCHEMA.fields.externals ?? 'externals'));
  if (externalField && network.link(externalField.child).references().some(id => selected.has(key(id)))) fail('captured external definitions are unsupported');
  const declarations = new Map([...program.declarations].filter(([name]) => selected.has(key(input.declarations.get(name)))));
  for (const definition of declarations.values()) if (!acceptFormalFunctionDependency(definition.k) || definition.modulePath?.length) fail('the function closure has an unsupported declaration context');
  const params = chosen.params.map(parameter => ({ ...parameter }));
  const call = { k: 'call', fn: chosen.fullName, args: params.map(parameter => ({ k: 'var', name: parameter.name, type: parameter.type })), type: chosen.ret };
  const wrapper = { ...chosen, name: entryName, fullName: entryName, modulePath: [], params, body: call, recursive: false, decreasing: null, generated: true };
  delete wrapper.span; delete wrapper.mutual; delete wrapper.sourceSignature;
  delete wrapper.sourceLoop;
  declarations.set(entryName, wrapper);
  const projected = { ...program, items: [...declarations.values()], declarations, main: { effects: [] } };
  delete projected.externals;
  const generated = encodeTypedProgramLinks(projected);
  const prepared = directory(generated.network, generated.root, relations(generated.network));
  const redirects = new Map([...declarations.keys()].filter(name => name !== entryName).map(name => [key(prepared.declarations.get(name)), input.declarations.get(name)]));
  redirectSignature(network, input.declarations.get(name), generated.network, prepared.declarations.get(entryName), redirects);
  const selectedProgram = importSelection(network, generated.network, generated.root, redirects);
  return encodeFormalConceptDefinition(selectedProgram, { provenance });
}
