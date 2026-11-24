// Original parser FieldDef/Ty constructor values in bounded source meta.
// Field token leaves are authentic input syntax, not fabricated compiler Ident,
// Span, resolved type, Option, attribute storage or heap/runtime identities.
import {createHash} from 'node:crypto';
import {deriveFootprintOriginalContext,deriveFootprintOriginalModule} from './derive-footprints.mjs';
import {planBuiltinDeriveBangOutput} from './builtin-derive-bang-footprints.mjs';
import {boundedInput} from './serde-bang-footprints.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal,originalAstFunction,originalAstDefinition,astStructLiteral,astEnumVariant} from './builtin-derive-ast-meta.mjs';
import {createBuiltinAstSourceSubstitution} from './builtin-ast-source-substitution.mjs';
import {splitBuiltinCallerSyntax} from './builtin-ast-caller-environments.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const states=new WeakMap(),cached=new WeakMap();
const item='compiler/rustc_parse/src/parser/item.rs',ty='compiler/rustc_parse/src/parser/ty.rs',mod='compiler/rustc_parse/src/parser/mod.rs',ast='compiler/rustc_ast/src/ast.rs';
const reference=value=>({source:value.source,sourceSha256:value.sourceSha256,span:value.span,digest:value.digest,syntaxSha256:value.syntaxSha256});
function recordFields(definition){
  const at=definition.syntax.findIndex(value=>value.text==='struct'),body=definition.syntax.slice(at+2).find(value=>value.delimiter==='{');
  if(!body)throw new TypeError('Original field input schema body missing');
  return splitBuiltinCallerSyntax(body.children).map(row=>{
    let at=0;if(row[at]?.text==='pub'){at++;if(row[at]?.delimiter==='(')at++;}
    if(row[at+1]?.text!==':')throw new TypeError('Original field input schema member remains open');return {name:row[at].text,typeSyntax:row.slice(at+2),span:row[at].span};
  });
}
function matching(root,predicate){
  const found=[];let cells=0;
  function walk(value,depth=0){if(++cells>16000||depth>64)throw new TypeError('Parsed field source traversal budget exceeded');if(!value||typeof value!=='object')return;if(predicate(value))found.push(value);for(const [key,child]of Object.entries(value))if(!['syntax','schema','recipe','import','typeSyntax','sourceBinding','original'].includes(key))if(Array.isArray(child))child.forEach(value=>walk(value,depth+1));else walk(child,depth+1);}
  walk(root);return found;
}
export function builtinParsedFieldConstructorSources(profile){
  builtinAstOriginal(profile,ast);if(cached.has(profile))return cached.get(profile);
  const stage=createBuiltinAstSourceSubstitution(profile),fieldFunction=originalAstFunction(profile,item,'parse_name_and_ty'),fieldRecipe=astStructLiteral(profile,fieldFunction,'FieldDef'),fieldSchema=originalAstDefinition(profile,ast,'struct','FieldDef');
  const program=stage.compile(fieldFunction),substitution=stage.substitute(program),candidates=matching(substitution.tree,value=>value.kind==='record-source-owner'&&value.name===fieldRecipe.name);
  if(candidates.length!==1)throw new TypeError('Original parsed field constructor value is absent or ambiguous');
  const candidate=candidates[0],schemaFields=recordFields(fieldSchema);
  if(candidate.fields.length!==schemaFields.length||new Set(candidate.fields.map(value=>value.name)).size!==schemaFields.length||candidate.fields.some(value=>!schemaFields.some(member=>member.name===value.name)))throw new TypeError('Actual field constructor values differ from its expected original AST schema');
  const typedFields=candidate.fields.map(value=>({...value,expectedSchemaMember:schemaFields.find(member=>member.name===value.name),typeOwnershipEstablished:false}));
  const typeFunction=originalAstFunction(profile,ty,'mk_ty'),typeProgram=stage.compile(typeFunction),typeValue=stage.substitute(typeProgram),typeRecipe=astStructLiteral(profile,typeFunction,'Ty'),typeSchema=originalAstDefinition(profile,ast,'struct','Ty');
  const path=originalAstFunction(profile,ty,'parse_path_start_ty'),kindSchema=originalAstDefinition(profile,ast,'enum','TyKind'),pathVariant=astEnumVariant(profile,kindSchema,'Path');
  // Keep every original recovery/default/macro/bounds path. A schema recipe
  // does not select a parser branch or grant a wildcard import's owner closure.
  const chain=[
    [item,'parse_field_def'],[item,'parse_single_struct_field'],[item,'parse_field_ident'],
    [ty,'parse_ty'],[mod,'ident_or_err'],[mod,'parse_ident_common'],
  ].map(([source,name])=>reference(originalAstFunction(profile,source,name)));
  const evidence={schema:'original-parser-field-constructor-values-v1',profileDigest:profile.digest,field:{function:reference(fieldFunction),recipe:fieldRecipe,schema:reference(fieldSchema),programDigest:program.digest,value:{...candidate,fields:typedFields},ownerEstablished:false},
    type:{function:reference(typeFunction),recipe:typeRecipe,schema:reference(typeSchema),programDigest:typeProgram.digest,value:typeValue,pathFunction:reference(path),pathVariant,ownerEstablished:false},chain,
    selectedOwnerBangComplete:false,generatedImplBehavior:false,fieldAstInputEstablished:false,parserBranchSelectionEstablished:false,fieldIdentifierHygieneEstablished:false,attributeStorageEstablished:false,optionOwnerEstablished:false,allocationPhaseBehavior:false,
    obligations:['actual token/Ident/Span source-map and hygiene construction remain open','FieldDef glob import resolution is distinct from the expected pinned schema','parser recovery/collect_tokens/visibility/safety/default/attributes remain original source requirements','Ty path/macros/bounds and parsed Path argument/segment construction remain independent','source Try/Option, NodeId and P allocation are not inferred from expected return types']};
  const encoded=JSON.stringify(evidence);if(Buffer.byteLength(encoded)>524288)throw new TypeError('Parsed field constructor metadata byte budget exceeded');const copy=JSON.parse(encoded);if(JSON.stringify(copy)!==encoded)throw new TypeError('Parsed field constructor semantic roundtrip changed');
  const result=freeze({...copy,digest:hash(encoded)});states.set(result,{profile});cached.set(profile,result);return result;
}
export function createBuiltinParsedFieldValueBridge({context,certificate,invocation}={}){
  const plan=planBuiltinDeriveBangOutput({context,certificate,invocation}),original=deriveFootprintOriginalContext(context,certificate),module=deriveFootprintOriginalModule(context,certificate),text=module.source.slice(certificate.span.start,certificate.span.end);
  if(hash(text)!==certificate.itemSha256)throw new TypeError('Parsed field input original bytes changed');
  const input=boundedInput(certificate,text,null),profile=builtinDeriveAstSourceProfile(original.dependencies),constructors=builtinParsedFieldConstructorSources(profile);
  const rows=(input.fields??[]).map((field,index)=>{
    const absolute=span=>({start:span.start+certificate.span.start,end:span.end+certificate.span.start}),nameSpan=absolute(field.span),typeSpan=absolute(field.typeSpan);
    const leaf=(span,role)=>({tag:'original-field-token-input',role,source:certificate.source,sourceSha256:certificate.sourceSha256,sourceUtf16Span:span,sourceUtf8Range:{start:Buffer.byteLength(module.source.slice(0,span.start)),end:Buffer.byteLength(module.source.slice(0,span.end))},syntax:module.source.slice(span.start,span.end),scope:module.path,moduleScopeKey:module.moduleScopeKey??null,compilationProfile:certificate.compilationProfile,compilerValueEstablished:false});
    return {index,name:leaf(nameSpan,'original field identifier input to parse_field_ident'),type:leaf(typeSpan,'original type token input to parse_ty'),constructorDigest:constructors.digest,recordValueDigest:hash(JSON.stringify(constructors.field.value)),fieldAstInputEstablished:false};
  });
  const evidence={schema:'original-parser-field-input-value-bridge-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,planDigest:plan.digest,profileDigest:profile.digest,compilationProfile:certificate.compilationProfile,originalInput:input,constructors,rows,
    selectedOwnerBangComplete:false,generatedImplBehavior:false,fieldAstInputEstablished:false,fieldIdentifierHygieneEstablished:false,parserBranchSelectionEstablished:false,optionOwnerEstablished:false,allocationPhaseBehavior:false,
    obligations:['authentic field name/type token leaves are not Symbol/Ident/Span/Ty compiler values','scope/type/attribute/recovery/default and parser branch owners remain independent','rows do not fabricate empty fields/Option/default storage or copied receiver ASTs']};
  const encoded=JSON.stringify(evidence);if(Buffer.byteLength(encoded)>524288)throw new TypeError('Parsed field input bridge metadata byte budget exceeded');const copy=JSON.parse(encoded);if(JSON.stringify(copy)!==encoded)throw new TypeError('Parsed field input bridge semantic roundtrip changed');
  const result=freeze({...copy,digest:hash(encoded)});states.set(result,{context,certificate,invocation:freeze(JSON.parse(JSON.stringify(invocation))),sourceView:module.sourceView,moduleScopeKey:module.moduleScopeKey});return result;
}
export function assertBuiltinParsedFieldValues(value,expected){
  const state=states.get(value);
  if(!state||state.profile&&state.profile!==expected?.profile||state.context&&(state.context!==expected?.context||state.certificate!==expected?.certificate||JSON.stringify(state.invocation)!==JSON.stringify(expected?.invocation)))throw new TypeError('Parsed field values require their original private source identity');
  if(state.context){const module=deriveFootprintOriginalModule(state.context,state.certificate);if(module.sourceView!==state.sourceView||module.moduleScopeKey!==state.moduleScopeKey)throw new TypeError('Parsed field value original source scope changed');}
  return value;
}
export const isBuiltinParsedFieldValues=value=>!!value&&states.has(value);
