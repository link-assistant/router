// Complete method digest adoption receiving; source DATA never grants authority.
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {createHash,Hash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {METHOD_METADATA_DIGEST_SOURCE_PATHS,proposeMethodMetadataDigestSources,restoreMethodMetadataDigestSources} from '../migrate-private-metadata-digests.mjs';
import {metadataDigest,metadataDigestWithPrivateAssignments,metadataDigestForInternalSources,copyMetadata} from '../extensions/source-links.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createMatchesMacroContext} from '../matches-macro-context.mjs';
import {translateProject} from '../project.mjs';
import {originalMethodValidationIntrinsicsUnchanged} from '../source-method-validation.mjs';
import {originalFlatTokenIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {associatedOriginalParentInputs,associatedOriginalDependencyInputs} from './associated-original-context.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),base=new URL('../',import.meta.url),get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,json=JSON.stringify;
const rules=[
 {path:METHOD_METADATA_DIGEST_SOURCE_PATHS[0],before:"import {copyMetadata,metadataDigestWithPrivateAssignments as metadataDigest} from './extensions/source-links.mjs';",after:"import {copyMetadata,metadataDigestForInternalSources as metadataDigest} from './extensions/source-links.mjs';"},
 {path:METHOD_METADATA_DIGEST_SOURCE_PATHS[1],before:"import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';",after:"import {copyMetadata,metadataDigestForInternalSources as metadataDigest} from './extensions/source-links.mjs';"},
];
const hash=value=>createHash('sha256').update(value).digest('hex');
function test(name,run){testCase(name,{timeout:60000},async t=>{const vectors=[],retain=(label,value)=>{vectors.push({label,value});return value;};try{await run(t,retain);}finally{const folder=process.env.ROUTER_METHOD_DIGEST_ADOPTION_VECTOR_DIR;if(folder){mkdirSync(folder,{recursive:true});writeJsonGzip(join(folder,Buffer.from(name).toString('hex')+'.json.gz'),{name,vectors},(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);}}});}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function sources(){return Object.fromEntries(METHOD_METADATA_DIGEST_SOURCE_PATHS.map(path=>[path,readFileSync(new URL(path,root),'utf8')]));}
function originalSources(current){return Object.fromEntries(rules.map(rule=>{const source=current[rule.path];assert.equal(source.split(rule.after).length,2);return [rule.path,source.replace(rule.after,rule.before)];}));}
async function copies(t,retain){
 const current=sources(),before=originalSources(current),proposal=proposeMethodMetadataDigestSources(before);assert.deepEqual(Object.fromEntries(proposal.rows.map(row=>[row.file,row.after.source])),current);assert.deepEqual({...restoreMethodMetadataDigestSources(current)},before);
 const folder=mkdtempSync(join(tmpdir(),'router-method-digest-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const pairs={};
 for(const [side,input]of Object.entries({before,current})){
  const modules={};for(const [index,path]of METHOD_METADATA_DIGEST_SOURCE_PATHS.entries()){
   const source=input[path],edits=[],relocated=source.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/g,(whole,prefix,quote,relative)=>{const after=prefix+quote+new URL(relative,base).href+quote;edits.push({before:whole,after});return after;});let inverse=relocated;for(const edit of [...edits].reverse()){assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,edit.before);}assert.equal(inverse,source);assert.equal(source.includes('import.meta'),false);const file=join(folder,side+'-'+index+'.mjs');writeFileSync(file,relocated);assert.equal(readFileSync(file,'utf8'),relocated);modules[index===0?'validation':'transforms']=await import(pathToFileURL(file).href);retain('complete-'+side+'-'+index,{path,source,relocated,edits,inverse});
  }pairs[side]=modules;
 }
 retain('full-two-phase-source-proposal',proposal);return pairs;
}
function observed(run,onUpdate){
 const update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),calls=[];let result;
 try{define(Hash.prototype,'update',{...update,value(...args){const row={operation:'update',arguments:args.map(value=>typeof value==='string'?value:{base64:Buffer.from(value).toString('base64')}),types:args.map(value=>typeof value)};calls.push(row);const value=apply(update.value,this,args);row.sameReceiver=value===this;onUpdate?.(args);return value;}});define(Hash.prototype,'digest',{...digest,value(...args){const value=apply(digest.value,this,args);calls.push({operation:'digest',arguments:args,value:typeof value==='string'?value:{base64:Buffer.from(value).toString('base64')}});return value;}});result=outcome(run);}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}return {result,calls};
}
function fixture(api,source='pub struct Counter{value:u8}impl Counter{pub fn read(&self)->u8{self.value}}'){
 const sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}).views[0],context=createMatchesMacroContext({modules:[{file:'src/lib.rs',path:[],source,sourceView}]}),method=extractImplDeclarations(source,{sourcePath:'src/lib.rs',sourceView}).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate',...method.typePath]),transform=api.createOriginalMethodTokenTransform(context,method,lowered),tokens=api.originalMethodParserTokens(transform);return {source,context,method,lowered,transform,tokens};
}
function tokenFacts(value){return {source:value.source,sourcePath:value.sourcePath,modulePath:value.modulePath,originalMemberSpan:value.originalMemberSpan,originalBodySpan:value.originalBodySpan,transform:copyMetadata(value.transform)};}
function split(tokens){let count=0;for(let index=0;index<tokens.length;index++){const token=tokens[index];if(token.value==='&&'){tokens.splice(index,1,{...token,value:'&',end:token.start+1},{...token,value:'&',start:token.start+1});index++;count++;}}return count;}
function assertDigestPair(retain,label,value){const old=observed(()=>metadataDigestWithPrivateAssignments(value)),current=observed(()=>metadataDigestForInternalSources(value));retain(label,{value,old,current});assert.deepEqual(current,old);assert.equal(current.result.value,metadataDigest(value));}

test('two fixed import substitutions preserve complete CST inverses and all old production bodies',async(_t,retain)=>{
 const current=sources(),before=originalSources(current),proposal=proposeMethodMetadataDigestSources(before);retain('complete-current-and-before',{current,before,proposal});assert.equal(proposal.schema,'method-metadata-digest-source-proposal-v1');assert.deepEqual(proposal.authority,{source:false,owner:false,type:false,executable:false});assert.equal(proposal.semanticChecksPassed,false);assert.equal(proposal.installApproved,false);assert.deepEqual(proposal.selectedSyntaxSites,{validationFallbackDigestExpressions:3,transformDigestExpressions:5,directCopyExpressionsChanged:0});
 for(const row of proposal.rows){const rule=rules.find(rule=>rule.path===row.file);assert.equal(row.before.source,before[row.file]);assert.equal(row.intermediate.source,row.before.source);assert.equal(row.after.source,current[row.file]);assert.equal(row.before.source.replace(rule.before,rule.after),row.after.source);assert.equal(row.after.source.replace(rule.after,rule.before),row.before.source);for(const phase of row.stages){assert.equal(transportConcreteSyntaxMeta(phase.before.meta).source,phase.before.source);assert.equal(transportConcreteSyntaxMeta(phase.after.meta).source,phase.after.source);assert.equal(phase.completeInverse,true);}assert.deepEqual(row.trace.map(entry=>entry.phase),['language','repository']);}
 assert.deepEqual({...restoreMethodMetadataDigestSources(current)},before);
 let reads=0;for(const input of [{}, {...before,extra:'x'},Object.defineProperty({...before},rules[0].path,{enumerable:true,get(){reads++;throw Error('must not read');}}),new Proxy(before,{get(){reads++;throw Error('must not read');}})])assert.throws(()=>proposeMethodMetadataDigestSources(input),TypeError);assert.equal(reads,0);
 for(const rule of rules){for(const change of [source=>source+'\n'+rule.before,source=>source.replace(rule.before,rule.after),source=>source.replace(rule.before,'')]){const altered={...before,[rule.path]:change(before[rule.path])};retain('refused-source-anchor',{path:rule.path,altered});assert.throws(()=>proposeMethodMetadataDigestSources(altered),TypeError);}}
 const oldTool=readFileSync(new URL('migrate-private-metadata-digests.mjs',base),'utf8').split('// Fixed method adoption DATA.')[0];assert.ok(oldTool.includes('export function proposePrivateMetadataDigestSources(input)'));assert.ok(oldTool.includes('export function restorePrivateMetadataDigestSources(input)'));
});

test('actual validation capture disabled missing and changed-token paths retain full canonical Hash calls',async(t,retain)=>{
 const pair=await copies(t,retain),value={child:Object.freeze({text:'λ😀\ud800',integer:7n}),copyCertificate:{z:'last',a:'first'}};
 for(const side of ['before','current']){const api=pair[side].validation;retain(side+'-runtime',api.originalMethodValidationRuntimeFacts());if(process.versions.bun)assert.equal(api.originalMethodValidationIntrinsicsUnchanged(),true);}
 const trials=api=>{
  const a=observed(()=>{const value=api.captureOriginalMethodValidation(null);return {digest:value.digest,active:value.capture!==null};});
  const b=observed(()=>api.originalMethodValidationDigest(value,null));
  const c=observed(()=>{const issued=api.captureOriginalMethodValidation(value);value.mutable='changed';return api.originalMethodValidationDigest(value,issued.capture);});delete value.mutable;
  const previous=get(Object,'freeze');let d;try{define(Object,'freeze',{...previous,value(value){return apply(previous.value,this,[value]);}});d=observed(()=>api.originalMethodValidationDigest(value,{}));}finally{define(Object,'freeze',previous);}
  return {a,b,c,d,storage:api.originalMethodValidationStorageFacts()};
 };
 const old=trials(pair.before.validation),current=trials(pair.current.validation);retain('complete-fallback-old-new',{old,current});for(const label of ['a','b','c','d'])assert.deepEqual(current[label],old[label]);assert.equal(current.a.result.value.digest,metadataDigest(null));assert.equal(current.b.result.value,metadataDigest(value));
});

test('genuine transform issuers preserve complete source owner and token digests while copied states refuse',async(t,retain)=>{
 const pair=await copies(t,retain),rows={};for(const side of ['before','current']){
  const api=pair[side].transforms,row=fixture(api),facts=api.originalMethodTransformFacts(row.transform);assert.strictEqual(facts.method,row.method);assert.strictEqual(facts.lowered,row.lowered);assert.equal(facts.proof.transformedTokenDigest,metadataDigest(row.lowered.tokens));assert.deepEqual(api.originalMethodTokenTransformSnapshot(row.transform),copyMetadata(row.transform));assert.throws(()=>api.originalMethodTransformFacts({...row.transform}),/unsealed|copied/);assert.throws(()=>api.originalMethodParserTokenFacts([...row.tokens]),/copied|unissued/);rows[side]={source:row.source,method:copyMetadata(row.method),lowered:copyMetadata(row.lowered),proof:copyMetadata(row.transform),facts:tokenFacts(api.originalMethodParserTokenFacts(row.tokens))};
  row.lowered.tokens[0].value='mutated';const refusal=outcome(()=>api.originalMethodTransformFacts(row.transform));retain(side+'-stale-lowered-stream',refusal);assert.equal(refusal.error.name,'TypeError');
 }retain('complete-original-methods',{rows});assert.deepEqual(rows.current,rows.before);
});

test('ordinary split and grouped issued token streams retain exact checks hashes and malformed refusals',async(t,retain)=>{
 const pair=await copies(t,retain),source='pub struct Counter{value:u8}impl Counter{pub fn read(&self,v:&&u8)->u8{self.value}}',rows={};
 for(const side of ['before','current']){
  const api=pair[side].transforms,row=fixture(api,source);assert.equal(split(row.tokens),1);const ordinary=observed(()=>tokenFacts(api.originalMethodParserTokenFacts(row.tokens))),grouped=observed(()=>tokenFacts(api.originalMethodParserTokenFactsGrouped(row.tokens)));assert.deepEqual(grouped.result,ordinary.result);rows[side]={ordinary,grouped,source,tokens:copyMetadata(row.tokens)};
  for(const [name,change]of [['span',tokens=>{tokens[0].start++;}],['field',tokens=>{tokens[0].unexpected='x';}],['missing',tokens=>{tokens.pop();}],['extra',tokens=>{tokens.push({...tokens[0]});}],['sparse',tokens=>{delete tokens[0];}],['budget',tokens=>{tokens[0].text='x'.repeat(4194305);}]]){const fresh=fixture(api,source);change(fresh.tokens);const old=outcome(()=>api.originalMethodParserTokenFacts(fresh.tokens)),current=outcome(()=>api.originalMethodParserTokenFactsGrouped(fresh.tokens));retain(side+'-malformed-'+name,{source,tokens:fresh.tokens,old,current});assert.equal(old.error.name,'TypeError');assert.equal(current.error.name,'TypeError');}
 }retain('complete-token-reader-Hash-tapes',{rows});assert.deepEqual(rows.current,rows.before);
 const eligible=()=>originalMethodValidationIntrinsicsUnchanged()&&originalFlatTokenIntrinsicsUnchanged();
 for(const phase of ['before-prefix','after-prefix']){
  const trial=grouped=>{const api=pair.current.transforms,row=fixture(api),previous=get(Object,'freeze');let changed=false,result;const change=()=>{if(!changed){changed=true;define(Object,'freeze',{...previous,value(value){return apply(previous.value,this,[value]);}});}};
   try{if(phase==='before-prefix')change();result=observed(()=>tokenFacts(grouped?api.originalMethodParserTokenFactsGrouped(row.tokens):api.originalMethodParserTokenFacts(row.tokens)),()=>{if(phase==='after-prefix')change();});}finally{define(Object,'freeze',previous);}return {result,changed};};
  const old=trial(false),current=trial(true);retain('exact-old-prefix-tail-guard-drift-'+phase,{old,current});assert.equal(current.changed,true);assert.deepEqual(current,old);
 }
 if(eligible()){
  const api=pair.current.transforms,row=fixture(api),previous=get(Object,'freeze'),observations=[];let armed=false,result;
  try{result=observed(()=>api.originalMethodParserTokenFactsGrouped(row.tokens),()=>{const rawStack=String(new Error().stack),frames=rawStack.split('\n').filter(line=>/^\s*at(?:\s|$)/u.test(line)).map(line=>/^\s*at ([A-Za-z_$][A-Za-z0-9_$]*) \(.+:[0-9]+:[0-9]+\)$/u.exec(line)?.[1]??null),at=frames.indexOf('hash');let next=at+1;if(frames[next]==='metadataDigest')next++;if(!armed&&at>=0&&frames[next]==='originalMethodParserTokenFactsGrouped'){armed=true;observations.push({rawStack,frames});define(Object,'freeze',{...previous,value(value){return apply(previous.value,this,[value]);}});}});}finally{define(Object,'freeze',previous);}
  retain('actual-group-Hash-callback-then-native-drift',{armed,result,observations});assert.equal(armed,true);assert.deepEqual(result.result.error,{name:'TypeError',message:'Original method grouped token validation native operations changed'});
 }else retain('actual-group-guard-ineligible',{eligible:false,notArtificiallyEnabled:true});
});

test('Buffer-driven receiver create and descriptor mutations preserve old callback tape and privacy loss',async(_t,retain)=>{
 for(const mode of ['create-wrapper','define-wrapper','create-getter','define-nonfunction','rebind-Object']){
  const trial=selected=>{const buffer=get(Buffer,'byteLength'),create=get(Object,'create'),def=get(Object,'defineProperty'),object=get(globalThis,'Object'),tape=[];let mutated=false,result;
   try{define(Buffer,'byteLength',{...buffer,value(value,...rest){tape.push(['buffer',value]);if(!mutated){mutated=true;if(mode==='create-wrapper')define(Object,'create',{...create,value(...args){tape.push(['create',args.length]);return apply(create.value,this,args);}});if(mode==='define-wrapper')define(Object,'defineProperty',{...def,value(...args){tape.push(['define',args[1]]);return apply(def.value,this,args);}});if(mode==='create-getter')define(Object,'create',{configurable:true,get(){tape.push(['create-getter']);return create.value;}});if(mode==='define-nonfunction')define(Object,'defineProperty',{...def,value:3});if(mode==='rebind-Object')define(globalThis,'Object',{...object,value:new Proxy(object.value,{get(target,key,receiver){tape.push(['Object-get',String(key)]);return Reflect.get(target,key,receiver);}})});}return apply(buffer.value,this,[value,...rest]);}});result=outcome(()=>selected({a:'first',b:{x:'child'},c:'last'}));}
   finally{define(globalThis,'Object',object);define(Object,'create',create);define(Object,'defineProperty',def);define(Buffer,'byteLength',buffer);}return {result,tape};};
  const old=trial(metadataDigestWithPrivateAssignments),current=trial(metadataDigestForInternalSources);retain(mode,{old,current});assert.deepEqual(current,old);
 }
});

test('default inherited descriptor hooks and original direct copies preserve quotas aliases and ordering',async(_t,retain)=>{
 const value={a:'λ',b:{text:'second'},copyCertificate:{z:'last',a:'first'}},trials=[];
 for(const key of ['cells','bytes','get','set']){
  const trial=selected=>{const previous=get(Object.prototype,key),tape=[];let result;try{define(Object.prototype,key,{__proto__:null,configurable:true,get(){tape.push(key);return key==='cells'?200000:key==='bytes'?4194304:undefined;}});result=outcome(()=>selected(value));}finally{if(previous)define(Object.prototype,key,previous);else delete Object.prototype[key];}return {result,tape};};const old=trial(metadataDigestWithPrivateAssignments),current=trial(metadataDigestForInternalSources);trials.push({key,old,current});assert.deepEqual(current,old);
 }retain('full-inherited-option-descriptor-observations',trials);
 assertDigestPair(retain,'complete-alias-UTF16-order',{a:value,b:value,nil:null,omitted:undefined,integer:5n,text:'\u0000😀\ud800'});
 const ordered=copyMetadata(value,{preserveKeyOrder:true});assert.deepEqual(Reflect.ownKeys(ordered),Reflect.ownKeys(value));assert.deepEqual(Reflect.ownKeys(copyMetadata(value).copyCertificate),['z','a']);
 for(const bad of [[,1],Object.assign([1],{extra:2}),new Map(),new Set(),new Proxy({},{get(){throw Error('not read');}}),{x:1.5}]){const old=outcome(()=>metadataDigestWithPrivateAssignments(bad)),current=outcome(()=>metadataDigestForInternalSources(bad));retain('unqualified-data',{old,current});assert.deepEqual(current,old);assert.equal(current.error.name,'TypeError');}
 let deep=0;for(let at=0;at<162;at++)deep={child:deep};const old=outcome(()=>metadataDigestWithPrivateAssignments(deep)),current=outcome(()=>metadataDigestForInternalSources(deep));retain('depth-overflow',{old,current});assert.deepEqual(current,old);
});

function stackOrder(raw){
 const orderedFrames=raw.split('\n').filter(line=>/^\s*at(?:\s|$)/u.test(line)).map(rawLine=>{const match=/^\s*at ([A-Za-z_$][A-Za-z0-9_$]*) \(.+:[0-9]+:[0-9]+\)$/u.exec(rawLine);return {rawLine,name:match?.[1]??null};});
 const at=orderedFrames.findIndex(row=>row.name==='hash');if(at<0)return {orderedFrames,mode:'missing-hash'};const next=orderedFrames[at+1]?.name;
 return {orderedFrames,mode:next==='metadataDigest'&&orderedFrames[at+2]?.name==='observeHashFrames'?'named':next==='observeHashFrames'?'native-inline':'unexpected'};
}
function observeHashFrames(selected){const previous=get(Hash.prototype,'update'),errors=[];let result;try{define(Hash.prototype,'update',{...previous,value(...args){errors.push(new Error());return apply(previous.value,this,args);}});result=selected({a:'λ',b:3n});}finally{define(Hash.prototype,'update',previous);}return {result,observations:errors.map(error=>{const rawStack=String(error.stack);return {rawStack,...stackOrder(rawStack)};})};}
test('Hash frame and JSON-expression contract changes remain explicit with complete raw observations',async(_t,retain)=>{
 const old=observeHashFrames(metadataDigest),current=observeHashFrames(metadataDigestForInternalSources);retain('complete-promised-Hash-frame-contract',{old,current});assert.equal(current.result,old.result);for(const row of [...old.observations,...current.observations])assert.ok(['named','native-inline'].includes(row.mode));
 for(const example of ['Error\n at hash (/a:1:1)\n at metadataDigest (/a:2:2)\n at observeHashFrames (/a:3:3)','Error\n at hash (/a:1:1)\n at observeHashFrames (/a:3:3)','Error\n at hash (/a:1:1)\n at unexpected [as wrapper] (/a:2:2)\n at observeHashFrames (/a:3:3)']){const row=stackOrder(example);retain('independent-stack-example',{example,row});assert.equal(row.orderedFrames.length,example.split('\n').length-1);}assert.equal(stackOrder('Error\n at hash (/a:1:1)\n at unexpected [as wrapper] (/a:2:2)\n at observeHashFrames (/a:3:3)').mode,'unexpected');
 const stringify=get(JSON,'stringify'),trials=[];for(const selected of [metadataDigestWithPrivateAssignments,metadataDigestForInternalSources]){let result;try{define(JSON,'stringify',{...stringify,value:3});result=outcome(()=>selected({a:'λ'}));}finally{define(JSON,'stringify',stringify);}trials.push(result);}retain('explicit-645-to647-native-expression-contract',{trials,messagesNotNormalized:true,validationContractChanged:true});for(const row of trials)assert.equal(row.error.name,'TypeError');
 const trial=selected=>{const tape=[],previous=get(JSON,'stringify');let result;try{define(JSON,'stringify',{...previous,value:function(...args){tape.push({sameReceiver:this===JSON,arguments:args.map(value=>typeof value)});throw new TypeError('independent JSON callback');}});result=outcome(()=>selected({a:'λ'}));}finally{define(JSON,'stringify',previous);}return {result,tape};};const a=trial(metadataDigestWithPrivateAssignments),b=trial(metadataDigestForInternalSources);retain('actual-JSON-callback-order',{a,b});assert.deepEqual(b,a);
});

function exposeMethods(result,names){
 const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),aliases=names.map(([owner,name,alias])=>{assert.ok(result.meta.checkedMethods.some(row=>row.name===owner+'.'+name));const entry=[...target.declarations.values()].find(row=>row.impl?.method===name);assert.ok(entry);return entry.name+' as '+alias;}),suffix='\nexport {'+aliases.join(',')+'};';return {...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix};
}
test('complete original provider and affinity parents retain independent checked and strict behavior',async(_t,retain)=>{
 const data=associatedOriginalParentInputs('derive-helper-originals.test.mjs'),dependencies=loadDeriveDependencyProof(associatedOriginalDependencyInputs(data)),rows=[];
 for(const path of ['src/provider_acceptance.rs','src/response_affinity.rs']){
  const source=data.source(path),concrete=transportConcreteSyntaxSource(source,{language:'Rust'}),result=translateProject({entry:path,paths:[path],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});rows.push({path,source,concrete,result});
  retain('complete-original-parent-'+path,{path,source,concrete,result});assert.equal(concrete.source,source);assert.equal(result.meta.runtimeParity,false);assert.ok(result.meta.refused.length);
  if(path.endsWith('provider_acceptance.rs'))await verifyTypedTargets(exposeMethods(result,[['ProviderProvisionFailure','kind','originalKind']]),(_api,_result,module)=>{for(const name of ['InvalidCandidate','CredentialRejected','RateLimited','Unverified','PersistenceUncertain']){const kind=Object.freeze({$:name});assert.strictEqual(module.originalKind(Object.freeze({$:'ProviderProvisionFailure',kind,message:'fixture'})),kind);}assert.throws(()=>module.originalKind(Object.freeze({$:'ProviderProvisionFailure',kind:Object.freeze({$:'Invented'}),message:'fixture'})),TypeError);},{childTimeoutMs:20000});
  else await verifyTypedTargets(exposeMethods(result,[['ResponseNamespace','from_path','originalResponseNamespace'],['ResponseNamespace','conversations_from_path','originalConversationNamespaces']]),(_api,_result,module)=>{
   for(const [prefix,name]of [['/api/services/openai/v1/responses','OpenAiResponses'],['/api/services/codex/v1/responses','CodexResponses'],['/api/services/qwen/v1/responses','QwenResponses'],['/api/services/openai/v1/chat/completions','OpenAiChat'],['/api/services/codex/v1/chat/completions','CodexChat'],['/api/services/qwen/v1/chat/completions','QwenChat']])for(const suffix of ['','/res_1','?stream=true','XYZ/🧪'])assert.deepEqual(module.originalResponseNamespace(prefix+suffix),Object.freeze({$:'Some',field0:Object.freeze({$:name})}));
   for(const path of ['','/v1/responses','/api/services/anthropic/v1/responses','/api/services/OpenAI/v1/responses','/api/services/openai/v1/response'])assert.deepEqual(module.originalResponseNamespace(path),Object.freeze({$:'None'}));
   for(const [prefix,name,items]of [['/api/services/openai/v1/conversations','OpenAiConversations','OpenAiConversationItems'],['/api/services/codex/v1/conversations','CodexConversations','CodexConversationItems'],['/api/services/qwen/v1/conversations','QwenConversations','QwenConversationItems']])for(const suffix of ['','/conv_1/items','?limit=2','Anything/🧪'])assert.deepEqual(module.originalConversationNamespaces(prefix+suffix),Object.freeze({$:'Some',field0:Object.freeze({$:'Tuple',field0:Object.freeze({$:name}),field1:Object.freeze({$:items})})}));
   let reads=0;const hostile=new Proxy(Object.create(null),{get(){reads++;throw Error('must not inspect');}});for(const fn of [module.originalResponseNamespace,module.originalConversationNamespaces])for(const value of [null,0,[],Object.freeze({$:'None'}),hostile])assert.throws(()=>fn(value),TypeError);assert.equal(reads,0);
  },{childTimeoutMs:20000});
 }
 retain('complete-both-originals',{rows});
});
