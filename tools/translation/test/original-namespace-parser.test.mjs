import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {originalDeclarationHeader} from '../module-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {captureOriginalNamespaceFunction,originalNamespaceFunctionMembers,originalNamespaceFunctionFacts,originalNamespaceFunctionInvocationPosition,originalNamespacePositionFacts} from '../original-namespace-parser.mjs';
import {captureOriginalNamespaceSourceSuperset,originalNamespaceSourceSupersetFacts} from '../conditional-namespace-superset.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const retain=(name,value)=>{const directory=process.env.ROUTER_ORIGINAL_NAMESPACE_PARSER_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value)+'\n',{flag:'wx'});}};
function authored(source,name='caller'){
 const capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),module={source,file:'src/lib.rs',path:[],sourceView:capture.views[0],compilationProfile:PRODUCTION_PROFILE},items=originalSourceModuleItems(module).filter(item=>{const header=originalDeclarationHeader(item);return name===null?header?.kind==='impl':header?.name===name;});assert.equal(items.length,1,'exact original declaration after its complete attributes');return {module,item:items[0],memberIndex:null};
}
function issue(input){const token=captureOriginalNamespaceFunction(input),facts=originalNamespaceFunctionFacts(token,input),positions=facts.opaqueInvocations.map((_node,index)=>{const token_=originalNamespaceFunctionInvocationPosition(token,input,index);return {token:token_,facts:originalNamespacePositionFacts(token_,token,input)};});return {token,facts,positions};}
function noAuthority(facts){for(const key of ['callerOwnerResolved','callerScopeComplete','attributeTransformationsResolved','globalBangComplete','typeAuthority','runtimeAuthority','namespaceAuthority'])assert.equal(facts[key],false,key);}

test('complete actual Engine trait all12 original methods parse with original opaque vec panic and unreachable TT',{timeout:60000},()=>{
 const packageToken=captureOriginalExternalTraitPackage(dependencies,'base64'),original=originalExternalTraitPackageInputs(packageToken),sources=new Map(original.sources.map(row=>[row.path,row.source])),paths=original.sources.filter(row=>row.path.endsWith('.rs')).map(row=>row.path);
 const graph=resolveModuleGraph({entry:original.crateRoot,paths,readSource:path=>sources.get(path),compilationProfile:null}),module=graph.modules.find(module=>module.file==='src/engine/mod.rs'),item=originalSourceModuleItems(module).find(item=>item.name==='Engine');assert.ok(item);
 const members=originalNamespaceFunctionMembers({module,item}),methods=members.filter(row=>row.kind==='fn');assert.equal(members.length,14);assert.deepEqual(methods.map(row=>row.name),['internal_encode','internal_decoded_len_estimate','internal_decode','config','encode','encode_string','encode_slice','decode','decode_vec','decode_slice','decode_slice_unchecked','padding']);
 const frames=methods.map(member=>({member,...issue({module,item,memberIndex:member.memberIndex})}));retain('01-complete-original-package-and-function-frames',{original,graph,members,frames});
 const invocations=frames.flatMap(frame=>frame.facts.opaqueInvocations);assert.equal(invocations.length,5);assert.deepEqual(invocations.map(node=>node.fields.path.fields.segments.at(-1)),['vec','vec','unreachable','unreachable','panic']);assert.equal(invocations.every(node=>node.fields.position==='Expr'),true);
 for(const frame of frames){noAuthority(frame.facts);assert.equal(frame.facts.source.sourceSha256,hash(module.source));assert.equal(module.source.slice(frame.member.span.start,frame.member.span.end),frame.facts.source.original);assert.equal(frame.facts.completeOriginalFunctionParsed,true);for(const position of frame.positions){assert.equal(position.facts.ordinaryGeneratedImportsAndProcStubsRemainBlockLocal,true);assert.equal(position.facts.enclosingAttributeBindingsUnchanged,false);assert.equal(position.facts.unresolvedGlobalMacroExportKindsRetained,true);}}
 assert.equal(module.configurationCondition,'unknown');
});

test('actual statement parser separates explicit semicolon braces postfix expression and parenthesized tail positions',{timeout:60000},()=>{
 const source='fn caller(){let a=alpha!();semi!();brace!{}let b=dot!{}.field;let c=question!{}?;(nested!());tail!()}',input=authored(source),result=issue(input);retain('02-exact-private-fragment-positions',{input,result});
 assert.deepEqual(result.facts.opaqueInvocations.map(node=>node.fields.path.fields.segments[0]),['alpha','semi','brace','dot','question','nested','tail']);
 assert.deepEqual(result.facts.opaqueInvocations.map(node=>node.fields.position),['Expr','Stmts','Stmts','Expr','Expr','Expr','Expr']);
 for(const node of result.facts.opaqueInvocations){assert.equal(source.slice(node.fields.tree.span.start,node.fields.tree.span.end),node.fields.tree.original);for(const token of node.fields.tree.tokens)assert.equal(source.slice(token.start,token.end),token.text);}
 const pin=JSON.parse(readFileSync(new URL('../source-profiles/namespace-parser/manifest.json',import.meta.url),'utf8')),packed=readFileSync(new URL('../source-profiles/namespace-parser/'+pin.archive,import.meta.url)),raw=gunzipSync(packed,{maxOutputLength:2*1024*1024});assert.equal(packed.length,pin.archiveBytes);assert.equal(hash(packed),pin.archiveSha256);assert.equal(raw.length,pin.bytes);assert.equal(hash(raw),pin.sha256);assert.equal(raw.toString('utf8').includes('fn parse_stmt_mac('),true);retain('02-complete-original-statement-parser',{pin,original:raw.toString('utf8')});const ranges=authored('fn caller(){let all=value[..];let prefix=value[..limit];let suffix=value[1..];let closed=value[1..=limit];let upper=value[..=limit];done!();}'),rangesResult=issue(ranges),operations=rangesResult.facts.ast.fields.body.fields.statements.slice(0,5).map(row=>row.fields.value.fields.index);assert.deepEqual(operations.map(row=>row.fields.operation),['..','..','..','..=','..=']);assert.equal(operations[0].fields.left,null);assert.equal(operations[0].fields.right,null);assert.equal(operations[2].fields.right,null);assert.ok(operations[3].fields.left);assert.ok(operations[3].fields.right);assert.equal(operations[4].fields.left,null);assert.ok(operations[4].fields.right);retain('02-complete-original-range-punctuation',{ranges,rangesResult,operations});
});

test('original type fragments and opaque argument subtrees preserve their exact source without nested invocation promotion',{timeout:60000},()=>{
 const source='fn caller(value:shape!())->result_type!(){let item:local_type!()=outer!{inner!();#[macro_export]macro_rules! hidden{()=>{}}};finish!(item)}',input=authored(source),result=issue(input);retain('03-original-type-and-opaque-inputs',{input,result});
 assert.deepEqual(result.facts.opaqueInvocations.map(node=>[node.fields.path.fields.segments[0],node.fields.position]),[['shape','Ty'],['result_type','Ty'],['local_type','Ty'],['outer','Expr'],['finish','Expr']]);
 const outer=result.facts.opaqueInvocations.find(node=>node.fields.path.fields.segments[0]==='outer');assert.equal(outer.fields.tree.original.includes('inner!();#[macro_export]macro_rules! hidden'),true);assert.equal(result.facts.opaqueInvocations.some(node=>node.fields.path.fields.segments[0]==='inner'),false);
 const supersetInput={module:input.module,dependencies},token=captureOriginalNamespaceSourceSuperset(supersetInput),facts=originalNamespaceSourceSupersetFacts(token,supersetInput);retain('03-whole-source-superset',{facts});
 assert.equal(facts.bangs.find(row=>row.original.startsWith('outer!')).parsedExpansionPosition,true);assert.equal(facts.bangs.find(row=>row.original.startsWith('inner!')).parsedExpansionPosition,false);assert.equal(facts.attributes.some(row=>row.attribute.name==='macro_export'),true);assert.equal(facts.attributeOwnersResolved,false);
});

test('all branches closure bodies local imports and procedural stub attributes remain present with global effects pending',{timeout:60000},()=>{
 const source='fn caller(){#![custom_inner]if false{#[macro_export]macro_rules! exported{()=>{}}}let run=||{use foreign::doc;#[proc_macro_attribute]fn local(){nested!();}inside!();};outside!();}',input=authored(source),result=issue(input);retain('04-whole-local-and-global-obligations',{input,result});
 const text=JSON.stringify(result.facts.ast);for(const fragment of ['MacroDefinition','proc_macro_attribute','foreign','custom_inner','Closure'])assert.equal(text.includes(fragment),true,fragment);
 assert.deepEqual(result.facts.opaqueInvocations.map(node=>node.fields.path.fields.segments[0]),['nested','inside','outside']);
 for(const row of result.positions){assert.equal(row.facts.globalBangComplete,false);assert.equal(row.facts.outerAttributeTransformationsResolved,false);assert.equal(row.facts.enclosingAttributeBindingsUnchanged,false);assert.equal(row.facts.unresolvedGlobalMacroExportKindsRetained,true);}
 noAuthority(result.facts);const definitions=authored('fn caller(){#![first]#[outer]macro_rules! local (()=>{});macro_rules! other [()=>{}];body!();}'),definitionsResult=issue(definitions);assert.equal(definitionsResult.facts.ast.fields.body.fields.innerAttributes.length,1);assert.equal(definitionsResult.facts.ast.fields.body.fields.statements[0].fields.attributes.length,1);retain('04-all-original-definition-delimiters',{definitions,definitionsResult});
});

test('fake cloned foreign private frames positions and public flags cannot manufacture original AST authority',{timeout:60000},()=>{
 const input=authored('fn caller(){emit!();}'),result=issue(input),other=authored(input.module.source);
 for(const token of [{},structuredClone(result.token),{...result.token,namespaceAuthority:true}])assert.throws(()=>originalNamespaceFunctionFacts(token,input),TypeError);
 for(const token of [{},structuredClone(result.positions[0].token)])assert.throws(()=>originalNamespacePositionFacts(token,result.token,input),TypeError);
 const otherResult=issue(other);assert.throws(()=>originalNamespacePositionFacts(result.positions[0].token,otherResult.token,other),TypeError);assert.throws(()=>originalNamespaceFunctionFacts(result.token,other),/association changed/);
 assert.throws(()=>captureOriginalNamespaceFunction({...input,item:structuredClone(input.item)}),/exact original/);
 assert.throws(()=>originalNamespaceFunctionInvocationPosition(result.token,input,result.facts.opaqueInvocations[0]),TypeError);
 for(const [field,value]of [['source',input.module.source+' '],['file','src/other.rs'],['path',['other']],['compilationProfile',null],['sourceView',structuredClone(input.module.sourceView)]]){const saved=input.module[field];input.module[field]=value;assert.throws(()=>originalNamespaceFunctionFacts(result.token,input),TypeError);input.module[field]=saved;assert.equal(originalNamespaceFunctionFacts(result.token,input),result.facts);}
 retain('05-private-copy-and-fresh-source-joins',{input,result,otherResult});
});

test('hostile ingress is descriptor-only before parser source loading and rejects holes or unissued options with zero callbacks',{timeout:5000},async t=>{
 const input=authored('fn caller(){emit!();}');let callbacks=0;const getter=Object.defineProperty({...input},'module',{get(){callbacks++;throw Error('getter');}});assert.throws(()=>captureOriginalNamespaceFunction(getter),TypeError);
 const proxy=new Proxy(input.module,{get(){callbacks++;throw Error('proxy');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');}});assert.throws(()=>captureOriginalNamespaceFunction({...input,module:proxy}),TypeError);
 const hole=[];hole.length=1;hole.unrelated='same key count';assert.throws(()=>captureOriginalNamespaceFunction({...input,module:{...input.module,path:hole}}),TypeError);
 assert.throws(()=>captureOriginalNamespaceFunction({...input,parser:()=>{callbacks++;}}),TypeError);assert.equal(callbacks,0);
 const refusals=[];
 for(const [owner,key]of [[Number,'isSafeInteger'],[Object.prototype,'9000001']]){
  const prior=Object.getOwnPropertyDescriptor(owner,key);let error;try{Object.defineProperty(owner,key,key==='9000001'?{get(){callbacks++;throw Error('numeric prototype getter');},configurable:true}:{value:function(){callbacks++;throw Error('number observer');},writable:true,configurable:true});try{captureOriginalNamespaceFunction(input);}catch(cause){error=cause;}}finally{if(prior)Object.defineProperty(owner,key,prior);else delete owner[key];}assert.ok(error instanceof TypeError);refusals.push({key,name:error.name,message:error.message});assert.equal(callbacks,0);
 }
 const cold=[],directory=mkdtempSync(join(tmpdir(),'router-namespace-parser-cold-')),completeParserSource=read('tools/translation/original-namespace-parser.mjs'),origin=new URL('../original-namespace-parser.mjs',import.meta.url),relocations=[];t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const relocated=completeParserSource.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(_whole,quote,path)=>{const target=new URL(path,origin).href;relocations.push({path,target});return 'from '+quote+target+quote;});
 const copies=new Map();for(const name of ['Number','String']){const path=join(directory,name+'.mjs');writeFileSync(path,relocated);copies.set(name,pathToFileURL(path).href);}
 for(const name of ['Number','String']){
  const prior=Object.getOwnPropertyDescriptor(globalThis,name),value=globalThis[name];let module,error;try{Object.defineProperty(globalThis,name,{value:new Proxy(value,{getOwnPropertyDescriptor(){callbacks++;throw Error('feature owner descriptor');},ownKeys(){callbacks++;throw Error('feature owner keys');}}),writable:true,configurable:true});module=await import(copies.get(name));try{module.captureOriginalNamespaceFunction(input);}catch(cause){error=cause;}}finally{Object.defineProperty(globalThis,name,prior);}assert.notEqual(module.captureOriginalNamespaceFunction,captureOriginalNamespaceFunction,'actual fresh leaf issuer');assert.ok(error instanceof TypeError);assert.match(error.message,/native parser operations unavailable/);assert.equal(callbacks,0);cold.push({name,error:{name:error.name,message:error.message}});
 }
 retain('06-zero-callback-ingress',{input,callbacks,refusals,cold,completeParserSource,relocated,relocations,copies:[...copies],scope:'fresh physical leaf copies share the active common issuers; whole bootstrap equivalence is not claimed'});
});

test('root item macros malformed partial grammar opaque patterns and escaped outer imports cannot acquire position authority',{timeout:60000},()=>{
 const root='emit!();fn caller(){body!();}use foreign::doc;',input=authored(root),result=issue(input),supersetInput={module:input.module,dependencies},token=captureOriginalNamespaceSourceSuperset(supersetInput),facts=originalNamespaceSourceSupersetFacts(token,supersetInput);
 const item=originalSourceModuleItems(input.module).find(item=>item!==input.item&&item.term!=='use');assert.ok(item);assert.throws(()=>captureOriginalNamespaceFunction({...input,item}),/not an original function/);assert.equal(facts.bangs.find(row=>row.original==='emit!()').parsedExpansionPosition,false);assert.equal(facts.declarations.some(row=>row.imports.some(import_=>import_.name==='doc')),true);assert.equal(facts.attributeOwnersResolved,false);
 const refused=[];for(const source of ['fn caller(){let x=1; leftover leftover;}','fn caller(){match value{pat!()=>true}}','fn caller(){const X:u8=1;}', 'fn caller(){let x=async{body!()};}', 'fn caller(value){emit!();}', 'fn caller(&self){emit!();}', 'fn caller(){fn nested(&self){emit!();}}', 'fn caller();', 'impl Owner{fn caller();}', 'fn caller(){let x=value[];}', 'fn caller(){let x=..=;}', 'fn caller(){let x=1..=;}', "fn caller(){let x='a;}", "fn caller(){return 'label 1;}", 'fn caller(#![bad] value:u8){emit!();}', 'fn caller(){let x=1;#![bad]emit!();}', 'fn caller(){macro_rules! local (()=>{}) emit!();}', 'fn caller(){macro_rules! local [()=>{}] emit!();}', 'impl Owner{fn caller(::self){emit!();}}', 'impl Owner{fn caller(::self:Self){emit!();}}', "fn caller(value:&' u8){emit!();}", "fn caller(){break ';}", 'fn caller(){let x=value[..=];}', 'fn caller(){let x=value[. .];}']){const base=authored(source,source.startsWith('impl ')?null:'caller'),input=source.startsWith('impl ')?{...base,memberIndex:0}:base;let error;assert.throws(()=>{try{captureOriginalNamespaceFunction(input);}catch(cause){error={name:cause.name,message:cause.message};throw cause;}},TypeError);refused.push({source,error});}
 retain('07-full-refused-source-and-outer-obligations',{input,result,facts,refused});assert.equal(refused.length,24);
});

test('identical spelling in distinct original occurrences binds distinct AST nodes and full member header attributes cannot substitute a fake member',{timeout:60000},()=>{
 const input=authored('fn caller(){same!();same!();}'),result=issue(input);assert.equal(result.positions.length,2);assert.notEqual(result.facts.opaqueInvocations[0],result.facts.opaqueInvocations[1]);assert.notDeepEqual(result.facts.opaqueInvocations[0].span,result.facts.opaqueInvocations[1].span);assert.notEqual(result.positions[0].token,result.positions[1].token);
 const source='#[doc=hidden!{fn fake(){wrong!();}}]trait Owner{fn actual(){right!();}}',base=authored(source,'Owner'),members=originalNamespaceFunctionMembers({module:base.module,item:base.item});assert.deepEqual(members.map(member=>member.name),['actual']);const actual=issue({...base,memberIndex:0});assert.deepEqual(actual.facts.opaqueInvocations.map(node=>node.fields.path.fields.segments[0]),['right']);assert.equal(actual.facts.source.original.includes('fake'),false);const generic=authored('fn caller(value:Outer<first!()>::Inner<second!()>){consume!(value);}'),genericResult=issue(generic),type=genericResult.facts.ast.fields.parameters[0].fields.type;assert.deepEqual(type.fields.segments,['Outer','Inner']);assert.equal(type.fields.segmentArguments.length,2);assert.deepEqual(type.fields.segmentArguments.map(args=>args.fields.values[0].fields.path.fields.segments[0]),['first','second']);assert.deepEqual(genericResult.facts.opaqueInvocations.map(node=>node.fields.path.fields.segments[0]),['first','second','consume']);
 const receiver=authored("trait Owner{fn caller(&'a self);}",'Owner'),receiverResult=issue({...receiver,memberIndex:0});assert.equal(receiverResult.facts.ast.fields.parameters[0].fields.pattern.fields.lifetime.fields.original,"'a");assert.equal(receiverResult.facts.ast.fields.body,null);
 retain('08-distinct-original-positions-and-parent-attributes',{input,result,base,members,actual,generic,genericResult,receiver,receiverResult});
});

test('private source-only function AST never substitutes for ordinary checked meta JS strictTS or caller namespace proof',{timeout:60000},async()=>{
 const source='pub fn caller(value:i32)->bool{value>=0}',input=authored(source),result=issue(input),translation=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});retain('09-full-independent-ordinary-targets',{input,result,translation});noAuthority(result.facts);assert.equal(translation.meta.executable.some(row=>row.name==='caller'),true);const observations=[];
 try{await verifyTypedTargets(translation,api=>{const actual=[api.caller(-1n),api.caller(0n),api.caller(1n)];assert.deepEqual(actual,[false,true,true]);observations.push(actual);},{childTimeoutMs:20000});}finally{retain('09-complete-target-observations',observations);}
 assert.equal(observations.length,2);assert.equal(result.facts.opaqueInvocations.length,0);assert.throws(()=>originalNamespaceFunctionInvocationPosition(result.token,input,0),TypeError);
});
