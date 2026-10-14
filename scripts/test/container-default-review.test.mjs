import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {reviewGeneratedMethods} from '../review-translation-draft.mjs';
import {translateProject} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../../tools/translation/json-macro-inputs.mjs';
import {parseProgram} from '../../tools/translation/semantic-meta.mjs';
import {verifyTypedTargets} from '../../tools/translation/test/typed-targets.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
const root=new URL('../../',import.meta.url),read=name=>execFileSync('git',['show','HEAD:'+name],{cwd:root,timeout:30000,maxBuffer:16*1024*1024}).toString(),inputs={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},dependencies=loadDeriveDependencyProof(inputs),jsonMacroDependencies=loadJsonMacroSourceProof(inputs);
function vector(name,value){if(!process.env.ROUTER_CONTAINER_REVIEW_VECTORS)return;mkdirSync(process.env.ROUTER_CONTAINER_REVIEW_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_CONTAINER_REVIEW_VECTORS+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}
function compile(source,file='src/lib.rs'){const result=translateProject({entry:file,paths:[file],readSource:()=>source,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});return {source,file,result,meta:JSON.parse(JSON.stringify(result.meta))};}
function review(fixture,meta=fixture.meta){return reviewGeneratedMethods(meta,{entry:fixture.file,checkedGeneratedMethods:fixture.meta.checkedGeneratedMethods.length},{readSource:()=>fixture.source,dependencies,jsonMacroDependencies});}
for(const [file,names]of [['src/admin.rs',['ClaimFile.default']],['src/metrics.rs',['TokenUsage.default']],['src/admin_api.rs',['TtlRequest.default']],['src/oauth.rs',['ClaudeCredentials.default','OAuthBlock.default']]])test('independent complete original container Default review '+file,{timeout:60000},async()=>{
 const fixture=compile(read(file),file);vector(file.replaceAll('/','_'),fixture);let reviewed;try{reviewed=review(fixture);}catch(error){vector("error-"+file.replaceAll("/","_"),{error:{message:error.message,stack:error.stack,cause:error.cause}});throw error;}for(const name of names){const item=reviewed.find(row=>row.name===name);assert.ok(item,name);assert.equal(item.originalDeclarationTerm,'struct');assert.equal(item.semanticAuthority,false);assert.equal(item.runtimeParity,false);assert.equal(item.defaultSourceProof.schema,'original-generated-container-default-ir-v1');}vector('reviewed-'+file.replaceAll('/','_'),reviewed);
 const goldens={'ClaimFile.default':{$:'ClaimFile',token_sha256:'',token_id:'',ttl_hours:0n,claimed_at:0n},'TokenUsage.default':{$:'TokenUsage',label:'',requests:0n},'TtlRequest.default':{$:'TtlRequest',ttl_hours:{$:'None'}},'ClaudeCredentials.default':{$:'ClaudeCredentials',access_token:{$:'None'},oauth_token:{$:'None'},refresh_token:{$:'None'},expires_at:{$:'None'},claude_ai_oauth:{$:'None'}},'OAuthBlock.default':{$:'OAuthBlock',access_token:{$:'None'},oauth_token:{$:'None'},refresh_token:{$:'None'},expires_at:{$:'None'}}};
 let javascript=fixture.result.javascript,typescript=fixture.result.typescript;for(const [index,name]of names.entries()){const method=reviewed.find(item=>item.name===name);javascript+='\nexport {'+method.targetName+' as default'+index+'};';typescript+='\nexport {'+method.targetName+' as default'+index+'};';}
 await verifyTypedTargets({...fixture.result,javascript,typescript},(_api,_result,module)=>{for(const [index,name]of names.entries()){const first=module['default'+index]();assert.deepEqual(first,goldens[name]);assert.notStrictEqual(first,module['default'+index]());}},{childTimeoutMs:20000});
});
const synthetic='#[derive(Default)]pub struct Payload{text:String,maybe:Option<Vec<u8>>,values:Vec<Option<String>>,enabled:bool}pub fn make()->Payload{Payload::default()}';
let original;
function syntheticFixture(){original??=compile(synthetic);return original;}
const generated=meta=>meta.checkedGeneratedMethods[0];
const checked=meta=>meta.checkedSemanticProgram.program.declarations.$map.find(([,value])=>value.impl?.defaultSourceProof)[1];
const flattened=meta=>meta.targetSemanticProgram.program.declarations.$map.find(([,value])=>value.impl?.defaultSourceProof)[1];
function mirrored(meta,change){for(const proof of [generated(meta).defaultSourceProof,checked(meta).impl.defaultSourceProof,flattened(meta).impl.defaultSourceProof])change(proof);}
test('independently reparsed nested container layouts retain zero-argument owned results',{timeout:60000},()=>{const fixture=syntheticFixture(),rows=review(fixture);assert.equal(rows.length,1);assert.equal(rows[0].name,'Payload.default');assert.deepEqual(rows[0].defaultSourceProof.fields.map(field=>field.field),['text','maybe','values','enabled']);vector('nested-genuine',{fixture,rows});});
for(const [label,change]of [
 ['plan',meta=>mirrored(meta,proof=>proof.originalCompilerPlanDigest='a'.repeat(64))],
 ['output',meta=>mirrored(meta,proof=>proof.originalOutputDigest='a'.repeat(64))],
 ['context',meta=>mirrored(meta,proof=>proof.contextDigest='a'.repeat(64))],
 ['field-body',meta=>mirrored(meta,proof=>proof.fields[0].originalBody.value='forged')],
 ['lowered-body',meta=>mirrored(meta,proof=>proof.fields[0].loweredBody.value='forged')],
 ['field-type',meta=>mirrored(meta,proof=>proof.fields[0].fieldType.owner='Vec')],
 ['field-scope',meta=>mirrored(meta,proof=>proof.fields[0].fieldType.sourceScopeSha256='f'.repeat(64))],
 ['field-span',meta=>mirrored(meta,proof=>proof.fields[0].fieldType.typeSpan.end++)],
 ['selection',meta=>mirrored(meta,proof=>proof.fields[0].selection.method.bodySource='{"forged"}')],
 ['syntax',meta=>mirrored(meta,proof=>proof.fields[0].syntaxSha256='f'.repeat(64))],
 ['helper',meta=>mirrored(meta,proof=>proof.sourceBangProof.originalHelperOwners.push({exactNestedHelperInert:true}))],
 ['extra-proof-field',meta=>mirrored(meta,proof=>proof.extra='unissued')],
 ['reordered-signed-proof',meta=>mirrored(meta,proof=>{const schema=proof.schema;delete proof.schema;proof.schema=schema;})],
 ['missing-proof-field',meta=>mirrored(meta,proof=>delete proof.sourceBangProof)],
 ['source-authority',meta=>mirrored(meta,proof=>proof.allocatorInternalsCompiled=true)],
 ['checked-body',meta=>{checked(meta).body.value.value='forged';flattened(meta).body.value.value='forged';}],
 ['layout',meta=>{const data=meta.checkedSemanticProgram.program.declarations.$map.find(([name])=>name==='Payload')[1];data.ctors[0].fields[0].name='renamed';}],
 ['return',meta=>checked(meta).ret.rustReference={kind:'shared'}],
 ['signature',meta=>checked(meta).params.push({name:'unissued',type:{kind:'bool'}})],
 ['reordered-checked-proof',meta=>{const proof=checked(meta).impl.defaultSourceProof,schema=proof.schema;delete proof.schema;proof.schema=schema;}],
 ['reordered-target-proof',meta=>{const proof=flattened(meta).impl.defaultSourceProof,schema=proof.schema;delete proof.schema;proof.schema=schema;}],
 ['target',meta=>flattened(meta).body.value.value='forged'],
 ['receiver',meta=>generated(meta).receiver='shared'],
 ['classification',meta=>generated(meta).originalDeclarationTerm='enum'],
 ['fn-overlap',meta=>meta.executable.push({source:'src/lib.rs',span:generated(meta).span})],
 ['method-overlap',meta=>meta.checkedMethods.push({source:'src/lib.rs',span:generated(meta).span})],
 ['duplicate',meta=>meta.checkedGeneratedMethods.push(structuredClone(generated(meta)))],
 ['source-hash',meta=>meta.sources[0].sha256='f'.repeat(64)],
])test('container review rejects mirrored/unissued '+label,{timeout:60000},()=>{const fixture=syntheticFixture(),meta=structuredClone(fixture.meta);change(meta);let error;try{review(fixture,meta);}catch(thrown){error=thrown;}assert.ok(error,label);vector('negative-'+label,{meta,error:{name:error.name,message:error.message,cause:error.cause}});});
test('container proof inputs refuse copied dependencies, altered original text and wrong inventory counts',{timeout:60000},()=>{
 const fixture=syntheticFixture();assert.throws(()=>reviewGeneratedMethods(fixture.meta,{entry:fixture.file,checkedGeneratedMethods:1},{readSource:()=>fixture.source,dependencies:structuredClone(dependencies)}),/unsealed|Unsealed|private|copied|original/);
 assert.throws(()=>review({...fixture,source:fixture.source+' '}),/hash/);
 for(const count of [0,2,-1,'1'])assert.throws(()=>reviewGeneratedMethods(fixture.meta,{entry:fixture.file,checkedGeneratedMethods:count},{readSource:()=>fixture.source,dependencies}),/count/);
});
test('metadata proxy/accessor hooks are rejected before any getter or serialization executes',{timeout:60000},()=>{
 const fixture=syntheticFixture();let hooks=0;
 for(const make of [meta=>new Proxy(meta,{get(){hooks++;throw Error('executed proxy');},ownKeys(){hooks++;throw Error('executed proxy');}}),meta=>{Object.defineProperty(meta.checkedGeneratedMethods[0].defaultSourceProof,'source',{enumerable:true,get(){hooks++;throw Error('executed getter');}});return meta;},meta=>{Object.defineProperty(meta,'toJSON',{value(){hooks++;throw Error('executed toJSON');}});return meta;}])assert.throws(()=>review(fixture,make(structuredClone(fixture.meta))),/metadata|JSON/);
 assert.equal(hooks,0);vector('inert-hooks',{hooks});
});

test('complete original Model container defaults retain exact generated separation and fresh behavior',{timeout:60000},async()=>{
 const fixture=compile(read('src/model_contract.rs'),'src/model_contract.rs'),rows=review(fixture);assert.deepEqual(rows.map(item=>item.name).sort(),['ModelAccessPolicy.default','ModelRouteScope.default','ModelSelectorKind.clone','ModelSelectorKind.default']);assert.equal(fixture.meta.executable.length,2);assert.equal(fixture.meta.checkedMethods.length,5);assert.equal(fixture.meta.refused.length,17);assert.ok(fixture.meta.refused.some(item=>item.name==='ModelTruthDescriptor.default'&&item.message.includes('ModelSelectorKind')));
 let javascript=fixture.result.javascript,typescript=fixture.result.typescript;for(const name of ['ModelRouteScope','ModelAccessPolicy']){const entry=rows.find(item=>item.name===name+'.default');javascript+='\nexport {'+entry.targetName+' as default'+name+'};';typescript+='\nexport {'+entry.targetName+' as default'+name+'};';}
 vector('complete-original-model',{fixture,rows});await verifyTypedTargets({...fixture.result,javascript,typescript},(_api,_result,module)=>{const route=module.defaultModelRouteScope(),policy=module.defaultModelAccessPolicy();assert.deepEqual(route,{$:'ModelRouteScope',provider:{$:'None'},account:{$:'None'},endpoint:{$:'None'},protocols:[]});assert.deepEqual(policy,{$:'ModelAccessPolicy',allowed_models:[],allow_substitution:false,substitution_source:{$:'None'}});assert.notStrictEqual(route,module.defaultModelRouteScope());assert.notStrictEqual(route.protocols,module.defaultModelRouteScope().protocols);assert.notStrictEqual(policy.allowed_models,module.defaultModelAccessPolicy().allowed_models);},{childTimeoutMs:20000});
});
for(const [label,suffix]of [['shadowed-String','struct String;'],['shadowed-Default','trait Default{}'],['manual-overlap','impl Default for Payload{fn default()->Self{unknown!()}}'],['missing-helper-owner','use custom::Deserialize as D;']])test('forged formerly refused caller context remains refused '+label,{timeout:60000},()=>{
 const fixture=syntheticFixture(),meta=structuredClone(fixture.meta),source=fixture.source+suffix,hash=createHash('sha256').update(source).digest('hex');meta.sources[0].sha256=hash;mirrored(meta,proof=>proof.sourceSha256=hash);let error;try{review({...fixture,source},meta);}catch(thrown){error=thrown;}assert.ok(error);assert.match(error.message,label==='shadowed-String'?/field needs an actual supported standard Default implementation: String/:label==='manual-overlap'?/manual and generated Default may overlap/:/shadow|owner|unproved|proof mismatch|unresolved|not closed/);vector('changed-caller-'+label,{source,meta,error:error.message});
});

for(const [label,source]of [['nested-module','mod inner{#[derive(Default)]pub struct Payload{text:String,maybe:Option<u8>}pub fn make()->Payload{Payload::default()}}'],['non-Default-payload','pub struct NotDefault{value:String}#[derive(Default)]pub struct Payload{maybe:Option<NotDefault>,values:Vec<NotDefault>}pub fn make()->Payload{Payload::default()}']])test('actual dependent source layout reconstruction '+label,{timeout:60000},()=>{const fixture=compile(source),rows=review(fixture);assert.equal(rows.length,1);assert.equal(rows[0].defaultSourceProof.runtimeParity,false);vector('layout-positive-'+label,{fixture,rows});});
