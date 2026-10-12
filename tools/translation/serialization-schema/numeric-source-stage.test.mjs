import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NUMERIC_SOURCE_STAGE_PROFILE as profile,captureNumericFormatterSources,numericSourceInputsFromFiles,compileNumericSourceStages,compileOriginalRustSourceStages,emitNumericSourceStage,requireNumericFormatterAuthority} from './numeric-source-stage.mjs';
import {loadJavaScript} from '../test/artifact-loader.mjs';
import {verifyTypedTargets} from '../test/typed-targets.mjs';
const manifest=()=>readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'),lock=()=>readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8');
let captured;
function actual(){return captured??=numericSourceInputsFromFiles({manifest:manifest(),lock:lock()});}
function generic(source,extra={}){return compileOriginalRustSourceStages({entry:'src/lib.rs',sources:{'src/lib.rs':source},...extra});}
function outputs(stage){assert.equal(stage.translationFailure,null);return emitNumericSourceStage(stage);}
const max64=(1n<<64n)-1n;

test('actual Cargo selects Zmij rather than unrelated locked Ryu and preserves complete licensed source',()=>{
  const input=actual();assert.equal(profile.formatter.name,'zmij');assert.equal(profile.formatter.version,'1.0.23');assert.equal(profile.formatter.sha256,'29666d0abbfad1e3dc4dcf6144730dd3a3ab225bbbdac83319345b1b44ccfc1b');
  assert.equal(input.packages[1].members.some(member=>member.path==='LICENSE-MIT'),true);assert.equal(input.packages[1].members.some(member=>member.path==='src/traits.rs'),true);assert.equal(input.buildScript.executionAvailable,false);
  assert.equal(input.consumerMethod.owner.name,'Formatter');assert.equal(input.consumerMethod.method,'write_f64');assert.match(input.consumerMethod.source,/buffer\.format_finite\(value\)/);assert.equal(input.formatterEquivalence,false);
});

test('mutated formatter source archive cannot inherit checked source identity',()=>{
  const formatterArchive=readFileSync(new URL(profile.formatter.archive,import.meta.url));formatterArchive[formatterArchive.length-8]^=1;
  assert.throws(()=>captureNumericFormatterSources({manifest:manifest(),lock:lock(),consumerArchive:readFileSync(new URL(profile.consumer.archive,import.meta.url)),formatterArchive}),/Locked zmij archive differs/);
});

test('changed Cargo dependency checksum or version never receives the original formatter certificate',()=>{
  const args={consumerArchive:readFileSync(new URL(profile.consumer.archive,import.meta.url)),formatterArchive:readFileSync(new URL(profile.formatter.archive,import.meta.url))};
  assert.throws(()=>captureNumericFormatterSources({...args,manifest:manifest(),lock:lock().replace(profile.formatter.sha256,'0'.repeat(64))}),/exact original Cargo/);
  assert.throws(()=>captureNumericFormatterSources({...args,manifest:manifest()+'\n',lock:lock()}),/exact original Cargo/);
});

test('copied and forged inputs cannot select source stages or confer formatting authority',()=>{
  assert.throws(()=>compileNumericSourceStages(structuredClone(actual())),/private captured/);
  assert.throws(()=>compileNumericSourceStages({...actual(),formatterEquivalence:true}),/private captured/);
  assert.throws(()=>requireNumericFormatterAuthority({formatterEquivalence:true}),/remain.*refused/);
});

test('whole original crate stages execute actual u128 multiply and high-word bodies without JS replacements',async()=>{
  const stage=compileNumericSourceStages(actual()),emitted=outputs(stage),api=(await loadJavaScript(emitted.javascript)).translated;
  assert.equal(api.umul128(0n,max64),0n);assert.equal(api.umul128(max64,max64),max64*max64);
  assert.equal(api.umul128_hi64(max64,max64),max64-1n);assert.equal(api.umul128_hi64(1n<<63n,2n),1n);
  assert.throws(()=>api.umul128(-1n,1n));assert.throws(()=>api.umul128(1n<<64n,1n));
  assert.equal(stage.meta.executable.some(entry=>entry.name==='umul128'),true);assert.equal(stage.formatterEquivalence,false);
});

test('unsafe buffer implementation and manual Float trait remain source-bearing refusals',()=>{
  const stage=compileNumericSourceStages(actual());outputs(stage);
  const buffers=stage.originalRows.filter(row=>row.term==='impl'&&row.source.includes('format_finite'));
  assert.notEqual(buffers.length,0);assert.equal(buffers.every(row=>row.source.includes('unsafe')&&row.status==='carried'),true);
  assert.equal(stage.originalRows.some(row=>row.name==='FloatTraits'&&row.term==='trait'&&row.status==='carried'),true);
  assert.equal(stage.meta.executable.some(entry=>entry.name==='format_finite'),false);
  assert.equal(stage.unsafeMemory,false);assert.equal(stage.traitCompleteness,false);assert.equal(stage.runtimeParity,false);
});

test('generic primitive stages preserve exact u128 products shifts and explicit narrowing',async()=>{
  const stage=generic('pub fn high(x:u64,y:u64)->u64{((x as u128*y as u128)>>64)as u64}pub fn low(x:u128)->u64{x as u64}');
  const api=(await loadJavaScript(outputs(stage).javascript)).translated;
  assert.equal(api.high(max64,max64),max64-1n);assert.equal(api.low((1n<<100n)+123n),123n);
  assert.throws(()=>api.high(1,2n));assert.throws(()=>api.low(1n<<128n));assert.equal(stage.inputs.lockedExternalPackage,false);
});

test('generic signed arithmetic shifts and branch order agree on independently authored boundaries',async()=>{
  const stage=generic('pub fn signed(x:i32)->i32{if x<0{x>>3}else{x+1}}pub fn chosen(x:u64,flag:bool)->u64{if flag{x>>1}else{x/10}}');
  const api=(await loadJavaScript(outputs(stage).javascript)).translated;
  assert.equal(api.signed(-9n),-2n);assert.equal(api.signed(-1n),-1n);assert.equal(api.signed(0n),1n);assert.equal(api.chosen(19n,true),9n);assert.equal(api.chosen(19n,false),1n);
  assert.throws(()=>api.chosen(19n,1));assert.throws(()=>api.signed(1n<<31n));
});

test('checked semantic meta and separately compiled strict TS execute the same genuine primitive source',async()=>{
  const stage=generic('pub fn wide(x:u64,y:u64)->u128{x as u128*y as u128}pub fn branch(x:i64)->i64{if x<0{x>>4}else{x}}'),emitted=outputs(stage);
  await verifyTypedTargets({...emitted,meta:{entry:'src/lib.rs'}},api=>{assert.equal(api.wide(max64,max64),max64*max64);assert.equal(api.branch(-17n),-2n);assert.equal(api.branch(9n),9n);},{childTimeoutMs:30000});
  const document=JSON.parse(emitted.meta);assert.equal(document.meta.checkedSemanticProgram.schema,'checked-rust-semantic-meta-v1');assert.equal(document.meta.targetSemanticProgram.schema,'checked-rust-semantic-meta-v1');
});

test('late primitive aliases retain the original whole-file type namespace',async()=>{
  const stage=generic('pub fn keep(x:u64)->u64{x}type u64=u8;'),api=(await loadJavaScript(outputs(stage).javascript)).translated;
  assert.equal(api.keep(255n),255n);assert.throws(()=>api.keep(256n));
});

test('genuine module callees resolve from original files while missing files remain explicit',async()=>{
  const stage=compileOriginalRustSourceStages({entry:'src/lib.rs',sources:{'src/lib.rs':'mod arithmetic;pub fn high(x:u64)->u64{arithmetic::half(x)}','src/arithmetic.rs':'pub fn half(x:u64)->u64{x>>1}'}});
  const api=(await loadJavaScript(outputs(stage).javascript)).translated;assert.equal(api.high(19n),9n);assert.equal(api['arithmetic.half'](21n),10n);
  const missing=generic('mod arithmetic;pub fn high(x:u64)->u64{arithmetic::half(x)}');outputs(missing);assert.notEqual(missing.moduleDiagnostics.length,0);assert.equal(missing.meta.executable.some(entry=>entry.name==='high'),false);
});

test('unproved pointers and mutable buffer writes refuse rather than expose stubs',async()=>{
  const stage=generic('pub unsafe fn write(value:u8,out:*mut u8){*out=value}pub fn independent(x:u64)->u64{x+1}'),api=(await loadJavaScript(outputs(stage).javascript)).translated;
  assert.equal(api.independent(8n),9n);assert.equal(Object.hasOwn(api,'write'),false);assert.equal(stage.originalRows.some(row=>row.name==='write'&&row.status==='carried'),true);
  assert.throws(()=>emitNumericSourceStage(structuredClone(stage)),/private unmodified/);
});

test('configuration input remains a candidate and cannot silently become actual build authority',()=>{
  const stage=generic('#[cfg(feature="alternate")]pub fn candidate(x:u64)->u64{x+1}',{candidateConfiguration:{flags:{test:false},values:{feature:['alternate']},closedKeys:['feature']}});
  outputs(stage);assert.equal(stage.meta.executable.some(entry=>entry.name==='candidate'),true);assert.equal(stage.configuration.authority,false);assert.equal(stage.targetBuildConfiguration,false);assert.equal(stage.formatterEquivalence,false);
  assert.throws(()=>generic('pub fn identity(x:u64)->u64{x}',{candidateConfiguration:{formatterEquivalence:true}}),/unknown compilation profile/);
});

test('source mutations change executable behavior and no formatter output is admitted from ordinary source hashes',async()=>{
  const a=generic('pub fn changed(x:u64)->u64{x+1}'),b=generic('pub fn changed(x:u64)->u64{x+2}');
  assert.equal((await loadJavaScript(outputs(a).javascript)).translated.changed(9n),10n);assert.equal((await loadJavaScript(outputs(b).javascript)).translated.changed(9n),11n);
  assert.throws(()=>compileOriginalRustSourceStages({entry:'../lib.rs',sources:{'../lib.rs':'pub fn f()->u8{1}'}}),/path\/data is invalid/);
  let reads=0;assert.throws(()=>compileOriginalRustSourceStages({entry:'src/lib.rs',sources:{get 'src/lib.rs'(){reads++;return 'pub fn f()->u8{1}'}}}),/path\/data is invalid/);assert.equal(reads,0);
  assert.throws(()=>generic(' '.repeat(512*1024+1)),/budget exceeded/);
  for(const value of [0,-0,Number.MIN_VALUE,Number.MAX_VALUE,1e-6,1e16,NaN,Infinity])assert.throws(()=>requireNumericFormatterAuthority(value),/finite f64 formatting remains refused/);
});
