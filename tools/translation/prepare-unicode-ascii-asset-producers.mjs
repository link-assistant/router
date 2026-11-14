// Derive separate current producers; historical producer APIs remain exact.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Current Unicode ASCII asset producers: '+message);};
const originals=[
 ['prepare-core-ascii-assets.mjs','4fee7e5b3eea78416c798bb5f736ec899fbc5dd8d2f875e3204c8eac98500c98'],
 ['prepare-core-ascii-base-assets.mjs','62d897166e88c3d82d46cae6ee888b8514a5c90621972ffcaaa22d2f2d616def'],
];
const once=(source,before,after)=>{if(source.split(before).length!==2)fail('unique complete native selection differs');return source.replace(before,()=>after);};
function ruleNames(base){return base?['ascii-base:retain-complete-original-source','ascii-base:explicit-selected-read-schedule','ascii-base:restore-complete-language-input','ascii-base:restore-complete-original-input']:['ascii-assets:retain-complete-original-source','ascii-assets:explicit-selected-read-schedule','ascii-assets:restore-complete-language-input','ascii-assets:restore-complete-original-input'];}
function entrySource(base,serializable,current=false){
 const entry=base?'prepareCoreAsciiBaseAssets':'prepareCoreAsciiAssets',schema=base?'router-owned-ascii-base-assets-v1':'router-owned-ascii-assets-v1';
 const metadata=base?"selection:{source:inputs.rows.find(row=>row.path===HOST).source,...result.selection},closure:result.closure,originalSourcePublicBuilderUnchanged:true,nonAsciiContextsUnchanged:true":
  "selection:{path:HOST,source:parent.source,sha256:parent.sha256,statements:result.selection.selected.map(row=>({name:row.name,span:[row.node.getStart(),row.node.end],source:row.node.getText()})),nativeBindings:result.selection.nativeBindings,nativeLexicalBindings:result.selection.links}";
 const historicalSelection=base||!serializable?'historical.selection':"{selected:historical.selection.selected.map(row=>({name:row.name,span:[row.node.getStart(),row.node.end],source:row.node.getText()})),links:historical.selection.links,statements:historical.selection.statements,nativeBindings:historical.selection.nativeBindings}";
 const preparation=current?`timing('prepare:start');const rows=originals();timing('prepare:originals');
 const inputs=currentUnicodeAssetInputs(rows,root);timing('prepare:unicode-inputs');
 const historical=afterSources(ts,rows);timing('prepare:historical');
 const result=afterSources(ts,inputs.rows),parent=inputs.rows.find(row=>row.path===HOST);timing('prepare:current');`:
  'const rows=originals(),inputs=currentUnicodeAssetInputs(rows,root),historical=afterSources(ts,rows),result=afterSources(ts,inputs.rows),parent=inputs.rows.find(row=>row.path===HOST);';
 return `export function ${entry}({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 ${preparation}
 const all=[...historical.files,...result.files],equations=transportConcreteNamedSourcePhases(all.map(row=>({before:row.before,middle:row.before,after:row.after,language:'JavaScript',rules:${JSON.stringify(ruleNames(base))}})));
${current?" timing('prepare:concrete-equations');\n":''} const historicalFiles=historical.files.map((row,at)=>prepare(ts,row,root,equations[at])),files=result.files.map((row,at)=>prepare(ts,row,root,equations[historical.files.length+at]));
 requireCurrentUnicodeAssetInputs(inputs);
${current?" timing('prepare:complete');\n":''} return {schema:${JSON.stringify(schema)},typescriptVersion:ts.version,files,${metadata},historical:{files:historicalFiles,selection:${historicalSelection},originals:rows},currentInputComposition:inputs,runtimeExecuted:false,rustExecuted:false,semanticAuthority:false,fullBuilderCallbackParity:false};
}`;
}
function prepareFile(ts,before,path,base,serializable=true,current=false){
 const parse=source=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;};
 const file=parse(before),fn=name=>{const found=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(found.length!==1)fail('one complete native '+name+' required');return found[0];};
 const helper=fn('prepare'),source=helper.getText(file),marker=' let current=null;',start=source.indexOf(marker);
 if(start<0)fail('complete original current-source read required');
 const tail=once(source.slice(start),'afterMeta:serializeConcreteSyntaxMeta(document)','afterMeta');
 const replacement=`function prepare(ts,row,root,equation){
 const {before,after}=row;
 if(equation.before!==before||equation.middle!==before||equation.after!==after||equation.inverse!==before)fail('complete named source equation differs');
 const stages=equation.stages.map(({phase,before,after,beforeMeta,afterMeta,trace})=>({phase,before,after,beforeMeta,afterMeta,trace,completeInverse:true})),beforeMeta=equation.beforeMeta,afterMeta=equation.afterMeta;
 ${tail}`;
 const entry=fn(base?'prepareCoreAsciiBaseAssets':'prepareCoreAsciiAssets'),edits=[[helper,replacement],[entry,entrySource(base,serializable,current)]].map(([node,replacement])=>({span:[node.getStart(file),node.end],expected:node.getText(file),replacement}));
 let middle=before;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(middle.slice(...edit.span)!==edit.expected)fail('complete native selection changed');middle=middle.slice(0,edit.span[0])+edit.replacement+middle.slice(edit.span[1]);}
 let after=once(middle,"import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';","import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';\nimport {currentUnicodeAssetInputs,requireCurrentUnicodeAssetInputs} from './current-unicode-asset-inputs.mjs';");
 if(!base)after=once(after,"from './prepare-core-ascii-base-assets.mjs'","from './prepare-current-core-ascii-base-assets.mjs'");
 if(current){
  after=once(after,"from './concrete-named-phases.mjs'","from './concrete-sequential-phases.mjs'");
  const producer=base?'current-core-ascii-base-assets':'current-core-ascii-assets';
  after=once(after,'function originals(){',"function timing(stage){if(process.env.ROUTER_TRANSLATION_PRODUCER_TRACE==='1')process.stderr.write(JSON.stringify({producer:"+JSON.stringify(producer)+",stage,timeMs:Date.now()})+'\\n');}\nfunction originals(){");
  if(!base){
   const native=parse(after),composer=native.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='composeCoreAsciiAssets');
   if(!composer?.body)fail('complete actual ASCII composer required');
   const at=composer.body.getStart(native)+1;
   const preflight=`
 // Authenticate the whole archived predecessor before native/CST preparation.
 // Accepted inputs retain complete preparation and its final comparison.
 const rows=originals(),before=new Map([[HELPER,''],[DATA,''],[SOURCE,rows.find(row=>row.path===SOURCE).source]]);
 for(const [path,source]of before)if(Object.hasOwn(prior,path)&&prior[path]&&prior[path].after!==source)fail('preceding complete source equation differs: '+path);
`;
   after=after.slice(0,at)+preflight+after.slice(at);
   const entry='export function prepareCurrentCoreAsciiReverseAssets(options={}){const birth=prepareCoreAsciiReverseSources(options),assets=composeCoreAsciiAssets(Object.fromEntries(birth.files.map(row=>[row.path,row])),options),base=composeCoreAsciiBaseAssets(assets.sources,options),retention=composeOwnedCorePrivateAnalysisRetention(base.sources,options),runtime=composeOwnedRuntimeImportEdges(retention.sources,options);return';
   const traced=`export function prepareCurrentCoreAsciiReverseAssets(options={}){
 timing('reverse:start');const birth=prepareCoreAsciiReverseSources(options);timing('reverse:birth');
 const assets=composeCoreAsciiAssets(Object.fromEntries(birth.files.map(row=>[row.path,row])),options);timing('reverse:assets');
 const base=composeCoreAsciiBaseAssets(assets.sources,options);timing('reverse:base');
 const retention=composeOwnedCorePrivateAnalysisRetention(base.sources,options);timing('reverse:retention');
 const runtime=composeOwnedRuntimeImportEdges(retention.sources,options);timing('reverse:runtime');
 return`;
   after=once(after,entry,traced);
  }
 }
 parse(middle);parse(after);return {before,middle,after,nativeEdits:edits};
}
export function prepareUnicodeAsciiAssetProducers({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const files=originals.map(([name,sha256])=>{
  const input='tools/translation/'+name,path='tools/translation/'+name.replace('prepare-core-','prepare-current-core-'),before=readFileSync(resolve(root,input),'utf8');
  if(hash(before)!==sha256)fail('complete original producer source differs: '+input);
  const previous=prepareFile(ts,before,path,name.includes('base-assets'),false),published=prepareFile(ts,before,path,name.includes('base-assets'));
  const sequential=prepareFile(ts,before,path,name.includes('base-assets'),true,true);
  const sourceReadPredecessor=once(sequential.after,"from './concrete-sequential-phases.mjs'","from './concrete-source-origin-phases.mjs'");
  let after=sourceReadPredecessor;
  if(!name.includes('base-assets')){
   after=once(after,"import {currentUnicodeAssetInputs,requireCurrentUnicodeAssetInputs} from './current-unicode-asset-inputs.mjs';", "import {currentUnicodeAssetInputs,requireCurrentUnicodeAssetInputs} from './current-unicode-asset-inputs.mjs';\nimport {deriveAsciiLiveSourceReads} from './ascii-live-source-reads.mjs';");
   after=once(after,'const result=afterSources(ts,inputs.rows),parent=', 'const result=deriveAsciiLiveSourceReads(ts,afterSources(ts,inputs.rows)),parent=');
   after=once(after,'currentInputComposition:inputs,runtimeExecuted:false', 'currentInputComposition:inputs,sourceReadEvolution:result.sourceReadEvolution,runtimeExecuted:false');
  }
  const native=ts.createSourceFile(path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(native.parseDiagnostics.length)fail('complete live source producer grammar differs');
  return {input,path,...sequential,after,sourceReadPredecessor,sequentialAfter:sequential.after,previousAfter:previous.after,publishedAfter:published.after,previousNativeEdits:previous.nativeEdits,beforeSha256:sha256};
 });
 const equations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.before,middle:row.middle,after:row.after,language:'JavaScript',rules:['language:compose-complete-known-unicode-asset-inputs','repository:bind-current-unicode-asset-input-composition','language:restore-complete-historical-asset-producer','repository:restore-historical-asset-imports']})));
 const publishedEquations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.publishedAfter,middle:row.publishedAfter,after:row.after,language:'JavaScript',rules:['language:retain-complete-published-producer','repository:sequential-source-data-and-refusal-preflight','language:restore-complete-published-language-input','repository:restore-complete-published-producer']})));
 const sequentialEquations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.sequentialAfter,middle:row.sequentialAfter,after:row.after,language:'JavaScript',rules:['language:retain-complete-sequential-producer','repository:primitive-source-origin-phase-domain','language:restore-complete-sequential-language-input','repository:restore-complete-sequential-producer']})));
 const sourceReadEquations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.sourceReadPredecessor,middle:row.sourceReadPredecessor,after:row.after,language:'JavaScript',rules:['language:retain-complete-source-read-producer','repository:observe-live-own-data-source-reads','language:restore-complete-source-read-language-input','repository:restore-complete-source-read-producer']})));
 for(const [at,row]of files.entries()){
  row.equation=equations[at];row.publishedEquation=publishedEquations[at];row.sequentialEquation=sequentialEquations[at];row.sourceReadEquation=sourceReadEquations[at];row.afterSha256=hash(row.after);let current=null;try{current=readFileSync(resolve(root,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}row.current=current;
  if(current!==null&&current!==row.after&&current!==row.previousAfter&&current!==row.publishedAfter&&current!==row.sequentialAfter&&current!==row.sourceReadPredecessor)fail('unknown complete current producer: '+row.path);
  if(row.after.split('\n').length>=1000)fail('complete source exceeds line bound');
  if(readFileSync(resolve(root,row.input),'utf8')!==row.before)fail('complete original producer changed');
 }
 return {schema:'current-unicode-ascii-asset-producers-v1',files,typescriptVersion:ts.version,originalProducerApisUnchanged:true,semanticAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--write','--check'].includes(mode))fail('use --write|--check');const plan=prepareUnicodeAsciiAssetProducers();
 if(mode==='--write'){for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete current asset producers are stale');
 console.log(JSON.stringify({files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false}));
}
