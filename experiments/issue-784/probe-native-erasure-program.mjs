// Whole generated production sources; compare fresh emissions, never reuse a verdict.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const ts=createRequire(process.cwd()+'/js/package.json')('typescript');
assert.equal(ts.version,'5.9.3');
const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,60}$/u);
const manifest=JSON.parse(readFileSync('tools/translation/js-to-rust/generated/native-typescript/manifest.json','utf8'));
assert.ok(manifest.modules.length>0&&manifest.modules.length<=512);
const sources=manifest.modules.map(row=>({path:row.target,text:readFileSync(row.target,'utf8')}));
assert.ok(sources.reduce((sum,row)=>sum+Buffer.byteLength(row.text),0)<8*1024*1024);
const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,
 verbatimModuleSyntax:true,useDefineForClassFields:false};
const checksum=text=>createHash('sha256').update(text).digest('hex');
function separate(){
 const start=performance.now();
 const rows=sources.map(({path,text})=>({path,text:ts.transpileModule(text,{compilerOptions:options,fileName:path}).outputText}));
 return {elapsedMs:performance.now()-start,rows};
}
function grouped(){
 const start=performance.now(),settings={...ts.getDefaultCompilerOptions(),...options};
 for(const option of ts.optionDeclarations){
  if(!Object.hasOwn(option,'transpileOptionValue')||option.name==='isolatedModules')continue;
  settings[option.name]=option.transpileOptionValue;
 }
 Object.assign(settings,{suppressOutputPathCheck:true,allowNonTsExtensions:true,declaration:false,declarationMap:false});
 const map=new Map(),outputs=new Map();
 for(const {path,text} of sources){
  const file=ts.createSourceFile(path,text,{languageVersion:ts.getEmitScriptTarget(settings),
   setExternalModuleIndicator:ts.getSetExternalModuleIndicator(settings),jsDocParsingMode:ts.JSDocParsingMode.ParseAll});
  assert.deepEqual(file.parseDiagnostics,[]);map.set(path,file);
 }
 const host={getSourceFile:path=>map.get(path),writeFile:(path,text)=>{assert.equal(outputs.has(path),false);outputs.set(path,text);},
  getDefaultLibFileName:()=> 'lib.d.ts',useCaseSensitiveFileNames:()=>false,
  getCanonicalFileName:path=>path,getCurrentDirectory:()=>'',getNewLine:()=> '\n',
  fileExists:path=>map.has(path),readFile:()=>'',directoryExists:()=>true,getDirectories:()=>[]};
 const program=ts.createProgram(sources.map(row=>row.path),settings,host);
 const emitted=program.emit();assert.equal(emitted.emitSkipped,false);assert.deepEqual(emitted.diagnostics,[]);
 assert.equal(outputs.size,sources.length);
 const rows=sources.map(({path})=>{const text=outputs.get(path.replace(/\.ts$/u,'.js'));assert.equal(typeof text,'string');return {path,text};});
 return {elapsedMs:performance.now()-start,rows};
}
const observations=[];
for(const name of ['separate','grouped','grouped','separate']){
 const result=(name==='separate'?separate:grouped)();
 if(observations.length)assert.deepEqual(result.rows,observations[0].rows);
 observations.push({name,...result});
 console.log(JSON.stringify({name,elapsedMs:result.elapsedMs,modules:result.rows.length}));
}
for(const {path,text} of sources)assert.equal(readFileSync(path,'utf8'),text);
const raw=Buffer.from(JSON.stringify({schema:'complete-native-erasure-program-diagnostic-v1',
 compiler:ts.version,sources,observations,allWholeEmissionsEqual:true,
 diagnosticOnly:true,originalDeadlineQualified:false,productionExecutableGain:0}));
assert.ok(raw.length<32*1024*1024);
const path='ci-logs/issue-784-restart-2/'+label+'.json.gz';
writeFileSync(path,gzipSync(raw),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(path)),raw);
console.log(JSON.stringify({path,decodedBytes:raw.length,sha256:checksum(raw)}));
