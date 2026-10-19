import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {HostChecker,parseRust,checkProgram,emitJavaScript,requireOriginalPrimitiveTryFromChecker} from '../extensions/host-contracts.mjs';
import {TupleRustParser,TupleChecker,tupleInferenceKind} from '../extensions/tuples.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {originalStandardTupleContext,originalStandardTupleField,originalStandardTupleIdentity,originalStandardTupleLayout} from '../extensions/standard-method-context.mjs';
import {originalStandardCallContext} from '../extensions/original-standard-calls.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const vectorRoot=process.env.ROUTER_COLD_STANDARD_TUPLE_VECTOR_DIR;
let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(vectorRoot){mkdirSync(vectorRoot,{recursive:true});writeFileSync(join(vectorRoot,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value instanceof Map?{$map:[...value]}:value)+'\n');}}});
const HISTORICAL_FAILURE_TITLES=[
  "not ok 36 - /home/runner/work/router/router/tools/translation/test/builtin-derive-namespace-candidates.test.mjs",
  "not ok 53 - /home/runner/work/router/router/tools/translation/test/cargo-invocation-plan.test.mjs",
  "not ok 54 - /home/runner/work/router/router/tools/translation/test/cargo-normal-dependency-unit.test.mjs",
  "not ok 80 - /home/runner/work/router/router/tools/translation/test/conditional-namespace-superset.test.mjs",
  "not ok 81 - /home/runner/work/router/router/tools/translation/test/const-qualification.test.mjs",
  "not ok 83 - /home/runner/work/router/router/tools/translation/test/constant-evaluation.test.mjs",
  "not ok 86 - /home/runner/work/router/router/tools/translation/test/copy-layout-refusal-batches.test.mjs",
  "not ok 87 - /home/runner/work/router/router/tools/translation/test/copy-methods.test.mjs",
  "not ok 96 - /home/runner/work/router/router/tools/translation/test/csv-original-source.test.mjs",
  "not ok 98 - /home/runner/work/router/router/tools/translation/test/data-metadata.test.mjs",
  "not ok 125 - /home/runner/work/router/router/tools/translation/test/derive-helper-namespaces.test.mjs",
  "not ok 126 - /home/runner/work/router/router/tools/translation/test/derive-helper-originals.test.mjs",
  "not ok 142 - /home/runner/work/router/router/tools/translation/test/edition-panic-source-output.test.mjs",
  "not ok 150 - /home/runner/work/router/router/tools/translation/test/external-dependency-defaults.test.mjs",
  "not ok 151 - /home/runner/work/router/router/tools/translation/test/external-trait-default-context.test.mjs",
  "not ok 152 - /home/runner/work/router/router/tools/translation/test/external-trait-sources.test.mjs",
  "not ok 175 - /home/runner/work/router/router/tools/translation/test/impl-resolver.test.mjs",
  "not ok 205 - /home/runner/work/router/router/tools/translation/test/locked-serde-record-meta.test.mjs",
  "not ok 1415 - fresh original data entry initializes its real parser and checker",
  "not ok 1416 - fresh original text entry initializes its real parser and checker",
  "not ok 211 - /home/runner/work/router/router/tools/translation/test/macro-literal-panic-source-output.test.mjs",
  "not ok 220 - /home/runner/work/router/router/tools/translation/test/matches-immutable-context-cache.test.mjs",
  "not ok 238 - /home/runner/work/router/router/tools/translation/test/namespace-streaming-equivalence.test.mjs",
  "not ok 255 - /home/runner/work/router/router/tools/translation/test/original-namespace-parser.test.mjs",
  "not ok 265 - /home/runner/work/router/router/tools/translation/test/ownership.test.mjs",
  "not ok 304 - /home/runner/work/router/router/tools/translation/test/real-source-contracts.test.mjs",
  "not ok 356 - /home/runner/work/router/router/tools/translation/test/source-implementation-targets.test.mjs",
  "not ok 362 - /home/runner/work/router/router/tools/translation/test/source-method-admission.test.mjs",
  "not ok 364 - /home/runner/work/router/router/tools/translation/test/source-method-parser.test.mjs",
  "not ok 366 - /home/runner/work/router/router/tools/translation/test/source-method-transforms.test.mjs",
  "not ok 367 - /home/runner/work/router/router/tools/translation/test/source-method-validation.test.mjs",
  "not ok 377 - /home/runner/work/router/router/tools/translation/test/standard-bang-effects.test.mjs",
  "not ok 389 - /home/runner/work/router/router/tools/translation/test/standard-vec-source-output.test.mjs",
  "not ok 391 - /home/runner/work/router/router/tools/translation/test/static-source-items.test.mjs",
  "not ok 418 - /home/runner/work/router/router/tools/translation/test/vendored-toml.test.mjs"
];
const project=source=>retain('complete-project',{source,result:translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source})}).result;
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const [key,value]of Object.entries(node))if(!['type','span','sourceFrameProof','originalLoanProof','sourceSharedPatternProof','sourcePatternProjectionProof'].includes(key))for(const child of Array.isArray(value)?value:[value]){const found=find(child,predicate);if(found)return found;}return null;}
function cold(path,body='assert.ok(Object.keys(module).length>0);'){
  const url=new URL('../'+path,import.meta.url).href;
  const script="import assert from 'node:assert/strict';const module=await import("+JSON.stringify(url)+");"+body+";console.log(JSON.stringify({entry:"+JSON.stringify(path)+",ok:true}));";
  const child=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',timeout:20_000,maxBuffer:4*1024*1024});
  retain('complete-cold-entry',{path,url,script,child:{status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error&&{name:child.error.name,message:child.error.message,code:child.error.code}}});
  assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),{entry:path,ok:true});
}

test('historical thirty-five failures retain all original entry subjects and cold namespace roots',()=>{
  assert.equal(HISTORICAL_FAILURE_TITLES.length,35);assert.equal(new Set(HISTORICAL_FAILURE_TITLES).size,35);
  const files=HISTORICAL_FAILURE_TITLES.flatMap(title=>{const match=/tools\/translation\/test\/([^\s]+)/u.exec(title);return match?[match[1]]:[];});assert.equal(files.length,33);
  retain('complete-historical-failure-subjects',HISTORICAL_FAILURE_TITLES);
  retain('complete-current-original-test-sources',files.map(path=>({path,source:readFileSync(new URL(path,import.meta.url),'utf8')})));
  // These are production entry imports only. Original whole tests remain separate
  // receiving obligations with their own complete workloads and original caps.
  for(const path of ['extensions/external-trait-sources.mjs','matches-macro-context.mjs','source-implementation-targets.mjs','source-method-admission.mjs'])cold(path);
});

test('fresh canonical format text data and host entries initialize without an import warmup',()=>{
  cold('extensions/formatting.mjs','assert.equal(typeof module.FormatRustParser,"function");assert.equal(typeof module.FormatChecker,"function");');
  cold('extensions/text.mjs','assert.equal(typeof module.TextRustParser,"function");assert.equal(typeof module.TextChecker,"function");');
  for(const path of ['extensions/data.mjs','extensions/host-contracts.mjs'])cold(path,'const surface=module.parseRust("fn answer()->u8{7}fn main(){}");const program=module.checkProgram(surface);const ret=program.declarations.get("answer").ret;assert.deepEqual({kind:ret.kind,bits:ret.bits,signed:ret.signed},{kind:"fixed",bits:8,signed:false});');
});

test('ordinary bare tuple checking ignores fabricated public hooks and rejects borrowed fields',()=>{
  let getters=0,calls=0;
  class FakeHooks extends TupleChecker{}
  for(const key of ['originalStandardTupleContext','originalStandardTupleField','originalStandardTupleIdentity','recordOriginalStandardTuple'])Object.defineProperty(FakeHooks.prototype,key,{configurable:true,get(){getters++;return ()=>{calls++;return true;};}});
  const checker=new FakeHooks('Rust',[]),surface=new TupleRustParser(tokenizeRust('fn main(){}')).file();checker.program(surface);
  const location={start:0,end:1},fake={token:true,types:[{kind:'bool'}]},scalar=checker.inferTuple([{type:{kind:'bool'}}],location,fake,{k:'routerTuple'});
  assert.equal(scalar.entry.tuple,true);assert.equal(scalar.entry.tupleInference.kind,'checked-scalar-expression-product');
  const borrowed={kind:'string',rustOwnership:{kind:'borrowed',source:'str'},rustReference:{kind:'shared',pointee:{kind:'string'}}};
  assert.throws(()=>checker.inferTuple([{type:borrowed}],location,fake,{k:'routerTuple'}),error=>error.kind==='unsupported');
  assert.equal(getters,0);assert.equal(calls,0);retain('bare-tuple-fake-hooks',{surface,scalar,getters,calls});
  for(const owner of [checker,new TupleChecker('Rust',[]),{},Object.create(HostChecker.prototype)]){
    assert.equal(originalStandardTupleContext(owner,{k:'routerTuple'},[]),null);assert.equal(originalStandardTupleField(owner,fake,borrowed,0),false);assert.equal(originalStandardTupleIdentity(owner,fake,[]),null);assert.equal(originalStandardTupleLayout(owner,{kind:'data',name:'fake'},{}),null);
  }
});

test('ordinary products preserve checked primitive identity and execute both independent targets',async()=>{
  const source='pub fn scalar(a:bool,b:u8)->u8{let t=(a,b);t.1}pub fn nested(a:u8)->u8{let t=((a,true),9u16);(t.0).0}pub fn pair(a:usize,b:u64)->(usize,u64){let t=(a,b);t}',result=project(source);assert.deepEqual(result.meta.refused,[]);
  const canonical=JSON.stringify(result.meta.checkedSemanticProgram),checked=parseProgram(canonical);assert.equal(serializeProgram(checked),canonical);retain('complete-checked-roundtrip',{canonical,checked});
  await verifyTypedTargets(result,api=>{assert.equal(api.scalar(false,7n),7n);assert.equal(api.nested(11n),11n);assert.deepEqual(api.pair(3n,5n),{$:'Tuple',field0:3n,field1:5n});},{childTimeoutMs:20_000});
  for(const text of ['pub fn bad(v:&str)->bool{let t=(v,true);t.1}','pub fn bad(v:u64)->usize{let t=(v,true);t.0}','pub fn bad()->bool{let t=(1,true);t.1}']){const refused=project(text);assert.ok(refused.meta.refused.some(row=>row.name==='bad'));assert.equal(refused.meta.executable.some(row=>row.name==='bad'),false);}
});

test('genuine original shared Option equality retains private tuple layout and all four arms',async()=>{
  const source='pub fn equal(a:Option<&str>,b:Option<&str>)->bool{a==b}',result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),frame=find(checked.declarations.get('equal').body,node=>node.k==='routerOriginalSharedPatternMatch');assert.ok(frame);assert.equal(frame.sourceSharedPatternProof.pointeeMoveAuthority,false);
  const tuple=checked.declarations.get(frame.sourceSharedPatternProof.subjectType.name);assert.ok(tuple?.tuple);assert.match(tuple.fullName,/_source_/u);assert.ok(frame.sourceSharedPatternProof.layouts.some(row=>row.proof.kind==='original-standard-method-shared-parameter-product'));retain('complete-private-layout',{checked,frame,tuple});
  await verifyTypedTargets(result,api=>{for(const [left,right,wanted]of [[none,none,true],[none,some(''),false],[some('Ω😀'),none,false],[some('Ω😀'),some('Ω😀'),true],[some('é'),some('e\u0301'),false]])assert.equal(api.equal(left,right),wanted);assert.throws(()=>api.equal(some('\ud800'),none),TypeError);},{childTimeoutMs:20_000});
});

test('source callers copied programs and protected existing-method replacements cannot mint a frame',()=>{
  const source='fn equal(a:Option<&str>,b:Option<&str>)->bool{a==b}fn main(){}',surface=parseRust(source),entry=surface.items.find(row=>row.name==='equal'),call=find(entry.body,node=>node.k==='binary'&&node.op==='eq'),checker=new HostChecker('Rust',[]);checker.program(surface);const context=originalStandardCallContext(checker,call);retain('complete-genuine-source',{source,surface,context});
  assert.throws(()=>originalStandardCallContext(new HostChecker('Rust',[]),call),/unchanged actual privately captured/u);assert.throws(()=>originalStandardCallContext(checker,structuredClone(call)),/unchanged actual privately captured/u);
  assert.throws(()=>checkProgram(structuredClone(parseRust(source))),/private|captured|original|operand|equality|binary/u);
  for(const method of ['inferTuple','inferredTupleField']){
    const changed=new HostChecker('Rust',[]);Object.defineProperty(changed,method,{value:()=>true,configurable:true});assert.throws(()=>requireOriginalPrimitiveTryFromChecker(changed),/callbacks|method|source class/u);delete changed[method];requireOriginalPrimitiveTryFromChecker(changed);
    let getters=0;const accessor=new HostChecker('Rust',[]);Object.defineProperty(accessor,method,{configurable:true,get(){getters++;return ()=>true;}});assert.throws(()=>requireOriginalPrimitiveTryFromChecker(accessor),/callbacks|method|source class/u);assert.equal(getters,0);delete accessor[method];requireOriginalPrimitiveTryFromChecker(accessor);
    let owner=Object.getPrototypeOf(HostChecker.prototype);while(owner&&!Object.hasOwn(owner,method))owner=Object.getPrototypeOf(owner);assert.ok(owner);const original=Object.getOwnPropertyDescriptor(owner,method);
    try{Object.defineProperty(owner,method,{...original,value:()=>true});assert.throws(()=>requireOriginalPrimitiveTryFromChecker(new HostChecker('Rust',[])),/method identity changed/u);}finally{Object.defineProperty(owner,method,original);}
    requireOriginalPrimitiveTryFromChecker(new HostChecker('Rust',[]));
  }
  call.span.end++;assert.throws(()=>originalStandardCallContext(checker,call),/unchanged actual privately captured/u);
});

test('private tuple mutations refuse reemission and the pure metadata read keeps inherited-getter order',()=>{
  const source='pub fn equal(a:Option<&str>,b:Option<&str>)->bool{a==b}',result=project(source);assert.deepEqual(result.meta.refused,[]);
  const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),tuple=[...program.declarations.values()].find(row=>row.k==='data'&&row.tuple);assert.ok(tuple);tuple.ctors[0].fields[0].type={kind:'bool'};retain('full-tampered-program',program);assert.throws(()=>emitJavaScript(program),/changed|private|captured|source|layout/u);
  const tape=[],inherited=Object.create({get token(){tape.push('token');return undefined;}});assert.equal(tupleInferenceKind(inherited),'checked-scalar-expression-product');assert.deepEqual(tape,['token']);
  const defect=new Error('actual token getter');const throwing=Object.create({get token(){throw defect;}});assert.throws(()=>tupleInferenceKind(throwing),error=>error===defect);assert.equal(tupleInferenceKind(null),'checked-scalar-expression-product');assert.equal(tupleInferenceKind(undefined),'checked-scalar-expression-product');retain('metadata-getter-order',{tape,exactThrownIdentity:true});
});

test('original source operand effects still run once in order and preserve adapter error identity',async()=>{
  const source='fn left(v:Option<&str>)->Option<&str>{let ignored=std::fs::read_to_string("left").is_ok();v}fn right(v:Option<&str>)->Option<&str>{let ignored=std::fs::read_to_string("right").is_ok();v}pub fn equal(a:Option<&str>,b:Option<&str>)->bool{left(a)==right(b)}',result=project(source);assert.deepEqual(result.meta.refused,[]);
  const outcomes=[];await verifyTypedTargets(result,(api,_result,_module,{effects:{withEffectCapabilities}})=>{
    for(const [left,right,wanted]of [[none,none,true],[some('Ω'),some('Ω'),true],[some('a'),some('b'),false]]){const tape=[],capability={fs:{sync:{readFileSync(path){tape.push(path);return new Uint8Array();}}}};assert.equal(withEffectCapabilities(capability,()=>api.equal(left,right)),wanted);assert.deepEqual(tape,['left','right']);outcomes.push({left,right,wanted,tape});}
    for(const failAt of ['left','right']){const tape=[],defect=new Error(failAt),capability={fs:{sync:{readFileSync(path){tape.push(path);if(path===failAt)throw defect;return new Uint8Array();}}}};assert.throws(()=>withEffectCapabilities(capability,()=>api.equal(none,none)),error=>error===defect);assert.deepEqual(tape,failAt==='left'?['left']:['left','right']);outcomes.push({failAt,tape,exactErrorIdentity:true});}
  },{childTimeoutMs:20_000});retain('complete-effect-observations',outcomes);
});
