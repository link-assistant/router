// Finite whole-production CST diagnostic. No semantic/deadline qualification.
import assert from 'node:assert/strict';
import {readFileSync,openSync,writeSync,closeSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {sourceModules} from '../../tools/translation/js-to-rust/native-typescript.mjs';
import {prepareReverseConcreteParsedSourceChunks,assertReverseConcreteSourceHost} from '../../tools/translation/js-to-rust/concrete-source.mjs';

const root=process.cwd(),label=process.argv[2];
assert.match(label??'',/^[a-z0-9-]{1,64}$/u);
const prefix='ci-logs/issue-784-restart-2/'+label;
const hash=value=>createHash('sha256').update(value).digest('hex');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const rows=sourceModules(root).map(path=>({path,source:readFileSync(path,'utf8')}));
assert.ok(rows.length<=256);
assert.ok(rows.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0)<=8*1024*1024);
const expected=new Map(),results=[];
for(const [rowTarget,unitTarget]of [[64,262144],[32,131072]]){
 const path=prefix+'-'+rowTarget+'.jsonl.gz';
 assert.equal(existsSync(path),false);
 const fd=openSync(path,'wx');let bytes=0,groups=0,splits=0,observed=0;
 const started=performance.now();
 const retain=value=>{
  const raw=Buffer.from(JSON.stringify(value)+'\n');
  assert.ok(raw.length<=64*1024*1024);
  const compressed=gzipSync(raw,{level:1});bytes+=compressed.length;
  assert.ok(bytes<=4*1024*1024,'finite diagnostic output bound');
  writeSync(fd,compressed);
 };
 function* receive(selected){
  let result;
  try{result=prepareReverseConcreteParsedSourceChunks([selected.map(row=>({source:row.source,language:'JavaScript'}))]);}
  catch(error){
   if(selected.length<2||Object.getOwnPropertyDescriptor(error,'message')?.value!=='Private parser execution: corpus aggregate node/canonical budget')throw error;
   splits++;const middle=Math.floor(selected.length/2);
   yield* receive(selected.slice(0,middle));yield* receive(selected.slice(middle));return;
  }
  assert.equal(result.chunks.length,1);assert.equal(result.chunks[0].stages.length,selected.length);groups++;
  for(let at=0;at<selected.length;at++)yield {row:selected[at],stage:result.chunks[0].stages[at]};
 }
 try{
  retain({schema:'production-cst-packing-diagnostic-v1',head,rowTarget,unitTarget,
   semanticAuthority:false,deadlineQualified:false,fullGatePassed:false});
  let cursor=0;
  while(cursor<rows.length){
   const selected=[];let units=0;
   while(cursor<rows.length&&selected.length<rowTarget){
    const row=rows[cursor];if(selected.length&&units+row.source.length>unitTarget)break;
    selected.push(row);units+=row.source.length;cursor++;if(units>=unitTarget)break;
   }
   for(const {row,stage}of receive(selected)){
    assertReverseConcreteSourceHost();assert.equal(stage.source,row.source);
    assert.equal(readFileSync(row.path,'utf8'),row.source);
    const meta=stage.concreteSyntax.meta;
    assert.equal(JSON.parse(meta).source,row.source);
    if(rowTarget===64)expected.set(row.path,hash(meta));else assert.equal(hash(meta),expected.get(row.path));
    retain({path:row.path,source:row.source,concreteSyntax:stage.concreteSyntax});observed++;
   }
  }
  assert.equal(observed,rows.length);
  for(const row of rows)assert.equal(readFileSync(row.path,'utf8'),row.source);
  assertReverseConcreteSourceHost();
  const result={rowTarget,unitTarget,elapsedMs:performance.now()-started,groups,splits,observed,bytes};
  retain({result});results.push(result);console.log(JSON.stringify(result));
 }finally{closeSync(fd);}
}
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),head);
console.log(JSON.stringify({head,results,allOriginalSourcesRetained:true,allCanonicalWiresEqual:true,
 scope:'Only fresh complete production CST transport; no semantic output, original whole-test deadline, speedup or gate qualification.'}));
