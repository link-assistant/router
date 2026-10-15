import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const directory=new URL('../../docs/development/reusable-translation-guidance/',import.meta.url);
const revision='62c4ce09c82ce53c39cecba7a978157bf4f12077';
const prefix='docs/case-studies/issue-759/standard/';
const names=['CONTRIBUTING.template.md','AGENTS.template.md','workflow.template.yml'];
const expectedHashes={"CONTRIBUTING.template.md":"ecbd129f77b7c9bf51d28e8740cd304a68dbc93eca6678a42eb248ba332a2491","AGENTS.template.md":"e0752f29d0e42cb3ea9fadf5c4fe1c4006de34f639d38ed9b81642c0ac36108a","workflow.template.yml":"ac4f3f88c93ebfa7b614a64be2173bfe8d015c84ab0074ee5d32e7922cfc7792"};
const original=name=>{
  const bytes=execFileSync('git',['show',revision+':'+prefix+name],{cwd:root,timeout:10000,maxBuffer:1048576});
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expectedHashes[name]);
  return bytes.toString('utf8');
};
// Apply only unified text hunks in memory. No case path or temporary checkout is written.
function applyPatch(text,originals){
  const lines=text.trimEnd().split('\n'),result=new Map();let index=0;
  while(index<lines.length){
    const before=lines[index++],after=lines[index++];
    assert.ok(before.startsWith('--- a/'+prefix));assert.ok(after.startsWith('+++ b/'+prefix));
    const name=before.slice(('--- a/'+prefix).length);
    assert.equal(after,'+++ b/'+prefix+name);assert.ok(names.includes(name));assert.equal(result.has(name),false);
    const old=originals.get(name).trimEnd().split('\n'),next=[];let consumed=0;
    while(index<lines.length&&!lines[index].startsWith('--- ')){
      const hunk=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@$/u.exec(lines[index++]);assert.ok(hunk);
      const start=Number(hunk[1])-1;assert.ok(start>=consumed&&start<=old.length);
      while(consumed<start)next.push(old[consumed++]);
      let removed=0,added=0;
      while(index<lines.length&&!lines[index].startsWith('@@ ')&&!lines[index].startsWith('--- ')){
        const line=lines[index++],kind=line[0],value=line.slice(1);assert.ok([' ','+','-'].includes(kind));
        if(kind!=='-'){next.push(value);added++;}
        if(kind!=='+'){assert.equal(old[consumed++],value);removed++;}
      }
      assert.equal(removed,Number(hunk[2]??1));assert.equal(added,Number(hunk[4]??1));assert.equal(next.length,Number(hunk[3])-1+added);
    }
    next.push(...old.slice(consumed));result.set(name,next.join('\n')+'\n');
  }
  assert.equal(result.size,3);return result;
}
function workflowContract(workflow){
  assert.match(workflow,/bun-version:\n        type: string\n        required: true/u);
  assert.match(workflow,/oven-sh\/setup-bun@[a-f0-9]{40}\n        with:\n          bun-version: \$\{\{ inputs\.bun-version \}\}/u);
  assert.match(workflow,/needs: javascript-gate/u);assert.match(workflow,/cancel-in-progress: false/u);
  assert.match(workflow,/test "\$TESTED_SHA" = "\$SOURCE_SHA"/u);
  assert.deepEqual([...workflow.matchAll(/timeout-minutes: (\d+)/gu)].map(match=>match[1]),['15','30']);
}

test('outside-case patch preserves pinned templates and stages explicit Bun runtime selection',()=>{
  const originals=new Map(names.map(name=>[name,original(name)]));
  const patched=applyPatch(readFileSync(new URL('standard-guidance.patch',directory),'utf8'),originals);
  for(const name of names.slice(0,2)){
    const expected=readFileSync(new URL(name,directory),'utf8');assert.equal(patched.get(name),expected);
    assert.ok(expected.startsWith(originals.get(name))); // Existing tier/release/publication policy survives verbatim.
  }
  workflowContract(patched.get('workflow.template.yml'));
});

test('patch refuses stale context and workflow controls reject weakened prerequisites',()=>{
  const originals=new Map(names.map(name=>[name,original(name)])),patch=readFileSync(new URL('standard-guidance.patch',directory),'utf8');
  const changed=new Map(originals);changed.set('CONTRIBUTING.template.md',originals.get('CONTRIBUTING.template.md').replace('there is no promise','there is a promise'));
  assert.throws(()=>applyPatch(patch,changed));
  assert.throws(()=>applyPatch(patch.replace('@@ -','@@ -999999'),originals));
  const workflow=applyPatch(patch,originals).get('workflow.template.yml');
  assert.throws(()=>workflowContract(workflow.replace('required: true\n      types-command:','required: false\n      types-command:')));
  assert.throws(()=>workflowContract(workflow.replace('needs: javascript-gate','needs: setup')));
  assert.throws(()=>workflowContract(workflow.replace('cancel-in-progress: false','cancel-in-progress: true')));
});

test('receiving guidance retains both checked directions, stricter policies and bounded coordinated work',()=>{
  for(const name of names.slice(0,2)){
    const source=readFileSync(new URL(name,directory),'utf8'),text=source.replace(/\s+/gu,' ');
    assert.match(text,/`language` first, then `repository`/u);
    assert.match(text,/Rust → meta → JavaScript\/TypeScript/u);assert.match(text,/JavaScript → meta → Rust\/TypeScript/u);
    assert.match(text,/serialize, reparse and independently check semantic meta/u);
    assert.match(text,/source of truth/u);assert.match(text,/check mode.*without repairing/u);
    assert.match(text,/complete focused JavaScript/u);assert.match(text,/strict(?:-compiled)? TypeScript/u);
    assert.match(text,/(?:complete|full) same-SHA JavaScript gate/u);
    assert.match(text,/meaningful Rust edge/u);assert.match(text,/explicit stricter user policy/iu);
    assert.match(text,/rust-script or other Rust-backed tools/u);
    assert.match(text,/one heavy compiler, test or compression workload/iu);
    assert.match(text,/Measure actual.*before optimiz/iu);assert.match(text,/original semantics|preserve semantics/iu);
    assert.match(text,/at most three active workers/u);assert.match(text,/user or environment constraints/u);
    assert.match(text,/publication owner/u);assert.match(text,/metadata and (?:raw )?logs.*every.*job.*attempt/iu);
    assert.match(text,/no (?:second push|repeated pushes).*cancellation/iu);
    assert.doesNotMatch(source,/issue\s*#?759|\/root\/|gpt-\d|Code\/Archive/u);
  }
  const readme=readFileSync(new URL('README.md',directory),'utf8');
  assert.match(readme,/exports the committed compiler closure/u);assert.match(readme,/Copy this guidance separately/u);
  assert.match(readme,/not proof of sufficiency/u);assert.match(readme,/has NOT been applied/u);
});
