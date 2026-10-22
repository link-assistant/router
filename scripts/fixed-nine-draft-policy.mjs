// Finite reviewed caller-selection policy; never a callee/Rust bypass input.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {createRulePipeline} from '../tools/translation/rule-pipeline.mjs';
export const DRAFT_SUPPLEMENTS=Object.freeze(['benchmarks.yml','bindings.yml','docker-build.yml','fuzz.yml','macos-keychain.yml','mutants.yml','real-clients.yml','soak.yml','upgrade-matrix.yml']);
export const DRAFT_SUPPLEMENT_CONDITION="${{ github.event_name != 'pull_request' || toJSON(github.event.pull_request.draft) == 'false' }}";
export const DRAFT_SUPPLEMENT_PR_TYPES=Object.freeze(['opened','synchronize','reopened','ready_for_review']);
const ROOT=fileURLToPath(new URL('../',import.meta.url)),ARCHIVE='scripts/ci/fixed-nine-draft-workflow-sources.json.gz',hash=value=>createHash('sha256').update(value).digest('hex');
export function readFixedNineDraftWorkflowSources({root=ROOT}={}){
 const packed=fs.readFileSync(path.resolve(root,ARCHIVE));if(packed.length!==31445||hash(packed)!=='4ec4892f68ded5e4607d3b4731d82db0cde72019e70672a376d589d7fc9ab47e')throw TypeError('Fixed-nine full workflow source archive differs');const raw=gunzipSync(packed,{maxOutputLength:262144});if(raw.length!==199445||hash(raw)!=='f19ad9627a60c141210271a8836ee950c1706fcce13b16ce6609df199b7a2bf4')throw TypeError('Fixed-nine full workflow source packet differs');const packet=JSON.parse(raw.toString('utf8'));
 if(packet.schema!=='fixed-nine-draft-workflow-source-proposal-v1'||packet.publishedSource!=='c6bed6215e157de4381e39e04b4cb1ef02720384'||JSON.stringify(packet.fixedNine)!==JSON.stringify(DRAFT_SUPPLEMENTS)||packet.condition!==DRAFT_SUPPLEMENT_CONDITION||packet.rules.length!==18||packet.files.length!==14)throw TypeError('Fixed-nine reviewed source census differs');
 for(const row of packet.files)if(hash(row.before)!==row.beforeSha256||hash(row.after??row.before)!==row.afterSha256)throw TypeError('Fixed-nine complete workflow before/after pin differs');return packet;
}

// Additive current-source DATA view. The immutable reader/archive stay exact.
export function readCurrentFixedNineDraftWorkflowSources({root=ROOT}={}){
 const packet=readFixedNineDraftWorkflowSources({root}),name='.github/workflows/javascript-first.yml',original=packet.files.find(row=>row.path===name);
 if(!original||original.before!==(original.after??original.before))throw TypeError('Fixed-nine original reusable gate must remain unchanged');
 let source;try{source=fs.readFileSync(path.resolve(root,name),'utf8');}catch(error){if(error.code==='ENOENT')return packet;throw error;}
 if(source===original.before)return packet;
 const require=createRequire(new URL('./ci/package.json',import.meta.url)),{parseDocument,Parser,CST,visit}=require('yaml');
 const commands=new Map([
  ['node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text --check','node scripts/translate-router.mjs --check'],
  ['node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text --profile-matrix --check','node scripts/translate-router.mjs --profile-matrix --check'],
 ]);
 const fail=message=>{throw TypeError('Fixed-nine current workflow source: '+message);};
 function concrete(text){
  if(typeof text!=='string'||text.length>524288)fail('complete YAML source bound');const tokens=[...new Parser().parse(text)],meta=JSON.stringify({schema:'fixed-nine-native-yaml-CST-v1',source:text,tokens});if(meta.length>4194304)fail('complete YAML CST bound');const fresh=JSON.parse(meta);
  if(fresh.source!==text||fresh.tokens.map(token=>CST.stringify(token)).join('')!==text)fail('serialized/reparsed source differs');const document=parseDocument(text,{version:'1.2',uniqueKeys:true,keepSourceTokens:true});if(document.errors.length)fail('complete native YAML grammar');return {source:text,meta};
 }
 const sequence=createRulePipeline([
  {phase:'language',rules:[{id:'yaml:complete-serialized-reparsed-native-CST',apply:concrete}]},
  {phase:'repository',rules:[{id:'router:restore-only-qualified-flat-storage-commands',apply:input=>{
   const document=parseDocument(input.source,{version:'1.2',uniqueKeys:true,keepSourceTokens:true}),edits=[];
   visit(document,{Scalar(_key,node){if(commands.has(node.value)){const span=node.range.slice(0,2);if(input.source.slice(...span)!==node.value)fail('plain native command span');edits.push({span,expected:node.value,replacement:commands.get(node.value)});}}});
   if(edits.length!==2||new Set(edits.map(row=>row.expected)).size!==2)fail('exact canonical and matrix source edits required');
   let restored=input.source;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(restored.slice(...row.span)!==row.expected)fail('actual command changed');restored=restored.slice(0,row.span[0])+row.replacement+restored.slice(row.span[1]);}
   let offset=0;const inverse=[];for(const row of [...edits].sort((a,b)=>a.span[0]-b.span[0])){inverse.push({span:[row.span[0]+offset,row.span[0]+offset+row.replacement.length],expected:row.replacement,replacement:row.expected});offset+=row.replacement.length-row.expected.length;}
   let again=restored;for(const row of inverse.reverse()){if(again.slice(...row.span)!==row.expected)fail('whole inverse span differs');again=again.slice(0,row.span[0])+row.replacement+again.slice(row.span[1]);}if(again!==input.source)fail('whole inverse differs');return {...concrete(restored),edits};
  }}]},
 ]),result=sequence.run(source);
 if(result.value.source!==original.before)fail('complete restored workflow differs from immutable reviewed gate');
 const evolution={path:name,before:original.before,after:source,beforeMeta:result.value.meta,afterMeta:concrete(source).meta,inverse:original.before,completeInverse:true,nativeSelections:result.value.edits,trace:result.trace,sourceAuthority:false};
 return {...packet,files:packet.files.map(row=>row===original?{...row,before:source,after:source,beforeSha256:hash(source),afterSha256:hash(source)}:row),currentWorkflowSourceEvolution:evolution};
}
