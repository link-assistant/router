// Complete source substitution DATA. No executable/type/native authority.
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {exactSourceHistoryEpoch} from './exact-source-history-epoch-20261103.mjs';
import {knownExactSourceSuccessor} from './exact-source-successors-20261103.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/borrowed-json-tool-packaging-installed-20261103/complete-source.json.gz';
const SHA='4e796493d01ef8d87c4be87efde83c2eed3b74b7c251a5bae540526a70c9c640';
const PATHS=["tools/translation/extensions/json-runtime.mjs","tools/translation/host-assets.mjs","tools/translation/borrowed-json-tool-predicate-20261103-packaging.mjs","tools/translation/borrowed-json-tool-predicate-20261103-profile.mjs"];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Complete installed borrowed JSON packaging: '+message);};
export function proposeBorrowedJsonToolPackagingInstalledSources({root=ROOT}={}){
 const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(join(root,PACKET),1048576);if(hash(packed)!==SHA)fail('fixed complete source archive differs');const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('lossless complete source required');const document=JSON.parse(text);
  if(document.schema!=='borrowed-json-tool-packaging-installed-source-20261103-v1'||document.rows.length!==4||new Set(document.rows.map(row=>row.path)).size!==4||document.rows.some(row=>!PATHS.includes(row.path))||document.newFiles.length!==0)fail('complete four-parent packaging source cohort required');
  const equation=row=>{
   if(row.proposedAfter!==null&&(typeof row.proposedAfter!=='string'||hash(row.proposedAfter)!==row.proposedAfterSha256))fail('whole frozen earlier proposal source differs');
   if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||row.beforeSha256!==undefined&&hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256)fail('complete original/successor/inverse differs');
   const input=transportConcreteSyntaxSource(row.before,{language:'JavaScript'});if(transportConcreteSyntaxMeta(input.meta).source!==row.before)fail('whole original CST roundtrip differs');
   const result=applyConcreteSyntaxSubstitutions(input.meta,{languageRules:[{id:'javascript:retain-complete-source-native-options-and-errors',edits:[]}],repositoryRules:[{id:'router:install-complete-borrowed-json-runtime-assets',edits:[{span:[0,row.before.length],expected:row.before,replacement:row.after}]}]});if(result.value.source!==row.after)fail('whole source substitution differs');
   const stages=transportConcreteSourceEquations([{before:row.before,after:row.before,language:'JavaScript'},{before:row.before,after:row.after,language:'JavaScript'}]).map((history,at)=>{if(transportConcreteSyntaxMeta(history.beforeMeta).source!==history.inverse||transportConcreteSyntaxMeta(history.afterMeta).source!==(at?row.after:row.before))fail('complete independent phase CST/inverse differs');return {phase:at?'repository':'language',history};});
   return {...row,stages,trace:result.trace,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
  };
  return {files:document.rows.map(equation),newFiles:document.newFiles.map(equation),sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
 },[custody.close]);
}
export function knownBorrowedJsonToolPackagingInstalledSuccessor({root=ROOT,path,before}={}){
 if(!PATHS.includes(path)||typeof before!=='string')return null;const row=proposeBorrowedJsonToolPackagingInstalledSources({root}).files.find(row=>row.path===path);if(row.before!==before)return null;const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{const current=custody.read(join(root,path)),later=current===row.after?null:knownExactSourceSuccessor({path,before:row.after},{root});if(current!==row.after&&(!later||later.currentIsTerminal!==true||later.after!==current))fail('actual complete installed JSON packaging source differs');const history=exactSourceHistoryEpoch({path,before,after:row.after,current,language:'JavaScript'});return {...history,currentAfter:current,installationEquation:row,laterHistories:later?[later]:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};},[custody.close]);
}
