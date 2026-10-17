import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {translateSource} from '../translate.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
async function artifacts(result) {
  execFileSync('node',['--input-type=module','--check'],{input:result.javascript,encoding:'utf8',timeout:10000});
  const directory=mkdtempSync(join(tmpdir(),'router-iterator-identity-'));
  try {
    writeRuntimeAssets(directory);const path=join(directory,'src/module.ts');
    writeFileSync(join(directory,'src/module.mjs'),result.javascript);writeFileSync(path,result.typescript);
    const javascript=(await import(pathToFileURL(join(directory,'src/module.mjs')).href)).translated;
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',path],{encoding:'utf8',timeout:30000});
    const typescript=(await import(pathToFileURL(join(directory,'src/module.js')).href)).translated;
    return [javascript,typescript];
  }finally{rmSync(directory,{recursive:true,force:true});}
}
function compiled(source) {
  const checked=checkProgram(parseRust(source+'\nfn main() {}'));
  const serialized=serializeProgram(checked);assert.equal(serializeProgram(parseProgram(serialized)),serialized);
  const result=translateSource(source,'src/module.rs');
  assert.equal(result.ir.counts.carried,0);assert.equal(result.ir.runtimeParity,false);
  return {result,checked};
}
const refuse=source=>{
  const result=translateSource(source,'src/module.rs');
  assert.ok(result.ir.items.some(item=>item.name==='bad'&&item.status==='carried'),source);
  assert.equal(result.ir.items.some(item=>item.name==='bad'&&item.status==='executable'),false,source);
};

test('iterator counts retain actual usize identity on arrays, ranges and size-taking adapters',async()=>{
  const {result,checked}=compiled('pub fn count(value:&[u8])->usize{value.iter().count()} pub fn range(start:u8,end:u8)->usize{(start..end).count()} pub fn bounded(value:&[u8],limit:usize)->usize{value.iter().take(limit).count()}');
  for(const name of ['count','range','bounded'])assert.equal(checked.declarations.get(name).body.type.rustPrimitiveName,'usize');
  for(const api of await artifacts(result)) {
    assert.equal(api.count(Object.freeze([])),0n);assert.equal(api.count(Object.freeze([1n,2n,3n])),3n);
    assert.equal(api.range(2n,6n),4n);assert.equal(api.range(6n,2n),0n);
    assert.equal(api.bounded(Object.freeze([1n,2n,3n]),2n),2n);assert.equal(api.bounded(Object.freeze([1n]),0n),0n);
  }
});

test('iterator count does not implicitly coerce usize to u64, isize or a shared reference',()=>{
  for(const source of [
    'fn bad(value:&[u8])->u64{value.iter().count()}',
    'fn bad(value:&[u8])->isize{value.iter().count()}',
    'fn bad(value:&[u8])->&usize{value.iter().count()}',
    'fn bad(value:&[u8])->u64{let count=value.iter().count();count}',
    'fn bad(value:&[u8],limit:u64)->usize{value.iter().take(limit).count()}',
  ])refuse(source);
});
