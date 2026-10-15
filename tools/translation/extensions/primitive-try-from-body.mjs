// Bind one genuine original numeric method to actual primitive arguments.
// The complete parsed Rust body produces ordinary checked let/if/cast/ctor IR.
import {types as nodeTypes} from 'node:util';
import {HostRustParser,HostChecker,originalHostParserIdentitySnapshot,requireOriginalPrimitiveTryFromChecker} from './host-contracts.mjs';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {renameFunction} from '../vendor/meta-language/translation/ir.js';
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {tokenizeRust} from './lexical.mjs';
import {originalTextCursorGuard} from './text.mjs';
import {assertOriginalParserIdentity} from '../original-parser-identity.mjs';
import {sameType} from '../checked-types.mjs';
import {copyMetadata,metadataDigest,originalParsedDeclarationEvidence,checkedSourceContext,checkedSourceEvidence,ownData,snapshotMap} from './source-links.mjs';
import {pinnedPrimitiveTryFrom,requirePrimitiveTryFromSelection,primitiveTryFromNamespace} from './primitive-try-from-source.mjs';
import {originalPrimitiveIntegerConstant,requireOriginalPrimitiveIntegerConstant} from './primitive-integer-constants.mjs';
import {originalStandardNumericErrorCopy,requireOriginalStandardNumericErrorCopy} from './primitive-try-from-error.mjs';
import {requirePrimitiveTryFromScope} from './primitive-try-from-scope.mjs';
const selfParsers=new WeakMap(),callers=new WeakMap(),contexts=new WeakMap(),issued=new Map(),emission=new WeakMap();
const fail=message=>{throw new TypeError('Original primitive TryFrom body: '+message);};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='span').map(([key,child])=>[key,canonical(child)])):value;
const digest=value=>metadataDigest(canonical(value));
function actualChecker(checker){if(!checker||nodeTypes.isProxy(checker)||Object.getPrototypeOf(checker)!==HostChecker.prototype||Object.hasOwn(checker,'expr'))fail('requires the actual original Host checker');requireOriginalPrimitiveTryFromChecker(checker);}
function checkerContext(checker){let state=contexts.get(checker);if(!state){state={token:Object.freeze({}),error:null};contexts.set(checker,state);}return state;}
export function captureOriginalPrimitiveTryFrom(checker,surface){
 // Ordinary Host extensions may check programs without these source bodies.
 // Identity becomes mandatory before the first actual source-node capture;
 // every check/issuance/finalization still independently requires it.
 if(!checker||typeof checker!=='object'||nodeTypes.isProxy(checker))fail('requires the actual original Host checker');
 let guarded=false;const nodes=new WeakMap(),visit=node=>{if(!node||typeof node!=='object')return;if(['routerPrimitiveTryFromCall','routerPrimitiveSourceConstant'].includes(node.k)){if(!guarded){actualChecker(checker);guarded=true;}nodes.set(node,metadataDigest(node));}for(const [key,value]of Object.entries(node))if(!['type','span','sourceConversionProof'].includes(key))Array.isArray(value)?value.forEach(visit):visit(value);};
 // Inspect caller containers without invoking accessor/proxy/iterator hooks.
 // Genuine function evidence validates its complete body before traversal.
 const items=list=>{if(!Array.isArray(list)||nodeTypes.isProxy(list))fail('requires original source item arrays');const length=ownData(list,'length');for(let at=0;at<length;at++){const item=ownData(list,String(at)),kind=ownData(item,'k');if(kind==='module')items(ownData(item,'items'));else if(kind==='fn'&&originalParsedDeclarationEvidence(item))visit(ownData(item,'body'));}};items(ownData(surface,'items'));
 // Empty captures also replace the previous surface's source-call identities.
 callers.set(checker,nodes);
}
function requireCaller(checker,node){actualChecker(checker);if(callers.get(checker)?.get(node)!==metadataDigest(node))fail('requires its exact privately captured original caller syntax');if(node.sourceTryFromRefusal)throw unsupported('primitive TryFrom namespace',node.sourceTryFromRefusal,node.span);return requirePrimitiveTryFromScope(node.sourceConversionProof,node.target);}
function errorType(checker,span){
 const state=checkerContext(checker);if(state.error){const original=state.error,current=checker.items.get(original.name);requireOriginalStandardNumericErrorCopy(original.copy);if(current!==original.declaration||metadataDigest(current)!==original.declarationDigest||!sameType(checker.resolveType({kind:'named',path:[original.name]},[],span),original.type))fail('cached standard error declaration or exact unit layout changed');return original.type;}
 const namespace=primitiveTryFromNamespace(),name='ml_standard_source_TryFromIntError';
 // Only the private canonical standard source kernel may discharge this
 // particular error's destructor. The public layout and name cannot do so.
 const copy=originalStandardNumericErrorCopy();requireOriginalStandardNumericErrorCopy(copy);
 if(metadataDigest(copy.declaration)!==metadataDigest(namespace.errorDeclaration)||metadataDigest(copy.layout)!==metadataDigest(namespace.errorLayout))fail('standard error source identity or exact unit layout differs');
 if(checker.items.has(name))fail('original conversion error layout collides with an existing declaration');
 const data=[{k:'data',name,ctors:[{name:'TryFromIntError',ctorStyle:'tuple',fields:[{name:'field0',type:{kind:'unit'}}]}],span,generated:'original-source-numeric-conversion-error',originalStandardType:{path:['core','num','TryFromIntError'],source:namespace.errorDeclaration,layout:namespace.errorLayout}}];
 checker.declare(data,[]);checker.instantiations.items.push(...checker.checkItems(data,[]));
 const type=checker.resolveType({kind:'named',path:[name]},[],span);state.error={type,name,declaration:checker.items.get(name),declarationDigest:metadataDigest(checker.items.get(name)),copy};return type;
}
function parseBody(selection){
 requirePrimitiveTryFromSelection(selection);const snapshot=originalHostParserIdentitySnapshot(),parser=new HostRustParser(tokenizeRust(selection.member.bodySource));
 assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));
 selfParsers.set(parser,{selection,tokensDigest:metadataDigest(parser.cursor.tokens)});let syntax;try{syntax=parser.block([]);}finally{selfParsers.delete(parser);}
 assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});
 if(!parser.cursor.atEnd())fail('requires the complete authentic expanded method body');return syntax;
}
// Only parseBody can install this original macro Self slot. Public parser
// properties or a source name cannot create a binding. The actual immutable
// expansion and complete token stream remain its backing source.
export function originalPrimitiveTryFromSelfType(parser){
 const state=selfParsers.get(parser);if(!state||!parser.cursor.is('Self'))return null;
 requirePrimitiveTryFromSelection(state.selection);if(metadataDigest(parser.cursor.tokens)!==state.tokensDigest)fail('original selected method token stream changed');
 const snapshot=originalHostParserIdentitySnapshot();assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});
 parser.cursor.next();return {...state.selection.target};
}
function bindBody(value,selection,binder,error,constants){
 if(Array.isArray(value))return value.map(child=>bindBody(child,selection,binder,error,constants));if(!value||typeof value!=='object')return value;
 if(value.k==='name'&&value.path?.length===1&&value.path[0]==='u')return {...value,path:[binder]};
 if(value.k==='name'&&value.path?.length===2&&value.path[0]==='Self'&&['MIN','MAX'].includes(value.path[1])){const proof=originalPrimitiveIntegerConstant(selection.target,value.path[1]);requireOriginalPrimitiveIntegerConstant(proof,selection.target,value.path[1]);constants.push(proof);return {k:'num',value:proof.decimal,type:selection.target,span:value.span};}
 if(value.kind==='named'&&value.path?.length===1&&value.path[0]==='Self')return {...selection.target};
 if(value.k==='app'&&value.fn?.k==='name'&&value.fn.path?.length===1&&['Ok','Err'].includes(value.fn.path[0]))return {k:'routerRegisteredConstructor',kind:'Result',constructor:value.fn.path[0],args:bindBody(value.args,selection,binder,error,constants),span:value.span};
 if(value.k==='app'&&value.fn?.k==='name'&&value.fn.path?.length===1&&value.fn.path[0]==='TryFromIntError'){
  if(value.args?.length!==1||value.args[0].k!=='unit')fail('actual original error constructor differs from its sole unit field');
  return {...value,fn:{...value.fn,path:[error.name,'TryFromIntError']}};
 }
 return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='span'?child:bindBody(child,selection,binder,error,constants)]));
}
function originalReferences(tree,original){
 if(Array.isArray(tree))return tree.map((value,index)=>originalReferences(value,original?.[index]));if(!tree||typeof tree!=='object')return tree;
 const value=Object.fromEntries(Object.entries(tree).map(([key,child])=>[key,originalReferences(child,original?.[key])]));
 for(const key of ['fn','data',...(tree.kind==='data'?['name']:[])])if(typeof tree[key]==='string'&&typeof original?.[key]==='string'&&tree[key]==='rp_'+Buffer.from(original[key]).toString('hex'))value[key]=original[key];return value;
}
function issue(checker,node,body,proof){
 const evidence={...proof,computationSha256:digest(body),constTraitCall:false,wholeTraitTranslated:false,runtimeParity:false},key=metadataDigest(evidence),sourceConversionProof={...evidence,digest:key};
 issued.set(key,{context:checkerContext(checker).token,proof:copyMetadata(sourceConversionProof),body:copyMetadata(body),finalized:[]});return {k:'routerOriginalPrimitiveTryFrom',body,type:body.type,sourceConversionProof,constEligible:false,span:node.span};
}
export function checkOriginalPrimitiveTryFrom(checker,node,env,path,expected){
 const caller=requireCaller(checker,node);if(node.args?.length!==1)throw typeError('TryFrom requires one original by-value argument',node.span);
 const value=checker.expr(node.args[0],env,path);let selection;try{selection=pinnedPrimitiveTryFrom(value.type,node.target);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('original primitive TryFrom input',error.message,node.span);}const syntax=parseBody(selection),error=errorType(checker,node.span),resultType=checker.instantiations.result(selection.target,error,node.span);
 if(expected&&!sameType(resultType,expected))throw typeError('source TryFrom result type differs from its actual checked Result',node.span);
 let binder;do{binder=checker.freshName('ml_try_from_argument_');}while(env.has(binder));
 const constants=[],specialized=bindBody(syntax,selection,binder,error,constants),body=checker.expr(specialized,new Map([[binder,value.type]]),[],resultType);
 if(!sameType(body.type,resultType))fail('original checked method returned a different Result layout');
 const computation={k:'let',name:binder,value,body,type:resultType,span:node.span};
 return issue(checker,node,computation,{schema:'original-checked-fixed-try-from-v1',caller,selection,originalParsedBodySha256:metadataDigest(syntax),constants,errorLayout:primitiveTryFromNamespace().errorLayout,errorSource:checkerContext(checker).error.copy,resultType,evaluationOrder:'argument exactly once, then actual complete selected original body'});
}
export function checkOriginalPrimitiveConstant(checker,node){
 const caller=requireCaller(checker,node),source=originalPrimitiveIntegerConstant(node.target,node.name);requireOriginalPrimitiveIntegerConstant(source,node.target,node.name);
 const body=checker.expr({k:'num',value:source.decimal,type:source.type,span:node.span},new Map(),[],source.type);
 return issue(checker,node,body,{schema:'original-checked-fixed-source-constant-v1',caller,source});
}
function nodes(value,result=[]){if(!value||typeof value!=='object')return result;if(value.k==='routerOriginalPrimitiveTryFrom')result.push(value);for(const [key,child]of Object.entries(value))if(!['type','sourceConversionProof'].includes(key))Array.isArray(child)?child.forEach(value=>nodes(value,result)):nodes(child,result);return result;}
export function requireOriginalPrimitiveTryFromBody(node,emitter=null){
 const proof=copyMetadata(node.sourceConversionProof),state=proof&&issued.get(proof.digest),body=state&&(emitter?emission.get(emitter)?.get(proof.digest)?.has(digest(node.body)):[state.body,...state.finalized].some(original=>digest(originalReferences(node.body,original))===digest(original)));
 if(!state||metadataDigest(proof)!==metadataDigest(state.proof)||!body||!sameType(node.type,node.body.type)||node.constEligible!==false)fail('unissued, copied or changed actual checked method computation');
 requirePrimitiveTryFromScope(proof.caller,proof.caller.target);if(proof.schema==='original-checked-fixed-try-from-v1'){const copy=originalStandardNumericErrorCopy();requireOriginalStandardNumericErrorCopy(copy);if(metadataDigest(proof.errorSource)!==metadataDigest(copy)||metadataDigest(proof.errorLayout)!==metadataDigest(copy.layout))fail('standard error source ownership differs');}return node.body;
}
export function finalizeOriginalPrimitiveTryFrom(checker,program,sourceLinks){
 if(!contexts.has(checker))return;actualChecker(checker);if(!checkedSourceContext(program))fail('requires the genuine finalized original checking surface');
 for(const original of snapshotMap(ownData(program,'declarations')).values()){
  const entry=copyMetadata(original),calls=nodes(entry.body);if(!calls.length)continue;if(!checkedSourceEvidence(sourceLinks,entry))fail('requires the genuine whole original finalized declaration');
  for(const node of calls){const state=issued.get(node.sourceConversionProof?.digest);if(!state||state.context!==checkerContext(checker).token||metadataDigest(node.sourceConversionProof)!==metadataDigest(state.proof)||!sameType(node.type,node.body.type)||node.constEligible!==false)fail('finalized method does not belong to this actual checker/source');state.finalized.push(copyMetadata(node.body));}
 }
}
export function prepareOriginalPrimitiveTryFrom(emitter,entry){
 const calls=nodes(entry.body);if(!calls.length)return null;calls.forEach(node=>requireOriginalPrimitiveTryFromBody(node));const previous=emission.get(emitter),renamed=renameFunction(entry,emitter.state.ident,emitter.state.localReserved()),expected=new Map();
 for(const node of nodes(renamed.body)){const key=node.sourceConversionProof.digest;if(!expected.has(key))expected.set(key,new Set());expected.get(key).add(digest(node.body));}emission.set(emitter,expected);return ()=>{if(previous)emission.set(emitter,previous);else emission.delete(emitter);};
}
