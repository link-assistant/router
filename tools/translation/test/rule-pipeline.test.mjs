import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRulePipeline,exactSubstitutionRule,RULE_PHASES} from '../rule-pipeline.mjs';
import {translateSource,annotateRuntimeTypes,sha256} from '../translate.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {analyzeJavaScript,translateJavaScript,parseMeta,emitRust,emitTypeScript} from '../js-to-rust/translator.mjs';
import {toLino} from '../js-to-rust/vendor/ir.mjs';

const declaration=(language=[],repository=[])=>[{phase:'language',rules:language},{phase:'repository',rules:repository}];
const rule=(id,apply)=>({id,apply});
const retain=(name,value)=>{if(process.env.ROUTER_RULE_PIPELINE_VECTOR_DIR)writeFileSync(process.env.ROUTER_RULE_PIPELINE_VECTOR_DIR+'/'+name+'.json',JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$bigint:item.toString()}:item instanceof Map?{$map:[...item]}:item)+'\n');};

test('separate extensible sequences run once in declaration order with deterministic traces',()=>{
  const calls=[],context={source:'original.rs'};
  const pipeline=createRulePipeline(declaration([
    rule('parse',(value,actual)=>{assert.equal(actual,context);calls.push('parse');return value+' IR';}),
    rule('lower',value=>{calls.push('lower');return value+' JS';}),
  ],[rule('format',value=>{calls.push('format');return value+'\n';}),rule('quality',value=>{calls.push('quality');assert.ok(value.endsWith('\n'));return value;})]));
  const result=pipeline.run('Rust',context);
  retain('ordered-sequences',{input:'Rust',context,description:pipeline.description,result,calls});
  assert.equal(result.value,'Rust IR JS\n');assert.deepEqual(calls,['parse','lower','format','quality']);
  assert.deepEqual(result.trace,[{phase:'language',id:'parse'},{phase:'language',id:'lower'},{phase:'repository',id:'format'},{phase:'repository',id:'quality'}]);
  assert.deepEqual(pipeline.description,declaration(['parse','lower'],['format','quality']).map(({phase,rules})=>({phase,rules})));
  const extended=createRulePipeline(declaration([rule('new-language-rule',value=>value*2)],[rule('new-repo-rule',value=>String(value))]));
  assert.equal(extended.run(21).value,'42');assert.deepEqual(RULE_PHASES,['language','repository']);
});

test('missing, duplicate, reordered and unknown phases and duplicate rule IDs refuse',()=>{
  for(const phases of [[],[{phase:'language',rules:[]}],[...declaration()].reverse(),[{phase:'language',rules:[]},{phase:'quality',rules:[]}],[...declaration(),{phase:'repository',rules:[]}]])assert.throws(()=>createRulePipeline(phases),/language then repository/);
  for(const id of ['', 'x'.repeat(161),null])assert.throws(()=>createRulePipeline(declaration([rule(id,value=>value)])),/rule IDs/);
  assert.throws(()=>createRulePipeline(declaration([rule('same',value=>value)],[rule('same',value=>value)])),/rule IDs/);
});

test('declaration snapshots do not invoke accessors or proxy traps and ignore later mutation',()=>{
  let callbacks=0;
  const bad={id:'bad',get apply(){callbacks++;return value=>value;}};
  assert.throws(()=>createRulePipeline(declaration([bad])),/own data/);
  const proxy=new Proxy({id:'proxy',apply:value=>value},{getOwnPropertyDescriptor(){callbacks++;throw Error('trap');}});
  assert.throws(()=>createRulePipeline(declaration([proxy])),/own data/);
  const sparse=[];sparse.length=1;assert.throws(()=>createRulePipeline([{phase:'language',rules:sparse},{phase:'repository',rules:[]}]),/dense/);
  assert.equal(callbacks,0);
  const stage=rule('original',value=>value+1),phases=declaration([stage]),pipeline=createRulePipeline(phases);
  stage.id='changed';stage.apply=()=>99;phases[0].rules.push(rule('extra',()=>100));
  assert.equal(pipeline.run(1).value,2);assert.equal(pipeline.description[0].rules[0],'original');
  assert.ok(Object.isFrozen(pipeline));assert.ok(Object.isFrozen(pipeline.description[0].rules));
});

test('an exact thrown value propagates and prevents later rules',()=>{
  const error={message:'original refusal',proof:{genuine:true}},calls=[];
  const pipeline=createRulePipeline(declaration([rule('refuse',()=>{calls.push('refuse');throw error;})],[rule('must-not-run',()=>{calls.push('wrong');})]));
  assert.throws(()=>pipeline.run(null),actual=>actual===error);assert.deepEqual(calls,['refuse']);
});

test('async functions, returned promises and thenables refuse without invoking then accessors',()=>{
  assert.throws(()=>createRulePipeline(declaration([rule('async',async value=>value)])),/synchronous/);
  assert.throws(()=>createRulePipeline(declaration([rule('promise',()=>Promise.resolve(1))])).run(null),/asynchronous/);
  let reads=0;const thenable={get then(){reads++;throw Error('getter');}};
  assert.throws(()=>createRulePipeline(declaration([rule('thenable',()=>thenable)])).run(null),/asynchronous/);assert.equal(reads,0);
  const previous=Object.getOwnPropertyDescriptor(Object.prototype,'then'),opaque={original:true};
  try{
    Object.defineProperty(Object.prototype,'then',{configurable:true,get(){reads++;throw Error('inherited then');}});
    assert.equal(createRulePipeline(declaration([rule('opaque',value=>value)])).run(opaque).value,opaque);
    assert.equal(reads,0);
    Object.defineProperty(Object.prototype,'then',{configurable:true,value(){reads++;}});
    assert.equal(createRulePipeline(declaration([rule('opaque',value=>value)])).run(opaque).value,opaque);assert.equal(reads,0);
  }finally{if(previous)Object.defineProperty(Object.prototype,'then',previous);else delete Object.prototype.then;}
});

test('reentrant runs have independent traces and preserve private mutable and frozen identities',()=>{
  const proof=Object.freeze({origin:'private'}),input={proof,value:1},seen=[];
  let pipeline;
  pipeline=createRulePipeline(declaration([rule('visit',(value,context)=>{
    seen.push([value,context]);if(context==='outer'){const child=pipeline.run(value,'inner');assert.equal(child.value,value);assert.equal(child.trace.length,2);}return value;
  })],[rule('retain',value=>value)]));
  const result=pipeline.run(input,'outer');assert.equal(result.value,input);assert.equal(result.value.proof,proof);assert.equal(result.trace.length,2);assert.equal(seen.length,2);
  assert.ok(Object.isFrozen(result.trace));assert.ok(Object.isFrozen(result.trace[0]));assert.equal(Object.isFrozen(input),false);
});

test('exact substitutions retain original match-count errors and String replacement semantics',()=>{
  const replacement=exactSubstitutionRule('export-class','class Parser {','export class Parser {','upstream patch anchor drift: parser');
  const pipeline=createRulePipeline(declaration([replacement],[rule('newline',value=>value+'\n')]));
  assert.equal(pipeline.run('class Parser {}').value,'export class Parser {}\n');
  for(const source of ['class Other {}','class Parser {} class Parser {}'])assert.throws(()=>pipeline.run(source),error=>error.constructor===Error&&error.message==='upstream patch anchor drift: parser');
  const special=exactSubstitutionRule('replacement-semantics','abc','$&!','drift');assert.equal(special.apply('abc'),'abc!');
});

test('actual forward and reverse emissions equal complete direct checked-emitter outputs',async()=>{
  const source='pub fn choose(flag: bool) -> u64 { if flag { 7 } else { 9 } }';
  const actual=translateSource(source);
  assert.equal(actual.ir.counts.executableFunctions,1);assert.equal(actual.ir.counts.carried,0);
  const parsed=parseRust(source+'\nfn main() {}\n');
  const program=roundTripProgram(checkProgram({language:'Rust',items:parsed.items.filter(item=>item.name!=='main'),main:null}));
  const emitted=emitJavaScript(program,{runtimeModule:'./runtime/effects.mjs',reserved:['choose']}),entry=program.declarations.get('choose');
  const target=emitted.mappings.find(mapping=>mapping.source==='choose').target;
  const counts={executable:1,executableFunctions:1,executableConstants:0,executableTypes:0,executableConstructors:0,carried:0,preserved:0};
  const expected=`// Generated draft from input.rs; sha256=${sha256(source)}\n// Carried constructs are data, never runtime parity evidence.\n${[...emitted.preludes,...emitted.definitions].join('\n\n')}\n\nexport const translated = { ["choose"]: ${target} };\nexport const provenance = ${JSON.stringify({sourcePath:'input.rs',sourceSha256:sha256(source),...counts,runtimeParity:false})};\n`;
  assert.equal(actual.javascript,expected);
  const dataTypes=[...program.declarations.values()].filter(declaration=>declaration.k==='data');
  const typed=annotateRuntimeTypes(expected,new Map([[target,entry.params]]),dataTypes,new Map([[target,entry.ret]])).replace('export const translated =','export const translated: { "choose": (flag: boolean) => bigint } =');
  retain('actual-forward-before-comparison',{source,actual,parsed,program,emitted,expectedJavascript:expected,expectedTypescript:typed});
  assert.equal(actual.typescript,typed);
  const runtime=await import('data:text/javascript;base64,'+Buffer.from(actual.javascript).toString('base64'));
  assert.equal(runtime.translated.choose(true),7n);assert.equal(runtime.translated.choose(false),9n);assert.throws(()=>runtime.translated.choose(1),TypeError);
  const javascript='/** @param {boolean} flag @returns {number} */\nexport function choose(flag) { return flag ? 7 : 9; }';
  const analyzed=analyzeJavaScript(javascript);assert.deepEqual(analyzed.diagnostics,[]);
  const meta=analyzed.program.map(toLino).join('\n')+'\n',reparsed=parseMeta(meta),reverse=translateJavaScript(javascript);
  retain('actual-complete-emissions',{source,actual,parsed,program,emitted,expectedJavascript:expected,expectedTypescript:typed,javascript,analyzed,meta,reparsed,reverse,expectedRust:emitRust(reparsed),expectedReverseTypescript:emitTypeScript(reparsed)});
  assert.equal(reverse.meta,meta);assert.equal(reverse.rust,emitRust(reparsed));assert.equal(reverse.typescript,emitTypeScript(reparsed));
  const refused='export function nope() { return new WeakMap(); }';
  const diagnostics=analyzeJavaScript(refused).diagnostics;assert.ok(diagnostics.length);
  assert.throws(()=>translateJavaScript(refused),error=>error.diagnostic.kind===diagnostics[0].kind&&error.diagnostic.message===diagnostics[0].message);
});

test('complete pinned upstream source substitutions equal the prior sequential implementation byte for byte',()=>{
  for(const [file,before,after] of [['rust.js','class RustParser {','export class RustParser {'],['check.js','class Checker {','export class Checker {'],['emit-javascript.js','class JavaScriptEmitter {','export class JavaScriptEmitter {']]){
    const source=readFileSync(new URL('../vendor/meta-language/translation/'+file,import.meta.url),'utf8');
    const rewrite=value=>value.replace(/from (['"])(\.\.?\/[^'"]+)\1/gu,(_,quote,path)=>`from ${quote}file:///source/${path}${quote}`);
    let expected=source;if(expected.split(before).length!==2)throw Error('original anchor drift');expected=expected.replace(before,after);expected=rewrite(expected);
    const actual=createRulePipeline(declaration([exactSubstitutionRule(file,before,after,'original anchor drift')],[rule('resolve-imports',rewrite)])).run(source);
    assert.equal(actual.value,expected);assert.equal(actual.trace.length,2);
  }
});
