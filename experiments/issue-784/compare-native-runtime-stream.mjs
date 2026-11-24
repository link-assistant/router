// Finite complete-module equivalence diagnostic, not a gate/deadline result.
import assert from 'node:assert/strict';
import {readFileSync,openSync,writeSync,closeSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {sourceModules,loadTypeScript,runtimeAST} from '../../tools/translation/js-to-rust/native-typescript.mjs';
import {matchesNativeRuntimeAST,hashMatchingNativeRuntimeAST} from '../../tools/translation/js-to-rust/native-runtime-identity.mjs';

const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,64}$/u);
const root=process.cwd(),prefix='ci-logs/issue-784-restart-2/'+label;
const output=prefix+'.jsonl.gz';assert.equal(existsSync(output),false);
const hash=value=>createHash('sha256').update(value).digest('hex');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const ts=loadTypeScript(root);assert.equal(ts.version,'5.9.3');
const paths=sourceModules(root);assert.ok(paths.length<=256);
const rows=paths.map(path=>{
 const source=readFileSync(path,'utf8'),targetPath=path.replace('js/','ts/').replace(/\.(?:mjs|js)$/u,'.ts');
 const typed=readFileSync(targetPath,'utf8');
 const erased=ts.transpileModule(typed,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,verbatimModuleSyntax:true,useDefineForClassFields:false},fileName:targetPath}).outputText;
 return {path,source,targetPath,typed,erased};
});
assert.ok(rows.reduce((sum,row)=>sum+Buffer.byteLength(row.source)+Buffer.byteLength(row.typed)+Buffer.byteLength(row.erased),0)<16*1024*1024);
const fd=openSync(output,'wx');let bytes=0;
const retain=value=>{
 const raw=Buffer.from(JSON.stringify(value)+'\n');assert.ok(raw.length<=64*1024*1024);
 const compressed=gzipSync(raw,{level:1});bytes+=compressed.length;assert.ok(bytes<=8*1024*1024);
 writeSync(fd,compressed);
};
const expected=new Map(),timings=[];
try{
 retain({schema:'complete-native-runtime-stream-equivalence-v1',head,compiler:ts.version,
  originalDeadlineQualified:false,fullGatePassed:false,productionExecutableGain:0});
 // Both orderings retain original checks. These observations do not constitute
 // controlled fresh-process performance or a whole receiving-test speed gain.
 for(const order of [['original','stream'],['stream','original']])for(const mode of order){
  const start=performance.now();
  for(const row of rows){
   let digest;
   if(mode==='original'){
    const tree=runtimeAST(ts,row.source,{rewriteImports:true});
    assert.equal(matchesNativeRuntimeAST(ts,row.erased,tree),true,row.path);
    const canonical=JSON.stringify(tree);digest=hash(canonical);
    if(!expected.has(row.path)){expected.set(row.path,digest);retain({...row,canonical,digest});}
   }else digest=hashMatchingNativeRuntimeAST(ts,row.source,row.erased,{rewriteImports:true});
   assert.equal(digest,expected.get(row.path),row.path);
  }
  const result={mode,elapsedMs:performance.now()-start,completeModules:rows.length};timings.push(result);console.log(JSON.stringify(result));
 }
 for(const row of rows){assert.equal(readFileSync(row.path,'utf8'),row.source);assert.equal(readFileSync(row.targetPath,'utf8'),row.typed);}
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),head);
 retain({result:{timings,completeModules:rows.length,allCanonicalDigestsEqual:true,physicalInputsUnchanged:true,
  originalDeadlineQualified:false,fullGatePassed:false,controlledSpeedup:false}});
}finally{closeSync(fd);}
console.log(JSON.stringify({output,bytes,head,completeModules:rows.length,allCanonicalDigestsEqual:true,controlledSpeedup:false}));
