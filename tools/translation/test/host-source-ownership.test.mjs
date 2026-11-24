import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions) {
  assert.deepEqual(result.meta.refused,[]);
  const folder=mkdtempSync(join(tmpdir(),'router-host-ownership-'));
  try {
    writeRuntimeAssets(folder);const js=join(folder,'src/fixture.mjs'),ts=join(folder,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000});
    try{execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(folder,'compiled'),ts],{encoding:'utf8',timeout:30_000});}catch(error){throw new Error(error.stdout+error.stderr,{cause:error});}
    for(const path of [js,join(folder,'compiled/fixture.js')])await assertions((await import(pathToFileURL(path).href)).translated);
  } finally {rmSync(folder,{recursive:true,force:true});}
}
test('default Host type branches retain ownership separately from actual reference pointees',()=>{
  const source='pub fn syntax(s:String,b:&str,r:&String,v:Vec<u8>,a:&[u8],n:&&u64)->u8{0} fn main(){}',entry=checkProgram(parseRust(source)).declarations.get('syntax');
  const types=entry.params.map(param=>param.type);
  assert.deepEqual(types[0].rustOwnership,{kind:'owned',source:'String'});assert.deepEqual(types[1].rustOwnership,{kind:'borrowed',source:'str'});
  assert.deepEqual(types[2].rustOwnership,{kind:'borrowed',source:'String'});assert.deepEqual(types[2].rustReference.pointee.rustOwnership,{kind:'owned',source:'String'});
  assert.deepEqual(types[3].rustOwnership,{kind:'owned',source:'Vec'});assert.deepEqual(types[4].rustOwnership,{kind:'borrowed',source:'slice'});
  assert.equal(types[4].rustReference.pointee.element.rustPrimitiveName,'u8');assert.equal(types[5].rustReference.pointee.rustReference.pointee.rustPrimitiveName,'u64');
  for(const type of types)assert.equal(type.rustSourceType,true);
});
test('ordinary source boundaries and Host early results preserve valid owned and borrowed identities',{timeout:30_000},async()=>{
  const source='pub fn owned(s:String)->String{s} pub fn borrowed(s:&str)->&str{s} pub fn vector(v:Vec<u8>)->Vec<u8>{v} pub fn slice(v:&[u8])->&[u8]{v} pub fn converted()->String{String::from("owned")} pub fn optional(v:Option<String>)->Option<String>{v} pub fn secs(v:&std::time::Duration)->u64{v.as_secs()} pub fn integer(v:&u64)->u64{*v}';
  await both(project(source),api=>{
    assert.equal(api.owned('text'),'text');assert.equal(api.borrowed('str'),'str');assert.equal(api.converted(),'owned');
    const values=Object.freeze([1n,2n]);assert.equal(api.vector(values),values);assert.equal(api.slice(values),values);
    const value=Object.freeze({$:'Some',field0:'owned'});assert.equal(api.optional(value),value);
    assert.equal(api.secs(Object.freeze({$:'Duration',secs:4n,nanos:0n})),4n);assert.equal(api.integer(9n),9n);
  });
  const type=checkProgram(parseRust('pub fn converted()->String{String::from("owned")} fn main(){}')).declarations.get('converted').body.type;
  assert.deepEqual(type.rustOwnership,{kind:'owned',source:'String'});
});
test('equal portable encodings do not waive source ownership or actual reference depth',()=>{
  for(const source of [
    'pub fn bad(s:String)->&str{s}',
    'pub fn bad(s:&str)->String{s}',
    'pub fn bad(v:Option<String>)->Option<&str>{v}',
    'pub fn bad(v:Option<&str>)->Option<String>{v}',
    'pub fn bad(v:Vec<u8>)->&[u8]{v}',
    'pub fn bad(v:&[u8])->Vec<u8>{v}',
    'pub fn bad(v:Option<Vec<u8>>)->Option<&[u8]>{v}',
    'pub fn bad(v:&String)->String{v}',
    'pub fn bad(v:&serde_json::Value)->serde_json::Value{v}',
    'pub fn bad()->&\'static str{String::from("owned")}',
    'pub fn bad(v:&u64)->&&u64{v}',
    'pub fn bad(v:Vec<Box<u8>>)->Vec<u8>{v}',
    'pub fn bad(v:u64)->u64{&&v}',
    'pub fn bad(v:[u8])->[u8]{v}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);}
});
