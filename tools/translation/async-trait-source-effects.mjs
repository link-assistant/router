// Source -> inert effect observations. All actual bodies and tokens remain in
// privately joined backing; observations do not execute a visitor or certify
// the output of an attribute macro.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {sourceItems} from './rust-structure.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {requireAsyncTraitSourceInputs,originalAsyncTraitSource,originalAsyncTraitInputEvidence} from './async-trait-source-inputs.mjs';
const issued=new WeakMap(),functions=new WeakMap(),callers=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex'),word=node=>node?.kind==='token'?node.text:null;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original async-trait effects: '+message);};
const authority={headerTargetAuthority:false,completeOutputConfinement:false,namespaceAuthority:false,noDropAuthority:false,copyAuthority:false,wholeExpansionCompiled:false,runtimeParity:false};
function functionHead(tokens){
 let at=0;
 while(tokens[at]?.text==='#'){
  at++;if(tokens[at]?.text==='!')at++;if(tokens[at++]?.text!=='[')return -1;
  let depth=1;for(;at<tokens.length&&depth;at++){if(tokens[at].text==='[')depth++;if(tokens[at].text===']')depth--;}if(depth)return -1;
 }
 if(tokens[at]?.text==='pub'){at++;if(tokens[at]?.text==='('){let depth=0;do{if(tokens[at]?.text==='(')depth++;if(tokens[at]?.text===')')depth--;at++;}while(at<tokens.length&&depth);if(depth)return -1;}}
 while(['async','const','unsafe','default'].includes(tokens[at]?.text))at++;
 if(tokens[at]?.text==='extern'){at++;if(tokens[at]?.type==='string')at++;}
 return tokens[at]?.text==='fn'?at:-1;
}
function functionInventory(origin){
 const rows=[];
 function visit(span,owners=[],depth=0){
  if(depth>64)fail('original callback owner depth exceeds its bound');
  for(const item of sourceItems(origin.source.slice(span.start,span.end))){
   const tokens=item.tokens.filter(token=>token.type!=='comment'),close=tokens.at(-1);if(close?.text!=='}')continue;
   let braces=0,opening=-1;for(let at=tokens.length-1;at>=0;at--){if(tokens[at].text==='}')braces++;if(tokens[at].text==='{'&&!--braces){opening=at;break;}}
   if(opening<0)fail('original callback item delimiter is incomplete');
   const bodySpan={start:span.start+tokens[opening].start,end:span.start+close.end},innerSpan={start:span.start+tokens[opening].end,end:span.start+close.start};
   if(item.term==='fn'){
    // Structural item discovery also encounters `fn` in opaque statements
    // and quote inputs. Only an actual declaration prefix is a candidate.
    const at=functionHead(tokens);if(at<0)continue;
    const definitionSpan={start:span.start+tokens[at].start,end:bodySpan.end},original=origin.source.slice(definitionSpan.start,definitionSpan.end);
    // The complete file remains backing evidence. Each independent original
    // function uses the unchanged TT budget and its explicit absolute offset;
    // a generated/reassembled source never enters originalMacroTrees here.
    let syntax;try{syntax=originalMacroTrees(original);}catch(error){if(!(error instanceof TypeError))throw error;fail(origin.package+'/'+origin.path+':'+tokens[at+1].text+' at '+definitionSpan.start+': '+error.message);}
    const body=syntax.at(-1);if(body?.delimiter!=='{')fail('original callback syntax body absent');
    let parameterAt=2;
    if(word(syntax[parameterAt])==='<'){
     let depth=0;for(;parameterAt<syntax.length;parameterAt++){if(word(syntax[parameterAt])==='<')depth++;if(word(syntax[parameterAt])==='>'&&!--depth){parameterAt++;break;}}
     if(depth)fail('original function generic prefix is incomplete');
    }
    const parameters=syntax[parameterAt];if(parameters?.delimiter!=='(')fail('original function parameter group absent');
    const record=freeze({schema:'original-async-source-function-v1',package:origin.package,path:origin.path,sourceSha256:origin.sha256,name:tokens[at+1].text,span:definitionSpan,bodySpan,sha256:hash(original),owners,original,syntax,syntaxOffset:definitionSpan.start,syntaxSourceSha256:hash(original),parameters:parameters.children,parameterSpan:{start:definitionSpan.start+parameters.span.start,end:definitionSpan.start+parameters.span.end},rustDeclarationOwnerVerified:false,...authority});
    functions.set(record,{origin,body});rows.push(record);visit(innerSpan,[...owners,{kind:'fn',name:record.name,span:definitionSpan}],depth+1);
   }else if(['impl','trait','mod'].includes(item.term)){
    visit(innerSpan,[...owners,{kind:item.term,header:tokens.slice(0,opening).map(token=>token.text),span:{start:span.start+item.start,end:span.start+item.end}}],depth+1);
   }
  }
 }visit({start:0,end:origin.source.length});return rows;
}
function inspectNodes(nodes,source){
 const borrows=[],macros=[],assignments=[],calls=[];
 function visit(list){for(let at=0;at<list.length;at++){
  const node=list[at];
  if(word(node)==='&'&&word(list[at+1])==='mut'){
   let end=at+2;const path=[];if(list[end]?.kind==='token'){path.push(word(list[end++]));while(word(list[end])==='.'&&list[end+1]?.kind==='token'){path.push(word(list[end+1]));end+=2;}}
   borrows.push({span:{start:node.span.start,end:list[Math.max(end-1,at+1)].span.end},writtenPath:path,writeRootJoined:false});
  }
  if(word(node)==='='||['+=','-=','*=','/=','|=','&='].includes(word(node))){const start=Math.max(0,at-6),span={start:list[start].span.start,end:node.span.end};assignments.push({operator:word(node),span,written:source.slice(span.start,span.end),targetJoined:false});}
  if(word(node)==='!'&&list[at-1]?.kind==='token'&&list[at+1]?.kind==='group'){
   let start=at-1;while(word(list[start-1])==='::'&&list[start-2]?.kind==='token')start-=2;
   macros.push({path:list.slice(start,at).map(word),span:{start:list[start].span.start,end:list[at+1].span.end},input:list[at+1],ownerJoined:false,expanded:false});at++;continue;
  }
  if(node.kind==='group'&&node.delimiter==='('&&list[at-1]?.kind==='token')calls.push({writtenCallee:word(list[at-1]),span:{start:list[at-1].span.start,end:node.span.end},arguments:node.children,calleeJoined:false,effectsJoined:false});
  if(node.kind==='group')visit(node.children);
 }}visit(nodes);return freeze({mutableBorrows:borrows,assignmentCandidates:assignments,callCandidates:calls,macroCandidates:macros,semanticEffectAnalysisComplete:false});
}
const dependencyPaths=[['syn','src/item.rs'],['syn','src/gen/visit_mut.rs'],['syn','src/parse_quote.rs'],['syn','src/attr.rs'],['syn','src/stmt.rs'],['syn','src/ty.rs'],['quote','src/to_tokens.rs'],['quote','src/lib.rs'],['proc-macro2','src/lib.rs']];
const reference=record=>({package:record.package,path:record.path,sourceSha256:record.sourceSha256,name:record.name,span:record.span,bodySpan:record.bodySpan,parameterSpan:record.parameterSpan,sha256:record.sha256});
export function originalAsyncTraitEffectPlan(inputs){
 requireAsyncTraitSourceInputs(inputs);const evidence=originalAsyncTraitInputEvidence(inputs),origins=[...evidence.sources.filter(row=>row.package==='async-trait'&&row.path.startsWith('src/')), ...dependencyPaths.map(([packageName,path])=>originalAsyncTraitSource(inputs,packageName,path))];
 const records=origins.flatMap(functionInventory),observations=records.filter(row=>row.package==='async-trait').map(record=>({function:reference(record),syntaxOffset:record.syntaxOffset,effects:inspectNodes(functions.get(record).body.children,record.original)}));
 const entries=records.filter(row=>row.package==='async-trait'&&row.path==='src/lib.rs'&&row.name==='async_trait');if(entries.length!==1)fail('actual registered entry function is absent or ambiguous');
 const entryOrigin=originalAsyncTraitSource(inputs,'async-trait','src/lib.rs'),entryItem=sourceItems(entryOrigin.source).filter(item=>item.term==='fn'&&item.name===entries[0].name);if(entryItem.length!==1||!entryItem[0].tokens.some((token,index,tokens)=>token.text==='proc_macro_attribute'&&tokens[index-1]?.text==='['&&tokens[index-2]?.text==='#'))fail('original attribute registration is absent');
 const payload={schema:'original-async-trait-effect-plan-v1',inputsProfileSha256:inputs.profileSha256,dependencyDigest:inputs.dependencyDigest,originalEntry:reference(entries[0]),sourceFunctions:records.map(reference),uncompiled:['original Rust control and borrow/write-root semantics','Syn ItemImpl parser, visitors, ToTokens and quote slot implementations','complete selected helper callback effects','Verbatim item parse and output','copied input attributes and nested macros','caller macro owner and active ancestor namespace','original generated method runtime, allocation and Future execution'],...authority};
 const plan=freeze({...payload,digest:hash(JSON.stringify(payload))});issued.set(plan,{inputs,origins,records,observations,evidence});return plan;
}
export function requireAsyncTraitEffectPlan(plan){if(types.isProxy(plan)||!issued.has(plan))fail('copied, foreign or proxy effect plan');requireAsyncTraitSourceInputs(issued.get(plan).inputs);return plan;}
export function originalAsyncTraitEffectEvidence(plan){requireAsyncTraitEffectPlan(plan);const state=issued.get(plan);return freeze({inputs:state.evidence,sources:state.origins,functions:state.records,observations:state.observations});}
export function originalAsyncTraitFunction(plan,{package:packageName,path,name,ownerContains=null}={}){
 requireAsyncTraitEffectPlan(plan);if(ownerContains!==null&&(typeof ownerContains!=='string'||ownerContains.length>256))fail('bounded original owner selector required');const state=issued.get(plan),records=state.records.filter(record=>record.package===packageName&&record.path===path&&record.name===name&&(!ownerContains||record.owners.some(owner=>owner.header?.join('').includes(ownerContains))));if(records.length!==1)fail('actual original callback is absent or ambiguous');return records[0];
}
export function requireAsyncTraitFunction(plan,record){requireAsyncTraitEffectPlan(plan);if(types.isProxy(record)||!issued.get(plan).records.includes(record)||!functions.has(record))fail('copied or foreign original callback');return record;}
export function inspectOriginalAsyncTraitImpl(plan,{module,modules,sourceScopes,span}={}){
 requireAsyncTraitEffectPlan(plan);if(types.isProxy(module)||types.isProxy(span)||!module||!span)fail('exact original caller required');assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile:module.compilationProfile});
 const matches=originalSourceModuleItems(module).filter(item=>item.term==='impl'&&item.start===span.start&&item.end===span.end);if(matches.length!==1)fail('implementation is outside the original caller span');
 const item=matches[0],tokens=item.tokens.filter(token=>token.type!=='comment'),close=tokens.at(-1);let depth=0,open=null;
 if(close?.text!=='}')fail('complete original impl body absent');
 // The body is the group paired with the original item's final brace, not
 // the first brace in an attribute argument or const generic type argument.
 for(let at=tokens.length-1;at>=0;at--){if(tokens[at].text==='}')depth++;if(tokens[at].text==='{'&&!--depth){open=tokens[at];break;}}
 if(!open||depth)fail('complete original impl body absent');
 const original=module.source.slice(span.start,span.end),bodySpan={start:open.end,end:close.start},body=module.source.slice(bodySpan.start,bodySpan.end),members=sourceItems(body),macros=inspectNodes(originalMacroTrees(body),body).macroCandidates;
 const scope=sourceScopes.find(row=>moduleScopeKey(row)===moduleScopeKey(module)),ancestors=sourceScopes.filter(row=>row.path.every((part,index)=>module.path[index]===part));
 const payload={schema:'original-async-trait-caller-plan-v1',effectPlanDigest:plan.digest,sourcePath:module.file,sourceSha256:hash(module.source),sourceViewDigest:module.sourceView.digest,span,originalSha256:hash(original),headerSpan:{start:tokens[0].start,end:open.start},bodySpan,condition:itemConfiguration(tokens,module.compilationProfile),members:members.map(row=>({term:row.term,name:row.name,span:{start:bodySpan.start+row.start,end:bodySpan.start+row.end},async:row.tokens.some((token,index)=>token.text==='async'&&row.tokens[index+1]?.text==='fn')})),copiedBodyMacros:macros.map(row=>({path:row.path,span:{start:bodySpan.start+row.span.start,end:bodySpan.start+row.span.end},expanded:false})),scopeResiduals:ancestors.filter(row=>row.configurationCondition!=='active'||row.unresolvedTypeScope||row.unresolvedAttributeMacroScope).map(row=>({path:row.path,configurationCondition:row.configurationCondition,unresolvedTypeScope:row.unresolvedTypeScope,unresolvedAttributeMacroScope:row.unresolvedAttributeMacroScope})),callerOwnerJoined:false,unknownNestedEffectsPreserved:true,...authority};
 if(!scope)fail('original caller scope absent');const candidate=freeze({...payload,digest:hash(JSON.stringify(payload))});callers.set(candidate,{plan,module,modules,sourceScopes,original,item,body,macros,members});return candidate;
}
export function originalAsyncTraitCallerEvidence(candidate){const state=types.isProxy(candidate)?null:callers.get(candidate);if(!state)fail('copied, foreign or proxy caller plan');requireAsyncTraitEffectPlan(state.plan);assertResolvedSourceScopeOrigin(state.sourceScopes,{modules:state.modules,compilationProfile:state.module.compilationProfile});if(!originalSourceModuleItems(state.module).includes(state.item)||state.module.source.slice(candidate.span.start,candidate.span.end)!==state.original)fail('original caller source changed');return freeze({original:state.original,item:state.item,members:state.members,body:state.body,bodyMacros:state.macros,effectEvidence:originalAsyncTraitEffectEvidence(state.plan)});}
