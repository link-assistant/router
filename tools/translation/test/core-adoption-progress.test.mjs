import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,lstatSync,existsSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolveModuleGraph} from '../project.mjs';
import {proposeCoreBase64Corpus} from '../migrate-core-base64.mjs';
import {proposeCoreAdoptionSequence,proposeCoreAdoptionCorpus,proposeCoreJsonReadersGzipPackets} from '../propose-core-adoption-corpus.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
const root=new URL('../../../',import.meta.url),base=new URL('../',import.meta.url),cli=fileURLToPath(new URL('../propose-core-adoption-corpus.mjs',import.meta.url));
const manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8');
const nativeJson=JSON.stringify,vectorRoot=process.env.ROUTER_CORE_ADOPTION_PROGRESS_VECTOR_DIR,hash=value=>createHash('sha256').update(value).digest('hex');
let retained=[];const retain=(kind,value)=>{retained.push({kind,value});return value;};
const test=(name,run)=>nodeTest(name,{timeout:60000},async t=>{retained=[];try{await run(t);}finally{if(vectorRoot){mkdirSync(vectorRoot,{recursive:true});writeJsonTextGzip(join(vectorRoot,Buffer.from(name).toString('hex')+'.json.gz'),nativeJson({name,vectors:retained}));}}});
const SOURCE_RULES={
  "tools/translation/migrate-core-base64.mjs": [
    {
      "before": "import {resolveModuleGraph} from './project.mjs';",
      "after": "import {resolveModuleGraph} from './project.mjs';\nimport {translationProgressReporter} from './translation-progress.mjs';"
    },
    {
      "before": "function fileProposal(source,modules,all,profile,context,nonTrait){\n const before=transportConcreteSyntaxSource(source,{language:'Rust'}),edits=[],selections=[],skipped=[],importRoles=[];\n for(const module of modules){const owners=scope(module,all,profile,context,nonTrait);importRoles.push(...owners.imports);",
      "after": "function fileProposal(source,modules,all,profile,context,nonTrait,progress=null){\n const file=modules[0].file;\n if(progress)progress({stage:'project-serialize',state:'start',source:file,phase:'base64-original-CST'});\n const before=transportConcreteSyntaxSource(source,{language:'Rust'}),edits=[],selections=[],skipped=[],importRoles=[];\n if(progress)progress({stage:'project-serialize',state:'end',source:file,phase:'base64-original-CST'});\n for(const module of modules){\n  if(progress)progress({stage:'namespace',state:'start',source:file,phase:'base64-module-bindings'});\n  const owners=scope(module,all,profile,context,nonTrait);importRoles.push(...owners.imports);\n  if(progress)progress({stage:'namespace',state:'end',source:file,phase:'base64-module-bindings'});"
    },
    {
      "before": "  for(const item of originalSourceModuleItems(module)){if(item.term!=='fn')continue;const rows=",
      "after": "  for(const item of originalSourceModuleItems(module)){if(item.term!=='fn')continue;\n   if(progress)progress({stage:'standalone',state:'advance',source:file,declaration:item.name,phase:'base64-function-analysis'});\n   const rows="
    },
    {
      "before": "edits.push({span,expected:source.slice(...span),replacement});selections.push({...base,callSpan:span,configuration:config,nativeOperation:method,ownedOperation:selected,operand,syntax,libraryUnit:'base64-0.23.1-normal-dependency-ABI',originalTraitPermission:false});at=finish;",
      "after": "edits.push({span,expected:source.slice(...span),replacement});selections.push({...base,callSpan:span,configuration:config,nativeOperation:method,ownedOperation:selected,operand,syntax,libraryUnit:'base64-0.23.1-normal-dependency-ABI',originalTraitPermission:false});\n    if(progress)progress({stage:'standalone',state:'advance',source:file,declaration:item.name,phase:'base64-candidate-lowering',completed:edits.length});\n    at=finish;"
    },
    {
      "before": " const applied=applyConcreteSyntaxSubstitutions(before.document,",
      "after": " if(progress)progress({stage:'project-serialize',state:'start',source:file,phase:'base64-edited-CST-roundtrip'});\n const applied=applyConcreteSyntaxSubstitutions(before.document,"
    },
    {
      "before": "mapping=[];let old=0,current=0;\n for(const edit of edits)",
      "after": "mapping=[];let old=0,current=0;\n if(progress)progress({stage:'project-serialize',state:'end',source:file,phase:'base64-edited-CST-roundtrip'});\n if(progress)progress({stage:'project-serialize',state:'start',source:file,phase:'base64-whole-source-inverse'});\n for(const edit of edits)"
    },
    {
      "before": "if(restored!==source)fail('full inverse changed');\n return",
      "after": "if(restored!==source)fail('full inverse changed');\n if(progress)progress({stage:'project-serialize',state:'end',source:file,phase:'base64-whole-source-inverse',completed:edits.length});\n return"
    },
    {
      "before": "export function proposeCoreBase64Corpus(input={}){\n const options=",
      "after": "// The optional callback receives only the existing bounded progress schema.\n// It is diagnostic data, never a source/owner permit; callback errors propagate.\nexport function proposeCoreBase64Corpus(input={},progressInput){\n const progress=progressInput==null?null:translationProgressReporter(progressInput);\n const options="
    },
    {
      "before": " const proof=deriveDependencyProfile(dependencies).proof;",
      "after": " if(progress)progress({stage:'project',state:'start',entry,phase:'base64-dependency-proof'});\n const proof=deriveDependencyProfile(dependencies).proof;"
    },
    {
      "before": "const library=originalExternalTraitPackageInputs(captureOriginalExternalTraitPackage(proof,'base64'));\n const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile})",
      "after": "const library=originalExternalTraitPackageInputs(captureOriginalExternalTraitPackage(proof,'base64'));\n if(progress)progress({stage:'project',state:'end',entry,phase:'base64-dependency-proof'});\n if(progress)progress({stage:'project-graph',state:'start',entry,phase:'base64-module-discovery'});\n const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile,...(progress?{progress:progressInput}:{})})"
    },
    {
      "before": " const context=createCoreAdoptionProducerContext(",
      "after": " if(progress)progress({stage:'project-graph',state:'end',entry,phase:'base64-module-discovery',total:graph.modules.length});\n if(progress)progress({stage:'namespace',state:'start',entry,phase:'base64-producer-context'});\n const context=createCoreAdoptionProducerContext("
    },
    {
      "before": "after={...files},proposals=[],skipped=[];\n for(const file of Object.keys(files))",
      "after": "after={...files},proposals=[],skipped=[];\n if(progress)progress({stage:'namespace',state:'end',entry,phase:'base64-producer-context'});\n for(const file of Object.keys(files))"
    },
    {
      "before": "const proposal=fileProposal(files[file],modules,graph.modules,profile,context,nonTrait);proposals.push({file,...proposal});after[file]=proposal.after.source;",
      "after": "if(progress)progress({stage:'standalone',state:'start',entry,source:file,phase:'base64-file-analysis'});\n  const proposal=fileProposal(files[file],modules,graph.modules,profile,context,nonTrait,progress);proposals.push({file,...proposal});after[file]=proposal.after.source;\n  if(progress)progress({stage:'standalone',state:'end',entry,source:file,phase:'base64-file-analysis',completed:proposals.length});"
    },
    {
      "before": " nonTrait.verify();const producerEffects=",
      "after": " if(progress)progress({stage:'namespace',state:'start',entry,phase:'base64-final-private-verification'});\n nonTrait.verify();const producerEffects="
    },
    {
      "before": "source:file,phase:'base64-module-bindings'});\n  const owners=",
      "after": "source:file,declaration:module.path.join('::')||'crate',phase:'base64-module-bindings'});\n  const owners="
    },
    {
      "before": "source:file,phase:'base64-module-bindings'});\n  for(const item",
      "after": "source:file,declaration:module.path.join('::')||'crate',phase:'base64-module-bindings'});\n  for(const item"
    },
    {
      "before": " const file=modules[0].file;",
      "after": " const file=progress?modules[0].file:null;"
    },
    {
      "before": "compilationProfile:profile,...(progress?{progress:progressInput}:{})}),core=",
      "after": "compilationProfile:profile},progress?progressInput:undefined),core="
    }
  ],
  "tools/translation/project.mjs": [
    {
      "before": "export function resolveModuleGraph({ entry, paths, readSource, compilationProfile:profileInput=null }) {\n  const profile=",
      "after": "export function resolveModuleGraph({ entry, paths, readSource, compilationProfile:profileInput=null,progress:progressInput }) {\n  const moduleProgress=progressInput==null?null:translationProgressReporter(progressInput);\n  const profile="
    },
    {
      "before": "    visited.add(key);\n    // Only whole",
      "after": "    visited.add(key);\n    if(moduleProgress)moduleProgress({stage:'module-parse',state:'start',entry,source:file,phase:'source-module',completed:modules.length});\n    // Only whole"
    },
    {
      "before": "    catch (error) { module.configurationCondition='unknown';diagnostics.push({ file, ...diagnostic(error) }); return; }\n    for (const item",
      "after": "    catch (error) {\n      module.configurationCondition='unknown';diagnostics.push({ file, ...diagnostic(error) });\n      // Outside the caught parser body: diagnostic callback errors stay errors.\n      if(moduleProgress)moduleProgress({stage:'module-parse',state:'end',entry,source:file,phase:'source-module-refusal',completed:modules.length});\n      return;\n    }\n    if(moduleProgress)moduleProgress({stage:'module-parse',state:'end',entry,source:file,phase:'source-module',completed:modules.length});\n    for (const item"
    },
    {
      "before": "phase:'source-module',completed:modules.length});\n    // Only whole",
      "after": "phase:'source-module',declaration:key||'crate',completed:modules.length});\n    // Only whole"
    },
    {
      "before": "phase:'source-module-refusal',completed:modules.length});",
      "after": "phase:'source-module-refusal',declaration:key||'crate',completed:modules.length});"
    },
    {
      "before": "phase:'source-module',completed:modules.length});\n    for (const item",
      "after": "phase:'source-module',declaration:key||'crate',completed:modules.length});\n    for (const item"
    },
    {
      "before": "export function resolveModuleGraph({ entry, paths, readSource, compilationProfile:profileInput=null,progress:progressInput }) {",
      "after": "// The separate optional argument leaves every old option read unchanged.\nexport function resolveModuleGraph({ entry, paths, readSource, compilationProfile:profileInput=null },progressInput=undefined) {"
    }
  ],
  "tools/translation/propose-core-adoption-corpus.mjs": [
    {
      "before": "import {createRulePipeline} from './rule-pipeline.mjs';",
      "after": "import {createRulePipeline} from './rule-pipeline.mjs';\nimport {translationProgressReporter} from './translation-progress.mjs';"
    },
    {
      "before": "function writer(target,gzipStorage=null){",
      "after": "function writer(target,gzipStorage=null,progress=null){"
    },
    {
      "before": "    const sha256=hash(text);parent(relative);",
      "after": "    if(progress)progress({stage:'plan',state:'start',source:relative,phase:'proposal-packet-emit',completed:records.length,bytes});\n    const sha256=hash(text);parent(relative);"
    },
    {
      "before": "const record={path:relative,kind,bytes,sha256};records.push(record);return record;",
      "after": "const record={path:relative,kind,bytes,sha256};records.push(record);\n    if(progress)progress({stage:'plan',state:'end',source:relative,phase:'proposal-packet-emit',completed:records.length,bytes});\n    return record;"
    },
    {
      "before": "export function proposeCoreAdoptionCorpus(input){",
      "after": "export function proposeCoreAdoptionCorpus(input,progressInput){"
    },
    {
      "before": "  const requested=options(input),root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),write=writer(target);",
      "after": "  const requested=options(input),progress=progressInput==null?null:translationProgressReporter(progressInput);\n  if(progress)progress({stage:'corpus',state:'start',phase:'input-discovery'});\n  const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),write=writer(target,null,progress);\n  if(progress)progress({stage:'corpus',state:'end',phase:'input-discovery',total:original.rows.length});"
    },
    {
      "before": "    rejoin(original);write.complete(text);return",
      "after": "    if(progress)progress({stage:'fingerprint',state:'start',phase:'final-source-and-index'});\n    rejoin(original);write.complete(text);return"
    },
    {
      "before": "function completeAdoptionPackets(proposal,write,files,name){",
      "after": "function completeAdoptionPackets(proposal,write,files,name,progress=null){"
    },
    {
      "before": "assertAdoptionInverse(row);packets.proposals.push(write.json(name+'/proposals/'+numbered(at)+'.json',row));",
      "after": "if(progress)progress({stage:'project-serialize',state:'start',source:row.file,phase:'packet-whole-source-inverse',completed:at});assertAdoptionInverse(row);if(progress)progress({stage:'project-serialize',state:'end',source:row.file,phase:'packet-whole-source-inverse',completed:at+1});packets.proposals.push(write.json(name+'/proposals/'+numbered(at)+'.json',row));"
    },
    {
      "before": "function fixedAdoptionStage(name,files,propose,original,write,dependencies,producerDependencies=false){",
      "after": "function fixedAdoptionStage(name,files,propose,original,write,dependencies,producerDependencies=false,progressInput){\n  const progress=progressInput==null?null:translationProgressReporter(progressInput);"
    },
    {
      "before": "apply:()=>propose({entry:'src/lib.rs',files,compilationProfile:PRODUCTION_PROFILE,...((name==='literal'||name==='scalar-count'||name==='json'||producerDependencies)&&dependencies.inputs?{dependencyInputs:dependencies.inputs}:{})})",
      "after": "apply:()=>{\n      if(progress)progress({stage:'project',state:'start',entry:'src/lib.rs',phase:name+'-analysis'});\n      const request={entry:'src/lib.rs',files,compilationProfile:PRODUCTION_PROFILE,...((name==='literal'||name==='scalar-count'||name==='json'||producerDependencies)&&dependencies.inputs?{dependencyInputs:dependencies.inputs}:{})};\n      const result=name==='base64'&&progress?propose(request,progressInput):propose(request);\n      if(progress)progress({stage:'project',state:'end',entry:'src/lib.rs',phase:name+'-analysis'});\n      return result;\n    }"
    },
    {
      "before": "const packets=completeAdoptionPackets(proposal,write,files,name);",
      "after": "const packets=completeAdoptionPackets(proposal,write,files,name,progress);"
    },
    {
      "before": "export async function proposeCoreAdoptionSequence(input,sequence='literal',packetStorage){",
      "after": "export async function proposeCoreAdoptionSequence(input,sequence='literal',packetStorage,progressInput){"
    },
    {
      "before": "  const requested=options(input);\n  // Lazy imports",
      "after": "  const requested=options(input),progress=progressInput==null?null:translationProgressReporter(progressInput);\n  if(progress)progress({stage:'project',state:'start',phase:'producer-module-load'});\n  // Lazy imports"
    },
    {
      "before": "  const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),dependencies=sequenceDependencies(root),write=writer(target,gzipStorage),stages=[];",
      "after": "  if(progress)progress({stage:'project',state:'end',phase:'producer-module-load'});\n  if(progress)progress({stage:'corpus',state:'start',phase:'input-discovery'});\n  const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),dependencies=sequenceDependencies(root),write=writer(target,gzipStorage,progress),stages=[];\n  if(progress)progress({stage:'corpus',state:'end',phase:'input-discovery',total:original.rows.length});"
    },
    {
      "before": "base64||jsonSequence||jsonUpdates||jsonIndices||jsonCollections||jsonCopies||jsonParse||jsonReaders);",
      "after": "base64||jsonSequence||jsonUpdates||jsonIndices||jsonCollections||jsonCopies||jsonParse||jsonReaders,progressInput);"
    },
    {
      "before": "    rejoin(original);dependencies.verify();if(gzipStorage)write.completeGzip(text,preparedStorage);else write.complete(text);",
      "after": "    // Final progress precedes the fresh source guard. Never call an observer\n    // between this rejoin and index publication; stdout reports completion.\n    if(progress)progress({stage:'fingerprint',state:'start',phase:'final-source-and-index'});\n    rejoin(original);dependencies.verify();if(gzipStorage)write.completeGzip(text,preparedStorage);else write.complete(text);"
    },
    {
      "before": "export async function proposeCoreJsonReadersGzipPackets(input){",
      "after": "export async function proposeCoreJsonReadersGzipPackets(input,progressInput){"
    },
    {
      "before": " const requested=options(input),{iterateCoreJsonReadersCorpusPackets}=await loadJsonReaderModule(),gzipStorage=await loadPacketStorageModule();\n const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),dependencies=sequenceDependencies(root),write=writer(target,gzipStorage),name='json-readers';let stage=name;",
      "after": " const requested=options(input),progress=progressInput==null?null:translationProgressReporter(progressInput);\n if(progress)progress({stage:'project',state:'start',phase:'producer-module-load'});\n const {iterateCoreJsonReadersCorpusPackets}=await loadJsonReaderModule(),gzipStorage=await loadPacketStorageModule();\n if(progress)progress({stage:'project',state:'end',phase:'producer-module-load'});\n if(progress)progress({stage:'corpus',state:'start',phase:'input-discovery'});\n const root=realpathSync(resolve(requested.root)),target=destination(root,requested.output),original=snapshot(root),dependencies=sequenceDependencies(root),write=writer(target,gzipStorage,progress),name='json-readers';let stage=name;\n if(progress)progress({stage:'corpus',state:'end',phase:'input-discovery',total:original.rows.length});"
    },
    {
      "before": "  next.value.verify();rejoin(original);dependencies.verify();write.completeGzip(text,preparedStorage);",
      "after": "  if(progress)progress({stage:'fingerprint',state:'start',phase:'final-source-and-index'});\n  next.value.verify();rejoin(original);dependencies.verify();write.completeGzip(text,preparedStorage);"
    },
    {
      "before": "  const args=process.argv.slice(2);\n  if(args.length===8&&args[0]==='--root'&&args[2]==='--output'&&args[4]==='--sequence'&&args[6]==='--packet-storage')(args[5]==='json-readers'&&args[7]==='gzip'?proposeCoreJsonReadersGzipPackets({root:args[1],output:args[3]}):proposeCoreAdoptionSequence({root:args[1],output:args[3]},args[5],args[7])).then(receipt=>console.log(JSON.stringify(receipt)));\n  else if(args.length===6&&args[0]==='--root'&&args[2]==='--output'&&args[4]==='--sequence')proposeCoreAdoptionSequence({root:args[1],output:args[3]},args[5]).then(receipt=>console.log(JSON.stringify(receipt)));\n  else {if(args.length!==4||args[0]!=='--root'||args[2]!=='--output')fail('usage: --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY');console.log(JSON.stringify(proposeCoreAdoptionCorpus({root:args[1],output:args[3]})));}\n",
      "after": "  const raw=process.argv.slice(2),selected=raw.filter(argument=>argument==='--progress');\n  if(selected.length>1)fail('--progress may be supplied once');\n  const args=selected.length?raw.filter(argument=>argument!=='--progress'):raw;\n  // Opt-in diagnostics only: complete source/private metadata never enters a\n  // record. Read the monotonic clock only for this explicitly selected route.\n  const started=selected.length?process.hrtime.bigint():null;\n  const progress=selected.length?record=>process.stderr.write(JSON.stringify({...record,elapsedMilliseconds:Number((process.hrtime.bigint()-started)/1000000n)})+'\\n'):undefined;\n  if(args.length===8&&args[0]==='--root'&&args[2]==='--output'&&args[4]==='--sequence'&&args[6]==='--packet-storage')(args[5]==='json-readers'&&args[7]==='gzip'?proposeCoreJsonReadersGzipPackets({root:args[1],output:args[3]},progress):proposeCoreAdoptionSequence({root:args[1],output:args[3]},args[5],args[7],progress)).then(receipt=>console.log(JSON.stringify(receipt)));\n  else if(args.length===6&&args[0]==='--root'&&args[2]==='--output'&&args[4]==='--sequence')proposeCoreAdoptionSequence({root:args[1],output:args[3]},args[5],undefined,progress).then(receipt=>console.log(JSON.stringify(receipt)));\n  else {if(args.length!==4||args[0]!=='--root'||args[2]!=='--output')fail('usage: --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY [--progress]');console.log(JSON.stringify(proposeCoreAdoptionCorpus({root:args[1],output:args[3]},progress)));}\n"
    },
    {
      "before": "  const raw=process.argv.slice(2),selected=raw.filter(argument=>argument==='--progress');\n  if(selected.length>1)fail('--progress may be supplied once');\n  const args=selected.length?raw.filter(argument=>argument!=='--progress'):raw;\n",
      "after": "  const raw=process.argv.slice(2),selected=[5,7,9].includes(raw.length)&&raw.at(-1)==='--progress';\n  // Append the flag; existing positional path/sequence values keep their meaning.\n  const args=selected?raw.slice(0,-1):raw;\n"
    },
    {
      "before": "const started=selected.length?",
      "after": "const started=selected?"
    },
    {
      "before": "const progress=selected.length?",
      "after": "const progress=selected?"
    },
    {
      "before": "fail('usage: --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY [--progress]')",
      "after": "fail('usage: --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY')"
    },
    {
      "before": "export function proposeCoreAdoptionCorpus(input,progressInput){",
      "after": "export function proposeCoreAdoptionCorpus(input,progressInput=undefined){"
    },
    {
      "before": "export async function proposeCoreJsonReadersGzipPackets(input,progressInput){",
      "after": "export async function proposeCoreJsonReadersGzipPackets(input,progressInput=undefined){"
    },
    {
      "before": "import {translationProgressReporter} from './translation-progress.mjs';\nimport {proposeCoreFormattingCorpus} from './propose-core-formatting-corpus.mjs';\nimport {proposeCorePrimitivesCorpus} from './migrate-core-primitives.mjs';",
      "after": "import {proposeCoreFormattingCorpus} from './propose-core-formatting-corpus.mjs';\nimport {proposeCorePrimitivesCorpus} from './migrate-core-primitives.mjs';\nimport {translationProgressReporter} from './translation-progress.mjs';"
    }
  ]
};
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,after);};
const sourceFiles=()=>({'src/lib.rs':'pub mod translation_core; mod text; pub mod nested { pub fn untouched(value:u8)->u8{value} }','src/text.rs':'pub fn original(value:&str)->String{base64::Engine::encode(&base64::engine::general_purpose::STANDARD,value)}','src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE});
const request=()=>({entry:'src/lib.rs',files:sourceFiles(),dependencyInputs:{manifest,lock},compilationProfile:PRODUCTION_PROFILE});
function records(rows,{elapsed=false}={}){
 assert.ok(rows.length>0);let previous=0;
 const allowed=new Set(['schema','stage','state','entry','source','profile','declaration','phase','completed','total','attempt','remaining','outputs','bytes',...(elapsed?['elapsedMilliseconds']:[])]);
 for(const row of rows){assert.equal(row.schema,'rust-meta-translation-progress-v1');assert.ok(Object.keys(row).every(name=>allowed.has(name)));assert.ok(Object.values(row).every(value=>typeof value==='string'||Number.isSafeInteger(value)&&value>=0));for(const value of Object.values(row))if(typeof value==='string')assert.ok(Buffer.byteLength(value)<=4096);if(elapsed){assert.ok(Number.isSafeInteger(row.elapsedMilliseconds)&&row.elapsedMilliseconds>=previous);previous=row.elapsedMilliseconds;}else assert.equal(Object.isFrozen(row),true);}
}
function fixture(t){
 const parent=mkdtempSync(join(tmpdir(),'router-core-progress-686-')),root=join(parent,'source');mkdirSync(root);
 const files=sourceFiles();for(const [path,source]of Object.entries({...files,'Cargo.toml':manifest,'Cargo.lock':lock})){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source,{flag:'wx'});}
 t.after(()=>rmSync(parent,{recursive:true,force:true}));retain('complete-fixture-input',{files,manifest,lock,root});return {root,parent};
}
function tree(root){
 const rows=[];function visit(relative){for(const entry of readdirSync(join(root,relative),{withFileTypes:true})){const path=relative?relative+'/'+entry.name:entry.name;if(entry.isDirectory())visit(path);else{assert.equal(entry.isFile(),true);assert.equal(lstatSync(join(root,path)).isSymbolicLink(),false);const bytes=readFileSync(join(root,path));rows.push({path,bytes:bytes.length,sha256:hash(bytes),base64:bytes.toString('base64')});}}}visit('');return rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
function child(args){const row=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});retain('complete-CLI-observation',{args,status:row.status,signal:row.signal,error:row.error?{name:row.error.name,message:row.error.message}:null,stdout:row.stdout,stderr:row.stderr});return row;}

test('progress substitutions reconstruct all three complete source files through both concrete rule phases',()=>{
 for(const [path,rules]of Object.entries(SOURCE_RULES)){
  const current=readFileSync(new URL('../../../'+path,import.meta.url),'utf8');let before=current;
  for(const rule of [...rules].reverse())before=once(before,rule.after,rule.before);
  let forward=before;for(const rule of rules)forward=once(forward,rule.before,rule.after);assert.equal(forward,current);
  const original=transportConcreteSyntaxSource(before,{language:'JavaScript'}),applied=applyConcreteSyntaxSubstitutions(original.document,{languageRules:[{id:'language:preserve-complete-diagnostic-source',edits:[]}],repositoryRules:[{id:'router:optional-adoption-progress',edits:[{span:[0,before.length],expected:before,replacement:current}]}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));assert.equal(after.source,current);
  const inverse=applyConcreteSyntaxSubstitutions(after.document,{languageRules:[{id:'language:preserve-complete-diagnostic-inverse',edits:[]}],repositoryRules:[{id:'router:undo-optional-adoption-progress',edits:[{span:[0,current.length],expected:current,replacement:before}]}]});assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source,before);
  retain('complete-source-equation',{path,before,current,rules,originalMeta:original.meta,afterMeta:after.meta,trace:applied.trace,inverseTrace:inverse.trace});
 }
});

test('module progress covers physical and inline source checks with identical complete module results',()=>{
 const files={'src/lib.rs':'mod text; pub mod inner { pub fn value(v:u8)->u8{v} }','src/text.rs':'pub fn value(v:u8)->u8{v}'},options={entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE},plain=resolveModuleGraph(options),rows=[],traced=resolveModuleGraph(options,row=>rows.push(row));
 retain('complete-module-inputs',files);retain('complete-untraced-modules',plain);retain('complete-traced-modules',traced);retain('full-module-progress',rows);records(rows);assert.equal(nativeJson(traced),nativeJson(plain));assert.equal(traced.modules.length,3);
 let optionHooks=0;const inherited=Object.assign(Object.create({get progress(){optionHooks++;throw new Error('unselected inherited option');}}),options);assert.equal(nativeJson(resolveModuleGraph(inherited)),nativeJson(plain));assert.equal(optionHooks,0);retain('unselected-option-hooks',optionHooks);
 const events=rows.filter(row=>row.phase==='source-module');assert.equal(events.filter(row=>row.state==='start').length,3);assert.equal(events.filter(row=>row.state==='end').length,3);assert.deepEqual(events.filter(row=>row.state==='start').map(row=>row.source),['src/lib.rs','src/text.rs','src/lib.rs']);
});

test('actual base64 producer retains every source CST inverse and packet field when progress is enabled',()=>{
 const options=request(),plain=proposeCoreBase64Corpus(options),rows=[],traced=proposeCoreBase64Corpus(options,row=>rows.push(row));retain('complete-base64-inputs',options);retain('complete-untraced-proposal',plain);retain('complete-traced-proposal',traced);retain('full-producer-progress',rows);records(rows);assert.equal(nativeJson(traced),nativeJson(plain));assert.equal(traced.executableAdmission,false);
 const row=traced.proposals.find(row=>row.file==='src/text.rs');assert.equal(row.edits.length,1);assert.equal(row.selections[0].originalTraitPermission,false);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,options.files['src/text.rs']);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);
 for(const phase of ['base64-dependency-proof','base64-module-discovery','base64-producer-context','base64-file-analysis','base64-module-bindings','base64-function-analysis','base64-candidate-lowering','base64-original-CST','base64-edited-CST-roundtrip','base64-whole-source-inverse','base64-final-private-verification'])assert.ok(rows.some(row=>row.phase===phase),phase);
});

test('diagnostic callback errors propagate unchanged outside module parser refusals and private analysis',()=>{
 const sentinel=new Error('exact progress sentinel');let reads=0;
 assert.throws(()=>resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>{reads++;return 'pub fn value(v:u8)->u8{v}';}},()=>{throw sentinel;}),error=>error===sentinel);assert.equal(reads,0);
 assert.throws(()=>resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>{reads++;return 'pub fn value(v:u8)->u8{v}';}},row=>{if(row.state==='end')throw sentinel;}),error=>error===sentinel);assert.equal(reads,1);
 const options=request();assert.throws(()=>proposeCoreBase64Corpus(options,row=>{if(row.phase==='base64-dependency-proof')throw sentinel;}),error=>error===sentinel);
 let hooks=0;const notCallback=new Proxy({},{get(){hooks++;throw sentinel;},ownKeys(){hooks++;throw sentinel;}});assert.throws(()=>proposeCoreBase64Corpus(options,notCallback),/callback/);assert.equal(hooks,0);retain('full-refusal-inputs',{options,sentinel:{name:sentinel.name,message:sentinel.message},reads,hooks});
});

test('full base64 gzip CLI progress is monotonic scalar stderr and leaves every generated byte unchanged',t=>{
 const f=fixture(t),plain=join(f.parent,'plain'),traced=join(f.parent,'traced'),args=['--root',f.root,'--output',plain,'--sequence','base64','--packet-storage','gzip'],left=child(args),right=child(['--root',f.root,'--output',traced,'--sequence','base64','--packet-storage','gzip','--progress']);
 assert.equal(left.status,0,left.stderr);assert.equal(right.status,0,right.stderr);assert.equal(left.stderr,'');const a=JSON.parse(left.stdout),b=JSON.parse(right.stdout);assert.deepEqual({...a,output:'selected'},{...b,output:'selected'});assert.equal(a.changedFiles,1);assert.equal(a.semanticAdmission,false);
 const rows=right.stderr.trim().split('\n').map(line=>JSON.parse(line));records(rows,{elapsed:true});assert.equal(rows[0].phase,'producer-module-load');assert.equal(rows.at(-1).phase,'final-source-and-index');assert.equal(rows.at(-1).state,'start');assert.equal(right.stderr.includes('pub fn'),false);assert.equal(right.stderr.includes('private-core-adoption-producer-context-v1'),false);for(const phase of ['input-discovery','base64-analysis','source-module','base64-producer-context','packet-whole-source-inverse','proposal-packet-emit'])assert.ok(rows.some(row=>row.phase===phase),phase);
 const before=tree(plain),after=tree(traced);retain('complete-plain-output',before);retain('complete-traced-output',after);assert.deepEqual(after,before);
});

test('a packet diagnostic failure retains incomplete evidence and never publishes a complete index',async t=>{
 const f=fixture(t),output=join(f.parent,'callback-failure'),rows=[],sentinel=new Error('packet progress failure');let selected=false;
 await assert.rejects(proposeCoreAdoptionSequence({root:f.root,output},'base64','gzip',row=>{rows.push(row);if(row.phase==='proposal-packet-emit'&&row.state==='end'){selected=true;throw sentinel;}}),error=>error===sentinel);
 assert.equal(selected,true);assert.equal(existsSync(join(output,'index.json')),false);assert.equal(existsSync(join(output,'packet-storage.json')),false);assert.equal(existsSync(join(output,'failure.json')),true);const failure=JSON.parse(readFileSync(join(output,'failure.json'),'utf8'));assert.equal(failure.complete,false);assert.equal(failure.semanticAdmission,false);assert.equal(failure.message,sentinel.message);retain('complete-failure-progress',rows);retain('complete-incomplete-output',tree(output));
});

test('the final diagnostic precedes fresh physical source rejoin so callback mutation cannot publish',async t=>{
 const f=fixture(t),output=join(f.parent,'source-changed'),path=join(f.root,'src/text.rs'),before=readFileSync(path,'utf8'),after=before+'\n// actual progress-time mutation\n',rows=[];let changed=false;
 await assert.rejects(proposeCoreAdoptionSequence({root:f.root,output},'base64','gzip',row=>{rows.push(row);if(row.phase==='final-source-and-index'){writeFileSync(path,after);changed=true;}}),/source.*changed|source file changed/);
 assert.equal(changed,true);assert.equal(readFileSync(path,'utf8'),after);assert.equal(existsSync(join(output,'index.json')),false);assert.equal(existsSync(join(output,'packet-storage.json')),false);assert.equal(JSON.parse(readFileSync(join(output,'failure.json'),'utf8')).complete,false);retain('full-source-mutation',{before,after,rows});retain('complete-source-refusal-output',tree(output));
});

test('positional CLI arguments remain strict and progress does not replace existing refusal checks',t=>{
 assert.equal(proposeCoreAdoptionCorpus.length,1);assert.equal(proposeCoreAdoptionSequence.length,1);assert.equal(proposeCoreJsonReadersGzipPackets.length,1);assert.equal(resolveModuleGraph.length,1);assert.equal(proposeCoreBase64Corpus.length,0);
 const f=fixture(t),output=join(f.parent,'invalid');for(const args of [['--root',f.root,'--output',output,'--progress','--progress'],['--root',f.root,'--output',output,'--sequence','unknown','--progress'],['--root',f.root,'--output',output,'--sequence','base64','--packet-storage','unknown','--progress']]){const row=child(args);assert.notEqual(row.status,0);assert.equal(row.stdout,'');assert.equal(existsSync(output),false);assert.match(row.stderr,/usage|fixed sequence|packet storage/);}
 const options=request();options.files['src/translation_core/base64.rs']+='\n';const rows=[];assert.throws(()=>proposeCoreBase64Corpus(options,row=>rows.push(row)),/facade and leaf/);records(rows);retain('complete-changed-leaf-refusal',{options,rows});
});
