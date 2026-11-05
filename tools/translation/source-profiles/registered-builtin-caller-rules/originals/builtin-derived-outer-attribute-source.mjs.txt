// Conditional original-source lemma. It does not resolve a derive callsite.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {builtinDeriveAstSourceProfile,builtinAstOriginal} from './builtin-derive-ast-meta.mjs';
import {captureOriginalRegisteredBuiltinDeriveTypeRange,originalRegisteredBuiltinDeriveTypeRangeFacts} from './builtin-derive-type-range.mjs';
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
 function templates(){const bytes=read(new URL('./source-profiles/builtin-derived-attributes/proof-templates.json',import.meta.url),65536);if(hash(bytes)!=='b78455190de277446b836bfabfe0814177e087ac4836d4f3b7503d353de22445')fail('complete source templates changed');return JSON.parse(bytes.toString('utf8'));}
 function finish(){for(const {url,bytes}of inputs.values())if(!readFileSync(url).equals(bytes))fail('complete source changed during conditional proof');guard();return [...sources.values()];}
 return {source,templates,finish};
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
function conditionalFacts(dependencies,name){
 guard();if(typeof name!=='string'||name.length>128)fail('bounded original registered name required');const frame=sourceFrame(),templates=frame.templates(),profile=builtinDeriveAstSourceProfile(dependencies);
 const token=captureOriginalRegisteredBuiltinDeriveTypeRange(dependencies,name),range=originalRegisteredBuiltinDeriveTypeRangeFacts(token,dependencies,name),catalogue=originalDerivedOuterBuiltinAttributeRegistrations(),originals=new Map(),inventories=new Map();
 const origin=(group,path)=>{const key=group+'\0'+path;if(!originals.has(key)){const row=frame.source(group,path);originals.set(key,row);}return originals.get(key);};
 const inventory=row=>{if(!inventories.has(row))inventories.set(row,functions(row));return inventories.get(row);};
 for(const callback of Object.values(range.callbacks)){
  const row=origin('builtin-derive-bang',callback.path),captured=builtinAstOriginal(profile,callback.path);if(row.source!==captured.source||row.sourceSha256!==callback.sourceSha256||row.source.slice(callback.span.start,callback.span.end)!==callback.original)fail('fresh complete registered callback differs');
 }
 const select=(key,group='builtin-derive-bang')=>{const template=templates[key],row=origin(group,template.path);return exactFunction(template,inventory(row));},callbacks={};
 for(const key of ['attributeIdent','hasNameDefault','hasAnyNameDefault','hasNameInherent','hasAnyNameInherent','attrWord','mkAttrWord','mkAttr','mkAttrFromItem','pathFromIdent','segmentFromIdent'])callbacks[key]=select(key);
 callbacks.identNew=select('identNew','compiler-output-collections');callbacks.builtinNameLookup=select('builtinNameLookup','macro-producer-kind');callbacks.collectAttribute=select('collectAttribute','macro-producer-kind');
 const attribute=origin('builtin-derive-bang',templates.attributeIdent.path),attributeInventory=inventory(attribute),implementation=containingType(attributeInventory,callbacks.attributeIdent,'implAttributeExtforAttribute');
 for(const node of implementation.body.children)if(node.text==='fn'){const at=implementation.body.children.indexOf(node),method=implementation.body.children[at+1]?.text;if(['has_name','has_any_name'].includes(method))fail('actual AttributeExt implementation overrides the proven defaults');}
 const owners={attributeIdent:implementation,hasNameDefault:containingType(attributeInventory,callbacks.hasNameDefault,'traitAttributeExt'),hasAnyNameDefault:containingType(attributeInventory,callbacks.hasAnyNameDefault,'traitAttributeExt'),hasNameInherent:containingType(attributeInventory,callbacks.hasNameInherent,'implAttribute'),hasAnyNameInherent:containingType(attributeInventory,callbacks.hasAnyNameInherent,'implAttribute'),
  pathFromIdent:containingType(inventory(origin('builtin-derive-bang',templates.pathFromIdent.path)),callbacks.pathFromIdent,'implPath'),segmentFromIdent:containingType(inventory(origin('builtin-derive-bang',templates.segmentFromIdent.path)),callbacks.segmentFromIdent,'implPathSegment'),identNew:containingType(inventory(origin('compiler-output-collections',templates.identNew.path)),callbacks.identNew,'implIdent'),attrWord:containingType(inventory(origin('builtin-derive-bang',templates.attrWord.path)),callbacks.attrWord,"impl<'a>ExtCtxt<'a>")};
 const suffix=compact(templates.createSuffix.original),create=compact(range.callbacks.create.original);if(!create.endsWith(suffix)||create.indexOf(suffix)!==create.length-suffix.length)fail('complete returned Impl attribute definition/use suffix differs');
 const builtin=origin('macro-producer-kind',templates.builtinMap.path),catalogueOriginal=origin('derive-ancestor-scope',templates.builtinMap.path);if(builtin.source!==catalogue.source||builtin.sourceSha256!==catalogue.sourceSha256||catalogueOriginal.source!==catalogue.source)fail('fresh source catalogue and collector builtin map differ');
 const map=wholeStatic(builtin,'BUILTIN_ATTRIBUTE_MAP',templates.builtinMap.original),registrations=catalogue.registrations.map(({name,registration})=>{
  const output=registration.expansion.trees;if(output.length!==2||output[0].text!=='BuiltinAttribute'||output[1].delimiter!=='{')fail('actual ungated expansion has another root constructor');const names=fields(output[1].children).filter(row=>row.name==='name');if(names.length!==1||syntaxText(names[0].expression)!=='sym::'+name)fail('actual expanded builtin registration preserves another name');
  return {name,registration,expandedNameField:names[0],actualOriginalInvocation:registration.originalInvocation.original,attributeBehaviorExecuted:false};
 });
 if(registrations.map(row=>row.name).join(',')!=='automatically_derived,allow,warn,deny,forbid,stable,unstable')fail('complete generated outer attribute set differs');
 // Whole exact callbacks above establish constructor flow and lookup behavior;
 // complete dispatch is reissued by the original registered-range issuer.
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'rust:original-generic-derived-outer-attribute-flow',apply:()=>({range,callbacks,owners,createSuffix:templates.createSuffix.original})}]},
  {phase:'repository',rules:[{id:'router:join-original-builtin-registry-and-collector',apply:value=>({...value,map,registrations})}]},
 ]).run(null),sources=frame.finish();
 return freeze({schema:'original-generic-derived-outer-attribute-source-v1',name,dependenciesDigest:dependencies.digest,...run.value,sources,trace:run.trace,
  conditionalConclusion:{emittedRoot:'ItemKind::Impl',generatedOuterAttributeNames:registrations.map(row=>row.name),singleSegmentNamePreserved:true,builtinLookupPrecedesCustomAttributeLookup:true,outerAttributeNamesSourceClosed:true,appliesOnlyToActualRegisteredGenericCallback:true},
  independentObligations:['genuine actual caller derive owner and all competing original/generated alternatives','complete generated nested item and macro_export effects','separate original input preservation dispatcher and all other producers','original architecture import type-prefix closure and tool ownership'],
  callerOwnerResolved:false,generatedOuterAttributeOwnersResolved:false,macroExportExceptionClosed:false,completeGeneratedOutput:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,crossInvocationCache:false});
}
export function captureOriginalGenericDerivedOuterAttributeSource(dependencies,name){
 conditionalFacts(dependencies,name);guard();const token=Object.freeze({schema:'private-original-generic-derived-outer-attribute-source-v1'});proofs.set(token,{dependencies,name});return token;
}
export function originalGenericDerivedOuterAttributeSourceFacts(token,dependencies,name){
 guard();const state=proofs.get(token);if(!state||state.dependencies!==dependencies||state.name!==name)fail('copied foreign or changed original request identity');return conditionalFacts(dependencies,name);
}
