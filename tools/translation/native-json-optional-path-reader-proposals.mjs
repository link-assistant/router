// Source-adoption DATA, never an original namespace/type/equivalence permit.
// Compose complete source pipelines; do not flatten their actual chronology.
import {types} from 'node:util';
import {posix} from 'node:path';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {proposeNativeJsonLiteralPathSearch} from './native-json-literal-path-search-proposals.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';

const fail=message=>{throw new TypeError('Native optional JSON reader: '+message);};
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
function request(value){const row=data(value,['sourcePath','function']);path(row.sourcePath);if(typeof row.function!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(row.function))fail('explicit ordinary function name required');return row;}
function metadataUnits(value,limit){
 const pending=[{value,depth:0}];let cells=0,units=0;
 while(pending.length){const row=pending.pop();if(++cells>200000||row.depth>192)fail('complete metadata cell/depth bound');if(typeof row.value==='string'){units+=row.value.length;if(units>limit)fail('complete retained metadata text bound');}else if(row.value&&typeof row.value==='object')for(const child of Object.values(row.value))pending.push({value:child,depth:row.depth+1});}return units;
}

// This deliberately narrow lexical grammar selects a complete straight-line
// prefix plus one tail search. Original symbol/type/body proof stays separate.
function prefixSelections(source,selected,pathSelection){
 const owners=sourceItems(source).filter(item=>item.term==='fn'&&item.name===selected.function);if(owners.length!==1)fail('one original lexical function required');
 const tokens=owners[0].tokens.filter(token=>token.type!=='comment');if(tokens.length>200000)fail('selected token bound');let at=tokens.findIndex(token=>token.text==='{');if(at<0)fail('ordinary function body required');at++;
 const take=text=>{const token=tokens[at++];if(token?.text!==text)fail('unsupported optional-reader prefix token '+text);return token;},name=()=>{const token=tokens[at++];if(!ident(token))fail('ordinary prefix identifier required');return token;};
 const bindings=new Map(),selections=[];
 function binding(){take('let');const local=name();if(local.text==='mut'||bindings.has(local.text))fail('mutable or shadowed reader local unsupported');if(tokens[at]?.text===':'){at++;const type=[];while(tokens[at]&&tokens[at].text!=='='){if(type.length>=8)fail('simple original JSON annotation required');type.push(tokens[at++].text);}if(!['Value','serde_json::Value','::serde_json::Value','crate::translation_core::Json'].includes(type.join('')))fail('simple original JSON annotation required');}take('=');return local;}
 const first=binding(),start=tokens[at]?.start;if(tokens[at]?.text==='::')at++;take('serde_json');take('::');take('from_str');take('(');const input=name();take(')');take('.');take('ok');take('(');take(')');const parseEnd=tokens[at-1].end;take('?');take(';');if(first.text===input.text)fail('reader input cannot be rebound');
 bindings.set(first.text,{borrowed:false});selections.push({kind:'parse',local:first.text,input:input.text,span:[start,parseEnd],arguments:[input.text],sourceAuthority:false,semanticAuthority:false});
 while(tokens[at]?.start<pathSelection.span[0]){
  if(selections.length>=17)fail('at most sixteen required child reads');const local=binding(),receiver=name(),parent=bindings.get(receiver.text);if(!parent)fail('field parent must be an earlier selected reader local');take('.');take('get');take('(');const key=tokens[at++];if(key?.type!=='string'||!(key.text.startsWith('"')||/^r#*"/u.test(key.text))||key.text.length>4096)fail('bounded original string key required');const stop=take(')').end;take('?');take(';');
  bindings.set(local.text,{borrowed:true});selections.push({kind:'field',local:local.text,parent:receiver.text,span:[receiver.start,stop],arguments:[(parent.borrowed?'':'&')+receiver.text,key.text],keyLiteral:key.text,sourceAuthority:false,semanticAuthority:false});
 }
 if(tokens[at]?.start!==pathSelection.span[0]||!bindings.has(pathSelection.root))fail('tail search must use a selected live reader root');
 while(tokens[at]?.end<=pathSelection.span[1])at++;if(tokens[at]?.text!=='}'||at!==tokens.length-1)fail('one complete tail search without trailing statements required');
 return selections;
}

/** Complete original module -> two composed language/repository pipelines. */
export function proposeNativeJsonOptionalPathReader(source,options){
 guard();bounded(source);const selected=request(options),paths=proposeNativeJsonLiteralPathSearch(source,selected);if(paths.selections.length!==1||paths.selections[0].resultKind==='str')fail('one complete tail path search with a result independent of the parsed local required');
 const selections=prefixSelections(source,selected,paths.selections[0]),intermediate=paths.files[0].after,names=new Set(rustTokens(intermediate).filter(ident).map(token=>token.text)),operations=new Map();
 if(intermediate.slice(0,paths.selections[0].span[0])!==source.slice(0,paths.selections[0].span[0]))fail('complete original reader prefix changed during tail composition');
 function intrinsic(kind){if(!operations.has(kind)){const stem='router_rule_optional_json_'+kind;let value=stem;for(let index=0;names.has(value);index++){if(index>=200000)fail('fresh intrinsic name bound');value=stem+'_'+index;}names.add(value);operations.set(kind,{placeholder:value,native:kind==='parse'?'crate::translation_core::json_parse':'crate::translation_json_fields_core::json_field'});}return operations.get(kind).placeholder;}
 const edits=selections.map(row=>({span:row.span,expected:source.slice(...row.span),replacement:intrinsic(row.kind)+'('+row.arguments.join(', ')+')'}));
 let original,language,after;const concreteTrace=[];
 const run=createRulePipeline([{phase:'language',rules:[{id:'language:substitute-selected-optional-json-parse-and-required-child-prefix',apply:()=>{
  original=transportConcreteSyntaxSource(intermediate,{language:'Rust'});if(transportConcreteSyntaxMeta(original.meta).source!==intermediate)fail('complete intermediate source inverse differs');
  const result=applyConcreteSyntaxSubstitutions(original.document,{languageRules:[{id:'language:optional-json-reader-prefix-intrinsics',edits}],repositoryRules:[]});concreteTrace.push({phase:'language',trace:result.trace});language=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(result.value));bounded(language.source);return language.document;
 }}]},{phase:'repository',rules:[{id:'router:bind-fresh-reader-intrinsic-call-tokens-to-existing-paired-json-cores',apply:document=>{
  const lookup=new Map([...operations.values()].map(row=>[row.placeholder,row.native])),counts=new Map(),bindings=[],tokens=rustTokens(language.source);
  for(let index=0;index<tokens.length;index++){const token=tokens[index],native=lookup.get(token.text);if(!native||token.type!=='ident')continue;let next=index+1;while(tokens[next]?.type==='comment')next++;if(tokens[next]?.text!=='(')fail('fresh reader intrinsic must remain a call token');counts.set(token.text,(counts.get(token.text)??0)+1);bindings.push({span:[token.start,token.end],expected:token.text,replacement:native});}
  for(const [kind,row]of operations)if(counts.get(row.placeholder)!==selections.filter(selection=>selection.kind===kind).length)fail('complete reader intrinsic census differs');
  const result=applyConcreteSyntaxSubstitutions(document,{languageRules:[],repositoryRules:[{id:'router:qualify-selected-json-reader-prefix-calls',edits:bindings}]});concreteTrace.push({phase:'repository',trace:result.trace});after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(result.value));return bounded(after.source);
 }}]}]).run(null);
 const prefix={before:intermediate,after:run.value,languageSource:language.source,languageConcreteSyntax:language.meta,concreteSyntax:after.meta,concreteTrace,ruleTrace:run.trace,selections};
 if(paths.metadataTextUnits+metadataUnits(prefix,16777216)+(source.length+run.value.length)*8>16777216)fail('composed proposal metadata preflight bound');
 const history=transportConcreteSourceEquations([{before:source,after:run.value,language:'Rust'}])[0];if(history.inverse!==source||transportConcreteSyntaxMeta(after.meta).source!==run.value)fail('complete composed reader source inverse differs');
 guard();const proposal={schema:'native-optional-json-path-reader-proposal-v1',sourcePath:selected.sourcePath,function:selected.function,files:[{path:selected.sourcePath,before:source,after:run.value,inverse:source,history}],pipelines:[paths,prefix],pipelineOrder:['literal-path-search','optional-reader-prefix'],prefixSelectionCoordinates:'original-module-before-path-tail-expansion',maxRequiredChildReads:16,requiredCoreFunctions:[...new Set([...paths.requiredCoreFunctions,...[...operations.values()].map(row=>row.native)])],...flags};return {...proposal,metadataTextUnits:metadataUnits(proposal,16777216)};
}

/** Bounded explicit multi-module/function composition; no source installation. */
export function proposeNativeJsonOptionalPathReaders(input,selections){
 guard();const requests=sequence(selections,128).map(request),files=new Map(),seen=new Set(),steps=[];let bytes=0,units=0;
 for(const value of sequence(input,32)){const row=data(value,['path','source']),name=path(row.path);bounded(row.source);bytes+=Buffer.byteLength(row.source);if(bytes>8388608||files.has(name))fail('unique aggregate complete source bound');files.set(name,{path:name,before:row.source,after:row.source});}
 const run=createRulePipeline([{phase:'language',rules:[{id:'language:compose-each-explicit-complete-reader-source-pipeline',apply:()=>{for(const selected of requests){const key=selected.sourcePath+':'+selected.function,row=files.get(selected.sourcePath);if(!row||seen.has(key))fail('unique selected existing module/function required');seen.add(key);const proposal=proposeNativeJsonOptionalPathReader(row.after,selected);units+=proposal.metadataTextUnits;if(units>33554432)fail('aggregate composed reader metadata bound');steps.push(proposal);row.after=proposal.files[0].after;}return null;}}]},{phase:'repository',rules:[{id:'router:retain-complete-module-source-history-and-unqualified-adoption-status',apply:()=>{
  const rows=[...files.values()].map(row=>{const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'Rust'}])[0];if(history.inverse!==row.before)fail('whole batch reader inverse differs');const result={...row,inverse:row.before,history};units+=metadataUnits(result,16777216);if(units>33554432)fail('aggregate final reader metadata bound');return result;});guard();return {schema:'native-optional-json-path-reader-batch-v1',files:rows,steps,selectedFunctions:requests.length,changedFiles:rows.filter(row=>row.before!==row.after).length,metadataTextUnits:units,...flags};
 }}]}]).run(null);return {...run.value,ruleTrace:run.trace};
}
