// Receiving observation storage only. This grants no compiler authority.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),SELF='tools/translation/prepare-closed-json-dag-observers.mjs',HELPER='tools/translation/test/fixtures/complete-closed-json-dag-hook-wire.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Complete closed JSON observer adapter: '+message);};
const names=new Map([['encodeCompleteJsonProjectionHookWire','encodeCompleteClosedJsonDagHookWire'],['decodeCompleteJsonProjectionHookWire','decodeCompleteClosedJsonDagHookWire'],['compareCompleteJsonProjectionHookWires','compareCompleteClosedJsonDagHookWires']]);
function originals(){
 const packed=readFileSync(new URL('./test/fixtures/closed-json-dag-observer-adapter-originals.json.gz',import.meta.url));
 if(packed.length!==7239||hash(packed)!=='d31a2da44fccb1d3adc0044e9d1f92059554b3d40195c06440d5aa5517042594')fail('complete original archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:65536});if(raw.length!==34199||hash(raw)!=='c1d3c84d1da7b6f270dc875dc5b488bf72d1092d4befb02aa6c43add9ae2ff31')fail('complete original source bytes differ');
 const value=JSON.parse(raw);if(value.schema!=='complete-closed-json-dag-observer-adapter-originals-v1'||value.files.length!==4||value.files.some(row=>hash(row.source)!==row.sha256)||new Set(value.files.map(row=>row.path)).size!==4)fail('complete four original sources required');return value.files;
}
function one(rows,label){if(rows.length!==1)fail('one actual native '+label+' required');return rows[0];}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native syntax differs: '+path);return file;}
function rewrite(source,edits){let after=source,last=source.length+1;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(edit.span[1]>last||after.slice(...edit.span)!==edit.expected)fail('native nonoverlapping exact span differs');last=edit.span[0];after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);}return after;}
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
export function prepareClosedJsonDagObservers({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');const inputs=[SELF,HELPER].map(path=>{const source=readFileSync(resolve(root,path),'utf8');return {path,source,sha256:hash(source)};}),helper=parse(ts,HELPER,inputs[1].source);
 for(const name of names.values())one(helper.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name&&node.modifiers?.some(value=>value.kind===ts.SyntaxKind.ExportKeyword)),name+' export');
 const files=originals().map(original=>{
  const {path,source:before}=original,file=parse(ts,path,before),selected=one(file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier?.text.endsWith('/complete-json-projection-hook-wire.mjs')),'complete original observer import');
  if(!selected.importClause?.namedBindings||!ts.isNamedImports(selected.importClause.namedBindings)||selected.importClause.name)fail('original named import aliases required');
  const edits=[],bindings=[];
  for(const spec of selected.importClause.namedBindings.elements){const imported=spec.propertyName??spec.name,target=names.get(imported.text);if(!target||!spec.propertyName)fail('exact original aliased storage import required');edits.push({span:[imported.getStart(file),imported.end],expected:imported.getText(file),replacement:target});bindings.push({before:imported.text,after:target,local:spec.name.text});}
  const module=selected.moduleSpecifier,target=module.text.replace('complete-json-projection-hook-wire.mjs','complete-closed-json-dag-hook-wire.mjs');edits.push({span:[module.getStart(file),module.end],expected:module.getText(file),replacement:JSON.stringify(target)});
  const after=rewrite(before,edits);parse(ts,path,after);let delta=0;const inverseEdits=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(edit=>{const start=edit.span[0]+delta;delta+=edit.replacement.length-edit.expected.length;return {span:[start,start+edit.replacement.length],expected:edit.replacement,replacement:edit.expected};});if(rewrite(after,inverseEdits)!==before)fail('independent complete native inverse differs');
  const first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),sequence={languageRules:[rule(before,before,'javascript:retain-complete-original-observer-workload')],repositoryRules:[rule(before,after,'router:explicit-closed-JSON-DATA-observation-storage')]},inverseSequence={languageRules:[],repositoryRules:[rule(after,before,'router:restore-complete-native-JSON-observation-imports')]},run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value);
  if(transportConcreteSyntaxMeta(afterMeta).source!==after||transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(afterMeta).document,inverseSequence).value)).source!==before)fail('complete serialized/reparsed CST inverse differs');
  const current=readFileSync(resolve(root,path),'utf8');if(current!==before&&current!==after)fail('current whole receiving source differs: '+path);
  return {path,before,after,current,beforeMeta:first.meta,afterMeta,sequence,inverseSequence,inverse:before,trace:run.trace,nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),selection:{imports:[selected.getText(file)],bindings,edits,inverseEdits,wholeBodiesAndDeadlinesUnchanged:true}};
 });
 for(const input of inputs)if(readFileSync(resolve(root,input.path),'utf8')!==input.source)fail('complete adapter source changed');
 return {schema:'complete-closed-json-dag-observer-adapters-v1',inputs,files,originalWorkloadsChanged:false,originalLimitsChanged:false,observationDataOnly:true,runtimeQualified:false,performanceQualified:false,sourceAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--write','--check'].includes(mode))fail('use --emit|--write|--check');const plan=prepareClosedJsonDagObservers();
 if(mode==='--write'){for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('whole source changed');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(mode==='--check'&&plan.files.some(row=>row.current!==row.after))fail('complete receiving source stale');console.log(JSON.stringify(mode==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),runtimeQualified:false}));
}
