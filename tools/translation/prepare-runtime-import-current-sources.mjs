// Additive receiving sources compose the exact later native regeneration layer.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {prepareRuntimeImportPhasedData} from './prepare-runtime-import-phased-data.mjs';
import {prepareNativeRegenerationBatch} from './prepare-native-regeneration-batch.mjs';
import {transportConcreteSourcePhases} from './concrete-phased-equations.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {proposeRuntimeCompilerSelections} from './prepare-runtime-compiler-selections.mjs';
import {proposeRuntimeCompilerLifetime} from './prepare-runtime-compiler-lifetime.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),base='tools/translation/';
const hash=value=>createHash('sha256').update(value).digest('hex');
const helper=base+'owned-runtime-node-source-data.mjs';
const helperPin='6a2986c290f98352c55702edaa89e41dba33416778944d8be07974633b918e69';
const fail=message=>{throw TypeError('Current runtime import source: '+message);};
const once=(source,before,after)=>{if(source.split(before).length!==2)fail('unique complete source anchor required');return source.replace(before,()=>after);};
const paths=[
 'prepare-core-ascii-assets.mjs','prepare-executable-checked-source.mjs',
 'prepare-core-ascii-base-assets.mjs','prepare-source-lifetime-refusal-batches.mjs',
 'prepare-primitive-identity-boundary.mjs','prepare-core-matches-sources.mjs',
 'prepare-core-vector-sources.mjs','test/router-core-vectors.test.mjs',
 'js-to-rust/test/runtime-import-parents.test.mjs',
 'test/runtime-import-phased-data.test.mjs',
];
const nativeOld='46ec636ff5c2ffa3ec3dfd8dfbc7b73f7a01b171286cf6d5c78b3320726d8208';
const nativePrevious='399c4719f43a7fdf9e682219fb38463e06accd4ac6bae980ee314a40e035c362';
const sourceOriginPrevious='b0e9ed69588b445686802b67cd5e71a51f43921f6797a2c0304438eee7d7793b';
const historyAssertion="  if(path==='tools/translation/js-to-rust/native-typescript.mjs'){assert.equal(row.sourceHistory[0].afterSha256,'"+nativeOld+"');assert.equal(row.sourceHistory[1].before,row.sourceHistory[0].after);assert.equal(row.sourceHistory[1].after,row.after);}\n";
const originalName='prepare-owned-runtime-import-edges.mjs',currentName='prepare-owned-runtime-import-current.mjs';
const nodeName='owned-runtime-node-current-source-data.mjs';
const addition=`
// The original producer remains exact. This copy admits one known later source
// equation only; every original compiler, archive, source and Hash check runs.
import {prepareNativeRegenerationBatch} from './prepare-native-regeneration-batch.mjs';
function composeCurrentNativeRegenerationRow(ts,root,original) {
 if(resolve(root)!==resolve(ROOT))fail('current native equation requires its actual repository root');
 const batch=prepareNativeRegenerationBatch();
 if(batch.path!==original.path||batch.before!==original.after)fail('complete native regeneration predecessor differs');
 const current=equation(ts,root,original.path,original.before,original.after,batch.after,original.nativeSelections);
 return {...current,sourceHistory:[original,batch]};
}
`;
export function prepareRuntimeImportCurrentSources(){
 const original=prepareRuntimeImportPhasedData().file;
 if(original.current!==original.after)fail('complete original phased producer must be current');
 const ts=ownershipCompiler(),files=[],nativeBatch=prepareNativeRegenerationBatch();
 const nativeCurrent=nativeBatch.afterSha256;
 if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const parse=(path,source)=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;};
 const before=original.after,file=parse(original.path,before),selected=[];
 function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='nativeRow')selected.push(node);ts.forEachChild(node,visit);}visit(file);
 if(selected.length!==1||selected[0].initializer?.getText(file)!=='equation(ts,root,NATIVE,nativeBefore,nativeLanguage,nativeAfter,nativeEdits)')fail('complete native row selection differs');
 const node=selected[0].initializer,replacement='composeCurrentNativeRegenerationRow(ts,root,'+node.getText(file)+')';
 const middle=before.slice(0,node.getStart(file))+replacement+before.slice(node.end)+addition;
 let after=once(middle,"from './owned-runtime-node-source-data.mjs'","from './"+nodeName+"'");
 after=once(after,"from './concrete-phased-equations.mjs'","from './concrete-sequential-equations.mjs'");
 const previousAfter=after,publishedAfter=once(after,"from './concrete-sequential-equations.mjs'","from './concrete-phased-equations.mjs'");
 const compilerSelections=proposeRuntimeCompilerSelections(ts,base+currentName,after),indexedAfter=compilerSelections.after;
 const compilerLifetime=proposeRuntimeCompilerLifetime(ts,base+currentName,indexedAfter);after=compilerLifetime.after;
 files.push({path:base+currentName,before,middle,after,previousAfter,publishedAfter,indexedAfter,compilerSelections,compilerLifetime,nativeSelection:{span:[node.getStart(file),node.end],expected:node.getText(file),replacement}});
 const dataBefore=readFileSync(resolve(root,helper),'utf8');if(hash(dataBefore)!==helperPin)fail('complete original Node DATA helper differs');
 const dataMiddle=once(dataBefore,"new URL('./"+originalName+"',import.meta.url)","new URL('./"+currentName+"',import.meta.url)");
 let dataAfter=once(dataMiddle,"['tools/translation/"+originalName+"'","['tools/translation/"+currentName+"'");
 const tail="'tools/translation/js-to-rust/native-typescript.mjs'];";
 dataAfter=once(dataAfter,tail,"'tools/translation/js-to-rust/native-typescript.mjs','tools/translation/prepare-native-regeneration-batch.mjs','tools/translation/source-profiles/native-regeneration-batch/original.mjs.gz','tools/translation/prepare-runtime-import-current-sources.mjs','tools/translation/"+originalName+"','tools/translation/concrete-sequential-equations.mjs','tools/translation/concrete-sequential-phases.mjs','tools/translation/private-parser-sequential-phases.mjs'];");
 const previousDataAfter=once(dataAfter,",'tools/translation/concrete-sequential-equations.mjs','tools/translation/concrete-sequential-phases.mjs','tools/translation/private-parser-sequential-phases.mjs'",'');
 files.push({path:base+nodeName,before:dataBefore,middle:dataMiddle,after:dataAfter,previousAfter:previousDataAfter});
 for(const relative of paths){
  const path=base+relative,current=readFileSync(resolve(root,path),'utf8');
  let old=current.includes(currentName)?current.replaceAll(currentName,originalName):current;
  if(relative==='test/runtime-import-phased-data.test.mjs'){
   if(old.includes(historyAssertion))old=once(old,historyAssertion,'');
   for(const pin of [nativePrevious,sourceOriginPrevious,nativeCurrent])if(old.includes(pin))old=once(old,pin,nativeOld);
  }
  const native=parse(path,old),imports=[];
  function find(value){if(ts.isStringLiteral(value)&&value.text.endsWith('/'+originalName))imports.push(value);ts.forEachChild(value,find);}find(native);
  if(!imports.length)fail('complete receiving import absent: '+path);
  let changed=old;for(const item of imports.sort((a,b)=>b.getStart(native)-a.getStart(native)))changed=changed.slice(0,item.getStart(native))+item.getText(native).replace(originalName,currentName)+changed.slice(item.end);
  if(relative==='test/runtime-import-phased-data.test.mjs'){
   // Keep the first case's exact historical producer path and its whole pin.
   changed=once(changed,"new URL('../"+currentName+"',import.meta.url)","new URL('../"+originalName+"',import.meta.url)");
   changed=once(changed,nativeOld,nativeCurrent);
   changed=once(changed,'  assert.equal(row.inverse,row.before);',historyAssertion+'  assert.equal(row.inverse,row.before);');
  }
  const previousAfter=relative==='test/runtime-import-phased-data.test.mjs'?once(changed,nativeCurrent,nativePrevious):undefined;
  files.push({path,before:old,middle:old,after:changed,current,...(previousAfter===undefined?{}:{previousAfter})});
 }
 const equations=transportConcreteSourcePhases(files.map(row=>({before:row.before,middle:row.middle,after:row.after,language:'JavaScript'})));
 for(const [at,row]of files.entries()){
  parse(row.path,row.before);parse(row.path,row.middle);parse(row.path,row.after);
  if(row.after.split('\n').length>=1000)fail('complete source exceeds repository line bound');
  row.equation=equations[at];if(row.equation.inverse!==row.before)fail('complete source inverse differs');
  row.nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,row.path),row.after);
  row.current=existsSync(resolve(root,row.path))?readFileSync(resolve(root,row.path),'utf8'):null;
  if(Object.hasOwn(row,'previousAfter')){
   [row.previousEquation]=transportConcreteSourcePhases([{before:row.previousAfter,middle:row.after,after:row.after,language:'JavaScript'}]);
   if(row.previousEquation.inverse!==row.previousAfter)fail('complete previous receiving inverse differs');
  }
  if(Object.hasOwn(row,'publishedAfter')){
   [row.publishedEquation]=transportConcreteSourcePhases([{before:row.publishedAfter,middle:row.after,after:row.after,language:'JavaScript'}]);
   if(row.publishedEquation.inverse!==row.publishedAfter)fail('complete published receiving inverse differs');
  }
  if(Object.hasOwn(row,'indexedAfter')){
   [row.indexedEquation]=transportConcreteSourcePhases([{before:row.indexedAfter,middle:row.after,after:row.after,language:'JavaScript'}]);
   if(row.indexedEquation.inverse!==row.indexedAfter)fail('complete indexed receiving inverse differs');
  }
  if(row.current!==null&&row.current!==row.before&&row.current!==row.after&&(!Object.hasOwn(row,'previousAfter')||row.current!==row.previousAfter)&&(!Object.hasOwn(row,'publishedAfter')||row.current!==row.publishedAfter)&&(!Object.hasOwn(row,'indexedAfter')||row.current!==row.indexedAfter))fail('unexpected complete physical source: '+row.path);
 }
 if(readFileSync(resolve(root,original.path),'utf8')!==before||readFileSync(resolve(root,helper),'utf8')!==dataBefore)fail('complete original input changed');
 return {schema:'current-runtime-import-source-composition-v1',files,typescriptVersion:ts.version,
  originalProducer:original,originalNodeHelper:{path:helper,source:dataBefore,sha256:helperPin},
  originalPublicPreparationUnchanged:true,originalRuntimeIssuersUnchanged:true,semanticAuthority:false,runtimeParity:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--emit','--check','--write'].includes(mode))fail('use --emit|--check|--write');
 const plan=prepareRuntimeImportCurrentSources();
 if(mode==='--emit')console.log(JSON.stringify(plan));
 else if(mode==='--write'){for(const row of plan.files)writeFileSync(resolve(root,row.path),row.after);}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete current receiving sources are stale');
 if(mode!=='--emit')console.log(JSON.stringify({mode,files:plan.files.map(row=>row.path),semanticAuthority:false}));
}
