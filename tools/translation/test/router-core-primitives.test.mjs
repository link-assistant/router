import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_PRIMITIVES_SHA256} from '../router-core-primitives.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,requireRouterCoreFacadeCurrent} from '../router-core-formatting.mjs';
import {migrateCoreFormatting} from '../migrate-core-formatting.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const vectorRoot=process.env.ROUTER_CORE_PRIMITIVES_VECTOR_DIR;
let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const digest=source=>createHash('sha256').update(source).digest('hex');
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{
  vectors=[];try{await run();}finally{if(vectorRoot){mkdirSync(vectorRoot,{recursive:true});writeFileSync(join(vectorRoot,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}
});
const C='crate::translation_core::Str';
const R='&'+C;
const S="&'static "+C;
const rootSource='pub mod translation_core;\n';
function project(source,{root=rootSource,facade=ROUTER_FORMATTING_FACADE_SOURCE,leaf=ROUTER_CORE_PRIMITIVES_SOURCE,extra={}}={}){
  const files={'src/lib.rs':root+source,'src/translation_core.rs':facade,'src/translation_core/primitives.rs':leaf,...extra};
  retain('complete-project-input',files);
  return retain('complete-project-result',translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]}));
}
const has=(result,name)=>result.meta.executable.some(item=>item.name===name);
function checked(result){
  const canonical=JSON.stringify(result.meta.checkedSemanticProgram),program=parseProgram(canonical);
  retain('complete-canonical-checked-meta',canonical);assert.equal(serializeProgram(program),canonical);return program;
}
async function targets(result,verify){
  retain('complete-targets',{javascript:result.javascript,typescript:result.typescript});
  await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});
}
function borrowed(type,lifetime){
  assert.equal(type.kind,'string');assert.equal(type.rustSourceType,true);
  assert.deepEqual(type.rustOwnership,{kind:'borrowed',source:'str'});
  assert.equal(type.rustBorrowLifetime.kind,lifetime);
  assert.equal(type.rustReference,undefined);assert.equal(type.rustStandardSignature,undefined);
  assert.equal(type.rustBorrowLifetime.tokens[0].value,'&');
  assert.deepEqual(type.rustBorrowLifetime.tokens.slice(-5).map(token=>token.value),['crate','::','translation_core','::','Str']);
}

test('complete owned alias selects borrowed text and survives checked semantic serialization',async()=>{
  const physical=readFileSync(new URL('../../../src/translation_core/primitives.rs',import.meta.url),'utf8');
  const stage=retain('actual-alias-CST',transportConcreteSyntaxSource(physical,{language:'Rust'}));
  retain('actual-full-alias',{physical,registered:ROUTER_CORE_PRIMITIVES_SOURCE,sha256:ROUTER_CORE_PRIMITIVES_SHA256});
  assert.equal(physical,ROUTER_CORE_PRIMITIVES_SOURCE);assert.equal(digest(physical),ROUTER_CORE_PRIMITIVES_SHA256);assert.equal(stage.source,physical);assert.equal(transportConcreteSyntaxMeta(stage.meta).source,physical);
  const source=`pub fn identity(value:${R})->${R}{value}`;
  const result=project(source);assert.equal(has(result,'identity'),true);
  const entry=checked(result).declarations.get('identity');borrowed(entry.params[0].type,'elided');borrowed(entry.ret,'elided');
  assert.equal(entry.sourceLifetimeProof.outputs[0].identity,'input:0:[]');
  const sourceText=rootSource+source;
  for(const token of entry.params[0].type.rustBorrowLifetime.tokens)assert.equal(sourceText.slice(token.span.start,token.span.end),token.value);
  await targets(result,api=>{for(const value of ['', 'ASCII', 'Ω猫😀', '\0\r\n'])assert.equal(api.identity(value),value);});
});

test('borrowed text behavior preserves UTF8 byte length trimming and source arguments',async()=>{
  const source=`pub fn bytes(value:${R})->usize{value.len()} pub fn cleaned(value:${R})->${R}{value.trim()} pub fn choice(value:${R},pick:bool)->${R}{if pick{value}else{"fallback"}}`;
  const result=project(source);for(const name of ['bytes','cleaned','choice'])assert.equal(has(result,name),true,name);checked(result);
  const cases=[['',0n],['ASCII',5n],['é😀',6n],['猫',3n],['a\0b',3n]];retain('independent-byte-oracle',cases);
  await targets(result,api=>{
    for(const [value,expected]of cases)assert.equal(api.bytes(value),expected);
    assert.equal(api.cleaned(' \tΩ😀\r\n'),'Ω😀');assert.equal(api.choice('input',true),'input');assert.equal(api.choice('input',false),'fallback');
    assert.throws(()=>api.bytes(null));
  });
});

test('static results and borrowed call boundaries retain actual lifetime origins',async()=>{
  const source=`pub fn fixed()->${S}{"fixed"} fn copied(value:${R})->${R}{value} pub fn call(value:${R})->${R}{copied(value)} pub fn static_input(value:${S})->${S}{value}`;
  const result=project(source);for(const name of ['fixed','copied','call','static_input'])assert.equal(has(result,name),true,name);
  const program=checked(result),fixed=program.declarations.get('fixed'),input=program.declarations.get('static_input');
  borrowed(fixed.ret,'static');borrowed(input.params[0].type,'static');assert.deepEqual(fixed.sourceLifetimeProof.returnOrigins,['static']);assert.equal(program.declarations.get('call').sourceLifetimeProof.outputs[0].identity,'input:0:[]');
  await targets(result,api=>{assert.equal(api.fixed(),'fixed');assert.equal(api.call('borrow'),'borrow');assert.equal(api.static_input('static'),'static');});
});

test('changed complete source and actual module routes cannot supply the owned contract',()=>{
  const good=`pub fn answer(value:${R})->${R}{value}`;
  const invalid=[
    {leaf:ROUTER_CORE_PRIMITIVES_SOURCE.replace('::std::primitive::str','::std::string::String')},
    {leaf:ROUTER_CORE_PRIMITIVES_SOURCE+'\n// different complete source\n'},
    {facade:ROUTER_FORMATTING_FACADE_SOURCE.replace('pub use self::primitives::Str;','pub use custom::Str;')},
    {root:'mod translation_core;\n'},
    {root:'#[cfg(any())] pub mod translation_core;\n'},
    {root:'pub mod translation_core; use custom as translation_core;\n'},
  ];
  for(const options of invalid){const result=project(good,options);assert.equal(has(result,'answer'),false);retain('owned-source-refusal',result.meta.refused);}
  const missing=project(good,{leaf:''});assert.equal(has(missing,'answer'),false);
  let reads=0;const fake=new Proxy({},{get(){reads++;throw new Error('fake parser read');}});
  assert.throws(()=>requireRouterCoreFacadeCurrent(fake,{trace:[]}),TypeError);assert.equal(reads,0);
});

test('unsupported lifetimes ownership and alias syntax preserve semantic refusals',()=>{
  const cases=[
    `pub fn bad(a:${R},b:${R})->${R}{a}`,
    `pub fn bad()->${R}{"literal"}`,
    `pub fn bad(value:${R})->${S}{value}`,
    `fn needs(value:${S})->u8{1} pub fn bad(value:${R})->u8{needs(value)}`,
    `pub fn bad(value:crate::translation_core::Text)->${S}{value.trim()}`,
    `pub fn bad(value:&mut ${C})->u8{1}`,
    `pub fn bad<'a>(value:&'a ${C})->&'a ${C}{value}`,
    `pub fn bad<'elided>(value:&'elided ${C})->&'elided ${C}{value}`,
    `pub fn bad(value:${C})->u8{1}`,
    `pub fn bad(value:&crate::translation_core::Str<u8>)->u8{1}`,
    `pub fn bad(value:&crate::translation_core::Str::Other)->u8{1}`,
    `pub fn bad(value:&crate::translation_core::Unknown)->u8{1}`,
  ];
  for(const source of cases){const result=project(source);assert.equal(has(result,'bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);}
});

test('actual affected signatures adopt the owned core through full CST substitutions and inverse',async()=>{
  const source='\uFEFF// &str format!("unchanged comment")\r\npub fn echo(value: &str) -> String { format!("{}", value) }\r\n';
  const migration=retain('complete-CST-adoption',migrateCoreFormatting(source));
  assert.equal(migration.after.source,'\uFEFF// &str format!("unchanged comment")\r\npub fn echo(value: &crate::translation_core::Str) -> crate::translation_core::Text { crate::translation_core::format!("{}", value) }\r\n');
  assert.equal(transportConcreteSyntaxMeta(migration.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(migration.after.meta).source,migration.after.source);
  assert.deepEqual(migration.trace.map(row=>row.phase),['language','repository']);
  let prior=0,next=0,undo='';
  for(const segment of migration.mapping){assert.equal(segment.before[0],prior);assert.equal(segment.after[0],next);const before=source.slice(...segment.before),after=migration.after.source.slice(...segment.after);if(segment.kind==='unchanged')assert.equal(before,after);else{assert.equal(before,segment.expected);assert.equal(after,segment.replacement);}undo+=before;prior=segment.before[1];next=segment.after[1];}
  assert.equal(prior,source.length);assert.equal(next,migration.after.source.length);assert.equal(undo,source);
  const result=project(migration.after.source);assert.equal(has(result,'echo'),true);borrowed(checked(result).declarations.get('echo').params[0].type,'elided');
  await targets(result,api=>{assert.equal(api.echo('Ω😀'),'Ω😀');assert.equal(api.echo(''),'');});
});

test('actual static error classifier retains its entire body and independent status outputs',async()=>{
  const original=readFileSync(new URL('../../../src/api_error.rs',import.meta.url),'utf8');
  const item=sourceItems(original).find(item=>item.term==='fn'&&item.name==='openai_error_type');assert.ok(item);
  const declaration=original.slice(item.start,item.end);assert.equal(digest(declaration),'4821472c2fa2db9400bd30cacf285f8f7b845454670db1b93f7a45e377975097');
  const from="&'static str",to=S;assert.equal(declaration.split(from).length,2);
  // An explicit owned API adoption of the return type, not an implicit prelude
  // theorem. This original declaration already had a bounded legacy positive.
  const adopted=declaration.replace(from,to),before=transportConcreteSyntaxSource(declaration,{language:'Rust'}),after=transportConcreteSyntaxSource(adopted,{language:'Rust'});
  retain('full-actual-original',{source:original,span:{start:item.start,end:item.end},declaration,adopted,before,after});
  assert.equal(adopted.replace(to,from),declaration);assert.equal(before.source,declaration);assert.equal(after.source,adopted);
  const result=project(adopted);assert.equal(has(result,'openai_error_type'),true);borrowed(checked(result).declarations.get('openai_error_type').ret,'static');
  const expected=[[400n,'invalid_request_error'],[404n,'invalid_request_error'],[422n,'invalid_request_error'],[401n,'authentication_error'],[403n,'permission_error'],[429n,'rate_limit_error'],[500n,'api_error'],[0n,'api_error']];retain('independent-status-oracle',expected);
  await targets(result,api=>{for(const [status,value]of expected)assert.equal(api.openai_error_type(status),value);});
});

test('existing ordinary borrowed text keeps its source lifetime semantics alongside owned aliases',async()=>{
  const source='pub fn identity(value:&str)->&str{value} pub fn fixed()->&\'static str{"fixed"}';
  const result=retain('unchanged-legacy-project',translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source}));
  assert.equal(has(result,'identity'),true);assert.equal(has(result,'fixed'),true);
  const program=checked(result);assert.deepEqual(program.declarations.get('identity').params[0].type.rustOwnership,{kind:'borrowed',source:'str'});assert.equal(program.declarations.get('identity').sourceLifetimeProof.outputs[0].identity,'input:0:[]');
  await targets(result,api=>{assert.equal(api.identity('legacy'),'legacy');assert.equal(api.fixed(),'fixed');});
});
