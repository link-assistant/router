// Resolve one original generated Default field through its actual source scope.
// A field proof supplies identity only; the child generator/checker must still
// prove the complete Default output, coherence, layout and body independently.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {assertDefaultCaller} from './default-trait-source.mjs';
import {deriveFootprintAt} from './derive-footprints.mjs';
import {inspectDeriveInput} from './derive-inputs.mjs';
import {isBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint} from './builtin-derive-bang-footprints.mjs';
import {validateBuiltinDefaultAstOutput,originalBuiltinDefaultAstOutput} from './builtin-default-ast-route.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from './extensions/host-contracts.mjs';
import {originalSourceTypeOwner} from './extensions/source-namespaces.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {assertOriginalParserIdentity} from './original-parser-identity.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
const fields=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original Default dependency: '+message);};
export function originalDefaultField(context,module,bangProof,index,Parser){
  if(Parser!==HostRustParser)fail('actual original Host parser required');
  if(types.isProxy(module))fail('plain original source module required');
  if(!isBuiltinDeriveBangFootprint(bangProof))fail('genuine original builtin output proof required');
  const {state,original}=assertDefaultCaller(context,module),route=bangProof.route;
  const item=originalSourceModuleItems(original).find(item=>item.start===bangProof.span.start&&item.end===bangProof.span.end);
  if(!item)fail('output is not the original caller declaration');
  const certificate=deriveFootprintAt(state.deriveContext,original,item),invocations=inspectDeriveInput(item,state.compilationProfile).derives.filter(row=>same(row.path,['Default']));
  if(!certificate||invocations.length!==1)fail('one genuine caller Default invocation is required');
  const invocation=invocations[0];assertBuiltinDeriveBangFootprint(bangProof,state.deriveContext,certificate,invocation);
  if(bangProof.schema!=='builtin-default-bang-output-v1')fail('actual named Default output required');
  const output=originalBuiltinDefaultAstOutput(route);validateBuiltinDefaultAstOutput(route,output);
  if(route.sourceSha256!==hash(original.source)||!Number.isSafeInteger(index)||index<0||index>=route.typedSource.fields.length)fail('original output source/field index differs');
  if(hash(original.source.slice(item.start,item.end))!==route.itemSha256)fail('output is not the original caller declaration');
  const field=route.typedSource.fields[index],scope=state.binding.scopes.find(row=>moduleScopeKey(row)===moduleScopeKey(original));if(!scope)fail('field original scope is absent');
  const parser=new Parser(tokenizeRust(original.source));configureParserSourceScope(parser,scope,state.binding.scopes,original.path);parser.modulePath=[...original.path];
  const snapshot=originalHostParserIdentitySnapshot(),identity=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};identity();
  parser.cursor.index=parser.cursor.tokens.findIndex(token=>token.start===field.typeSpan.start);if(parser.cursor.index<0)fail('field type has no actual original token boundary');
  const first=parser.cursor.index;let type;
  try{type=parser.type();}catch(error){if(!(error instanceof TranslationError))throw error;fail('field original type remains unproved: '+error.message);}
  identity();
  if(parser.cursor.tokens[parser.cursor.index-1]?.end!==field.typeSpan.end||original.source.slice(field.typeSpan.start,field.typeSpan.end)!==field.typeSource)fail('field complete original type span differs');
  const syntax=parser.cursor.tokens.slice(first,parser.cursor.index).map(token=>token.value),generic=type.rustGeneratedTypeOwner&&parser.genericTypes.get(type.rustGeneratedTypeOwner.name);
  let owner,sourceOwner=null;
  if(type.kind==='string'&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String')owner='String';
  else if(type.kind==='array'&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='Vec')owner='Vec';
  else if(generic?.standardGeneric?.kind==='Option'&&generic.standardGeneric.arguments.length===1)owner='Option';
  else if(['bool','fixed','float','string'].includes(type.kind)&&syntax.length===1&&!type.rustReference&&!type.rustOwnership)owner=syntax[0];
  else if(type.kind==='named'&&!type.rustReference&&!type.rustOwnership&&!type.rustGenericIdentityUnresolved&&!generic){
    sourceOwner=originalSourceTypeOwner(parser,type,original.path);
    if(sourceOwner&&same(sourceOwner,type.path))owner='generated';
    else if(same(type.path,['serde_json','Value'])){
      // A real local root or unresolved alias resolves elsewhere (or refuses).
      // A named import must retain its actual resolved target; a qualified
      // external path still needs the independent pinned package selection.
      const leading=syntax[0],binding=scope.bindings.filter(row=>row.namespace==='type'&&row.name===leading),ancestors=state.binding.scopes.filter(row=>row.path.every((part,index)=>original.path[index]===part));
      const segments=syntax.filter(token=>token!=='::');
      if(segments.length*2-1===syntax.length&&syntax.every((token,index)=>index%2?token==='::':/^[A-Za-z_][A-Za-z0-9_]*$/.test(token))&&
         !ancestors.some(row=>row.bindings.some(binding=>binding.namespace==='type'&&binding.name==='serde_json'&&(binding.status!=='resolved'||!same(binding.target,['serde_json']))))&&
         (binding.length===0&&same(segments,type.path)||binding.length===1&&binding[0].status==='resolved'&&binding[0].target&&same([...binding[0].target,...segments.slice(1)],type.path)))owner='serde_json::Value';
    }
  }
  if(!owner)fail('field needs an actual supported standard Default implementation: '+field.typeSource);
  const fieldType={type,owner,syntax,generic:generic??null,sourceScopeSha256:hash(JSON.stringify(scope)),typeSpan:field.typeSpan};
  const evidence={schema:'original-generated-default-field-v1',contextDigest:context.digest,source:original.file,sourceViewDigest:original.sourceView?.digest??null,sourceSha256:route.sourceSha256,span:route.span,itemSha256:route.itemSha256,outputDigest:route.digest,index,field:field.name,typeSpan:field.typeSpan,fieldType,sourceOwner,bodyAuthority:false};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});fields.set(proof,Object.freeze({context,module:original,deriveContext:state.deriveContext,bangProof,certificate,invocation,route,field,index,fieldType,sourceOwner}));return proof;
}
export function originalDefaultFieldFacts(proof,context){const state=fields.get(proof);if(!state||state.context!==context)fail('field is copied, foreign or unsealed');assertDefaultCaller(context,state.module);assertBuiltinDeriveBangFootprint(state.bangProof,state.deriveContext,state.certificate,state.invocation);validateBuiltinDefaultAstOutput(state.route,originalBuiltinDefaultAstOutput(state.route));return state;}
export function originalDefaultDependencyTarget(proof,context){
  const field=originalDefaultFieldFacts(proof,context),{state}=assertDefaultCaller(context,field.module),path=field.sourceOwner;
  if(field.fieldType.owner!=='generated'||!path||path[0]!=='crate'||path.length<2)fail('field has no privately resolved local nominal owner');
  const modules=state.modules.filter(module=>same(module.path,path.slice(1,-1)));if(modules.length!==1)fail('nominal owner module is absent or ambiguous');
  const module=modules[0],scope=state.binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(module));
  const bindings=scope?.bindings.filter(row=>row.namespace==='type'&&row.name===path.at(-1))??[];
  if(bindings.length!==1||bindings[0].status!=='resolved'||bindings[0].via!=='declaration'||!same(bindings[0].target,path)||!['struct','enum'].includes(bindings[0].kind))fail('nominal owner lacks its exact resolved declaration binding');
  const items=originalSourceModuleItems(module).filter(item=>item.name===path.at(-1)&&item.term===bindings[0].kind&&item.start===bindings[0].span.start&&item.end===bindings[0].span.end);
  if(items.length!==1||itemConfiguration(items[0].tokens,state.compilationProfile).status!=='active')fail('nominal declaration is absent, ambiguous or conditional');
  assertDefaultCaller(context,module);return {module,item:items[0],typePath:[...path]};
}
