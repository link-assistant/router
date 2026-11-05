import {ownedTextVectorJoinHelperSources,defaultOwnedTextVectorJoinHelperNames} from './owned-text-vector-join-helper-sources.mjs';
// Source-adoption DATA, never an original namespace/type/equivalence permit.
// Compose complete source pipelines; do not flatten their actual chronology.
import {types} from 'node:util';
import {posix} from 'node:path';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {composeConcreteSourceEditTemplates} from './concrete-source-edit-templates.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';

const fail=message=>{throw new TypeError('Native joining String vector adoption: '+message);};
const ident=token=>token?.type==='ident'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(token.text);
const flags={requiresWholeOriginalSemanticReissue:true,originalBodyEquivalenceQualified:false,sourceInstalled:false,nativeInstalled:false,productionSelected:false,namespaceAuthority:false,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,receivingQualified:false,runtimeParity:false,wholeRouterSynchronization:false,runtimeExecuted:false,rustExecuted:false,crossInvocationCache:false};
function guard(){if(!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()||!originalLexingIntrinsicsUnchanged())fail('original source host changed');}
function data(value,names){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary own source DATA required');
 const keys=Reflect.ownKeys(value);if(keys.length!==names.length||keys.some(key=>typeof key!=='string'||!names.includes(key)))fail('exact own source fields required');
 return Object.fromEntries(names.map(key=>{const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('source accessors forbidden');return [key,field.value];}));
}
function sequence(value,maximum){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary dense source batch required');
 const length=Object.getOwnPropertyDescriptor(value,'length');if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<1||length.value>maximum||Reflect.ownKeys(value).length!==length.value+1)fail('bounded dense source batch required');
 return Array.from({length:length.value},(_,index)=>{const field=Object.getOwnPropertyDescriptor(value,String(index));if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('source batch holes/accessors forbidden');return field.value;});
}
function path(value){if(typeof value!=='string'||value.length>4096||!value.endsWith('.rs')||posix.isAbsolute(value)||value.includes('\\')||/[\x00-\x1f:]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('bounded canonical native source path required');return value;}
function bounded(source){if(typeof source!=='string'||source.length>2097152||Buffer.byteLength(source)>2097152||source.split('\n').length-(source.endsWith('\n')?1:0)>=1000)fail('complete source byte/line bound');return source;}
function request(value){const row=data(value,['sourcePath','function','local']);path(row.sourcePath);if(typeof row.function!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(row.function))fail('explicit ordinary function name required');if(typeof row.local!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(row.local))fail('explicit ordinary local name required');return row;}
function metadataUnits(value,limit){
 const pending=[{value,depth:0}];let cells=0,units=0;
 while(pending.length){const row=pending.pop();if(++cells>200000||row.depth>192)fail('complete metadata cell/depth bound');if(typeof row.value==='string'){units+=row.value.length;if(units>limit)fail('complete retained metadata text bound');}else if(row.value&&typeof row.value==='object')for(const child of Object.values(row.value))pending.push({value:child,depth:row.depth+1});}return units;
}


// Lexical selection DATA only. Standard-looking paths and local annotations do
// not resolve original namespaces or establish String/Vec ownership.
function syntaxSelections(source,selected){
 const owners=sourceItems(source).filter(item=>item.term==='fn'&&item.name===selected.function);if(owners.length!==1)fail('one complete top-level lexical function required');
 const tokens=owners[0].tokens.filter(token=>token.type!=='comment');if(tokens.length>200000)fail('selected token bound');
 const first=tokens.findIndex(token=>token.text==='{');if(first<0||tokens.at(-1)?.text!=='}')fail('ordinary complete function body required');
 const pairs=new Map(),stack=[],blocks=[],enclosing=new Map();for(let index=first;index<tokens.length;index++){enclosing.set(index,blocks.at(-1));const value=tokens[index].text;if(['(','[','{'].includes(value)){if(stack.length>=160)fail('native delimiter depth bound');stack.push(index);if(value==='{')blocks.push(index);}else if([')',']','}'].includes(value)){const open=stack.pop();if(open===undefined||({'(':')','[':']','{':'}'})[tokens[open].text]!==value)fail('balanced native delimiters required');pairs.set(open,index);if(value==='}')blocks.pop();}}
 if(stack.length||pairs.get(first)!==tokens.length-1)fail('one complete original body required');
 // Balanced lexical blocks retain original control-flow and macro tokens.
 // This is source selection DATA: owner/effect and loop fixed-point proof is
 // still required from the complete original semantic pipeline.
 const constructors=[],uses=[],covered=new Set();let declaration=null;
 for(let index=first+1;index<tokens.length-1;index++){
  if(tokens[index].text!=='let')continue;let at=index+1,mutable=false;if(tokens[at]?.text==='mut'){mutable=true;at++;}if(tokens[at]?.text!==selected.local)continue;
  if(declaration)fail('selected local cannot be shadowed');const nameIndex=at++;if(tokens[at]?.text===':'){at++;let budget=0;while(tokens[at]?.text!=='='){if(!tokens[at]||++budget>32||[';', 'let'].includes(tokens[at].text))fail('bounded ordinary local annotation required');at++;}}
  if(tokens[at++]?.text!=='=')fail('one selected initialized local required');const start=at;
  while(tokens[at]&&tokens[at].text!==';'){if(pairs.has(at))at=pairs.get(at)+1;else at++;}if(tokens[at]?.text!==';')fail('complete selected constructor statement required');
  const end=at,signature=tokens.slice(start,end).map(token=>token.text).join('');let kind,interior=null;
  if(['Vec::new()','std::vec::Vec::new()','::std::vec::Vec::new()','Vec::<String>::new()','std::vec::Vec::<String>::new()','::std::vec::Vec::<String>::new()'].includes(signature))kind='new';
  else {let open=start;while(open<end&&tokens[open].text!=='[')open++;const head=tokens.slice(start,open).map(token=>token.text).join('');if(!['vec!','std::vec!','::std::vec!'].includes(head)||pairs.get(open)!==end-1)fail('selected constructor must be empty Vec or list vec macro');let count=0,hasValue=false;for(let item=open+1;item<end-1;item++){if(tokens[item].text===';')fail('repeat macro requires a separate evaluate-once rule');if(tokens[item].text===','){if(!hasValue)fail('dense macro elements required');count++;hasValue=false;}else {hasValue=true;if(pairs.has(item))item=pairs.get(item);}}if(hasValue)count++;if(count>64)fail('source literal has at most 64 elements');kind='from_slice';interior=[tokens[open].end,tokens[end-1].start];}
  const scope=enclosing.get(nameIndex),scopeEnd=pairs.get(scope);if(scope===undefined||scopeEnd===undefined)fail('selected local requires an enclosing complete lexical block');declaration={index,nameIndex,mutable,end,scope,scopeEnd};covered.add(nameIndex);constructors.push({kind,span:[tokens[start].start,tokens[end-1].end],interior});
 }
 if(!declaration)fail('one selected initialized local required');
 for(let index=first+1;index<tokens.length-1;index++){
  if(tokens[index].text!==selected.local||covered.has(index))continue;if(index<declaration.end)fail('selected local in its own initializer or before declaration');if(index>=declaration.scopeEnd)fail('selected local outside its complete lexical binding block');
  const dot=tokens[index+1],method=tokens[index+2],open=index+3,close=pairs.get(open);
  if(dot?.text==='.'&&['push','len','is_empty','clear','join'].includes(method?.text)&&tokens[open]?.text==='('&&close!==undefined){
   if(['len','is_empty'].includes(method.text)){if(close!==open+1)fail('length or emptiness takes no arguments');uses.push({kind:method.text,span:[tokens[index].start,tokens[close].end],receiver:[tokens[index].start,tokens[index].end]});covered.add(index);continue;}
   if(method.text==='join'){let argumentsCount=0,present=false;for(let at=open+1;at<close;at++){if(tokens[at].text===','){if(!present)fail('one dense join separator required');argumentsCount++;present=false;}else{present=true;if(pairs.has(at))at=pairs.get(at);}}if(present)argumentsCount++;if(argumentsCount!==1)fail('exactly one join separator required');const final=tokens[close-1],stop=final.text===','?final.start:tokens[close].start;uses.push({kind:'join',span:[tokens[index].start,tokens[close].end],argument:[tokens[open].end,stop],suffix:[stop,tokens[close].start],receiver:[tokens[index].start,tokens[index].end],open:tokens[open].start});covered.add(index);continue;}
   if(!declaration.mutable||![';',',','}'].includes(tokens[close+1]?.text)||![';','{','}','=>'].includes(tokens[index-1]?.text))fail('mutable discarded statement or unit match-arm push required');
   if(method.text==='clear'){if(close!==open+1)fail('clear takes no arguments');uses.push({kind:'clear',span:[tokens[index].start,tokens[close].end]});covered.add(index);continue;}
   let values=0,hasValue=false;for(let at=open+1;at<close;at++){if(tokens[at].text===','){if(!hasValue)fail('one dense push operand required');values++;hasValue=false;}else {hasValue=true;if(pairs.has(at))at=pairs.get(at);}}if(hasValue)values++;if(values!==1)fail('exactly one push operand required');
   // Exclude an optional trailing comma while retaining all operand trivia.
   const last=tokens[close-1],stop=last.text===','?last.start:tokens[close].start;
   uses.push({kind:'push',span:[tokens[index].start,tokens[close].end],argument:[tokens[open].end,stop],suffix:[stop,tokens[close].start],receiver:[tokens[index].start,tokens[index].end],open:tokens[open].start});covered.add(index);continue;
  }
  // A final owned return is retained verbatim, never an ownership permit.
  if(tokens[index+1]?.text==='}'&&[';','{','}'].includes(tokens[index-1]?.text)||tokens[index-1]?.text==='return'&&tokens[index+1]?.text===';'){covered.add(index);continue;}
  fail('unselected alias, borrow, index, mutation or local operation');
 }
 return {constructor:constructors[0],uses,mutable:declaration.mutable,bindingBlockSpan:[tokens[declaration.scope].start,tokens[declaration.scopeEnd].end],controlFlowTokens:tokens.filter(token=>['if','else','for','while','loop','match','break','continue'].includes(token.text)).map(token=>({text:token.text,span:[token.start,token.end]}))};
}

/** Original native module -> serialized/reparsed CST adoption DATA. */
export function proposeNativeJoiningOwnedTextVector(source,options){
 guard();bounded(source);const selected=request(options),plan=syntaxSelections(source,selected),names=new Set(rustTokens(source).filter(ident).map(token=>token.text)),operations=new Map(),templates=[];
 function fresh(stem){let result=stem;for(let index=0;names.has(result);index++){if(index>=200000)fail('fresh native name bound');result=stem+'_'+index;}names.add(result);return result;}
 const helperName=fresh('router_rule_owned_text_join');let helperSource=null;
 function intrinsic(kind){if(!operations.has(kind))operations.set(kind,{placeholder:fresh('router_rule_owned_text_vec_'+kind),native:kind==='join'?helperName:'crate::translation_owned_text_vectors_core::vec_text_'+kind});return operations.get(kind).placeholder;}
 function edit(span,parts){templates.push({span,expected:source.slice(...span),parts});}
 function comments(start,end){const result=[];for(const token of rustTokens(source.slice(start,end)))if(token.type==='comment')result.push({sourceSpan:[start+token.start,start+token.end]},'\n');return result;}
 const constructor=plan.constructor;
 if(constructor.kind==='new')edit(constructor.span,[...comments(...constructor.span),intrinsic('new')+'()']);
 else edit(constructor.span,[...comments(constructor.span[0],constructor.interior[0]),intrinsic('from_slice')+'(&[',{sourceSpan:constructor.interior},'])']);
 let pushes=0,lengths=0,emptyChecks=0,clears=0,joins=0;
 for(const row of plan.uses){if(['len','is_empty'].includes(row.kind)){if(row.kind==='len')lengths++;else emptyChecks++;edit(row.span,[...comments(...row.span),(row.kind==='is_empty'?'(':'')+intrinsic('len')+'(&'+selected.local+')'+(row.kind==='is_empty'?' == 0u64)':'')]);}else if(row.kind==='join'){joins++;edit(row.span,[...comments(row.receiver[1],row.open),intrinsic('join')+'(&'+selected.local+', ',{sourceSpan:row.argument},...comments(...row.suffix),')']);}else if(row.kind==='clear'){clears++;edit(row.span,['{ ',...comments(...row.span),selected.local+' = '+intrinsic('truncate')+'('+selected.local+', 0u64); }']);}else {pushes++;const temporary=fresh('router_rule_owned_text_item');edit(row.span,['{ let '+temporary+' = ',...comments(row.receiver[1],row.open),{sourceSpan:row.argument},'; '+selected.local+' = '+intrinsic('push')+'('+selected.local+', '+temporary+'); ',...comments(...row.suffix),'}']);}}
 const composition=composeConcreteSourceEditTemplates(source,templates);let language,after;const concreteTrace=[];
 const run=createRulePipeline([{phase:'language',rules:[{id:'language:lower-scoped-String-vector-constructors-and-evaluate-push-operand-once-in-a-unit-block',apply:()=>{
  const original=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(original.meta).source!==source)fail('complete original source inverse differs');const result=applyConcreteSyntaxSubstitutions(original.document,{languageRules:[{id:'language:compose-native-String-vector-original-span-templates',edits:composition.edits}],repositoryRules:[]});concreteTrace.push({phase:'language',trace:result.trace});language=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(result.value));bounded(language.source);return language.document;
 }}]},{phase:'repository',rules:[{id:'router:bind-scoped-native-String-vector-intrinsic-call-tokens-to-paired-core',apply:document=>{
  const lookup=new Map([...operations.values()].map(row=>[row.placeholder,row.native])),counts=new Map(),bindings=[],tokens=rustTokens(language.source);
  for(let index=0;index<tokens.length;index++){const token=tokens[index];if(token.type!=='ident'||!lookup.has(token.text))continue;let next=index+1;while(tokens[next]?.type==='comment')next++;if(tokens[next]?.text!=='(')fail('fresh intrinsic must remain a call token');counts.set(token.text,(counts.get(token.text)??0)+1);bindings.push({span:[token.start,token.end],expected:token.text,replacement:lookup.get(token.text)});}
  for(const [kind,row]of operations){const expected=Number(constructor.kind===kind)+(kind==='push'?pushes:kind==='len'?lengths+emptyChecks:kind==='truncate'?clears:kind==='join'?joins:0);if(counts.get(row.placeholder)!==expected)fail('complete native intrinsic census differs');}
  if(joins){const templates=ownedTextVectorJoinHelperSources({...defaultOwnedTextVectorJoinHelperNames(),functionName:helperName});helperSource=templates.sources.find(row=>row.language==='Rust').source;bindings.push({span:[language.source.length,language.source.length],expected:'',replacement:'\n'+helperSource});}
  const result=applyConcreteSyntaxSubstitutions(document,{languageRules:[],repositoryRules:[{id:'router:qualify-selected-native-owned-String-vector-core-calls-and-append-complete-local-join-helper',edits:bindings}]});concreteTrace.push({phase:'repository',trace:result.trace});after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(result.value));return bounded(after.source);
 }}]}]).run(null);
 const history=transportConcreteSourceEquations([{before:source,after:run.value,language:'Rust'}])[0];if(history.inverse!==source||transportConcreteSyntaxMeta(after.meta).source!==run.value)fail('complete native adoption inverse differs');guard();
 const proposal={schema:'native-joining-owned-text-vector-proposal-v1',sourcePath:selected.sourcePath,function:selected.function,local:selected.local,files:[{path:selected.sourcePath,before:source,after:run.value,inverse:source,history}],languageSource:language.source,languageConcreteSyntax:language.meta,concreteSyntax:after.meta,concreteTrace,ruleTrace:run.trace,bindingBlockSpan:plan.bindingBlockSpan,controlFlowTokens:plan.controlFlowTokens,controlFlowSemanticQualified:false,sourceEdits:composition.sourceEdits,nestedSourceEdits:composition.nestedEdits,pushes,lengths,emptyChecks,clears,joins,joinHelper:helperSource?{name:helperName,source:helperSource,clonesSelectedText:true,maxTextUtf8Bytes:1048576,semanticQualified:false}:null,clearRetainedCapacityEquivalent:false,maxLiteralElements:64,maxValues:4096,requiredCoreFunctions:[...new Set([...operations.entries()].filter(([kind])=>kind!=='join').map(([,row])=>row.native).concat(joins?['crate::translation_owned_text_vectors_core::vec_text_len','crate::translation_owned_text_vectors_core::vec_text_get','crate::translation_text_core::len_utf8','crate::translation_text_core::to_owned','crate::translation_text_core::append_owned']:[]))],pushOperandEvaluatedOnceBeforeReceiverMove:true,originalTwoPhaseBorrowEquivalent:false,literalClonesChanged:constructor.kind==='from_slice',lengthRepresentationChanged:lengths>0,inputEnvelopeChanged:true,resourceEnvelopeChanged:true,requiresOriginalNamespaceCheck:true,requiresOriginalDomainCheck:true,semanticReissueQualified:false,...flags};return {...proposal,metadataTextUnits:metadataUnits(proposal,16777216)};
}

/** Bounded explicit source batch. Every whole module retains its inverse. */
export function proposeNativeJoiningOwnedTextVectors(input,selections){
 guard();const requests=sequence(selections,128).map(request),files=new Map(),seen=new Set(),steps=[];let bytes=0,units=0;
 for(const value of sequence(input,32)){const row=data(value,['path','source']),name=path(row.path);bounded(row.source);bytes+=Buffer.byteLength(row.source);if(bytes>8388608||files.has(name))fail('unique aggregate complete source bound');files.set(name,{path:name,before:row.source,after:row.source});}
 const run=createRulePipeline([{phase:'language',rules:[{id:'language:compose-explicit-complete-native-String-vector-source-pipelines',apply:()=>{for(const selected of requests){const key=selected.sourcePath+':'+selected.function+':'+selected.local,row=files.get(selected.sourcePath);if(!row||seen.has(key))fail('unique selected existing module/function/local required');seen.add(key);const proposal=proposeNativeJoiningOwnedTextVector(row.after,selected);units+=proposal.metadataTextUnits;if(units>33554432)fail('aggregate native proposal metadata bound');steps.push(proposal);row.after=proposal.files[0].after;}return null;}}]},{phase:'repository',rules:[{id:'router:retain-complete-native-String-vector-module-history-and-open-semantic-obligations',apply:()=>{
  const result=[...files.values()].map(row=>{const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'Rust'}])[0];if(history.inverse!==row.before)fail('whole native batch inverse differs');const value={...row,inverse:row.before,history};units+=metadataUnits(value,16777216);if(units>33554432)fail('aggregate final native metadata bound');return value;});guard();return {schema:'native-joining-owned-text-vector-batch-v1',files:result,steps,selectedLocals:requests.length,changedFiles:result.filter(row=>row.before!==row.after).length,metadataTextUnits:units,requiresOriginalNamespaceCheck:true,requiresOriginalDomainCheck:true,semanticReissueQualified:false,...flags};
 }}]}]).run(null);return {...run.value,ruleTrace:run.trace};
}
