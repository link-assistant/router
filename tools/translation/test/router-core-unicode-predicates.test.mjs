import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareCoreUnicodePredicates,composeCoreUnicodePredicates} from '../prepare-core-unicode-predicates.mjs';
import {unicodePredicateSourceArtifacts} from '../unicode-predicates-source.mjs';
import {proposeCoreUnicodePredicatesCorpus} from '../migrate-core-unicode-predicates.mjs';
import {router_core_strip_unicode_whitespace as strip,router_core_has_unicode_control as control} from '../extensions/string-iterator-runtime.mjs';
import {ROUTER_CORE_UNICODE_PREDICATE_CONTRACTS,checkRouterCoreScalarCall} from '../router-core-scalars.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {migrateCoreLiteralText} from '../migrate-core-literal-text.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),C='crate::translation_core::',S='&'+C+'Str';
const hash=value=>createHash('sha256').update(value).digest('hex');
const input=source=>({'src/lib.rs':'pub mod translation_core;'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE});
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
const whitespace=[9,10,11,12,13,32,133,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288];
const vectors=[['','',false],[' ASCII ','ASCII',false],['\t猫😀 e\u0301\u200d\0\ufeff\n','猫😀e\u0301\u200d\0\ufeff',true],['\u0085\u00a0\u1680\u2028\u2029\u202f\u205f\u3000','',true],['\u200b\u2060\ufeff','\u200b\u2060\ufeff',false],['\u007f\u009f','\u007f\u009f',true],['😀'.repeat(64),'😀'.repeat(64),false]];
function inverse(row){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let restored=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution'){assert.equal(restored.slice(...part.after),part.replacement);restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);}assert.equal(restored,row.before.source);assert.equal(row.inverse,row.before.source);assert.equal(row.executableAdmission,false);}
function application(){const archive=readFileSync(new URL('../source-profiles/core-unicode-predicates/application.json.gz',import.meta.url));assert.equal(hash(archive),'5c7894b6f00e68b972250058bcaf2979f1cf781f76a5ab3ffe2707ffaa80afec');const raw=gunzipSync(archive,{maxOutputLength:300000});assert.equal(hash(raw),'616a7509c5daec22cd5a9e4eca7d4fc30fec8347d212e9e03831c3b4c68c7339');return JSON.parse(raw.toString('utf8'));}

test('Unicode source layer retains every original core API and complete native/CST inverse',{timeout:60000},()=>{
 const plan=prepareCoreUnicodePredicates();assert.equal(plan.files.length,8);assert.equal(plan.semanticAuthority,false);assert.equal(plan.nativeRustExecuted,false);
 for(const row of plan.files){assert.equal(row.current,row.after,row.path);assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.deepEqual(row.trace,row.stages.flatMap(stage=>stage.trace));for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}assert.equal(row.nativeCopies.length,row.sourceLanguage==='JavaScript'?2:0);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));}
 const facade=plan.files.find(row=>row.path==='rust/src/translation_core.rs');for(const marker of ['unicode_scalar_count, ascii_chars_in','json_parse','__router_translation_core_format','__router_translation_core_matches','__router_translation_core_vec'])assert.ok(facade.before.includes(marker)&&facade.after.includes(marker),marker);
 assert.ok(plan.files.find(row=>row.path.endsWith('host-contracts.mjs')).after.split('\n').length-1<=999);
 const prior=Object.fromEntries(plan.files.map(row=>[row.path,{after:row.before}]));assert.equal(composeCoreUnicodePredicates(prior).layers.length,1);assert.throws(()=>composeCoreUnicodePredicates({...prior,[facade.path]:{after:facade.before+' '}}),/preceding complete source/);
 const proof=plan.property;assert.deepEqual(proof.control.ranges,[[0,31],[127,159]]);assert.deepEqual(proof.whitespace.codes,whitespace);for(const row of proof.sources){assert.equal(hash(row.source),row.sha256);assert.equal(transportConcreteSyntaxMeta(row.meta).source,row.source);}
});

test('Unicode runtime matches every scalar boundary and rejects invalid ABI without coercion',{timeout:60000},()=>{
 for(const [value,stripped,hasControl]of vectors){assert.equal(strip(value),stripped);assert.equal(control(value),hasControl);}
 const white=new Set(whitespace);for(let scalar=0;scalar<=0x10ffff;scalar++){if(scalar>=0xd800&&scalar<=0xdfff)continue;const value=String.fromCodePoint(scalar);assert.equal(strip(value),white.has(scalar)?'':value,'strip '+scalar);assert.equal(control(value),scalar<=31||scalar>=127&&scalar<=159,'control '+scalar);}
 let callbacks=0;const hostile={toString(){callbacks++;throw Error('coercion');},[Symbol.toPrimitive](){callbacks++;throw Error('coercion');}},proxy=new Proxy({},{get(){callbacks++;throw Error('proxy');}});
 for(const value of [undefined,null,0,0n,true,{},new String('a'),hostile,proxy,'\ud800','\udfff','x\ud800'])for(const run of [strip,control])assert.throws(()=>run(value),TypeError);assert.equal(callbacks,0);
 // Complete input validation precedes the early positive control result.
 assert.throws(()=>control('\0\ud800'),TypeError);const order=[];assert.equal(strip((order.push('argument'),' a ')),'a');assert.deepEqual(order,['argument']);
});

test('genuine owned Unicode calls survive semantic roundtrip and strict typed targets',{timeout:60000},async()=>{
 const result=project(input(`fn once(value:${S})->${S}{value}pub fn stripped(value:${S})->${C}Text{${C}strip_unicode_whitespace(once(value))}pub fn controlled(value:${S})->bool{${C}has_unicode_control(once(value))}`));for(const name of ['stripped','controlled'])assert.equal(has(result,name),true,name);
 const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);assert.equal(ROUTER_CORE_UNICODE_PREDICATE_CONTRACTS.length,2);
 await verifyTypedTargets(result,api=>{for(const [value,stripped,hasControl]of vectors){assert.equal(api.stripped(value),stripped);assert.equal(api.controlled(value),hasControl);}assert.throws(()=>api.controlled('\0\ud800'),TypeError);},{childTimeoutMs:20000});
 for(const source of [`pub fn bad(v:${C}Text)->bool{${C}has_unicode_control(v)}`,`pub fn bad(v:&mut ${C}Str)->bool{${C}has_unicode_control(v)}`,`pub fn bad(v:${S})->bool{${C}has_unicode_control(v,v)}`,`pub fn bad(v:${S})->bool{${C}has_unicode_control()}`,`pub const fn bad(v:${S})->bool{${C}has_unicode_control(v)}`])assert.equal(has(project(input(source)),'bad'),false,source);
 const changed=input(`pub fn bad(v:${S})->bool{${C}has_unicode_control(v)}`);changed['src/translation_core/primitives.rs']=ROUTER_CORE_PRIMITIVES_SOURCE.replace('value.chars().any(char::is_control)','false');assert.equal(has(project(changed),'bad'),false);
 assert.throws(()=>checkRouterCoreScalarCall({}, {k:'routerCoreScalarCountCall',args:[],span:{start:0,end:1}},new Map(),[],null),error=>error.kind==='type');
});

test('whole-expression adoption preserves BOM CRLF Unicode trivia and exact complete inverses',{timeout:60000},async()=>{
 const source=`\uFEFF// 😀 retained\r\npub mod translation_core;\r\n#[allow(dead_code)]pub fn compact(value:${S})->${C}Text{value.chars().filter(|ch| !ch.is_whitespace()).collect()}\r\npub fn clean(value:${S})->bool{!value.chars().any(char::is_control)}\r\n`,files=input('');files['src/lib.rs']=source;
 const plan=proposeCoreUnicodePredicatesCorpus({files}),row=plan.proposals.find(row=>row.file==='src/lib.rs');inverse(row);assert.equal(row.edits.length,2);assert.deepEqual(row.selections.map(row=>row.name),['compact','clean']);assert.ok(row.after.source.startsWith('\uFEFF// 😀 retained\r\n'));assert.deepEqual(row.trace.map(event=>event.phase),['language','repository']);assert.equal(proposeCoreUnicodePredicatesCorpus({files:plan.after}).proposals.flatMap(row=>row.edits).length,0);
 const result=project(plan.after);for(const name of ['compact','clean'])assert.equal(has(result,name),true);await verifyTypedTargets(result,api=>{for(const [value,stripped,hasControl]of vectors){assert.equal(api.compact(value),stripped);assert.equal(api.clean(value),!hasControl);}},{childTimeoutMs:20000});
});

test('unknown producers shadowed names attributes and unobserved callbacks retain original source',{timeout:60000},()=>{
 const bodies=[`let value=other();value.chars().any(char::is_control)`,`unknown!();value.chars().any(char::is_control)`,`foreign::unknown /* gap */ !();value.chars().any(char::is_control)`,`other.map(|value|value.chars().any(char::is_control));value.chars().any(char::is_control)`,`value.chars()/*keep*/.any(char::is_control)`,`value.chars().filter(|ch| !ch.is_whitespace() && ch!='x').collect()`];
 for(const body of bodies){const plan=proposeCoreUnicodePredicatesCorpus({files:input(`pub fn unchanged(value:${S})->bool{${body}}`)}),row=plan.proposals.find(row=>row.file==='src/lib.rs');inverse(row);assert.equal(row.edits.length,0,body);}
 for(const prefix of ['struct char;','use unknown::char;','use unknown::*;','#![no_implicit_prelude]','#[unknown]']){const files=input(prefix+`pub fn unchanged(value:${S})->bool{value.chars().any(char::is_control)}`),plan=proposeCoreUnicodePredicatesCorpus({files}),row=plan.proposals.find(row=>row.file==='src/lib.rs');inverse(row);assert.equal(row.edits.length,0,prefix);}
 let callbacks=0;const proxy=new Proxy({},{ownKeys(){callbacks++;return [];}});assert.throws(()=>proposeCoreUnicodePredicatesCorpus({files:proxy}));assert.equal(callbacks,0);
});

test('complete physical parents Cargo and exact original function spans remain retained DATA',{timeout:60000},()=>{
 const packet=application();assert.equal(packet.files.length,7);for(const row of packet.files){assert.equal(hash(row.source),row.sha256);assert.equal(readFileSync(new URL(row.path,root),'utf8'),row.source,row.path);}
 for(const [path,name]of [['rust/src/login_pty_backend.rs','compact_terminal_text'],['rust/src/model_resource.rs','valid_model_id']]){const row=packet.files.find(row=>row.path===path),items=sourceItems(row.source).filter(item=>item.term==='fn'&&item.name===name);assert.equal(items.length,1);assert.ok(row.source.slice(items[0].start,items[0].end).includes('.chars()'));}
 for(const path of ['rust/src/lib.rs','Cargo.toml','rust/Cargo.toml','Cargo.lock'])assert.ok(packet.files.some(row=>row.path===path));
 // These complete parents are source evidence, not a closed executable crate.
 assert.equal(packet.semanticAuthority,false);assert.equal(unicodePredicateSourceArtifacts().semanticAuthority,false);
});

test('complete original compact and model-id bodies receive fresh whole-function checking',{timeout:60000},async()=>{
 const packet=application(),originals=[['rust/src/login_pty_backend.rs','compact_terminal_text'],['rust/src/model_resource.rs','valid_model_id']].map(([path,name])=>{const source=packet.files.find(row=>row.path===path).source,items=sourceItems(source).filter(item=>item.term==='fn'&&item.name===name);assert.equal(items.length,1);return {path,name,span:[items[0].start,items[0].end],source:source.slice(items[0].start,items[0].end)};});
 const text=migrateCoreLiteralText(originals.map(row=>row.source).join('\n'));assert.equal(transportConcreteSyntaxMeta(text.before.meta).source,text.before.source);assert.equal(transportConcreteSyntaxMeta(text.after.meta).source,text.after.source);
 const files=input(text.after.source),before=project(files),plan=proposeCoreUnicodePredicatesCorpus({files}),row=plan.proposals.find(row=>row.file==='src/lib.rs');inverse(row);assert.equal(row.edits.length,2);assert.deepEqual(row.selections.map(row=>row.name),originals.map(row=>row.name));const after=project(plan.after);for(const original of originals)assert.equal(has(after,original.name),true,original.name);for(const item of before.meta.executable)assert.equal(has(after,item.name),true,'retained original fixture item '+item.name);
 await verifyTypedTargets(after,api=>{for(const [value,expected]of vectors)assert.equal(api.compact_terminal_text(value),expected);for(const value of ['model','猫😀','e\u0301','\ufeff','a'.repeat(512),'😀'.repeat(128)])assert.equal(api.valid_model_id(value),true,value);for(const value of ['', '/', 'model/name','\0','\u0085','a'.repeat(513),'😀'.repeat(129)])assert.equal(api.valid_model_id(value),false,value);},{childTimeoutMs:20000});
 // Exact full-body fixture checks above do not establish admission in either
 // retained original parent, the full corpus, reverse executable parity or CI.
});
