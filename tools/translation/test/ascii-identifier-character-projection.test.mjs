// Character interpretation is independent of lossless Rust CST token classes.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {Hash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {executeFreshSourceAsciiIdentifierPredicates,createFreshSourceAsciiIdentifierPredicateExecutor} from '../source-format-template.mjs';
import {transportConcreteSyntaxSources,transportConcreteSyntaxMetaChunks} from '../concrete-syntax-meta.mjs';
import {captureOriginalFileTokenContext,originalFileTokenContextFacts,originalFileContextSourceCandidate} from '../original-file-context-source.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const nativeJson=JSON.stringify,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const lexer="pub fn is_id_start(c: char) -> bool { c == '_' || unicode_xid::UnicodeXID::is_xid_start(c) }\npub fn is_id_continue(c: char) -> bool { unicode_xid::UnicodeXID::is_xid_continue(c) }\n";
const xid="impl UnicodeXID for char {\nfn is_xid_start(self) -> bool { ('a' <= self && self <= 'z') || ('A' <= self && self <= 'Z') || (self > '\\x7f' && derived_property::XID_Start(self)) }\nfn is_xid_continue(self) -> bool { ('a' <= self && self <= 'z') || ('A' <= self && self <= 'Z') || ('0' <= self && self <= '9') || self == '_' || (self > '\\x7f' && derived_property::XID_Continue(self)) }\n}\n";
function test(name,run){nodeTest(name,{timeout:60000},async()=>{const vectors=[],retain=(label,value)=>{vectors.push({label,value});return value;};try{await run(retain);}finally{const folder=process.env.ROUTER_ASCII_CHARACTER_PROJECTION_VECTOR_DIR;if(folder){mkdirSync(folder,{recursive:true});writeJsonGzip(join(folder,Buffer.from(name).toString('hex')+'.json.gz'),{name,vectors});}}});}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
async function asyncOutcome(run){try{return {value:await run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function completePacket(sources={lexer,xid}){
 const first=transportConcreteSyntaxSources([{source:sources.lexer,language:'Rust'},{source:sources.xid,language:'Rust'}]),second=transportConcreteSyntaxMetaChunks([first.rows.map(row=>row.meta)]);assert.equal(second.chunks.length,1);assert.equal(second.chunks[0].rows.length,2);
 const packet={lexer:{source:sources.lexer,canonical:second.chunks[0].rows[0].meta},xid:{source:sources.xid,canonical:second.chunks[0].rows[1].meta}};
 for(const [at,name]of ['lexer','xid'].entries()){assert.equal(first.rows[at].meta,packet[name].canonical);assert.equal(second.chunks[0].rows[at].source,sources[name]);assert.equal(nativeJson(JSON.parse(packet[name].canonical)),packet[name].canonical);}return packet;
}
function independent(data,expectedStart=code=>code===95||code>=65&&code<=90||code>=97&&code<=122,expectedContinue=code=>code===95||code>=65&&code<=90||code>=97&&code<=122||code>=48&&code<=57){
 assert.equal(data.characters.length,128);for(let code=0;code<128;code++){const row=data.characters[code];assert.equal(row.code,code);assert.equal(row.character,String.fromCharCode(code));assert.equal(row.start,expectedStart(code));assert.equal(row.continue,expectedContinue(code));}assert.equal(data.sourceDataOnly,true);assert.equal(data.namespaceAuthority,false);assert.equal(data.runtimeAuthority,false);
}
async function pinned(){
 const source='pub struct Copy(u8);',sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}).views[0],request={module:{file:'src/lib.rs',path:[],source,sourceView,compilationProfile:PRODUCTION_PROFILE},span:{start:11,end:15}},token=await captureOriginalFileTokenContext(request),facts=await originalFileTokenContextFacts(token,request),lexerRow=facts.sourceProfile.sources.find(row=>row.path==='compiler/rustc_lexer/src/lib.rs'),xidRow=facts.sourceProfile.sources.find(row=>row.path==='unicode-xid-0.2.6/src/lib.rs');assert.ok(lexerRow&&xidRow);return {request,token,facts,lexerRow,xidRow};
}

test('all four actual pinned predicates execute every ASCII input with independent identifier expectations',async retain=>{
 const original=await pinned(),sources={lexer:original.lexerRow.source,xid:original.xidRow.source},data=await executeFreshSourceAsciiIdentifierPredicates(sources);retain('complete-private-originals-and-predicate-data',{original,sources,data});independent(data);assert.equal(original.facts.positiveOrdinaryTokenEquation,true);assert.equal(original.facts.namespaceAuthority,false);assert.equal(original.facts.runtimeAuthority,false);
 for(const name of ['lexer::is_id_start','lexer::is_id_continue','xid::is_xid_start','xid::is_xid_continue'])assert.ok(data.trace.includes(name),name);for(const [name,source]of Object.entries(sources)){assert.equal(data.sources[name].source,source);const doc=JSON.parse(data.sources[name].canonical);assert.equal(doc.source,source);assert.equal(nativeJson(doc),data.sources[name].canonical);}await assert.rejects(()=>originalFileTokenContextFacts(data),/copied|foreign/);
});

test('genuine string-class CST characters keep complete raw source spans and canonical roundtrip unchanged',async retain=>{
 const packet=completePacket(),before=nativeJson(packet),execute=await createFreshSourceAsciiIdentifierPredicateExecutor(),data=execute(packet);retain('complete-small-source-CST-and-result',{packet,data});independent(data);assert.equal(nativeJson(packet),before);
 const spellings=[];for(const name of ['lexer','xid']){const doc=JSON.parse(packet[name].canonical);assert.equal(data.sources[name].source,packet[name].source);assert.equal(data.sources[name].canonical,packet[name].canonical);for(const node of doc.nodes){if(node[0]!=='token')continue;const raw=doc.source.slice(node[2],node[3]);if(raw.startsWith("'")){assert.equal(node[1],'string');assert.equal(Buffer.byteLength(doc.source.slice(0,node[2])),node[4]);assert.equal(Buffer.byteLength(doc.source.slice(0,node[3])),node[5]);spellings.push({name,raw,node});}}}retain('complete-original-character-CST-leaves',spellings);assert.ok(spellings.some(row=>row.raw==="'_'"));assert.ok(spellings.some(row=>row.raw==="'a'"));assert.ok(spellings.some(row=>row.raw==="'\\x7f'"));
});

test('changed source DATA changes results while fixed original pins and private receipts still refuse',async retain=>{
 const original=await pinned(),sources={lexer:original.lexerRow.source,xid:original.xidRow.source},before=await executeFreshSourceAsciiIdentifierPredicates(sources),changed=sources.xid.replaceAll("'a' <= self","'b' <= self");assert.notEqual(changed,sources.xid);const after=await executeFreshSourceAsciiIdentifierPredicates({...sources,xid:changed});retain('full-changed-original-data',{original,sources,changed,before,after});assert.equal(before.characters[97].start,true);assert.equal(after.characters[97].start,false);assert.equal(before.characters[97].continue,true);assert.equal(after.characters[97].continue,false);assert.equal(after.sourceDataOnly,true);assert.equal(after.namespaceAuthority,false);assert.equal(after.runtimeAuthority,false);assert.throws(()=>originalFileContextSourceCandidate(original.xidRow.path,changed),/complete fixed original candidate differs/);for(const fake of [after,structuredClone(original.token),{...after,positiveOrdinaryTokenEquation:true,eligibleOwnerScope:0}])await assert.rejects(()=>originalFileTokenContextFacts(fake),TypeError);
});

test('strict written ASCII scalar and sentinel interpretation is source driven rather than a host table',async retain=>{
 const sources={lexer:"pub fn is_id_start(c: char) -> bool { c == '$' || (c == 'Z') } pub fn is_id_continue(c: char) -> bool { c <= '\\x7f' }",xid},data=await executeFreshSourceAsciiIdentifierPredicates(sources);retain('independent-changed-scalar-branches',{sources,data});independent(data,code=>code===36||code===90,()=>true);assert.equal(data.characters[95].start,false);
 const lazy={lexer:"pub fn is_id_start(c: char) -> bool { c == '_' || (c > '\\x7f' && unicode_xid::UnicodeXID::is_xid_start(c)) } pub fn is_id_continue(c: char) -> bool { c == '0' || (c > '\\x7f' && unicode_xid::UnicodeXID::is_xid_continue(c)) }",xid},result=await executeFreshSourceAsciiIdentifierPredicates(lazy);retain('actual-lazy-nonASCII-call-frontier',{sources:lazy,result});independent(result,code=>code===95,code=>code===48);assert.ok(!result.trace.some(name=>name.startsWith('xid::')));
});

test('malformed doublequoted nonASCII and unsupported escapes cannot refine to valid characters',async retain=>{
 for(const literal of ["''","'ab'","'''","'\n'","'\r'","'\t'",'"a"',"'é'","'😀'","'\\n'","'\\x7e'","'\\u{61}'","'\\q'","'a"]){const source=lexer.replace("'_'",literal),result=await asyncOutcome(()=>executeFreshSourceAsciiIdentifierPredicates({lexer:source,xid}));retain('complete-refused-written-literal',{literal,source,xid,result});assert.equal(result.error?.name,'TypeError',literal);}
});

test('unsupported nested groups operators operands and call shapes retain independent parser IR refusals',async retain=>{
 const bodies=["[c == '_']","{ c == '_' }","c != '_'","c + '_'","c | '_'","!true","c.is_ascii()","c == true","unicode_xid::UnicodeXID::is_xid_start(c,c)","unicode_xid::UnicodeXID::is_xid_start('_')","c == '_' c == 'a'","(c == '_', true)"];
 for(const body of bodies){const source="pub fn is_id_start(c: char) -> bool { "+body+" } pub fn is_id_continue(c: char) -> bool { true }",result=await asyncOutcome(()=>executeFreshSourceAsciiIdentifierPredicates({lexer:source,xid}));retain('complete-refused-operator-or-shape',{body,source,xid,result});assert.equal(result.error?.name,'TypeError',body);}
 for(const source of [lexer.replace('c: char','c: char, self: char'),lexer+lexer,lexer.replace('fn is_id_start','fn another_name')]){const result=await asyncOutcome(()=>executeFreshSourceAsciiIdentifierPredicates({lexer:source,xid}));retain('complete-refused-definition',{source,xid,result});assert.equal(result.error?.name,'TypeError');}
});

test('full canonical source UTF8 partition fields and own data cannot be forged through the direct executor',async retain=>{
 const execute=await createFreshSourceAsciiIdentifierPredicateExecutor(),packet=completePacket();
 for(const [label,change]of [['source',doc=>{doc.source+=' ';}],['span',doc=>{doc.nodes[0][3]--;}],['bytes',doc=>{doc.sourceEncoding.utf8Bytes++;}],['encoding',doc=>{doc.sourceEncoding.utf8Mapping='public';}],['authority',doc=>{doc.authority.type=true;}],['partition',doc=>{const row=doc.nodes.find(row=>row[0]==='token'&&row[1]==='string');row[2]++;}],['extra',doc=>{doc.extra=true;}]]){const doc=JSON.parse(packet.lexer.canonical);change(doc);const changed={...packet,lexer:{...packet.lexer,canonical:nativeJson(doc)}},result=outcome(()=>execute(changed));retain('complete-mutated-canonical-'+label,{packet,changed,result});assert.equal(result.error?.name,'TypeError');}
 let gets=0;const accessor=Object.defineProperty({xid:packet.xid},'lexer',{enumerable:true,get(){gets++;throw Error('must not read');}});for(const input of [accessor,new Proxy(packet,{}),{...packet,extra:true},{lexer:{...packet.lexer,extra:true},xid:packet.xid}]){const result=outcome(()=>execute(input));retain('complete-unqualified-direct-input',{result});assert.equal(result.error?.name,'TypeError');}assert.equal(gets,0);
});

test('fresh native parser guards and late source observers refuse without invoking hostile conversion hooks',async retain=>{
 const packet=completePacket(),execute=await createFreshSourceAsciiIdentifierPredicateExecutor(),previous=get(globalThis,'parseInt');let calls=0,result;
 try{define(globalThis,'parseInt',{...previous,value(...args){calls++;return apply(previous.value,this,args);}});result=outcome(()=>execute(packet));}finally{define(globalThis,'parseInt',previous);}retain('native-parseInt-drift-before-conversion',{packet,result,calls});assert.equal(calls,0);assert.deepEqual(result.error,{name:'TypeError',message:'source format control: ASCII region requires native own parseInt'});
 // The established native host's factory/current guards perform no Hash. The
 // first update belongs to fresh transport after the wrapper captured own fields.
 const update=get(Hash.prototype,'update'),sources={lexer,xid},observations=[];let changed=false,failure;
 try{define(Hash.prototype,'update',{...update,value(...args){const value=apply(update.value,this,args),rawStack=String(new Error().stack);observations.push({arguments:args.map(item=>typeof item==='string'?item:{base64:Buffer.from(item).toString('base64')}),rawStack});if(!changed){changed=true;sources.lexer+='\n';}return value;}});failure=await asyncOutcome(()=>executeFreshSourceAsciiIdentifierPredicates(sources));}finally{define(Hash.prototype,'update',update);}retain('full-late-source-mutation',{before:{lexer,xid},sources,observations,changed,failure});assert.equal(changed,true);assert.equal(failure.error?.name,'TypeError');assert.match(failure.error.message,/lexical source descriptor changed/);
 const healthy=execute(packet);independent(healthy);assert.equal(healthy.sources.lexer.canonical,packet.lexer.canonical);
});
