// Actual Syn schema transcription and helper lineage. Source-defined fields
// are not yet checked Rust layouts, typed loans or attribute output authority.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {sourceItems} from './rust-structure.mjs';
import {originalMacroInvocation} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput,declarativeExpansionLineage} from './declarative-token-macros.mjs';
import {requireAsyncTraitSourceInputs,originalAsyncTraitSource} from './async-trait-source-inputs.mjs';
const schemas=new WeakMap(),callbacks=new WeakMap(),failures=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original async-trait schema: '+message);};
const transparent=node=>node?.kind==='fragment'&&['ident','tt','lifetime'].includes(node.fragment)&&node.trees.length===1?transparent(node.trees[0]):node;
const word=node=>{const value=transparent(node);return value?.kind==='token'?value.text:null;};
function declarations(nodes){
 const rows=[];for(let at=0;at<nodes.length;at++)if(['struct','enum'].includes(word(nodes[at]))){const name=word(nodes[at+1]),body=transparent(nodes[at+2]);if(name&&body?.delimiter==='{')rows.push({kind:word(nodes[at]),name,body,header:nodes.slice(0,at+2)});}return rows;
}
function definitionSource(origin,name){
 const definitions=sourceItems(origin.source).filter(item=>item.term==='macro_rules!'&&item.name===name);if(definitions.length!==1)fail('original referenced definition absent or ambiguous: '+name);const item=definitions[0];return {original:origin.source.slice(item.start,item.end),span:{start:item.start,end:item.end},sha256:hash(origin.source.slice(item.start,item.end))};
}
function calls(nodes,path=[]){
 const rows=[];for(let at=0;at<nodes.length;at++){
  const node=transparent(nodes[at]);if(word(nodes[at+1])==='!'&&transparent(nodes[at+2])?.delimiter){const group=nodes[at+2];if(group.kind!=='group')fail('helper invocation group is opaque');rows.push({name:word(nodes[at]),groupPath:[...path,at+2],input:group.children});at+=2;continue;}
  if(node?.kind==='group'&&nodes[at].kind==='group')rows.push(...calls(node.children,[...path,at]));
 }return rows;
}
function fieldRows(declaration){
 const rows=[],nodes=declaration.body.children;let at=0;
 while(at<nodes.length){
  const attributes=[];while(word(nodes[at])==='#'&&transparent(nodes[at+1])?.delimiter==='['){attributes.push(nodes[at],nodes[at+1]);at+=2;}
  if(word(nodes[at])==='pub')at++;
  const name=word(nodes[at++]);if(!name)fail('source schema member name is unsupported');
  if(declaration.kind==='struct'){
   if(word(nodes[at++])!==':')fail('source struct member type delimiter is unsupported');const from=at;let angle=0;for(;at<nodes.length;at++){const value=word(nodes[at]);if(value==='<')angle++;if(value==='>')angle--;if(value===','&&!angle)break;}if(angle||from===at)fail('source field type is incomplete');rows.push({name,attributes,typeTokens:nodes.slice(from,at),typeOwnerResolved:false,ownedGraphChecked:false});
  }else{
   const payload=transparent(nodes[at]);if(payload?.delimiter==='('){rows.push({name,attributes,payloadTokens:payload.children,variantOwnerResolved:false});at++;}else rows.push({name,attributes,payloadTokens:[],variantOwnerResolved:false});
  }
  if(at<nodes.length&&word(nodes[at++])!==',')fail('source schema member requires its original comma');
 }
 return rows;
}
export function originalAsyncTraitSynSchema(inputs,{path,name}={}){
 requireAsyncTraitSourceInputs(inputs);if(typeof path!=='string'||typeof name!=='string'||path.length>128||name.length>128)fail('bounded original schema selector required');
 const origin=originalAsyncTraitSource(inputs,'syn',path),macros=originalAsyncTraitSource(inputs,'syn','src/macros.rs'),lib=originalAsyncTraitSource(inputs,'syn','src/lib.rs');
 const macroModules=sourceItems(lib.source).filter(item=>item.term==='mod'&&item.name==='macros');if(macroModules.length!==1||macroModules[0].tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('')!=='#[macro_use]modmacros;')fail('actual original macro module import differs');
 const definitions=sourceItems(macros.source).filter(item=>item.term==='macro_rules!'),known=new Set(definitions.map(item=>item.name)),matches=[];
 for(const item of sourceItems(origin.source)){
  const original=origin.source.slice(item.start,item.end);let invocation;try{invocation=originalMacroInvocation(original);}catch(error){if(!(error instanceof TypeError))throw error;continue;}
  if(invocation.path.length!==1||!known.has(invocation.path[0]))continue;
  const selected=declarations(invocation.trees);if(selected.some(row=>row.name===name))matches.push({item,original,invocation});
 }
 if(matches.length!==1)fail('actual original schema invocation absent or ambiguous');const selected=matches[0],sources=[],expansions=[],helperInputs=[],residuals=[];
 const compile=macroName=>{const source=definitionSource(macros,macroName);sources.push({name:macroName,...source});return compileDeclarativeMacro(source.original,{name:macroName,owner:['syn','macros']});};
 const root=expandDeclarativeMacro(compile(selected.invocation.path[0]),selected.invocation.trees);let steps=0;
 function close(expansion){
  if(++steps>64)fail('original schema helper lineage exceeds its finite bound');expansions.push(expansion);
  for(const call of calls(expansion.trees)){
   if(!call.name||!known.has(call.name)){residuals.push({name:call.name,parentDigest:expansion.digest,groupPath:call.groupPath,expanded:false});continue;}
   const input=declarativeSubInput(expansion,call.groupPath),definition=compile(call.name);helperInputs.push({parentDigest:expansion.digest,call,definition,input});let child;try{child=expandDeclarativeMacro(definition,input);}catch(error){if(!(error instanceof TypeError))throw error;failures.set(error,{inputs,origin,macros,selected,expansions:[...expansions],call,definition,input});throw error;}close(child);
  }
 }close(root);
 const emitted=declarations(root.trees).filter(row=>row.name===name);if(emitted.length!==1)fail('full original expansion has no unique requested declaration');const declaration=emitted[0],fields=fieldRows(declaration);
 const sourceReference={package:'syn',path,sourceSha256:origin.sha256,invocationSpan:{start:selected.item.start,end:selected.item.end},invocationSha256:hash(selected.original)},payload={schema:'original-async-trait-syn-schema-v1',inputProfileSha256:inputs.profileSha256,sourceReference,kind:declaration.kind,name,fields,rootExpansionDigest:root.digest,helperExpansions:expansions.map(expansion=>({digest:expansion.digest,definitionDigest:expansion.definitionDigest,rule:expansion.rule,lineage:declarativeExpansionLineage(expansion).parent?.digest??null})),residuals,originalSchemaTranscribed:true,actualMacroOwnerResolved:false,fieldTypesChecked:false,ownedGraphChecked:false,typedLoansChecked:false,completeOutputConfinement:false,headerTargetAuthority:false,namespaceAuthority:false,runtimeParity:false};
 const proof=freeze({...payload,digest:hash(JSON.stringify(payload))});schemas.set(proof,{inputs,origin,macros,lib,selected,sources,expansions,helperInputs,declaration});return proof;
}
export function originalAsyncTraitSynSchemaEvidence(proof){
 const state=types.isProxy(proof)?null:schemas.get(proof);if(!state)fail('copied, foreign or proxy schema');requireAsyncTraitSourceInputs(state.inputs);if(originalAsyncTraitSource(state.inputs,'syn',proof.sourceReference.path)!==state.origin||state.origin.source.slice(proof.sourceReference.invocationSpan.start,proof.sourceReference.invocationSpan.end)!==state.selected.original)fail('original schema source changed');for(const expansion of state.expansions)declarativeExpansionLineage(expansion);return freeze({origin:state.origin,macroSource:state.macros,libSource:state.lib,originalInvocation:state.selected.original,invocation:state.selected.invocation,definitions:state.sources,expansions:state.expansions,forwardedHelperInputs:state.helperInputs,declaration:state.declaration});
}
export function originalAsyncTraitSynGeneratedCallback(schema,{name='to_tokens'}={}){
 const backing=originalAsyncTraitSynSchemaEvidence(schema),matches=[];
 for(const expansion of backing.expansions){
  function visit(nodes,path=[]){for(let at=0;at<nodes.length;at++){
   if(word(nodes[at])==='fn'&&word(nodes[at+1])===name){let end=at+2;while(end<nodes.length&&transparent(nodes[end])?.delimiter!=='{'&&word(nodes[end])!==';')end++;if(nodes[end]?.kind==='group'&&nodes[end].delimiter==='{')matches.push({expansion,syntax:nodes.slice(at,end+1),definitionTokenPath:[...path,at],bodyPath:[...path,end]});}
   if(nodes[at]?.kind==='group'&&word(nodes[at-1])!=='!')visit(nodes[at].children,[...path,at]);
  }}visit(expansion.trees);
 }
 if(matches.length!==1)fail('actual generated callback absent or ambiguous');const row=matches[0],payload={schema:'original-async-trait-expanded-callback-v1',schemaDigest:schema.digest,name,expansionDigest:row.expansion.digest,definitionTokenPath:row.definitionTokenPath,bodyPath:row.bodyPath,syntax:row.syntax,spanDomain:'mixed exact original definition and invocation ranges; no contiguous original fn span',originalFunctionDeclaration:false,callbackEffectsClosed:false,headerTargetAuthority:false,namespaceAuthority:false,runtimeParity:false};
 const callback=freeze({...payload,digest:hash(JSON.stringify(payload))});callbacks.set(callback,{schema,row});return callback;
}
export function originalAsyncTraitSynGeneratedCallbackEvidence(callback){
 const state=types.isProxy(callback)?null:callbacks.get(callback);if(!state)fail('copied, foreign or proxy generated callback');originalAsyncTraitSynSchemaEvidence(state.schema);declarativeExpansionLineage(state.row.expansion);const backing=originalAsyncTraitSynSchemaEvidence(state.schema),coordinateSources=[{sourceSha256:hash(backing.originalInvocation),package:'syn',path:backing.origin.path,absoluteOffset:state.schema.sourceReference.invocationSpan.start,original:backing.originalInvocation},...backing.definitions.map(row=>({sourceSha256:row.sha256,package:'syn',path:'src/macros.rs',absoluteOffset:row.span.start,original:row.original}))];return freeze({schema:state.schema,expansion:state.row.expansion,syntax:state.row.syntax,definitionTokenPath:state.row.definitionTokenPath,bodyPath:state.row.bodyPath,coordinateSources});
}

export function originalAsyncTraitSynSchemaFailureEvidence(error){
 const state=types.isProxy(error)?null:failures.get(error);if(!state)fail('copied, foreign or proxy schema failure');requireAsyncTraitSourceInputs(state.inputs);for(const expansion of state.expansions)declarativeExpansionLineage(expansion);return freeze({origin:state.origin,macroSource:state.macros,originalInvocation:state.selected.original,parentExpansions:state.expansions,actualHelperCall:state.call,definition:state.definition,forwardedInput:state.input,error:{name:error.name,message:error.message},targetAuthority:false,namespaceAuthority:false,runtimeParity:false});
}
