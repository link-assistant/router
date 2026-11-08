// Development source proposal. Grouped CST DATA never grants semantic authority.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteSourcePhases} from './concrete-phased-equations.mjs';
const root=new URL('../../',import.meta.url),path='tools/translation/js-to-rust/native-typescript.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const originalSha256='46ec636ff5c2ffa3ec3dfd8dfbc7b73f7a01b171286cf6d5c78b3320726d8208';
function once(source,expected,replacement){
 if(source.indexOf(expected)<0||source.indexOf(expected)!==source.lastIndexOf(expected))throw Error('Unique complete native-build anchor required');
 return source.replace(expected,()=>replacement);
}
export function prepareNativeRegenerationBatch(){
 const bytes=gunzipSync(readFileSync(new URL('source-profiles/native-regeneration-batch/original.mjs.gz',import.meta.url)),{maxOutputLength:1048576});
 if(hash(bytes)!==originalSha256)throw Error('Complete original native TypeScript source differs');
 const before=bytes.toString(),ts=ownershipCompiler();
 if(ts.version!=='5.9.3')throw Error('Lockfile TypeScript 5.9.3 required');
 const file=ts.createSourceFile(path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)throw Error('Original native grammar differs');
 const selected=name=>{
  const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  if(rows.length!==1)throw Error('Unique original native function required: '+name);
  return before.slice(rows[0].getStart(file),rows[0].end);
 };
 const parser=once(once(selected('parseBuildNativeJavaScript'),
  'function parseBuildNativeJavaScript(', 'function parseBuildReconstructedNativeJavaScript('),
  'source=prepareReverseConcreteSource(source).source;', 'assertReverseConcreteSourceHost();');
 let builder=once(selected('buildNativeTypeScript'),
  'export function buildNativeTypeScript(', 'function buildNativeTypeScriptForRegeneration(');
 builder=once(builder,
  "  for (const path of paths) {\n    const source = readFileSync(join(sourceRoot, path), 'utf8');\n    const meta = parseBuildNativeJavaScript(ts, path, source, { file: inference.program.getSourceFile(join(sourceRoot, path)), checker: inference.checker });",
  '  for (const {path,source} of nativeRegenerationParsedConcreteSources(sourceRoot, paths)) {\n    const meta = parseBuildReconstructedNativeJavaScript(ts, path, source, { file: inference.program.getSourceFile(join(sourceRoot, path)), checker: inference.checker });');
 const helpers=`
// Separate regeneration-only source-origin contract. Public build/parser APIs
// retain their original standalone observer schedule. No verdict survives a call.
import {prepareReverseConcreteParsedSourceChunks,assertReverseConcreteSourceHost} from './concrete-source.mjs';
function* nativeRegenerationParsedConcreteSources(sourceRoot, paths) {
  const originals=[];
  let cursor=0;
  while(cursor<paths.length) {
    const rows=[];let units=0;
    while(cursor<paths.length && rows.length<16) {
      const path=paths[cursor],source=readFileSync(join(sourceRoot,path),'utf8');
      if(rows.length && units+source.length>65536)break;
      rows.push({path,source});units+=source.length;cursor++;
      if(units>=65536)break;
    }
    const result=prepareReverseConcreteParsedSourceChunks([rows.map(row=>({source:row.source,language:'JavaScript'}))]);
    if(result.chunks.length!==1)throw new Error('native concrete source-origin chunk count differs');
    const batch=result.chunks[0];
    if(batch.stages.length!==rows.length)throw new Error('native concrete batch row count differs');
    for(let at=0;at<rows.length;at++) {
      const row=rows[at],source=batch.stages[at].source;
      assertReverseConcreteSourceHost();
      if(source!==row.source || readFileSync(join(sourceRoot,row.path),'utf8')!==source)throw new Error('native concrete source snapshot differs for '+row.path);
      originals.push(row);yield {path:row.path,source};
      assertReverseConcreteSourceHost();
    }
  }
  // Rejoin every complete physical input after all semantic consumers return.
  for(const row of originals)if(readFileSync(join(sourceRoot,row.path),'utf8')!==row.source)throw new Error('native concrete source changed during regeneration: '+row.path);
  assertReverseConcreteSourceHost();
}
`;
 const language=createRulePipeline([
  {phase:'language',rules:[exactLiteralSubstitutionRule('native-regeneration:complete-private-build-copy',
   before,before+helpers+'\n'+parser+'\n\n'+builder+'\n','Complete original native build source differs')]},
  {phase:'repository',rules:[]},
 ]).run(before);
 const middle=language.value;
 const repository=createRulePipeline([
  {phase:'language',rules:[]},
  {phase:'repository',rules:[exactLiteralSubstitutionRule('native-regeneration:select-private-grouped-build',
   'const artifacts = buildNativeTypeScript(sourceRoot);',
   'const artifacts = buildNativeTypeScriptForRegeneration(sourceRoot);','Original regeneration build call differs')]},
 ]).run(middle);
 const after=repository.value;
 for(const source of [middle,after])if(ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw Error('Complete candidate native grammar differs');
 // Retain the exact installed predecessor as a second complete source
 // equation. This is source DATA, never a remembered native/semantic verdict.
 let previousAfter=after;
 for(const [next,previous]of [
  ['// Separate regeneration-only source-origin contract. Public build/parser APIs','// Separate regeneration-only grouped source contract. Public build/parser APIs'],
  ["import {prepareReverseConcreteParsedSourceChunks,assertReverseConcreteSourceHost} from './concrete-source.mjs';","import {prepareReverseConcreteSources,assertReverseConcreteSourceHost} from './concrete-source.mjs';"],
  ['function* nativeRegenerationParsedConcreteSources(', 'function* nativeRegenerationConcreteSources('],
  ['for (const {path,source} of nativeRegenerationParsedConcreteSources(sourceRoot, paths))', 'for (const {path,source} of nativeRegenerationConcreteSources(sourceRoot, paths))'],
  ["    const result=prepareReverseConcreteParsedSourceChunks([rows.map(row=>({source:row.source,language:'JavaScript'}))]);\n    if(result.chunks.length!==1)throw new Error('native concrete source-origin chunk count differs');\n    const batch=result.chunks[0];","    const batch=prepareReverseConcreteSources(rows.map(row=>({source:row.source,language:'JavaScript'})));"],
 ])previousAfter=once(previousAfter,next,previous);
 const previousSha256='399c4719f43a7fdf9e682219fb38463e06accd4ac6bae980ee314a40e035c362';
 if(hash(previousAfter)!==previousSha256)throw Error('Complete original grouped-regeneration predecessor differs');
 const [equation,previousEquation]=transportConcreteSourcePhases([
  {before,middle,after,language:'JavaScript'},
  {before:previousAfter,middle:after,after,language:'JavaScript'},
 ]);
 const physical=readFileSync(new URL(path,root),'utf8');
 if(physical!==before&&physical!==previousAfter&&physical!==after)throw Error('Physical native source is neither full original nor exact proposal');
 return {schema:'native-regeneration-concrete-batch-proposal-v1',path,before,middle,after,
  originalSha256,middleSha256:hash(middle),afterSha256:hash(after),equation,
  previousAfter,previousSha256,previousEquation,
  trace:[language.trace,repository.trace],compiler:ts.version,semanticAuthority:false,
  productionExecutableGain:0,standalonePublicBuildUnchanged:true};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--emit','--write','--check'].includes(mode))throw Error('Use --emit, --write or --check');
 const plan=prepareNativeRegenerationBatch(),target=new URL(path,root);
 if(mode==='--emit')process.stdout.write(JSON.stringify(plan)+'\n');
 else if(mode==='--write')writeFileSync(target,plan.after);
 else if(readFileSync(target,'utf8')!==plan.after)throw Error('Native regeneration proposal is stale');
 if(mode!=='--emit')console.log(JSON.stringify({mode,path,afterSha256:plan.afterSha256,semanticAuthority:false}));
}
