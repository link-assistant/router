// Complete creation images only. No installer or semantic issuer.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createConcreteSourceRuleRegistry} from './concrete-source-rule-registry.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PACKET='tools/translation/source-profiles/ordered-scalar-helper-statements-20261103/complete-source.json.gz';
const SHA='a64ea56775faef671aa4a9118c1f6b11b3e71670fc222cf986034d9a49eff5ea';
const PATHS=["tools/translation/ordered-scalar-helper-statements-20261103.mjs", "tools/translation/test/ordered-scalar-helper-statements-20261103.test.mjs", "rust/tests/translation_ordered_scalar_helper_oracle.rs"];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Scalar source reconciliation creation: '+message);};
export function proposeOrderedScalarHelperStatementSources20261103(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const raw=custody.readBytes(ROOT+PACKET,1048576);if(hash(raw)!==SHA)fail('fixed complete creation archive differs');
  const bytes=gunzipSync(raw,{maxOutputLength:8388608}),text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))fail('complete creation UTF8 differs');const document=JSON.parse(text);
  if(document.schema!=='ordered-scalar-helper-statements-creation-20261103-v1'||document.files.length!==3||new Set(document.files.map(row=>row.path)).size!==3)fail('all three complete creations required');
  for(const row of document.files)if(!PATHS.includes(row.path)||row.language!==(row.path.endsWith('.rs')?'Rust':'JavaScript')||typeof row.source!=='string'||hash(row.source)!==row.sha256||custody.read(ROOT+row.path)!==row.source||row.sequences.join(',')!=='language,repository')fail('actual complete creation source differs');
  const registry=createConcreteSourceRuleRegistry([
   {id:'language:retain-complete-source-reconciliation-implementation-and-cases',phase:'language',plan:files=>files.map(file=>({path:file.path,templates:[{span:[0,0],expected:'',parts:[document.files.find(row=>row.path===file.path).source]}]}))},
   {id:'repository:retain-original-source-creation-paths-and-both-rule-sequences',phase:'repository',requires:['language:retain-complete-source-reconciliation-implementation-and-cases'],plan:files=>files.map(file=>({path:file.path,templates:[]}))},
  ]);
  const plan=registry.plan(document.files.map(row=>({path:row.path,language:row.language,source:''})),['repository:retain-original-source-creation-paths-and-both-rule-sequences']);
  for(const file of plan.files)if(file.before!==''||file.inverse!==''||file.after!==document.files.find(row=>row.path===file.path).source)fail('complete source creation/CST inverse differs');
  return {plan,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
