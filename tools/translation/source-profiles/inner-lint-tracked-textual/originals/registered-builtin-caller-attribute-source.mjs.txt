// Conditional original-source lemma. It does not resolve a derive callsite.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';


import {originalDerivedOuterBuiltinAttributeRegistrations} from './derive-ancestor-attribute-scope.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {rustTokens} from './rust-structure.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';

const initiallyNative=originalPrivateParserIngressUnchanged()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
// Identity records contain requests only. Every read recomputes source facts.
const proofs=initiallyNative?new WeakMap():null;
const fail=message=>throwOriginalCapturedTypeError('Original derived outer attributes: '+message);
function guard(){if(!initiallyNative||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source operations changed');}
const hash=value=>{const result=createHash('sha256').update(value).digest('hex');guard();return result;};
const freeze=(value,seen=new WeakSet())=>{if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const child of Object.values(value))freeze(child,seen);Object.freeze(value);}return value;};
const compact=source=>rustTokens(source).filter(token=>token.type!=='comment').map(token=>token.text).join('');
function syntaxText(nodes){return nodes.map(node=>node.kind==='group'?node.delimiter+syntaxText(node.children)+({'(':')','[':']','{':'}'}[node.delimiter]):node.kind==='fragment'?syntaxText(node.trees):node.text).join('');}
const pins={
 'registered-builtin-caller-attributes':'a94134a8eebefd780f7697f733cf47217cd635ee09cef6172ff2b8fb1f0dbaa2',
 'derive-ancestor-scope':'9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5',
 'builtin-derive-bang':'0827bbd1c92c969fc5de2c0cd38d53c74bf3483a26a9bc9ce9b62678ccf9b340',
 'macro-producer-kind':'edd410a9b253e9e73cc94f268c5de389b118ca4592ee8ea0ddb51e4817b9a5ef',
 'compiler-output-collections':'95838d907d2550fdbac20c8b1a805336cb0cb7db8fd242e497fa840673a11f85',
};
function sourceFrame(){
 const inputs=new Map(),manifests=new Map(),sources=new Map();let retained=0;
 function read(url,limit){const key=url.href;if(inputs.has(key))return inputs.get(key).bytes;const bytes=readFileSync(url);if(bytes.length>limit||(retained+=bytes.length)>8388608)fail('complete source input bound exceeded');inputs.set(key,{url,bytes});return bytes;}
 function manifest(group){if(!manifests.has(group)){const url=new URL('./source-profiles/'+group+'/manifest.json',import.meta.url),bytes=read(url,1048576);if(hash(bytes)!==pins[group])fail('complete source inventory changed: '+group);manifests.set(group,JSON.parse(bytes.toString('utf8')));}return manifests.get(group);}
 function source(group,path){
  const key=group+'\0'+path;if(sources.has(key))return sources.get(key);const rows=manifest(group).sources.filter(row=>(row.path??row.sourcePath)===path);if(rows.length!==1)fail('one actual complete original source required: '+path);
  const pin=rows[0],url=new URL('./source-profiles/'+group+'/'+pin.archive,import.meta.url);if(!url.href.startsWith(new URL('./source-profiles/',import.meta.url).href))fail('original archive escapes source profiles');
  const packed=read(url,2097152);if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete original archive changed');const raw=gunzipSync(packed,{maxOutputLength:2097152});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256||(retained+=raw.length)>8388608)fail('complete original source changed or decoded bound exceeded');
  const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==text||hash(text)!==pin.sha256)fail('complete original concrete inverse differs');
  const row={path,source:text,sourceSha256:pin.sha256,profileSha256:pins[group],concreteSyntax:concrete.meta,inverse:text};sources.set(key,row);return row;
 }
 function templates(){const bytes=read(new URL('./source-profiles/builtin-derived-attributes/proof-templates.json',import.meta.url),65536);if(hash(bytes)!=='b78455190de277446b836bfabfe0814177e087ac4836d4f3b7503d353de22445')fail('complete source templates changed');const parser=read(new URL('./source-profiles/registered-builtin-caller-attributes/parser-callbacks.json',import.meta.url),65536);if(hash(parser)!=='e6705daeb0aaf4cdb1f47170d927e2c59ae6f8a5cddfeb53702cb02cec09bd1e')fail('complete original parser callbacks changed');return {...JSON.parse(bytes.toString('utf8')),...JSON.parse(parser.toString('utf8'))};}
 function finish(){for(const {url,bytes}of inputs.values())if(!readFileSync(url).equals(bytes))fail('complete source changed during conditional proof');guard();return [...sources.values()];}
 return {source,templates,finish,retainedSourceBytes:()=>retained};
}
function functions(origin){
 const roots=originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),rows=[];
 function visit(nodes){for(let at=0;at<nodes.length;at++){
  if(nodes[at].text==='fn'&&nodes[at+1]?.type==='ident'){
   let end=at+2;while(end<nodes.length&&nodes[end].delimiter!=='{'&&nodes[end].text!==';')end++;
   if(nodes[end]?.delimiter==='{'){const span={start:nodes[at].span.start,end:nodes[end].span.end};rows.push({path:origin.path,sourceSha256:origin.sourceSha256,name:nodes[at+1].text,span,original:origin.source.slice(span.start,span.end),syntax:nodes.slice(at,end+1)});}
  }
  if(nodes[at].kind==='group')visit(nodes[at].children);
 }}visit(roots);return {roots,rows};
}
function exactFunction(template,inventory){
 const matches=inventory.rows.filter(row=>row.name===template.name&&compact(row.original)===compact(template.original));if(matches.length!==1)fail('complete original function grammar differs: '+template.name);return matches[0];
}
function containingType(inventory,callback,header){
 const matches=[];function visit(nodes){for(let at=0;at<nodes.length;at++){
  if(['impl','trait'].includes(nodes[at].text)){let end=at+1;while(end<nodes.length&&nodes[end].delimiter!=='{'&&nodes[end].text!==';')end++;const body=nodes[end];if(body?.delimiter==='{'&&syntaxText(nodes.slice(at,end))===header&&body.span.start<callback.span.start&&body.span.end>callback.span.end)matches.push({header,span:{start:nodes[at].span.start,end:body.span.end},body});}
  if(nodes[at].kind==='group')visit(nodes[at].children);
 }}visit(inventory.roots);if(matches.length!==1)fail('actual method implementation owner differs: '+header);return matches[0];
}
function fields(nodes){
 const rows=[];let start=0;for(let at=0;at<=nodes.length;at++)if(at===nodes.length||nodes[at].text===','){if(at>start){const row=nodes.slice(start,at);if(row[0]?.kind!=='token'||row[1]?.text!==':')fail('complete source struct field grammar differs');rows.push({name:row[0].text,expression:row.slice(2)});}start=at+1;}return rows;
}
function wholeStatic(origin,name,expected){
 const roots=originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000}),matches=[];
 for(let at=0;at<roots.length;at++)if(roots[at].text==='static'&&roots[at+1]?.text===name){let end=at+2;while(end<roots.length&&roots[end].text!==';')end++;let begin=at;if(roots[begin-1]?.text==='pub')begin--;const span={start:roots[begin].span.start,end:roots[end]?.span.end};if(!span.end)fail('complete original static absent');const original=origin.source.slice(span.start,span.end);if(compact(original)!==compact(expected))fail('complete actual builtin map initializer differs');matches.push({path:origin.path,sourceSha256:origin.sourceSha256,name,span,original});}
 if(matches.length!==1)fail('one actual complete builtin map required');return matches[0];
}
function registeredCallerFacts(name){
 guard();if(!['stable','unstable','automatically_derived','allow','warn','deny','forbid'].includes(name))fail('one actual registered caller attribute domain required');const frame=sourceFrame(),templates=frame.templates(),catalogue=originalDerivedOuterBuiltinAttributeRegistrations(),originals=new Map(),inventories=new Map();
 const origin=(group,path)=>{const key=group+'\0'+path;if(!originals.has(key))originals.set(key,frame.source(group,path));return originals.get(key);};const inventory=row=>{if(!inventories.has(row))inventories.set(row,functions(row));return inventories.get(row);};
 const select=(key,group='builtin-derive-bang')=>{const template=templates[key],row=origin(group,template.path);return exactFunction(template,inventory(row));};
 const callbacks={attributeIdent:select('attributeIdent'),mkAttrFromItem:select('mkAttrFromItem'),segmentFromIdent:select('segmentFromIdent'),builtinNameLookup:select('builtinNameLookup','macro-producer-kind'),collectAttribute:select('collectAttribute','macro-producer-kind')};
 const attributeInventory=inventory(origin('builtin-derive-bang',templates.attributeIdent.path)),attributeOwner=containingType(attributeInventory,callbacks.attributeIdent,'implAttributeExtforAttribute'),segmentOwner=containingType(inventory(origin('builtin-derive-bang',templates.segmentFromIdent.path)),callbacks.segmentFromIdent,'implPathSegment');
 const parser={};for(const key of ['parse_attribute','parse_attr_item','parse_path','parse_path_inner','parse_path_segments','parse_path_segment','parse_path_segment_ident','parse_ident','parse_ident_common','ident_or_err','parse_attr_args','parse_delim_args_inner']){const template=templates[key],source=origin('registered-builtin-caller-attributes',template.path),callback=exactFunction(template,inventory(source));parser[key]={...callback,owner:containingType(inventory(source),callback,template.owner)};}
 const builtin=origin('macro-producer-kind',templates.builtinMap.path),catalogueOriginal=origin('derive-ancestor-scope',templates.builtinMap.path);if(builtin.source!==catalogue.source||builtin.sourceSha256!==catalogue.sourceSha256||catalogueOriginal.source!==catalogue.source)fail('fresh current registered attribute map/catalogue source differs');
 const map=wholeStatic(builtin,'BUILTIN_ATTRIBUTE_MAP',templates.builtinMap.original),registrations=catalogue.registrations.map(({name,registration})=>{const output=registration.expansion.trees;if(output.length!==2||output[0].text!=='BuiltinAttribute'||output[1].delimiter!=='{')fail('actual original ungated constructor differs');const names=fields(output[1].children).filter(row=>row.name==='name');if(names.length!==1||syntaxText(names[0].expression)!=='sym::'+name)fail('actual original registered symbol differs');return {name,registration,expandedNameField:names[0]};});if(registrations.map(row=>row.name).join(',')!=='automatically_derived,allow,warn,deny,forbid,stable,unstable')fail('complete original registered symbol set differs');
 // Whole pinned parser callbacks establish the ordinary non-interpolated,
 // nonraw, nonqualified path. The bounded caller grammar below supplies those
 // exact branch preconditions. No generic macro token input is an original attr.
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'rust:join-original-written-attribute-parser-normal-item-and-single-segment-ident',apply:()=>({parser,callbacks,owners:{attributeOwner,segmentOwner}})}]},
  {phase:'repository',rules:[{id:'router:join-complete-unconditional-registry-before-custom-attribute-selection',apply:value=>({...value,map,registrations})}]},
 ]).run(null),sources=frame.finish();
 const facts=freeze({schema:'original-written-registered-builtin-attribute-source-v1',name,...run.value,sources,trace:run.trace,conditionalConclusion:{requiresOriginalPlainOuterAttribute:true,requiresOrdinarySingleSegmentIdentifier:true,requiresOriginalLiteralOrEmptyArguments:true,normalItemRetainsParsedPath:true,singleSegmentIdentPreserved:true,builtinLookupPrecedesCustomAttributeSelection:true},callerOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,crossInvocationCache:false});return {facts,current:()=>frame.finish()};
}
export function captureOriginalRegisteredBuiltinCallerSource(name){registeredCallerFacts(name);guard();const token=Object.freeze({schema:'private-original-written-builtin-attribute-source-v1'});proofs.set(token,{name});return token;}
export function originalRegisteredBuiltinCallerSourceFacts(token,name){guard();const state=proofs.get(token);if(!state||state.name!==name)fail('copied foreign or changed original builtin attribute request');return registeredCallerFacts(name).facts;}

// The frame is invocation-local. It retains complete original source only for
// this resolver operation and physically rejoins every input before returning.
export function createOriginalRegisteredBuiltinCallerAttributeScope(){
 let closure=null,cells=0;const selected=[];const tick=()=>{if(++cells>200000)fail('complete original registered attribute source-cell bound');};
 function at(module,item,attribute){
  tick();if(!attribute||!['stable','unstable','automatically_derived'].includes(attribute.name)||typeof module?.source!=='string')return null;const span=attribute.span;if(!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<item.start||span.end>item.end)return null;
  const actual=originalSourceModuleItems(module).find(row=>row.start===item.start&&row.end===item.end);if(!actual||actual.tokens.length!==item.tokens.length||actual.tokens.some((token,index)=>['text','type','start','end'].some(key=>token[key]!==item.tokens[index][key])))fail('complete actual original attribute item differs');
  const source=module.source.slice(span.start,span.end),trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64});if(trees.length!==2||trees[0].text!=='#'||trees[1].delimiter!=='[')return null;const body=trees[1].children;if(body[0]?.kind!=='token'||body[0].text!==attribute.name)return null;
  if(attribute.name==='automatically_derived'){if(body.length!==1)return null;}else{if(body.length!==2||body[1].delimiter!=='(')return null;const args=body[1].children,keys=new Set();let index=0;while(index<args.length){tick();const key=args[index++];if(key?.kind!=='token'||!['feature','since','issue','reason','soft'].includes(key.text)||keys.has(key.text))return null;keys.add(key.text);if(key.text!=='soft'){if(args[index++]?.text!=='=')return null;const value=args[index++];if(value?.kind!=='token'||value.type!=='string'||!value.text.startsWith('"'))return null;}if(index<args.length&&args[index++]?.text!==',')return null;}if(!keys.has('feature')||attribute.name==='stable'&&!keys.has('since')||attribute.name==='unstable'&&!keys.has('issue'))return null;}
  closure??=registeredCallerFacts('stable');const registration=closure.facts.registrations.find(row=>row.name===attribute.name);if(!registration)fail('fresh actual builtin registration absent');const row={source:module.file,module:[...module.path],span:{...span},original:source,name:attribute.name,sourceAuthority:false,semanticAuthority:false};selected.push(row);return row;
 }
 return {at,finish(){if(!closure)return null;closure.current();return {schema:'original-registered-builtin-caller-scope-source-v1',selected,sources:closure.facts.sources.map(row=>({path:row.path,sourceSha256:row.sourceSha256,profileSha256:row.profileSha256})),trace:closure.facts.trace,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false};}};
}

import {originalSourceModuleItems} from './source-module-views.mjs';

// Every direct source request creates and closes its own complete frame.
export function originalRegisteredBuiltinCallerAttributeAt(module,item,attribute){const scope=createOriginalRegisteredBuiltinCallerAttributeScope();const selected=scope.at(module,item,attribute);scope.finish();return selected;}

// Separate passive source domain; the ordinary 3-name namespace frame stays.
export function createOriginalPassiveBuiltinCallerAttributeScope(){
 let closure=null,cells=0;const selected=[];const tick=()=>{if(++cells>200000)fail('complete original registered attribute source-cell bound');};
 function at(module,item,attribute){
  tick();if(!attribute||!['stable','unstable','automatically_derived','allow','warn','deny','forbid'].includes(attribute.name)||typeof module?.source!=='string')return null;const span=attribute.span;if(!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<item.start||span.end>item.end)return null;
  const actual=originalSourceModuleItems(module).find(row=>row.start===item.start&&row.end===item.end);if(!actual||actual.tokens.length!==item.tokens.length||actual.tokens.some((token,index)=>['text','type','start','end'].some(key=>token[key]!==item.tokens[index][key])))fail('complete actual original attribute item differs');
  const source=module.source.slice(span.start,span.end),trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64});if(trees.length!==2||trees[0].text!=='#'||trees[1].delimiter!=='[')return null;const body=trees[1].children;if(body[0]?.kind!=='token'||body[0].text!==attribute.name)return null;
  if(['allow','warn','deny','forbid'].includes(attribute.name)){if(body.length!==2||body[1].delimiter!=='(')return null;const args=body[1].children;let index=0;while(index<args.length){tick();let segments=1;if(args[index]?.kind!=='token'||args[index].type!=='ident'||! /^[A-Za-z_][A-Za-z0-9_]*$/u.test(args[index++].text))return null;while(args[index]?.text==='::'){if(++segments>16||args[++index]?.kind!=='token'||args[index].type!=='ident'||! /^[A-Za-z_][A-Za-z0-9_]*$/u.test(args[index++].text))return null;}if(index<args.length&&args[index++]?.text!==',')return null;}}else if(attribute.name==='automatically_derived'){if(body.length!==1)return null;}else{if(body.length!==2||body[1].delimiter!=='(')return null;const args=body[1].children,keys=new Set();let index=0;while(index<args.length){tick();const key=args[index++];if(key?.kind!=='token'||!['feature','since','issue','reason','soft'].includes(key.text)||keys.has(key.text))return null;keys.add(key.text);if(key.text!=='soft'){if(args[index++]?.text!=='=')return null;const value=args[index++];if(value?.kind!=='token'||value.type!=='string'||!value.text.startsWith('"'))return null;}if(index<args.length&&args[index++]?.text!==',')return null;}if(!keys.has('feature')||attribute.name==='stable'&&!keys.has('since')||attribute.name==='unstable'&&!keys.has('issue'))return null;}
  closure??=registeredCallerFacts('stable');const registration=closure.facts.registrations.find(row=>row.name===attribute.name);if(!registration)fail('fresh actual builtin registration absent');const row={source:module.file,module:[...module.path],span:{...span},original:source,name:attribute.name,sourceAuthority:false,semanticAuthority:false};selected.push(row);return row;
 }
 return {at,finish(){if(!closure)return null;closure.current();return {schema:'original-registered-builtin-caller-scope-source-v1',selected,sources:closure.facts.sources.map(row=>({path:row.path,sourceSha256:row.sourceSha256,profileSha256:row.profileSha256})),trace:closure.facts.trace,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false};}};
}

// Separate exact original token domain; prior source frames stay available.
export function createTokenBoundRegisteredBuiltinCallerAttributeScope(){
 let closure=null,cells=0;const selected=[];const tick=()=>{if(++cells>200000)fail('complete original registered attribute source-cell bound');};
 function at(module,item,attribute){
  tick();if(!attribute||!['stable','unstable','automatically_derived'].includes(attribute.name)||typeof module?.source!=='string')return null;const span=attribute.span;if(!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<item.start||span.end>item.end)return null;
  const actual=originalSourceModuleItems(module).find(row=>row.start===item.start&&row.end===item.end);if(!actual||actual.tokens.length!==item.tokens.length||actual.tokens.some((token,index)=>['text','type','start','end'].some(key=>token[key]!==item.tokens[index][key])))fail('complete actual original attribute item differs');
  const originalTokens=actual.tokens.filter(token=>token.type!=='comment'),first=originalTokens.findIndex(token=>token.start===span.start),last=originalTokens.findIndex(token=>token.end===span.end);if(first<0||last<=first||originalTokens[first].type!=='punct'||originalTokens[first].text!=='#'||originalTokens[first+1]?.type!=='punct'||originalTokens[first+1].text!=='['||originalTokens[last].type!=='punct'||originalTokens[last].text!==']')return null;
  const source=module.source.slice(span.start,span.end),trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64});if(trees.length!==2||trees[0].text!=='#'||trees[1].delimiter!=='[')return null;const body=trees[1].children;if(body[0]?.kind!=='token'||body[0].text!==attribute.name)return null;
  if(attribute.name==='automatically_derived'){if(body.length!==1)return null;}else{if(body.length!==2||body[1].delimiter!=='(')return null;const args=body[1].children,keys=new Set();let index=0;while(index<args.length){tick();const key=args[index++];if(key?.kind!=='token'||!['feature','since','issue','reason','soft'].includes(key.text)||keys.has(key.text))return null;keys.add(key.text);if(key.text!=='soft'){if(args[index++]?.text!=='=')return null;const value=args[index++];if(value?.kind!=='token'||value.type!=='string'||!value.text.startsWith('"'))return null;}if(index<args.length&&args[index++]?.text!==',')return null;}if(!keys.has('feature')||attribute.name==='stable'&&!keys.has('since')||attribute.name==='unstable'&&!keys.has('issue'))return null;}
  closure??=registeredCallerFacts('stable');const registration=closure.facts.registrations.find(row=>row.name===attribute.name);if(!registration)fail('fresh actual builtin registration absent');const row={source:module.file,module:[...module.path],span:{...span},original:source,name:attribute.name,originalTokenBoundsVerified:true,sourceAuthority:false,semanticAuthority:false};selected.push(row);return row;
 }
 return {at,finish(){if(!closure)return null;closure.current();return {schema:'original-registered-builtin-caller-scope-source-v1',selected,sources:closure.facts.sources.map(row=>({path:row.path,sourceSha256:row.sourceSha256,profileSha256:row.profileSha256})),trace:closure.facts.trace,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false};}};
}

// Complete copied metadata source route; older written-attribute APIs remain.
import {originalSourceMetadataBuiltinAttributeRegistrations} from './derive-ancestor-attribute-scope.mjs';
function registeredSourceMetadataCallerFacts(name){
 guard();if(!['stable','unstable','automatically_derived','allow','warn','deny','forbid','target_feature'].includes(name))fail('one actual registered caller attribute domain required');const frame=sourceFrame(),templates=frame.templates(),catalogue=originalSourceMetadataBuiltinAttributeRegistrations(),originals=new Map(),inventories=new Map();
 const origin=(group,path)=>{const key=group+'\0'+path;if(!originals.has(key))originals.set(key,frame.source(group,path));return originals.get(key);};const inventory=row=>{if(!inventories.has(row))inventories.set(row,functions(row));return inventories.get(row);};
 const select=(key,group='builtin-derive-bang')=>{const template=templates[key],row=origin(group,template.path);return exactFunction(template,inventory(row));};
 const callbacks={attributeIdent:select('attributeIdent'),mkAttrFromItem:select('mkAttrFromItem'),segmentFromIdent:select('segmentFromIdent'),builtinNameLookup:select('builtinNameLookup','macro-producer-kind'),collectAttribute:select('collectAttribute','macro-producer-kind')};
 const attributeInventory=inventory(origin('builtin-derive-bang',templates.attributeIdent.path)),attributeOwner=containingType(attributeInventory,callbacks.attributeIdent,'implAttributeExtforAttribute'),segmentOwner=containingType(inventory(origin('builtin-derive-bang',templates.segmentFromIdent.path)),callbacks.segmentFromIdent,'implPathSegment');
 const parser={};for(const key of ['parse_attribute','parse_attr_item','parse_path','parse_path_inner','parse_path_segments','parse_path_segment','parse_path_segment_ident','parse_ident','parse_ident_common','ident_or_err','parse_attr_args','parse_delim_args_inner']){const template=templates[key],source=origin('registered-builtin-caller-attributes',template.path),callback=exactFunction(template,inventory(source));parser[key]={...callback,owner:containingType(inventory(source),callback,template.owner)};}
 const builtin=origin('macro-producer-kind',templates.builtinMap.path),catalogueOriginal=origin('derive-ancestor-scope',templates.builtinMap.path);if(builtin.source!==catalogue.source||builtin.sourceSha256!==catalogue.sourceSha256||catalogueOriginal.source!==catalogue.source)fail('fresh current registered attribute map/catalogue source differs');
 const map=wholeStatic(builtin,'BUILTIN_ATTRIBUTE_MAP',templates.builtinMap.original),registrations=catalogue.registrations.map(({name,registration})=>{const output=registration.expansion.trees;if(output.length!==2||output[0].text!=='BuiltinAttribute'||output[1].delimiter!=='{')fail('actual original ungated constructor differs');const names=fields(output[1].children).filter(row=>row.name==='name');if(names.length!==1||syntaxText(names[0].expression)!=='sym::'+name)fail('actual original registered symbol differs');return {name,registration,expandedNameField:names[0]};});if(registrations.map(row=>row.name).join(',')!=='automatically_derived,allow,warn,deny,forbid,stable,unstable,target_feature')fail('complete original registered symbol set differs');
 // Whole pinned parser callbacks establish the ordinary non-interpolated,
 // nonraw, nonqualified path. The bounded caller grammar below supplies those
 // exact branch preconditions. No generic macro token input is an original attr.
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'rust:join-original-written-attribute-parser-normal-item-and-single-segment-ident',apply:()=>({parser,callbacks,owners:{attributeOwner,segmentOwner}})}]},
  {phase:'repository',rules:[{id:'router:join-complete-unconditional-registry-before-custom-attribute-selection',apply:value=>({...value,map,registrations})}]},
 ]).run(null),sources=frame.finish();
 const facts=freeze({schema:'original-written-registered-builtin-attribute-source-v1',name,...run.value,sources,trace:run.trace,conditionalConclusion:{requiresOriginalPlainOuterAttribute:true,requiresOrdinarySingleSegmentIdentifier:true,requiresOriginalLiteralOrEmptyArguments:true,normalItemRetainsParsedPath:true,singleSegmentIdentPreserved:true,builtinLookupPrecedesCustomAttributeSelection:true},callerOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,crossInvocationCache:false});return {facts,current:()=>frame.finish()};
}
export function createSourceMetadataBuiltinCallerAttributeScope(){
 let closure=null,cells=0;const selected=[];const tick=()=>{if(++cells>200000)fail('complete original registered attribute source-cell bound');};
 function at(module,item,attribute){
  tick();if(!attribute||!['stable','unstable','automatically_derived','target_feature'].includes(attribute.name)||typeof module?.source!=='string')return null;const span=attribute.span;if(!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<item.start||span.end>item.end)return null;
  const actual=originalSourceModuleItems(module).find(row=>row.start===item.start&&row.end===item.end);if(!actual||actual.tokens.length!==item.tokens.length||actual.tokens.some((token,index)=>['text','type','start','end'].some(key=>token[key]!==item.tokens[index][key])))fail('complete actual original attribute item differs');
  const originalTokens=actual.tokens.filter(token=>token.type!=='comment'),first=originalTokens.findIndex(token=>token.start===span.start),last=originalTokens.findIndex(token=>token.end===span.end);if(first<0||last<=first||originalTokens[first].type!=='punct'||originalTokens[first].text!=='#'||originalTokens[first+1]?.type!=='punct'||originalTokens[first+1].text!=='['||originalTokens[last].type!=='punct'||originalTokens[last].text!==']')return null;
  const source=module.source.slice(span.start,span.end),trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64});if(trees.length!==2||trees[0].text!=='#'||trees[1].delimiter!=='[')return null;const body=trees[1].children;if(body[0]?.kind!=='token'||body[0].text!==attribute.name)return null;
  if(attribute.name==='target_feature'){if(body.length!==2||body[1].delimiter!=='(')return null;const args=body[1].children;if(![3,4].includes(args.length)||args.length===4&&args[3].text!==','||args[0]?.kind!=='token'||args[0].type!=='ident'||args[0].text!=='enable'||args[1]?.text!=='='||args[2]?.kind!=='token'||args[2].type!=='string'||!args[2].text.startsWith('"'))return null;}else if(attribute.name==='automatically_derived'){if(body.length!==1)return null;}else{if(body.length!==2||body[1].delimiter!=='(')return null;const args=body[1].children,keys=new Set();let index=0;while(index<args.length){tick();const key=args[index++];if(key?.kind!=='token'||!['feature','since','issue','reason','soft'].includes(key.text)||keys.has(key.text))return null;keys.add(key.text);if(key.text!=='soft'){if(args[index++]?.text!=='=')return null;const value=args[index++];if(value?.kind!=='token'||value.type!=='string'||!value.text.startsWith('"'))return null;}if(index<args.length&&args[index++]?.text!==',')return null;}if(!keys.has('feature')||attribute.name==='stable'&&!keys.has('since')||attribute.name==='unstable'&&!keys.has('issue'))return null;}
  closure??=registeredSourceMetadataCallerFacts('target_feature');const registration=closure.facts.registrations.find(row=>row.name===attribute.name);if(!registration)fail('fresh actual builtin registration absent');const row={source:module.file,module:[...module.path],span:{...span},original:source,name:attribute.name,originalTokenBoundsVerified:true,sourceAuthority:false,semanticAuthority:false};selected.push(row);return row;
 }
 return {at,finish(){if(!closure)return null;closure.current();return {schema:'original-registered-builtin-caller-scope-source-v1',selected,sources:closure.facts.sources.map(row=>({path:row.path,sourceSha256:row.sourceSha256,profileSha256:row.profileSha256})),trace:closure.facts.trace,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false};}};
}
export function originalSourceMetadataBuiltinCallerAttributeAt(module,item,attribute){const scope=createSourceMetadataBuiltinCallerAttributeScope();const selected=scope.at(module,item,attribute);scope.finish();return selected;}

import {originalModuleMacroUseBuiltinAttributeRegistrations,originalModuleMacroUseSourcePlan} from './derive-ancestor-attribute-scope.mjs';
import {originalDeclarationHeader} from './module-bindings.mjs';

function registeredModuleMacroUseCallerFacts(name){
 guard();if(!['macro_use'].includes(name))fail('one actual registered caller attribute domain required');const frame=sourceFrame(),templates=frame.templates(),catalogue=originalModuleMacroUseBuiltinAttributeRegistrations(),originals=new Map(),inventories=new Map();
 const origin=(group,path)=>{const key=group+'\0'+path;if(!originals.has(key))originals.set(key,frame.source(group,path));return originals.get(key);};const inventory=row=>{if(!inventories.has(row))inventories.set(row,functions(row));return inventories.get(row);};
 const select=(key,group='builtin-derive-bang')=>{const template=templates[key],row=origin(group,template.path);return exactFunction(template,inventory(row));};
 const callbacks={attributeIdent:select('attributeIdent'),mkAttrFromItem:select('mkAttrFromItem'),segmentFromIdent:select('segmentFromIdent'),builtinNameLookup:select('builtinNameLookup','macro-producer-kind'),collectAttribute:select('collectAttribute','macro-producer-kind')};
 const attributeInventory=inventory(origin('builtin-derive-bang',templates.attributeIdent.path)),attributeOwner=containingType(attributeInventory,callbacks.attributeIdent,'implAttributeExtforAttribute'),segmentOwner=containingType(inventory(origin('builtin-derive-bang',templates.segmentFromIdent.path)),callbacks.segmentFromIdent,'implPathSegment');
 const parser={};for(const key of ['parse_attribute','parse_attr_item','parse_path','parse_path_inner','parse_path_segments','parse_path_segment','parse_path_segment_ident','parse_ident','parse_ident_common','ident_or_err','parse_attr_args','parse_delim_args_inner']){const template=templates[key],source=origin('registered-builtin-caller-attributes',template.path),callback=exactFunction(template,inventory(source));parser[key]={...callback,owner:containingType(inventory(source),callback,template.owner)};}
 const builtin=origin('macro-producer-kind',templates.builtinMap.path),catalogueOriginal=origin('derive-ancestor-scope',templates.builtinMap.path);if(builtin.source!==catalogue.source||builtin.sourceSha256!==catalogue.sourceSha256||catalogueOriginal.source!==catalogue.source)fail('fresh current registered attribute map/catalogue source differs');
 const map=wholeStatic(builtin,'BUILTIN_ATTRIBUTE_MAP',templates.builtinMap.original),registrations=catalogue.registrations.map(({name,registration})=>{const output=registration.expansion.trees;if(output.length!==2||output[0].text!=='BuiltinAttribute'||output[1].delimiter!=='{')fail('actual original ungated constructor differs');const names=fields(output[1].children).filter(row=>row.name==='name');if(names.length!==1||syntaxText(names[0].expression)!=='sym::'+name)fail('actual original registered symbol differs');return {name,registration,expandedNameField:names[0]};});if(registrations.map(row=>row.name).join(',')!=='macro_use')fail('complete original registered symbol set differs');
 // Whole pinned parser callbacks establish the ordinary non-interpolated,
 // nonraw, nonqualified path. The bounded caller grammar below supplies those
 // exact branch preconditions. No generic macro token input is an original attr.
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'rust:join-original-written-attribute-parser-normal-item-and-single-segment-ident',apply:()=>({parser,callbacks,owners:{attributeOwner,segmentOwner}})}]},
  {phase:'repository',rules:[{id:'router:join-complete-unconditional-registry-before-custom-attribute-selection',apply:value=>({...value,map,registrations})}]},
 ]).run(null),sources=frame.finish(),moduleMacroUseSource=originalModuleMacroUseSourcePlan();if(frame.retainedSourceBytes()+moduleMacroUseSource.retainedSourceBytes>8388608)fail('complete parser registry and resolver source closure exceeds its original byte bound');
 const facts=freeze({schema:'original-written-registered-builtin-attribute-source-v1',name,...run.value,sources,moduleMacroUseSource,trace:run.trace,conditionalConclusion:{requiresOriginalPlainOuterAttribute:true,requiresActualModuleWord:true,requiresOrdinarySingleSegmentIdentifier:true,requiresOriginalLiteralOrEmptyArguments:true,normalItemRetainsParsedPath:true,singleSegmentIdentPreserved:true,builtinLookupPrecedesCustomAttributeSelection:true},callerOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,crossInvocationCache:false});return {facts,current:()=>{frame.finish();originalModuleMacroUseSourcePlan();}};
}

export function createModuleMacroUseBuiltinCallerAttributeScope(){
 let closure=null,cells=0;const selected=[];const tick=()=>{if(++cells>200000)fail('complete original registered attribute source-cell bound');};
 function at(module,item,attribute){
  tick();if(!attribute||!['macro_use'].includes(attribute.name)||typeof module?.source!=='string')return null;const span=attribute.span;if(!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<item.start||span.end>item.end)return null;
  const actual=originalSourceModuleItems(module).find(row=>row.start===item.start&&row.end===item.end);if(!actual||actual.tokens.length!==item.tokens.length||actual.tokens.some((token,index)=>['text','type','start','end'].some(key=>token[key]!==item.tokens[index][key])))fail('complete actual original attribute item differs');
  const originalTokens=actual.tokens.filter(token=>token.type!=='comment'),first=originalTokens.findIndex(token=>token.start===span.start),last=originalTokens.findIndex(token=>token.end===span.end);if(first<0||last<=first||originalTokens[first].type!=='punct'||originalTokens[first].text!=='#'||originalTokens[first+1]?.type!=='punct'||originalTokens[first+1].text!=='['||originalTokens[last].type!=='punct'||originalTokens[last].text!==']')return null;
  const source=module.source.slice(span.start,span.end),trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64});if(trees.length!==2||trees[0].text!=='#'||trees[1].delimiter!=='[')return null;const body=trees[1].children;if(body[0]?.kind!=='token'||body[0].text!==attribute.name)return null;
  if(body.length!==1||originalDeclarationHeader(actual,module.path)?.kind!=='mod')return null;
  closure??=registeredModuleMacroUseCallerFacts('macro_use');const registration=closure.facts.registrations.find(row=>row.name===attribute.name);if(!registration)fail('fresh actual builtin registration absent');const row={source:module.file,module:[...module.path],span:{...span},original:source,name:attribute.name,originalTokenBoundsVerified:true,sourceAuthority:false,semanticAuthority:false};selected.push(row);return row;
 }
 return {at,finish(){if(!closure)return null;closure.current();return {schema:'original-registered-builtin-caller-scope-source-v1',selected,sources:closure.facts.sources.map(row=>({path:row.path,sourceSha256:row.sourceSha256,profileSha256:row.profileSha256})),trace:closure.facts.trace,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false};}};
}
