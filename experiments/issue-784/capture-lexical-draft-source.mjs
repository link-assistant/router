// Complete source custody only. Reconstructed drafts are labeled separately.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';
const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,70}$/u);assert.equal(process.argv.length,3);
const paths=['tools/translation/static-rust-tokens.mjs','tools/translation/macro-token-trees.mjs','tools/translation/builtin-ast-builder-meta.mjs','tools/translation/test/builtin-import-token-storage.test.mjs'];
const files=paths.map(path=>{const source=readFileSync(path,'utf8');return {path,source,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex')};});
let candidate=files.find(row=>row.path.endsWith('/macro-token-trees.mjs')).source;
const edits=[
 ["import {createStaticRustTokenReader} from './static-rust-tokens.mjs';\n","import {createStaticRustTokenReader} from './static-rust-tokens.mjs';\nimport {originalStaticSourceIntrinsicsUnchanged} from './original-json-intrinsics.mjs';\n"],
 ['()=>readTokens(pin,source));','()=>readTokens(pin,source),true);'],
 ['function readOriginalMacroTrees(source,{maxBytes=128000,maxTokens=16000,maxDepth=64}={},readTokens) {',`// Only the private parser's fresh token/group/span/array records reach this
// walk. The complete native guard excludes changed values/forEach/freeze and
// prototype operations; observers retain the original recursive walk below.
function freezeOriginalTreeData(nodes){
  for(let at=0;at<nodes.length;at++){
    const node=nodes[at];if(node.kind==='group')freezeOriginalTreeData(node.children);
    Object.freeze(node.span);Object.freeze(node);
  }
  return Object.freeze(nodes);
}
function readOriginalMacroTrees(source,{maxBytes=128000,maxTokens=16000,maxDepth=64}={},readTokens,staticTreeData=false) {`],
 ['const trees=freezeMacroTree(list().children);','const children=list().children,trees=staticTreeData&&originalStaticSourceIntrinsicsUnchanged()?freezeOriginalTreeData(children):freezeMacroTree(children);'],
];
for(const [before,after]of edits){assert.equal(candidate.split(before).length,2);candidate=candidate.replace(before,()=>after);}
let inverse=candidate;for(const [before,after]of [...edits].reverse()){assert.equal(inverse.split(after).length,2);inverse=inverse.replace(after,()=>before);}assert.equal(inverse,files[1].source);
const result={sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files,
 reconstructedDeclinedDraft:{path:files[1].path,source:candidate,edits,inverse,reconstructedFromRecordedEdits:true,originalObservedSourceCustody:false,retainedInProduction:false},
 fullGatePassed:false,deadlineQualified:false,runtimeParity:false};
console.log(JSON.stringify({output:writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/'+label+'.json',Buffer.from(JSON.stringify(result)))}));
