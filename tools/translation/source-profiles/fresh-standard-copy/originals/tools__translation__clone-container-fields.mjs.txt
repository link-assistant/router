// Private original caller/type parsing for the bounded Option Clone lane.
// No supplied public field/type row can replace these actual parser results.
import {createHash} from 'node:crypto';
import {assertCloneCaller} from './clone-trait-source.mjs';
import {deriveFootprintAt} from './derive-footprints.mjs';
import {inspectDeriveInput} from './derive-inputs.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {proveBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint} from './builtin-derive-bang-footprints.mjs';
import {validateBuiltinCloneAstOutput,builtinCloneOriginalSourcePlan} from './builtin-clone-ast-route.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from './extensions/host-contracts.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {originalNestedImplementationObligations} from './nested-implementation-obligations.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {assertOriginalParserIdentity} from './original-parser-identity.mjs';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {originalPrimitiveCopySource} from './shared-reference-copy-source.mjs';
const issued=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fail=message=>{throw new TypeError('Original Option Clone fields: '+message);};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
// The general original-source census distinguishes opaque types from block
// implementation declarations, before either Copy or fieldwise admission.
function rejectNestedImplementations(state){
 for(const owner of state.modules)if(originalNestedImplementationObligations(owner).length)fail('nested original written implementation retains a global coherence obligation');
}
export function originalCloneContainerFields(context,module,item,Parser){
 if(Parser!==HostRustParser)fail('requires actual original Host parser');
 const {state,original}=assertCloneCaller(context,module),actual=originalSourceModuleItems(original).find(row=>row.start===item.start&&row.end===item.end&&row.name===item.name);if(!actual||!same(actual.tokens,item.tokens))fail('original declaration differs');
 const input=inspectDeriveInput(actual,state.compilationProfile),invocations=input.derives.filter(invocation=>same(invocation.path,['Clone']));if(actual.term!=='struct'||invocations.length!==1||input.genericParameters||input.lifetimeParameters)fail('requires original nongeneric named Clone record');
 const certificate=deriveFootprintAt(state.deriveContext,original,actual);if(!certificate)fail('original input certificate is absent');const proof=proveBuiltinDeriveBangFootprint({context:state.deriveContext,certificate,invocation:invocations[0]});assertBuiltinDeriveBangFootprint(proof,state.deriveContext,certificate,invocations[0]);
 if(proof.schema!=='builtin-clone-bang-output-v1')fail('requires actual complete data Clone route');const route=proof.route;validateBuiltinCloneAstOutput(route,route.branches);if(route.typedSource.inputSyntax.style!=='named-struct')fail('requires actual named field AST sinks');
 rejectNestedImplementations(state);
 const scope=state.binding.scopes.find(row=>moduleScopeKey(row)===moduleScopeKey(original));if(!scope)fail('actual field scope absent');const parser=new Parser(tokenizeRust(original.source));configureParserSourceScope(parser,scope,state.binding.scopes,original.path);parser.modulePath=[...original.path];const identity=originalHostParserIdentitySnapshot(),guard=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(identity.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(identity.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};guard();
 const fields=route.typedSource.fields.map(field=>{parser.cursor.index=parser.cursor.tokens.findIndex(token=>token.start===field.typeSpan.start);if(parser.cursor.index<0)fail('original type token boundary absent');const first=parser.cursor.index;let type;try{type=parser.type();}catch(error){if(!(error instanceof TranslationError))throw error;guard();fail('unsupported original field type remains refused: '+error.message);}const last=parser.cursor.tokens[parser.cursor.index-1];guard();if(last?.end!==field.typeSpan.end||original.source.slice(field.typeSpan.start,field.typeSpan.end)!==field.typeSource)fail('complete original type span differs');const syntax=parser.cursor.tokens.slice(first,parser.cursor.index).map(token=>token.value),generic=type.rustGeneratedTypeOwner&&parser.genericTypes.get(type.rustGeneratedTypeOwner.name),option=generic?.standardGeneric?.kind==='Option'&&generic.standardGeneric.arguments.length===1,payload=option?generic.standardGeneric.arguments[0]:type,copySource=originalPrimitiveCopySource(payload);if(!copySource)fail('requires actual primitive Clone/Copy payload: '+field.typeSource);if(generic&&!option||!option&&type.kind==='data')fail('unknown generic or nominal field remains unproved');return {...field,type,owner:option?'Option':'primitive',generic:option?generic:null,payload,primitiveCopySource:copySource,syntax,sourceScopeSha256:hash(JSON.stringify(scope))};});
 if(!fields.some(field=>field.owner==='Option'))fail('requires at least one actual canonical Option field');
 const value=freeze({schema:'original-option-clone-field-types-v1',source:original.file,sourceSha256:route.sourceSha256,span:route.span,itemSha256:route.itemSha256,fields,sourceBangProof:proof,sourceAstRoute:route,sourcePlan:builtinCloneOriginalSourcePlan(route),hasDeriveCopy:input.derives.some(invocation=>same(invocation.path,['Copy'])),namespaceAuthority:false,copyAuthority:false,noDropAuthority:false});issued.set(value,{context,module:original,item:actual,route});return value;
}
export function assertOriginalCloneContainerFields(value,context,module,item){const state=issued.get(value);if(!state||state.context!==context||state.module.source!==module.source||state.module.sourceView!==module.sourceView||state.item.start!==item.start||state.item.end!==item.end)fail('fields are copied or rebound');assertCloneCaller(context,module);validateBuiltinCloneAstOutput(state.route,state.route.branches);return value;}
