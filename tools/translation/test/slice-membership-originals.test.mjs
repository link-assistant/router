import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url);
const fixture=JSON.parse(readFileSync(new URL('../fixtures/slice-membership-originals.json',import.meta.url),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});

// These expectations are written independently of the new runtime helper.
// Read whole original files, retaining every attribute, import and carried body.
test('whole original cookie header and secret predicates retain source and literal policy',async()=>{
  let outcomes=0;
  for(const entry of fixture.entries){
    const source=readFileSync(new URL(entry.path,root),'utf8');
    assert.equal(Buffer.byteLength(source),entry.bytes);assert.equal(hash(source),entry.sourceSha256);
    const items=sourceItems(source);
    for(const pin of entry.declarations){
      const item=items.find(item=>item.term===pin.term&&item.name===pin.name);
      assert.ok(item,pin.name);assert.deepEqual({start:item.start,end:item.end},pin.span);
      assert.equal(hash(source.slice(pin.span.start,pin.span.end)),pin.sha256);
    }
    const result=translateProject({entry:entry.path,paths:[entry.path],readSource:path=>{assert.equal(path,entry.path);return source;},deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
    assert.equal(result.meta.runtimeParity,false);
    assert.ok(result.meta.refused.length,'unrelated original effects and trait implementations remain explicit obligations');
    const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
    const aliases=entry.declarations.map(pin=>{
      const admitted=result.meta.executable.find(item=>item.term==='fn'&&item.name===pin.name);
      assert.ok(admitted,`${entry.path} ${pin.name}: original body must actually be admitted before positive evidence`);
      assert.deepEqual(admitted.span,pin.span);
      const emitted=target.declarations.get('rp_'+Buffer.from(pin.name).toString('hex'));assert.ok(emitted);
      return `${emitted.name} as original_${pin.name}`;
    });
    const suffix=`\nexport {${aliases.join(',')}};`;
    await verifyTypedTargets({...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix},(_api,_result,module)=>{
      for(const pin of entry.declarations){
        const predicate=module['original_'+pin.name];
        for(const [input,expected]of pin.cases){assert.equal(predicate(input),expected,`${pin.name} ${JSON.stringify(input)}`);outcomes++;}
        let reads=0;const proxy=new Proxy(Object.create(null),{get(){reads++;throw new Error('non-string input must not be read');},getPrototypeOf(){reads++;throw new Error('non-string input must not be read');}});
        for(const input of [null,0,[],proxy,'\ud800','\udc00'])assert.throws(()=>predicate(input),TypeError);
        assert.equal(reads,0);
      }
    });
  }
  assert.equal(outcomes,2*fixture.plannedLiteralOutcomesPerTarget);
});
