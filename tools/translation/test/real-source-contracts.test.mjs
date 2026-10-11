import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';

const root=new URL('../../../',import.meta.url);
const fixture=JSON.parse(readFileSync(new URL('../fixtures/real-source-provenance.json',import.meta.url),'utf8'));
const hash=text=>createHash('sha256').update(text).digest('hex');
function exactModule(id) {
  const entry=fixture.entries.find(entry=>entry.id===id);assert.ok(entry,`unknown source evidence ${id}`);
  const source=readFileSync(new URL(entry.path,root),'utf8');assert.equal(hash(source),entry.sourceSha256,`${entry.path}: source pin changed`);
  const items=sourceItems(source);
  const declarations=entry.declarations.map(pin=>{
    const matches=items.filter(item=>item.start===pin.start && item.end===pin.end && item.name===pin.name && item.term===pin.term);
    assert.equal(matches.length,1,`${entry.path}:${pin.name}: exact structural declaration missing`);
    const text=source.slice(pin.start,pin.end);assert.equal(hash(text),pin.sha256);return text;
  });
  return {entry,source:declarations.join('\n')};
}
async function checkedModule(id) {
  const {entry,source}=exactModule(id);
  const result=translateProject({entry:entry.path,paths:[entry.path],readSource:path=>{assert.equal(path,entry.path);return source;}});
  assert.deepEqual(result.meta.moduleDiagnostics,[]);
  assert.deepEqual(result.meta.refused,[],`${id}: a refused source declaration supplies no executable evidence`);
  assert.deepEqual(result.meta.executable.filter(item=>item.term==='fn').map(item=>item.name).sort(),[...entry.bodyNames].sort());
  assert.equal(result.meta.runtimeParity,false);
  const temporary=mkdtempSync(join(tmpdir(),'router-actual-source-'));
  try {
    const artifact=join(temporary,entry.path.replace(/\.rs$/u,'.mjs'));mkdirSync(dirname(artifact),{recursive:true});
    symlinkSync(fileURLToPath(new URL('../extensions/',import.meta.url)),join(temporary,'runtime'),'dir');
    writeFileSync(artifact,result.javascript);
    const {translated}=await import(pathToFileURL(artifact).href);return {translated,result};
  } finally {rmSync(temporary,{recursive:true,force:true});}
}

test('production source pins select complete original declarations without body substitutions',()=>{
  assert.equal(fixture.fullParity,false);assert.equal(fixture.rustExecution,false);
  for(const entry of fixture.entries){
    exactModule(entry.id);
    if(entry.testSource && entry.testName){const tests=readFileSync(new URL(entry.testSource,root),'utf8');assert.match(tests,new RegExp(`fn ${entry.testName}\\(`));}
  }
  assert.ok(fixture.obligations.length>0,'unresolved source obligations must remain visible');
});

test('actual Claude credential predicate executes its checked original production body',async()=>{
  const {translated}=await checkedModule('identity-token');
  for(const [token,expected] of [['sk-ant-oat01-abc',true],['sk-ant-api03-abc',false],['',false],['sk-ant-oat',true],[' sk-ant-oat01-abc',false],['SK-ANT-OAT01-abc',false]])assert.equal(translated.is_oauth_credential(token),expected,token);
});
