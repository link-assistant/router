import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {prepareCoreAsciiSources,composeCoreAscii} from '../prepare-core-ascii-sources.mjs';
import {proposeCoreAsciiCorpus} from '../migrate-core-ascii.mjs';
import {router_core_ascii_chars_in as ascii} from '../extensions/string-iterator-runtime.mjs';
import {ROUTER_CORE_ASCII_CONTRACT,checkRouterCoreScalarCall} from '../router-core-scalars.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {migrateCorePrimitives} from '../migrate-core-primitives.mjs';
import {migrateCoreLiteralText} from '../migrate-core-literal-text.mjs';
import {proposeCoreAlgebraicCorpus} from '../migrate-core-algebraic.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),C='crate::translation_core::',S='&'+C+'Str',F=C+'ascii_chars_in';
const hash=value=>createHash('sha256').update(value).digest('hex');
const input=source=>({'src/lib.rs':'pub mod translation_core;'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE});
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
const vectors=[['','',true],['','é猫😀',true],['a','',false],['aAa0-_','aA0-_',true],['é','é',false],['猫😀','猫😀',false],['A','aé猫😀',false],['a','aé猫😀',true],['\0\r\n','\0\r\n',true],['e\u0301','e\u0301',false],['\u007f','\u007f',true],['/','.-_',false]];
function inverse(row){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let restored=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution'){assert.equal(restored.slice(...part.after),part.replacement);restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);}assert.equal(restored,row.before.source);assert.equal(row.inverse,row.before.source);assert.equal(row.executableAdmission,false);}

test('complete ASCII source equations retain current full facade and both native/CST copies',{timeout:60000},()=>{
 const plan=prepareCoreAsciiSources();assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.files.length,7);
 for(const row of plan.files){assert.equal(row.current,row.after,row.path);assert.equal(row.inverse,row.before);assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.deepEqual(stage.trace.map(event=>event.phase),['language','repository']);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}if(row.sourceLanguage==='JavaScript'){assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));}else assert.deepEqual(row.nativeCopies,[]);}
 const host=plan.files.find(row=>row.path.endsWith('/host-contracts.mjs'));assert.equal(host.after.split('\n').length-1,999);assert.ok(host.before.includes('prepareOriginalPrimitiveIdentityBoundary'));
 const prior=Object.fromEntries(plan.files.map(row=>[row.path,{after:row.before}]));assert.equal(composeCoreAscii(prior).layers.length,1);assert.throws(()=>composeCoreAscii({...prior,[host.path]:{after:host.before+' '}}),/preceding complete source/);
 assert.equal(ROUTER_CORE_ASCII_CONTRACT.requiresRefinement,'genuine-router-core-ascii-call');assert.equal(ROUTER_CORE_ASCII_CONTRACT.constEligible,false);
});

test('shared ASCII vectors include every byte empty-all Unicode and invalid ABI without coercion',{timeout:60000},()=>{
 for(const [value,alphabet,expected]of vectors)assert.equal(ascii(value,alphabet),expected);
 const hex='0123456789ABCDEFabcdef';for(let byte=0;byte<128;byte++){const value=String.fromCharCode(byte),expected=byte>=48&&byte<=57||byte>=65&&byte<=70||byte>=97&&byte<=102;assert.equal(ascii(value,hex),expected,'ASCII '+byte);}
 let callbacks=0;const hostile={toString(){callbacks++;throw Error('coercion');},[Symbol.toPrimitive](){callbacks++;throw Error('coercion');}},proxy=new Proxy({},{get(){callbacks++;throw Error('proxy');}});
 for(const value of [undefined,null,0,0n,true,{},new String('a'),hostile,proxy,'\ud800','\udfff','x\ud800']){assert.throws(()=>ascii(value,'abc'),TypeError);assert.throws(()=>ascii('',value),TypeError);}assert.equal(callbacks,0);
 const order=[];assert.equal(ascii((order.push('value'),'abc'),(order.push('alphabet'),'abc')),true);assert.deepEqual(order,['value','alphabet']);
});

test('genuine qualified calls emit JS and strict TS after semantic roundtrip; other ownership stays refused',{timeout:60000},async()=>{
 const result=project(input(`fn left(value:${S})->${S}{value}fn right(value:${S})->${S}{value}pub fn accepted(value:${S},alphabet:${S})->bool{${F}(left(value),right(alphabet))}`));assert.equal(has(result,'accepted'),true);
 const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 await verifyTypedTargets(result,api=>{for(const [value,alphabet,expected]of vectors)assert.equal(api.accepted(value,alphabet),expected);assert.throws(()=>api.accepted('\ud800','a'),TypeError);assert.throws(()=>api.accepted('a','\ud800'),TypeError);},{childTimeoutMs:20000});
 for(const source of [`pub fn bad(v:${C}Text)->bool{${F}(v,"a")}`,`pub fn bad(v:${S})->bool{${F}(v)}`,`pub fn bad(v:${S})->bool{${F}(v,"a","b")}`,`pub const fn bad(v:${S})->bool{${F}(v,"a")}`,`pub fn bad(v:u8)->bool{${F}(v,"a")}`])assert.equal(has(project(input(source)),'bad'),false,source);
 const changed=input(`pub fn bad(v:${S})->bool{${F}(v,"a")}`);changed['src/translation_core/primitives.rs']=ROUTER_CORE_PRIMITIVES_SOURCE.replace('byte.is_ascii() &&','true &&');assert.equal(has(project(changed),'bad'),false);
 assert.throws(()=>checkRouterCoreScalarCall({}, {k:'routerCoreScalarCountCall',args:[],span:{start:0,end:1}},new Map(),[],null),error=>error.kind==='type');
});

test('ASCII source adoption preserves whole bodies comments attributes and inverses and refuses other producers',{timeout:60000},async()=>{
 const source=`\uFEFF// 😀 retained\r\npub mod translation_core;\r\n#[allow(dead_code)]pub fn valid(value:${S})->bool{let valid=!value.is_empty()&&value.bytes().all(|byte|byte.is_ascii_lowercase()||byte.is_ascii_digit()||byte==b'-');valid}\r\n`,files=input('');files['src/lib.rs']=source;
 const result=proposeCoreAsciiCorpus({files}),row=result.proposals.find(row=>row.file==='src/lib.rs');inverse(row);assert.equal(row.edits.length,1);assert.equal(row.selections[0].name,'valid');assert.ok(row.after.source.startsWith('\uFEFF// 😀 retained\r\n'));assert.ok(row.after.source.includes('let valid=!value.is_empty()&&'+F+'(value, "-0123456789abcdefghijklmnopqrstuvwxyz");valid'));assert.deepEqual(row.trace.map(event=>event.phase),['language','repository']);assert.equal(proposeCoreAsciiCorpus({files:result.after}).proposals.flatMap(row=>row.edits).length,0);
 const executable=project(result.after);assert.equal(has(executable,'valid'),true);await verifyTypedTargets(executable,api=>{assert.equal(api.valid('a-0'),true);for(const value of ['', 'A','é','😀','a_b'])assert.equal(api.valid(value),false);},{childTimeoutMs:20000});
 const refused=[`let value=other();value.bytes().all(|b|b.is_ascii_digit())`,`unknown!();value.bytes().all(|b|b.is_ascii_digit())`,`value.bytes().all(|b|b.is_ascii_digit()&&b!=b'0')`,`value.bytes().all(|b|matches!(b,b'0'|b'1'))`,`value.bytes()/* retained */.all(|b|b.is_ascii_digit())`,`other.map(|value|value.bytes().all(|b|b.is_ascii_digit()));value.bytes().all(|b|b.is_ascii_digit())`];
 for(const body of refused){const files=input(`pub fn unchanged(value:${S})->bool{${body}}`),plan=proposeCoreAsciiCorpus({files}),row=plan.proposals.find(row=>row.file==='src/lib.rs');inverse(row);assert.equal(row.after.source,row.before.source,body);}
});

test('complete production modules and Cargo inputs retain exact actual predicate bodies without admission claims',{timeout:60000},()=>{
 const archive=readFileSync(new URL('../source-profiles/core-ascii/application.json.gz',import.meta.url));assert.equal(hash(archive),'53abfb67c0bbdcd30d48c2e10491ae21da53e064d5dfa6236dccb59ecf59a619');const raw=gunzipSync(archive);assert.equal(hash(raw),'4f47814ad48cc84a7204c6bb256ae113966bb98b155d68d1990a57d92bf20d2e');const packet=JSON.parse(raw.toString('utf8'));
 for(const row of packet.files){assert.equal(hash(row.source),row.sha256);assert.equal(readFileSync(new URL(row.path,root),'utf8'),row.source,row.path);}
 for(const [path,name]of [['rust/src/client_lifecycle/backup.rs','validate_id'],['rust/src/codex_loopback_bridge.rs','validate_nonce'],['rust/src/deploy/instance.rs','validate'],['rust/src/deploy_local/staging.rs','namespace']]){const source=packet.files.find(row=>row.path===path).source,items=sourceItems(source).filter(item=>item.term==='fn'&&item.name===name);assert.equal(items.length,1);assert.ok(source.slice(items[0].start,items[0].end).includes('.bytes()'));}
 // Complete parents are retained as inputs. A synthetic fixture or spelling
 // census does not prove these modules executable in their real crate scope.
 assert.ok(packet.files.some(row=>row.path==='rust/src/lib.rs'));assert.ok(packet.files.some(row=>row.path==='rust/Cargo.toml'));assert.ok(packet.files.some(row=>row.path==='Cargo.lock'));
});

test('complete original hexadecimal validator bodies compose explicit core adoptions and retain real errors',{timeout:60000},async()=>{
 const packet=JSON.parse(gunzipSync(readFileSync(new URL('../source-profiles/core-ascii/application.json.gz',import.meta.url))).toString('utf8'));
 const originals=[['rust/src/client_lifecycle/backup.rs','validate_id'],['rust/src/codex_loopback_bridge.rs','validate_nonce']].map(([path,name])=>{const source=packet.files.find(row=>row.path===path).source,item=sourceItems(source).find(item=>item.term==='fn'&&item.name===name);assert.ok(item);return {path,name,span:[item.start,item.end],source:source.slice(item.start,item.end)};});
 const source=originals.map(row=>row.source).join('\n'),str=migrateCorePrimitives(source),text=migrateCoreLiteralText(str.after.source),algebraic=proposeCoreAlgebraicCorpus({files:input(text.after.source)}),proposal=proposeCoreAsciiCorpus({files:algebraic.after}),row=proposal.proposals.find(row=>row.file==='src/lib.rs');inverse(row);assert.deepEqual(row.selections.map(row=>row.name),['validate_id','validate_nonce']);
 for(const stage of [str,text]){assert.equal(transportConcreteSyntaxMeta(stage.before.meta).source,stage.before.source);assert.equal(transportConcreteSyntaxMeta(stage.after.meta).source,stage.after.source);assert.deepEqual(stage.trace.map(event=>event.phase),['language','repository']);}
 // These are full original bodies in a fixture scope. Their complete physical
 // parents remain in the source packet; real-crate admission is still separate.
 const executable=project(proposal.after);for(const original of originals)assert.equal(has(executable,original.name),true,original.name);
 await verifyTypedTargets(executable,api=>{for(const name of ['validate_id','validate_nonce']){for(const value of ['0'.repeat(32),'F'.repeat(32),'0123456789abcdefABCDEF0123456789'])assert.deepEqual(api[name](value),{$:'Ok',field0:null});for(const value of ['', '0'.repeat(31),'0'.repeat(33),'g'.repeat(32),'é'.repeat(16),'😀'.repeat(8)]){const result=api[name](value);assert.equal(result.$,'Err');assert.equal(result.field0,name==='validate_id'?'invalid backup ID':'Codex bridge ownership nonce is invalid');}}},{childTimeoutMs:20000});
});
