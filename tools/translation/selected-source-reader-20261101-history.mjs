// Complete predecessor/copy/virtual-delegation source equations, DATA only.
// The actual original corpus issuer/delegation is NOT changed or installed.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readSelectedTrackedSourceBytes as read,withSelectedTrackedSourceOperation as scope} from './selected-source-reader-20261101.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {SELECTED_SOURCE_READER_PINS as PINS} from './selected-source-reader-20261101-pins.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/source-profiles/selected-source-reader-20261101/';
const need=(yes,message)=>{if(!yes)throw TypeError('Selected reader source history: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
export function proposeSelectedSourceReaderHistory({root=ROOT}={}){
 root=resolve(root);return scope(root,()=>{
  const text=name=>{const bytes=read(root,name,{maxBytes:1048576}),value=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes);need(Buffer.from(value).equals(bytes),'whole exact UTF8 source required');return value;};
  const sources={};for(const key of Object.keys(PINS)){const value=text(P+'selected-source-reader-20261101-'+key+'.mjs.txt');need(hash(value)===PINS[key],'complete immutable source snapshot differs');sources[key]=value;}
  need(text('tools/translation/forward-output-ownership-20261101-bounded-bytes.mjs')===sources['predecessor-reader'],'committed predecessor reader changed');
  need(text('tools/translation/source-corpus.mjs')===sources['predecessor-corpus'],'original corpus must still retain its exact committed issuer/delegation');
  need(text('tools/translation/selected-source-reader-20261101.mjs')===sources['authored-reader']&&text('tools/translation/selected-source-reader-20261101-metadata.mjs')===sources['authored-metadata']&&text('tools/translation/selected-source-reader-20261101-index.mjs')===sources['authored-index'],'complete actual new implementation differs');
  const corpusAfter=sources['predecessor-corpus'].replace("import {readBoundedTrackedSourceBytes} from './forward-output-ownership-20261101-bounded-bytes.mjs';","import {readSelectedTrackedSourceBytes} from './selected-source-reader-20261101.mjs';").replace('return readBoundedTrackedSourceBytes(root,path,{maxBytes});','return readSelectedTrackedSourceBytes(root,path,{maxBytes});');
  need(corpusAfter===sources['virtual-corpus'],'virtual delegation changed anything beyond byte ingress/import');
  const rows=[
   {path:'tools/translation/selected-source-reader-20261101.mjs',before:sources['predecessor-reader'],after:sources['authored-reader'],physicallyInstalled:true,kind:'complete-data-reader-successor'},
   {path:'tools/translation/selected-source-reader-20261101-metadata.mjs',before:'',after:sources['authored-metadata'],physicallyInstalled:true,kind:'actual-git-metadata-transport-addition'},
   {path:'tools/translation/selected-source-reader-20261101-index.mjs',before:'',after:sources['authored-index'],physicallyInstalled:true,kind:'actual-complete-owned-index-image-transport-addition'},
   {path:'tools/translation/source-corpus.mjs',before:sources['predecessor-corpus'],after:corpusAfter,physicallyInstalled:false,kind:'proposed-original-private-issuer-byte-delegation'}
  ];
  const files=[],result={schema:'selected-original-source-reader-complete-successor-20261101-v1',files,originalCorpusPhysicallyChanged:false,sourceAuthority:false,semanticAuthority:false,executionEvidence:'UNRUN'};
  for(const row of rows){
   // Reusable language phase builds the complete selected transport; the
   // repository phase resolves its exact Router-local helper/delegate import.
   const middle=row.after.replace("'./selected-source-reader-20261101-metadata.mjs'","'./selected-source-reader-metadata.mjs'").replace("'./selected-source-reader-20261101.mjs'","'./selected-source-reader.mjs'").replace("'./selected-source-reader-20261101-index.mjs'","'./selected-source-reader-index.mjs'");
   const before=transportConcreteSyntaxSource(row.before,{language:'JavaScript'}),after=transportConcreteSyntaxSource(row.after,{language:'JavaScript'});
   const forward=applyConcreteSyntaxSubstitutions(before.meta,{languageRules:[{id:'javascript:selected-original-byte-operation-with-literal-git-rows',edits:[{span:[0,row.before.length],expected:row.before,replacement:middle}]}],repositoryRules:[{id:'router:selected-reader-local-source-dependencies',edits:[{span:[0,middle.length],expected:middle,replacement:row.after}]}]});
   const inverse=applyConcreteSyntaxSubstitutions(after.meta,{languageRules:[{id:'javascript:restore-complete-original-reader-or-delegation',edits:[{span:[0,row.after.length],expected:row.after,replacement:row.before}]}],repositoryRules:[{id:'router:restore-complete-original-source-coordinate',edits:[]}]});
   need(forward.value.source===row.after&&inverse.value.source===row.before&&transportConcreteSyntaxMeta(before.meta).source===row.before&&transportConcreteSyntaxMeta(after.meta).source===row.after,'complete source/CST/phase/inverse mismatch');
   const retained={...row,middle,inverse:row.before,beforeMeta:before.meta,afterMeta:after.meta,trace:forward.trace,inverseTrace:inverse.trace};
   // Count aliases on every retained path plus the current complete transient
   // equation pair BEFORE accumulating it. Original16Mi/2M/depth160 unchanged.
   account({sources,rows,result,retained,forward:forward.value,inverse:inverse.value});files.push(retained);
  }
  account(result);return result;
 },{limits:{paths:11,bytes:11*1048576}});
}
