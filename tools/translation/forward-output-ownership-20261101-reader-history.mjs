// Independent child source history. No pending ownership writer is imported.
// Source/CST equality is DATA and grants no namespace/type/source permission.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readBoundedTrackedSourceBytes,withBoundedTrackedSourceOperation} from './forward-output-ownership-20261101-bounded-bytes.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/source-profiles/forward-output-ownership-20261101-reader/';
const ORIGINAL_SHA='6f1249c4d47e37c3595345e8fd7e2600063e48bdb05b79d9f3632b6e97add8f1',CORPUS_SHA='04de9cb64de5025de42f38fb6c59c08ac3d3639377355ed8aaabe1e91ed95c75',READER_SHA='02fcc5ff7807c13af2c4554221ef55741cd225371daa7717e81a7b993595f32e';
const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(yes,message)=>{if(!yes)throw TypeError('Bounded source-reader history: '+message);};
export function proposeBoundedSourceReaderHistory({root=ROOT}={}){
 return withBoundedTrackedSourceOperation(root,()=>{
  const read=name=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(readBoundedTrackedSourceBytes(root,name,{maxBytes:1048576}));
  const before=read(P+'originals/source-corpus.mjs.txt'),corpus=read(P+'authored/source-corpus.mjs.txt'),reader=read(P+'authored/bounded-bytes.mjs.txt');
  need(hash(before)===ORIGINAL_SHA&&hash(corpus)===CORPUS_SHA&&hash(reader)===READER_SHA,'complete fixed child original/authored sources differ');
  const start=before.indexOf('export function trackedSourceBytes('),end=before.indexOf('\nexport function trackedSource(',start);
  need(start>=0&&end>start,'one complete original physical reader boundary required');
  const delegated="import {readBoundedTrackedSourceBytes} from './forward-output-ownership-20261101-bounded-bytes.mjs';\n"+before.slice(0,start)+"export function trackedSourceBytes(root,path,{maxBytes=32*1024*1024}={}){return readBoundedTrackedSourceBytes(root,path,{maxBytes});}\n"+before.slice(end);
  need(delegated===corpus,'original corpus issuer/APIs/selection/Cargo/limits changed outside exact physical-reader delegation');
  const rows=[{path:'tools/translation/source-corpus.mjs',before,after:corpus,kind:'original-issuer-with-bounded-byte-ingress'},{path:'tools/translation/forward-output-ownership-20261101-bounded-bytes.mjs',before,after:reader,kind:'independent-data-only-reader-and-synchronous-operation-fence'}];
  for(const row of rows)need(read(row.path)===row.after,'actual complete child successor differs: '+row.path);
  const bindings=verifyNativeCopiedSourceBindingBatch(ownershipCompiler(),rows.map(row=>({path:resolve(root,row.path),source:row.after}))),files=[];
  for(let index=0;index<rows.length;index++){
   const row=rows[index],original=transportConcreteSyntaxSource(row.before,{language:'JavaScript'}),current=transportConcreteSyntaxSource(row.after,{language:'JavaScript'});
   const run=applyConcreteSyntaxSubstitutions(original.meta,{languageRules:[{id:'javascript:bounded-original-byte-source-ingress',edits:[{span:[0,row.before.length],expected:row.before,replacement:row.after}]}],repositoryRules:[{id:'router:retain-original-corpus-private-issuer-and-separate-data-operation-fence',edits:[]}]}),undo=applyConcreteSyntaxSubstitutions(current.meta,{languageRules:[{id:'javascript:restore-complete-original-source-reader',edits:[{span:[0,row.after.length],expected:row.after,replacement:row.before}]}],repositoryRules:[{id:'router:restore-complete-physical-reader-source-coordinate',edits:[]}]});
   need(run.value.source===row.after&&undo.value.source===row.before&&transportConcreteSyntaxMeta(original.meta).source===row.before&&transportConcreteSyntaxMeta(current.meta).source===row.after,'complete source/CST/inverse changed');
   files.push({...row,inverse:row.before,beforeMeta:original.meta,afterMeta:current.meta,trace:run.trace,inverseTrace:undo.trace,nativeBindings:bindings[index]});
  }
  const result={schema:'router-independent-bounded-source-reader-child-20261101-v1',files,originalCorpusIssuerPreserved:true,newNamespaceIssuer:false,sourceAuthority:false,semanticAuthority:false,executionEvidence:'UNRUN'};accountPrimitiveVectorIteratorBulkData(result);return result;
 },{limits:{paths:5,bytes:5*1048576}});
}
