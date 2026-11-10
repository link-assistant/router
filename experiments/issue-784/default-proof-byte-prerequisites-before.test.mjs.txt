import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,symlinkSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {prepareDefaultProofByteAdoption,prepareDefaultProofByteEnclosingHistory} from '../prepare-default-proof-byte-adoption.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const archive='tools/translation/source-profiles/default-proof-byte-adoption/complete-original-inputs.json.gz';
const scope='tools/translation/operation-proof-byte-consumer-scope.mjs';
const prerequisites=['operation-proof-byte-bridge.mjs','operation-proof-byte-consumer-scope.mjs','operation-proof-byte-original-fallback.mjs'].map(name=>'tools/translation/'+name);
const hash=value=>createHash('sha256').update(value).digest('hex');
const originals=()=>JSON.parse(gunzipSync(readFileSync(join(root,archive)))).files;
function temporary(t){
  const target=mkdtempSync(join(tmpdir(),'router-default-byte-prerequisites-'));
  t.after(()=>rmSync(target,{recursive:true,force:true}));
  symlinkSync(join(root,'js'),join(target,'js'),'dir');
  return target;
}
function copy(target,path){mkdirSync(dirname(join(target,path)),{recursive:true});copyFileSync(join(root,path),join(target,path));}

// Exercise the shared prerequisite reader through its complete enclosing-source
// equation. The existing full-adoption tests retain all nine proposal rows.
test('complete enclosing source history composes only the genuine guarded prerequisite import',{timeout:60000},()=>{
  const plan=prepareDefaultProofByteEnclosingHistory(),before=originals();
  assert.equal(plan.prerequisiteInputs.length,3);
  for(const row of plan.prerequisiteInputs){
    const original=before.find(value=>value.path===row.path);
    assert.equal(row.source,readFileSync(join(root,row.path),'utf8'));
    assert.equal(row.sha256,hash(row.source));
    assert.equal(row.bytes,Buffer.byteLength(row.source));
    if(row.path!==scope){assert.deepEqual(row,original);continue;}
    assert.deepEqual(row.original,original);
    const equation=row.sourceEvolution;
    assert.equal(equation.path,scope);
    assert.equal(equation.current,row.source);
    assert.equal(equation.text,row.source);
    assert.equal(equation.source,original.source);
    assert.equal(equation.inverse,original.source);
    assert.equal(equation.sourceSha256,original.sha256);
    assert.equal(equation.consumerBodyUnchanged,true);
    assert.deepEqual(equation.stages.map(stage=>stage.phase),['language','repository']);
    for(const stage of equation.stages){
      assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);
      assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.text);
      assert.equal(stage.inverse,stage.source);
    }
  }
  assert.equal(plan.semanticAuthority,false);
  assert.equal(plan.runtimeExecuted,false);
  assert.equal(plan.performanceQualified,false);
});

test('the complete original prerequisite vector remains usable with its unchanged pins',{timeout:60000},t=>{
  const plan=prepareDefaultProofByteEnclosingHistory(),target=temporary(t);
  const paths=new Set([archive,plan.fragment.path,'tools/translation/default-proof-byte-operation.mjs',...plan.inputs.map(row=>row.path),...plan.files.map(row=>row.path),...plan.historicalLayers[0].inputs.map(row=>row.path),plan.historicalLayers[0].history.archiveInput.path]);
  for(const path of paths)copy(target,path);
  for(const path of prerequisites)writeFileSync(join(target,path),originals().find(row=>row.path===path).source);
  const historical=prepareDefaultProofByteEnclosingHistory({root:target});
  assert.deepEqual(historical.prerequisiteInputs,originals().filter(row=>prerequisites.includes(row.path)));
  assert.deepEqual(historical.files.map(row=>row.after),plan.files.map(row=>row.after));
  assert.equal(readFileSync(join(target,archive)).equals(readFileSync(join(root,archive))),true);
});

test('unrelated prerequisite bodies and foreign imports are refused before source proposals',{timeout:60000},t=>{
  const target=temporary(t);copy(target,archive);
  for(const path of prerequisites)copy(target,path);
  const source=readFileSync(join(target,scope),'utf8');
  for(const changed of [source+'\n// unrelated body extension\n',source.replace("'./guarded-proof-lexing-intrinsics.mjs'","'./foreign-lexing-intrinsics.mjs'")]){
    writeFileSync(join(target,scope),changed);
    assert.throws(()=>prepareDefaultProofByteAdoption({root:target}),/complete actual byte bridge prerequisite differs|private lexing import/);
  }
  writeFileSync(join(target,scope),source);
  for(const path of prerequisites.filter(path=>path!==scope)){
    const bytes=readFileSync(join(target,path));
    writeFileSync(join(target,path),Buffer.concat([bytes,Buffer.from('\n// foreign complete source\n')]));
    assert.throws(()=>prepareDefaultProofByteAdoption({root:target}),/complete actual byte bridge prerequisite differs/);
    writeFileSync(join(target,path),bytes);
  }
  for(const path of prerequisites)assert.equal(readFileSync(join(target,path)).equals(readFileSync(join(root,path))),true);
});
