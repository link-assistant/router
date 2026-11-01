// Complete scalar corpus/receiving copy equations; DATA, never permission.
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readBoundedTrackedSourceBytes,withBoundedTrackedSourceOperation} from './forward-output-ownership-20261101-bounded-bytes.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),path='tools/translation/source-profiles/constant-index-corpus-20261101/complete-copy.json.gz',pin='82df0991d3138788debf9e207626097657baa6b07c2e77cfff409b2706d9f516';
const fail=message=>{throw TypeError('Constant-index corpus source custody: '+message);};
const parse=JSON.parse,birth=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged()&&originalCapturedFunctionSource(parse)==='function parse() { [native code] }';
const guard=()=>{if(!birth||JSON.parse!==parse||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source input intrinsics changed');};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function load(){return withSourceInputValidation(()=>{
 guard();const raw=readBoundedTrackedSourceBytes(root,path,{maxBytes:2097152});if(!raw||createHash('sha256').update(raw).digest('hex')!==pin)fail('immutable complete copy archive differs');
 const data=parse(new TextDecoder('utf8',{fatal:true}).decode(gunzipSync(raw,{maxOutputLength:4194304})));account(data);guard();
 if(data.schema!=='constant-index-corpus-complete-source-copy-v1'||data.parent.sha256!=='b7413d607a8dfdf4babac347f358e53211d3a5ec627ab1fd27865422175ca857'||data.parent.versions!==188||data.rows.length!==2||data.additions.length!==1||data.additions[0].path!=='tools/translation/constant-index-corpus-20261101-targets.mjs')fail('actual complete scalar-to-constant copy census differs');
 const expected=['tools/translation/constant-index-corpus-20261101.mjs','tools/translation/constant-index-corpus-20261101-receiving.mjs'];if(data.rows.some((row,index)=>row.path!==expected[index]))fail('closed exact copy row set differs');
 for(const row of data.rows)for(const [target,source]of [[row.originalPath,row.before],[row.beforePath,row.before],[row.path,row.after],[row.afterPath,row.after]]){const bytes=readBoundedTrackedSourceBytes(root,target,{maxBytes:2097152});if(!bytes||!bytes.equals(Buffer.from(source)))fail('complete source/snapshot bytes differ: '+target);}
 for(const row of data.additions)for(const target of [row.path,row.snapshotPath]){const bytes=readBoundedTrackedSourceBytes(root,target,{maxBytes:2097152});if(!bytes||!bytes.equals(Buffer.from(row.source)))fail('complete new target helper/snapshot differs: '+target);}
 for(const row of data.prerequisites){const bytes=readBoundedTrackedSourceBytes(root,row.path,{maxBytes:2097152});if(!bytes||!bytes.equals(Buffer.from(row.source)))fail('complete actual prerequisite differs: '+row.path);}
 return freeze(data);
});}
export function withConstantIndexCorpusSourceCustody(run){requireSynchronousSourceCallback(run);return withBoundedTrackedSourceOperation(root,()=>{const data=load();return withCompleteSourceClosingFence(()=>run(),[()=>{load();account(data);}]);});}
export function visitConstantIndexCorpusSourceEquations(run){
 requireSynchronousSourceCallback(run);return withBoundedTrackedSourceOperation(root,()=>{const data=load(),chronology=[];return withCompleteSourceClosingFence(()=>{
  for(const row of [...data.rows,...data.additions.map(row=>({path:row.path,originalPath:null,before:row.source,after:row.source}))]){const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];if(history.inverse!==row.before||transportConcreteSyntaxMeta(history.beforeMeta).source!==row.before||transportConcreteSyntaxMeta(history.afterMeta).source!==row.after||history.trace.map(value=>value.phase).join(',')!=='language,repository')fail('whole copied source/CST/inverse differs');const event=freeze({kind:row.originalPath?'complete-constant-index-corpus-copy-equation':'complete-constant-index-corpus-addition-equation',path:row.path,originalPath:row.originalPath,history,semanticAuthority:false});account({data,chronology,event});withCompleteSourceClosingFence(()=>{const reply=run(event);account({data,chronology,event,reply});},[]);chronology.push({path:row.path,originalPath:row.originalPath,trace:history.trace,completeInverseDelivered:true});account({data,chronology});}
  const copyCustody=[...data.rows.flatMap(row=>[{path:row.originalPath,source:row.before},{path:row.beforePath,source:row.before},{path:row.path,source:row.after},{path:row.afterPath,source:row.after}]),...data.additions.flatMap(row=>[{path:row.path,source:row.source},{path:row.snapshotPath,source:row.source}]),...data.prerequisites];
  const pipeline=createRulePipeline([{phase:'language',rules:[{id:'language:complete-flat-enclosing-original-and-adopted-corpus-source-copy',apply:()=>chronology}]},{phase:'repository',rules:[{id:'repository:actual-constant188-source-custody-and-receiving-cohort',apply:value=>({chronology:value,parent:data.parent,visited:chronology.length,copyRows:data.rows.length,additionRows:data.additions.length,prerequisites:data.prerequisites.map(row=>row.path),copyCustody,completeCopyDelivered:true,sourceInstalled:false,semanticAuthority:false,execution:'UNRUN'})}]}]).run(null),result={...pipeline.value,ruleTrace:pipeline.trace};account({data,result});return freeze(result);
 },[()=>{load();}]);});
}
