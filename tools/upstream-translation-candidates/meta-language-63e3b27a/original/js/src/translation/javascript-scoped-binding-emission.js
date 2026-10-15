import {readRuntimeProjectData} from '../project-data-loader.js';
import {validateLinkedTypedProgram} from '../typed-program-links-validation.js';
import {recheckLinkedTypedProgram} from '../typed-program-checked-projection.js';
import {checkRustScalarLoopProof} from './rust-scalar-loops.js';
import {checkRustSourceSignature} from './rust-source-signatures.js';
import {checkRustEmptyOptionProof} from './rust-empty-options.js';
import {validateRustTypeNamespace} from './rust-type-namespace.js';
import {unsupported} from './diagnostics.js';
import {acceptJavaScriptScopedBindingEmissionModel, acceptJavaScriptScopedBindingEmissionContext,
  acceptJavaScriptScopedBindingEmissionReferenceContext,
  acceptJavaScriptScopedBindingEmissionDeclaration, acceptJavaScriptScopedBindingEmissionValueType,
  acceptJavaScriptScopedBindingEmissionAbsentValueType,
  acceptJavaScriptScopedBindingEmissionAbsentExpression,
  acceptJavaScriptScopedBindingEmissionExpression, acceptJavaScriptScopedBindingEmissionEffect,
  acceptJavaScriptScopedBindingEmissionRole, acceptJavaScriptScopedBindingOwnField, acceptJavaScriptScopedBindingSourceFacet, acceptJavaScriptScopedBindingBooleanField, acceptJavaScriptScopedBindingEmptySequence, acceptJavaScriptScopedBindingDefinedField, renderJavaScriptScopedBindingIdentifier} from './javascript-scoped-binding-emission-rules.js';

export const JAVASCRIPT_SCOPED_BINDING_EMISSION_POLICY = readRuntimeProjectData(new URL('./data/javascript-scoped-binding-emission.lino', import.meta.url));
const fail = detail => { throw unsupported('JavaScript scoped binding emission', detail); };

/** Checked ownership precedes every local alias allocation. */
export function readJavaScriptScopedBindingEmission(program, model) {
  if (!acceptJavaScriptScopedBindingEmissionModel(model)) throw unsupported('JavaScript scoped binding emission model', `select ${JAVASCRIPT_SCOPED_BINDING_EMISSION_POLICY.model}`);
  validateLinkedTypedProgram(program);
  checkRustEmptyOptionProof(program);
  validateRustTypeNamespace(program);
  const ownFields=(value,role,kind='')=>{
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(field=>!acceptJavaScriptScopedBindingOwnField(role,kind,field))) fail('a checked '+role+' has unrepresented own fields');
    if(role!=='program'&&Object.keys(value).some(field=>!acceptJavaScriptScopedBindingDefinedField(value[field]===undefined)))fail('a checked '+role+' has an explicitly undefined field');
    if(Object.keys(value).some(field=>acceptJavaScriptScopedBindingBooleanField(role,kind,field)&&typeof value[field]!=='boolean'))fail('a checked '+role+' requires exact Boolean fields');
  };
  ownFields(program,'program');
  for(const field of JAVASCRIPT_SCOPED_BINDING_EMISSION_POLICY.emptySequenceFields)if(!acceptJavaScriptScopedBindingEmptySequence(field,Object.hasOwn(program,field),Array.isArray(program[field]),Array.isArray(program[field])&&program[field].length===0))fail('the closed program context requires actual empty import and external sequences');
  if(program.main!=null)ownFields(program.main,'main');
  const snapshotScope = program.sourceLanguage === 'JavaScript' && [...program.declarations.values()].some(declaration => declaration.sourceLoop !== undefined);
  const referenceForm = program.referenceSemantics === true ? 'true' : program.referenceSemantics === false ? 'false' : 'other';
  const referenceContext = !acceptJavaScriptScopedBindingEmissionReferenceContext(Object.hasOwn(program, 'referenceSemantics'), referenceForm, snapshotScope);
  const forbidden = Boolean(program.imports?.length || program.externals?.length || referenceContext
    || ['outputThreaded', 'abortsThreaded', 'utf16Strings'].some(name => Object.hasOwn(program, name) && program[name] !== false));
  if (!acceptJavaScriptScopedBindingEmissionContext(program.sourceLanguage, forbidden)) fail('only the closed scalar value context has an owned local interpretation');
  if(Object.keys(program).some(field=>!acceptJavaScriptScopedBindingDefinedField(program[field]===undefined)))fail('a checked program has an explicitly undefined field');
  const type = value => {
    const primitive = value && acceptJavaScriptScopedBindingEmissionValueType(value.kind, Object.keys(value).length === 1);
    const absent = value && acceptJavaScriptScopedBindingEmissionAbsentValueType(value.kind, value.element?.kind ?? '', value.absence ?? '',
      Object.keys(value).length === 3 && Object.keys(value.element ?? {}).length === 1);
    if (!primitive && !absent) fail('only primitive scalar values and the exact undefined optional value type are admitted');
  };
  const pending = [];
  for (const declaration of program.declarations.values()) {
    ownFields(declaration,'declaration',declaration.k);
    for(const field of JAVASCRIPT_SCOPED_BINDING_EMISSION_POLICY.validatedSourceFacets)if(Object.hasOwn(declaration,field)){
      const value=declaration[field];
      if(!acceptJavaScriptScopedBindingSourceFacet(field,Boolean(value&&typeof value==='object'&&!Array.isArray(value))))fail('an owned source facet must retain its actual checked record');
    }
    if (!acceptJavaScriptScopedBindingEmissionDeclaration(declaration.k, Boolean(declaration.modulePath?.length), Object.hasOwn(declaration, 'generated') && declaration.generated !== false)) fail('only flat original value functions own these local scopes');
    if (Object.hasOwn(declaration,'sourceSignature')) checkRustSourceSignature(declaration.sourceSignature,declaration.params.map(parameter=>parameter.type),declaration.ret,program.sourceLanguage);
    if (Object.hasOwn(declaration,'sourceLoop')) checkRustScalarLoopProof(declaration, program.sourceLanguage);
    type(declaration.ret);
    for (const parameter of declaration.params) {
      ownFields(parameter,'parameter');
      type(parameter.type);
      if (parameter.guard != null || parameter.default != null) fail('parameter guards, defaults and unrepresented facets require another scope proof');
    }
    pending.push(declaration.body);
  }
  for (const effect of program.main?.effects ?? []) {
    ownFields(effect,'effect',effect.k);
    if (!acceptJavaScriptScopedBindingEmissionEffect(effect.k)) fail('only ordered value bindings and prints are admitted in main');
    pending.push(effect.k === 'let' ? effect.value : effect.expr);
  }
  for (let at = 0; at < pending.length; at += 1) {
    if (at >= 100000) fail('the scoped value walk exceeds its resource limit');
    const node = pending[at]; type(node?.type);
    if (!acceptJavaScriptScopedBindingEmissionExpression(node.k)) fail('the construct has no admitted local ownership role');
    ownFields(node,'expression',node.k);
    if (node.k === 'none' && !acceptJavaScriptScopedBindingEmissionAbsentExpression(node.type.kind, node.absence ?? '')) fail('only the exact undefined empty expression is admitted');
    if (node.k === 'call' && !program.declarations.has(node.fn)) fail('each call must resolve to an actual owned declaration');
    if (node.k === 'binary') { type(node.domain); pending.push(node.left, node.right); }
    else if (node.k === 'unary') pending.push(node.arg);
    else if (node.k === 'let') pending.push(node.value, node.body);
    else if (node.k === 'if') pending.push(node.cond, node.then, node.else);
    else if (node.k === 'print') pending.push(node.text, node.body);
    else if (node.k === 'call' || node.k === 'math') pending.push(...node.args);
  }
  recheckLinkedTypedProgram(program,{wholeProgram:true});
  return (name, scope) => {
    let role; let owner;
    if (scope === program.main) { role = 'main binding'; owner = 'main effect container'; }
    else if (scope && scope.k === 'fn' && program.declarations.get(scope.fullName) === scope) {
      const preserved = scope.sourceLoop !== undefined;
      role = preserved ? 'scalar loop binding' : 'function binding';
      owner = preserved ? 'scalar loop declaration' : 'function declaration';
    } else fail('the alias does not belong to its actual checked declaration or main scope');
    if (!acceptJavaScriptScopedBindingEmissionRole(role, owner)) fail('the alias does not belong to an admitted binding scope');
    return renderJavaScriptScopedBindingIdentifier(name, owner === JAVASCRIPT_SCOPED_BINDING_EMISSION_POLICY.preservedScope);
  };
}
