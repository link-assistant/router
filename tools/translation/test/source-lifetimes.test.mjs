import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {withSourceLifetimeChecker} from '../extensions/source-lifetimes.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions) {
  assert.deepEqual(result.meta.refused,[]);
  const folder=mkdtempSync(join(tmpdir(),'router-source-lifetime-'));
  try {
    writeRuntimeAssets(folder);const js=join(folder,'src/fixture.mjs'),ts=join(folder,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000});
    try{execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(folder,'compiled'),ts],{encoding:'utf8',timeout:30_000});}catch(error){throw new Error(error.stdout+error.stderr,{cause:error});}
    for(const path of [js,join(folder,'compiled/fixture.js')])await assertions((await import(pathToFileURL(path).href)).translated);
  } finally {rmSync(folder,{recursive:true,force:true});}
}
test('actual source lifetime syntax distinguishes single input elision and explicit static origins',{timeout:30_000},async()=>{
  const source='pub fn borrowed(v:&str)->&str{v} pub fn cleaned(v:&str)->&str{v.trim()} pub fn identity(v:&u64)->&u64{v} pub fn text()->&\'static str{"literal"} pub fn static_input(v:&\'static u64)->&\'static u64{v} pub fn caller(v:&str)->&str{borrowed(v)} pub fn choose(v:&str,b:bool)->&str{if b{v}else{"fallback"}}';
  const program=checkProgram(parseRust(source+' fn main(){}'));
  assert.equal(program.declarations.get('borrowed').sourceLifetimeProof.outputs[0].identity,'input:0:[]');
  assert.equal(program.declarations.get('text').sourceLifetimeProof.returnOrigins[0],'static');
  assert.equal(program.declarations.get('identity').sourceLifetimeProof.params[0][0].span.start,source.indexOf('&u64'));
  await both(project(source),api=>{assert.equal(api.borrowed('body'),'body');assert.equal(api.cleaned('  text  '),'text');assert.equal(api.identity(7n),7n);assert.equal(api.text(),'literal');assert.equal(api.static_input(9n),9n);assert.equal(api.caller('call'),'call');assert.equal(api.choose('input',true),'input');assert.equal(api.choose('input',false),'fallback');});
});
test('ambiguous elision, static escape and static arguments cannot borrow portable identity',()=>{
  for(const source of [
    'pub fn bad(a:&str,b:&str)->&str{a}',
    'pub fn bad()->&str{"literal"}',
    'pub fn bad(v:&u64)->&\'static u64{v}',
    'pub fn bad(v:&str)->&\'static str{v}',
    'pub fn bad(v:&str)->Option<&\'static str>{Some(v)}',
    'pub fn bad(v:&[&u64])->Option<&&u64>{v.first()}',
    'pub fn bad(v:&[&\'static u64])->Option<&\'static &\'static u64>{v.first()}',
    'fn needs(v:&\'static u64)->u64{*v} pub fn bad(v:&u64)->u64{needs(v)}',
    'fn needs(v:&\'static str)->u8{1} pub fn bad(v:&str)->u8{needs(v)}',
    'struct Holder{value:&\'static u64} pub fn bad(v:&u64)->Holder{Holder{value:v}}',
    'struct Holder{value:&\'static str} pub fn bad(v:Holder)->&str{v.value}',
    'fn identity(v:&str)->&str{v} pub fn bad(v:&str)->&\'static str{identity(v)}',
    'fn needs(v:Option<&\'static str>)->u8{1} pub fn bad(v:&str)->u8{needs(Some(v))}',
    'pub fn bad(v:String)->&\'static str{v.trim()}',
    'pub fn bad(v:Vec<u8>)->Option<&u8>{v.first()}',
    'pub fn bad<\'a,\'b>(v:&\'a str)->&\'b str{v}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);}
});
test('per-use tuple lifetimes cannot inherit a previous portable layout staticness',()=>{
  for(const prefix of ['pub fn first(v:&str)->(&str,u8){(v,0)} ','pub fn first(v:&\'static str)->(&\'static str,u8){(v,0)} ']) {
    const result=project(prefix+'pub fn bad(v:&str)->(&\'static str,u8){(v,0)}');
    assert.ok(result.meta.refused.some(entry=>entry.name==='bad'));
  }
  // Negative validation only: incomplete public tuple qualifiers cannot
  // remove the existing constructor field's independently written staticness.
  const original=checkProgram(parseRust("pub fn source(v:&str)->(&'static str,u8){(\"fixed\",0u8)}fn main(){}"));
  for(const fields of [[],[null]]){
    const program=structuredClone(original),entry=program.declarations.get('source'),ctor=entry.body;
    assert.equal(ctor.k,'ctor');assert.equal(ctor.args.length,2);
    ctor.type.rustTupleLifetimeFields=fields;
    ctor.args[0]={k:'var',name:'v',type:entry.params[0].type,span:ctor.args[0].span};
    class ValidationOnlyBase{constructor(){this.language='Rust';this.items=program.declarations;}resolveType(type){return type;}program(){return program;}}
    assert.throws(()=>new (withSourceLifetimeChecker(ValidationOnlyBase))().program({items:[]}),/static source parameter/);
  }
});
test('mutable borrowed bindings cannot retain stale initializer lifetime origins',()=>{
  for(const [source,diagnostic] of [
    ['pub fn bad(v:&str)->&\'static str{let mut x:&str="fixed";x=v;x}',/escaping source borrow/],
    ['pub fn bad(mut v:&str)->&\'static str{v="fixed";v}',/mutable borrowed parameter/],
    ['pub fn bad(v:&u64)->&\'static u64{let mut x:&u64=v;x=v;x}',/escaping source borrow/],
    ['pub fn bad(mut v:&\'static str)->&\'static str{v="fixed";v}',/mutable borrowed parameter/],
  ]){const result=project(source);const entry=result.meta.refused.find(entry=>entry.name==='bad');assert.ok(entry,source);assert.match(entry.message,diagnostic,source);}
  assert.deepEqual(project('pub fn count(mut n:u8)->u8{n=n+1;n}').meta.refused,[]);
});
test('mixed tuple leaves retain their distinct input and static origins',{timeout:30_000},async()=>{
  const source='pub fn good(v:&str)->(&str,&\'static str){(v,"fixed")} fn needs(v:(&\'static str,&str))->u8{1} pub fn accepted(v:&str)->u8{needs(("fixed",v))}';
  await both(project(source),api=>{const result=api.good('input');assert.equal(result.field0,'input');assert.equal(result.field1,'fixed');assert.equal(api.accepted('dynamic'),1n);});
  const result=project('fn needs(v:(&\'static str,&str))->u8{1} pub fn bad(v:&str)->u8{needs((v,"fixed"))}');
  assert.ok(result.meta.refused.some(entry=>entry.name==='bad'));
});
test('unchanged tracked static error classifier retains literal lifetime origin evidence',{timeout:30_000},async()=>{
  const source=readFileSync(new URL('../../../src/api_error.rs',import.meta.url),'utf8');
  const item=sourceItems(source).find(item=>item.term==='fn'&&item.name==='openai_error_type');
  assert.ok(item);const declaration=source.slice(item.start,item.end);
  const hash=createHash('sha256').update(declaration).digest('hex');
  assert.equal(hash,'4821472c2fa2db9400bd30cacf285f8f7b845454670db1b93f7a45e377975097');
  const result=project(declaration);
  assert.deepEqual(result.meta.executable.map(item=>item.name),['openai_error_type']);
  await both(result,api=>{for(const [status,value] of [[400n,'invalid_request_error'],[404n,'invalid_request_error'],[422n,'invalid_request_error'],[401n,'authentication_error'],[403n,'permission_error'],[429n,'rate_limit_error'],[500n,'api_error'],[0n,'api_error']])assert.equal(api.openai_error_type(status),value);});
});

test('computed standard Option results retain borrowed source leaves',{timeout:30_000},async()=>{
  const source="pub fn prefix(v:&'static str,p:&str)->Option<&'static str>{v.strip_prefix(p)} pub fn split(v:&str)->Option<(&str,&str)>{v.split_once('=')}";
  const result=project(source);await both(result,api=>{assert.deepEqual(api.prefix('prefix','pre'),{$:'Some',field0:'fix'});assert.deepEqual(api.prefix('prefix','x'),{$:'None'});assert.deepEqual(api.split('a=b'),{$:'Some',field0:{$:'Tuple',field0:'a',field1:'b'}});});
  for(const source of ["pub fn bad(v:&str)->Option<&'static str>{v.strip_prefix(\"x\")}","pub fn bad(v:&str)->Option<(&'static str,&'static str)>{v.split_once('=')}"])assert.ok(project(source).meta.refused.some(entry=>entry.name==='bad'));
  const dynamic="pub fn current(v:&str)->Option<&str>{Some(v)}pub fn nested(v:&str)->Option<Option<&str>>{Some(Some(v))}pub fn ok(v:&str)->Result<&str,u8>{Ok(v)}pub fn err(v:&str)->Result<u8,&str>{Err(v)}";
  const frozen="pub fn frozen(v:&'static str)->Option<&'static str>{Some(v)}pub fn frozen_nested(v:&'static str)->Option<Option<&'static str>>{Some(Some(v))}pub fn frozen_ok(v:&'static str)->Result<&'static str,u8>{Ok(v)}pub fn frozen_err(v:&'static str)->Result<u8,&'static str>{Err(v)}";
  const nestedDynamic="pub fn nested_ok(v:&str)->Result<Option<&str>,u8>{Ok(Some(v))}pub fn nested_err(v:&str)->Result<u8,Option<&str>>{Err(Some(v))}",nestedFrozen="pub fn frozen_nested_ok(v:&'static str)->Result<Option<&'static str>,u8>{Ok(Some(v))}pub fn frozen_nested_err(v:&'static str)->Result<u8,Option<&'static str>>{Err(Some(v))}";
  for(const parts of [[frozen,dynamic,nestedFrozen,nestedDynamic],[dynamic,frozen,nestedDynamic,nestedFrozen]]){
    const input=parts.join(' '),result=project(input);
    await both(result,api=>{
      for(const value of ['', '猫😀', '\0']){
        assert.deepEqual(api.current(value),{$:'Some',field0:value});assert.deepEqual(api.frozen(value),{$:'Some',field0:value});
        assert.deepEqual(api.nested(value),{$:'Some',field0:{$:'Some',field0:value}});assert.deepEqual(api.frozen_nested(value),{$:'Some',field0:{$:'Some',field0:value}});
        assert.deepEqual(api.ok(value),{$:'Ok',field0:value});assert.deepEqual(api.err(value),{$:'Err',field0:value});
        assert.deepEqual(api.nested_ok(value),{$:'Ok',field0:{$:'Some',field0:value}});assert.deepEqual(api.nested_err(value),{$:'Err',field0:{$:'Some',field0:value}});
        assert.deepEqual(api.frozen_nested_ok(value),{$:'Ok',field0:{$:'Some',field0:value}});assert.deepEqual(api.frozen_nested_err(value),{$:'Err',field0:{$:'Some',field0:value}});
      }
    });
    for(const body of ["pub fn bad(v:&str)->Option<&'static str>{Some(v)}","pub fn bad(v:&str)->Option<Option<&'static str>>{Some(Some(v))}","pub fn bad(v:&str)->Result<&'static str,u8>{Ok(v)}","pub fn bad(v:&str)->Result<u8,&'static str>{Err(v)}","struct Holder{value:&'static str}pub fn bad(v:&str)->Holder{Holder{value:v}}","fn needs(v:Option<&'static str>)->u8{1u8}pub fn bad(v:&str)->u8{needs(Some(v))}"]){
      const refused=project(input+' '+body),failure=refused.meta.refused.find(entry=>entry.name==='bad');assert.ok(failure,body);assert.match(failure.message,/static source parameter|escaping source borrow/);assert.equal(refused.meta.executable.some(entry=>entry.name==='bad'),false);
    }
    for(const body of ["pub fn bad(v:&str)->Result<Option<&'static str>,u8>{Ok(Some(v))}","pub fn bad(v:&str)->Result<u8,Option<&'static str>>{Err(Some(v))}"]){const refused=project(input+' '+body),failure=refused.meta.refused.find(entry=>entry.name==='bad');assert.ok(failure,body);assert.match(failure.message,/static source parameter|escaping source borrow/);assert.equal(refused.meta.executable.some(entry=>entry.name==='bad'),false);}
  }
});
test('source static reference field copies retain their written origin',{timeout:30_000},async()=>{
  const source="struct S{value:&'static u64} impl S{fn read(&self)->&'static u64{self.value}} pub fn run(v:S)->&'static u64{v.read()}";
  await both(project(source),api=>assert.equal(api.run(Object.freeze({$:'S',value:7n})),7n));
  assert.ok(project("struct S{value:&'static str} pub fn bad(v:S)->&str{v.value}").meta.refused.some(entry=>entry.name==='bad'));
});

test('diverging branches and checked let-else continuations retain borrow origins',{timeout:30_000},async()=>{
  const source="fn never()->&'static str{panic!(\"first\")} pub fn ordered()->&'static str{never().trim_end_matches(\"x\")} pub fn selected(v:&str)->&str{let Some((_,right))=v.rsplit_once('=') else{return v;};right}";
  await both(project(source),api=>{assert.throws(()=>api.ordered(),{message:'first'});assert.equal(api.selected('a=b'),'b');assert.equal(api.selected('plain'),'plain');});
});
