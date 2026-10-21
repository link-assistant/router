// Source preparation only. Fresh full archive/CST/source checks remain intact.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const FILE='tools/translation/prepare-real-source-fixtures.mjs';
const MARKER='\n// Generated invocation-local source/CST allocation variant; original producer stays exact.\n';
const IMPORT="import {originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';\nimport {encodeStaticSourceStorageIncremental} from './static-source-layout-storage.mjs';\n";
const fail=message=>{throw new TypeError('Static source release preparation: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
function once(source,before,after){if(source.split(before).length!==2)fail('unique complete source anchor required');return source.replace(before,()=>after);}
function grammar(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar: '+path+' '+file.parseDiagnostics.map(d=>String(d.start)+':'+ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));return file;}
function stages(ts,path,original,language,after,before){
 for(const text of [original,language,after])grammar(ts,path,text);
 const stage=(a,b,id)=>({id,edits:[{span:[0,a.length],expected:a,replacement:b}]}),beforeMeta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(original,{language:'JavaScript'}).document),first=transportConcreteSyntaxMeta(beforeMeta);
 if(first.source!==original)fail('complete original CST differs');
 const sequence={languageRules:[stage(original,language,'javascript:copy-original-producer-and-release-overwritten-owned-DATA')],repositoryRules:[stage(language,after,'router:attach-separate-complete-source-producer-and-receiving-binding')]},run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('complete proposed CST differs');
 const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[stage(after,original,'javascript:restore-complete-original-producer')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==original)fail('complete inverse differs');
 return {path,before,original,language,after,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:original,originalSha256:hash(original),afterSha256:hash(after)};
}
export function prepareStaticSourceRelease({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const current=readFileSync(resolve(root,FILE),'utf8');let original=current.includes(MARKER)?current.slice(0,current.indexOf(MARKER)):current;const importAt=original.startsWith('#!')?original.indexOf('\n')+1:0;if(original.slice(importAt).startsWith(IMPORT))original=original.slice(0,importAt)+original.slice(importAt+IMPORT.length);
 const file=grammar(ts,FILE,original),functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareStaticSourceLifecycleProposal');if(functions.length!==1)fail('one complete original producer required');
 const definition=functions[0].getText(file),rules=[
  ['export function prepareStaticSourceLifecycleProposal(','export function prepareStaticSourceLifecycleProposalReleased('],
  ["  root=realpathSync(root);const subjectRevision=revision(root,currentRevision),history=historyArchive===null?null:staticReadArchive(historyArchive),sources=new Map(),profiles=[];","  root=realpathSync(root);const subjectRevision=revision(root,currentRevision);\n  let history=historyArchive===null?null:staticReadArchive(historyArchive);\n  const sources=new Map(),profiles=[];"],
  ['profiles.push({revision:rev,files:captured.files,sourceSetSha256:captured.sourceSetSha256});for(const [id,row]of captured.sources)add(id,row);','profiles.push({revision:rev,files:captured.files,sourceSetSha256:captured.sourceSetSha256});for(const [id,row]of captured.sources)add(id,row);\n    captured=null;'],
  ['  const pipeline=createRulePipeline([',`  // All original archive bytes have already received complete decoding and
  // logical digest checks. Drop only first-pass inputs freshly overwritten by
  // BOTH complete source and canonical transports below. Unchanged/deleted
  // parents retain every historical canonical value and output field.
  history=null;
  for(const id of changedIds){
    const row=sources.get(id);
    if(row&&Object.hasOwn(row,'canonical')){const value={...row};delete value.canonical;sources.set(id,value);}
  }
  const pipeline=createRulePipeline([`],
  ['encodeStaticSourceStorage(bundle,raw)','encodeStaticSourceStorageIncremental(bundle,raw)'],
 ];let copied=definition;for(const [before,after]of rules)copied=once(copied,before,after);
 const collectors=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='transportStaticSourceLifecycleCanonicals');if(collectors.length!==1)fail('one complete original canonical collector required');
 const originalCollector=collectors[0].getText(file);let shared=once(originalCollector,'export function transportStaticSourceLifecycleCanonicals(rows){','export function transportStaticSourceLifecycleCanonicalsShared(rows){');
 shared=once(shared,'  const out=new Map();visitStaticSourceLifecycleCanonicals(rows,(id,document)=>out.set(id,document));return out;',`  if(!originalBatchedDataFreezeIntrinsicsUnchanged())return transportStaticSourceLifecycleCanonicals(rows);
  const out=new Map(),prefixes=new Map();
  visitStaticSourceLifecycleCanonicals(rows,(id,document)=>{
    if(!originalBatchedDataFreezeIntrinsicsUnchanged()||!Object.isFrozen(document)||!Object.isFrozen(document.nodes)){out.set(id,document);return;}
    const nodes=document.nodes,key=document.source.slice(0,1024),previous=prefixes.get(key);let selected=document;
    if(previous&&nodes.length>=128){
      const end=Math.min(nodes.length,previous.length);let equal=0;
      for(let at=1;at<end;at++){const left=nodes[at],right=previous[at];let same=true;for(let field=0;field<7;field++)if(left[field]!==right[field]){same=false;break;}if(same)equal++;}
      // The new outer array costs one reference per node. Share only when
      // more than a quarter of the seven-field immutable rows are identical.
      if(equal>nodes.length/4){
        const values=nodes.slice();
        for(let at=1;at<end;at++){const left=nodes[at],right=previous[at];let same=true;for(let field=0;field<7;field++)if(left[field]!==right[field]){same=false;break;}if(same)values[at]=right;}
        Object.freeze(values);selected=Object.freeze({...document,nodes:values});
      }
    }
    if(prefixes.has(key)||prefixes.size<256)prefixes.set(key,selected.nodes);
    out.set(id,selected);
  });return out;`);
 const language=original+MARKER+copied+'\n'+shared+'\n',after=language.slice(0,importAt)+IMPORT+language.slice(importAt);if(current!==original&&current!==after)fail('unexpected complete current producer');
 const consumerPath='tools/translation/test/static-source-lifecycle.test.mjs',consumer=readFileSync(resolve(root,consumerPath),'utf8'),consumerFile=grammar(ts,consumerPath,consumer),imports=consumerFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='../prepare-real-source-fixtures.mjs');if(imports.length!==1)fail('one complete receiving producer import required');
 const bindings=[['prepareStaticSourceLifecycleProposal','prepareStaticSourceLifecycleProposalReleased'],['transportStaticSourceLifecycleCanonicals','transportStaticSourceLifecycleCanonicalsShared']],edits=[];
 for(const [plain,target]of bindings){const elements=imports[0].importClause?.namedBindings?.elements?.filter(node=>node.name.text===plain);if(elements?.length!==1)fail('one receiving binding required');const element=elements[0],selected=element.getText(consumerFile),adapted=target+' as '+plain;if(selected!==plain&&selected!==adapted)fail('unexpected receiving binding');edits.push({start:element.getStart(consumerFile),end:element.end,plain,adapted});}
 const replace=field=>{let source=consumer;for(const edit of [...edits].sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit[field]+source.slice(edit.end);return source;},consumerOriginal=replace('plain'),consumerAfter=replace('adapted');
 const files=[stages(ts,FILE,original,language,after,current),stages(ts,consumerPath,consumerOriginal,consumerOriginal,consumerAfter,consumer)];
 return {schema:'static-source-producer-release-source-v1',files,completeOriginalProducer:definition,completeOriginalCollector:originalCollector,orderedSubstitutions:rules,originalProducerBodyUnchanged:true,allSourceAndCstPassesRemain:true,originalLimitsUnchanged:true,newAcrossInvocationCaches:false,invocationLocalImmutableNodeSharing:true,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-static-source-release.mjs --emit|--check');
 const result=prepareStaticSourceRelease();if(args[0]==='--check'){if(result.files.some(row=>row.before!==row.after))fail('complete installed producer is stale');console.log('Static source allocation variant is current; no compiler authority.');}else console.log(JSON.stringify(result));
}
