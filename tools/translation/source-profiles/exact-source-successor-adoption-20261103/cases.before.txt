// Source algebra and narrow DATA-scope cases. Not a receiving compiler fixture.
// Every parser/CST/case execution is UNRUN during bulk source drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {composeExactSourceSuccessorData as compose} from '../exact-source-successor-data-20261103.mjs';
import {prepareExactSourceSuccessor,knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const INDEX='tools/translation/source-profiles/exact-source-successors-20261103/index.json';
const edge=(id,before,after)=>({id,language:'JavaScript',before,after});
test('unique complete histories compose and deduplicate identical equations without rewriting dollar or Unicode DATA',()=>{
 const a='const café="$&";\n',b='const café="e\u0301";\n',c='const café="é";\n';
 const result=compose({path:'module.mjs',before:a,current:b,edges:[edge('first',a,b),edge('same-equation',a,b),edge('second',b,c)]});
 assert.equal(result.after,c);assert.equal(result.inverse,a);assert.deepEqual(result.chain[0].ids,['first','same-equation']);assert.equal(result.currentInSelectedChain,true);assert.equal(result.currentIsTerminal,false);assert.equal(result.semanticAuthority,false);
 assert.deepEqual(result.selectionTrace.map(row=>row.phase),['language','repository']);
 assert.equal(compose({path:'module.mjs',before:a+' ',current:c,edges:[edge('first',a,b)]}),null);
});
test('branches cycles duplicate IDs and excessive history are explicit refusals',()=>{
 assert.throws(()=>compose({path:'m',before:'a',current:'b',edges:[edge('one','a','b'),edge('two','a','c')]}),/ambiguous/u);
 assert.throws(()=>compose({path:'m',before:'a',current:'b',edges:[edge('one','a','b'),edge('two','b','a')]}),/cyclic/u);
 assert.throws(()=>compose({path:'m',before:'a',current:'b',edges:[edge('same','a','b'),edge('same','b','c')]}),/unique/u);
 assert.throws(()=>compose({path:'m',before:'0',current:'65',edges:Array.from({length:65},(_,at)=>edge('edge'+at,String(at),String(at+1)))}),/bounded/u);
});
test('a source proposal never approves an unrelated physical program',()=>{
 const result=compose({path:'m',before:'a',current:'unrelated',edges:[edge('one','a','b')]});
 assert.equal(result.after,'b');assert.equal(result.currentInSelectedChain,false);assert.equal(result.currentIsTerminal,false);assert.equal(result.sourceAuthority,false);assert.equal(result.nativeBindingQualified,false);
});
test('input accessors are rejected before they can supply source or graph DATA',()=>{
 let called=0;const input={path:'m',current:'b',edges:[edge('one','a','b')]};Object.defineProperty(input,'before',{enumerable:true,get(){called++;return 'a';}});
 assert.throws(()=>compose(input));assert.equal(called,0);
});
function fixture(t,path='tools/translation/protected-native-writers-20261102.mjs'){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'exact-source-data-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=fs.readFileSync(join(ROOT,INDEX)),index=JSON.parse(source),rows=index.rows.filter(row=>row.path===path);
 const copy=name=>{const target=join(root,name);fs.mkdirSync(dirname(target),{recursive:true});fs.copyFileSync(join(ROOT,name),target);};copy(INDEX);
 for(const row of rows)for(const name of [row.before.path,row.after.path])copy(name);
 copy(path);return {root,path,rows,before:fs.readFileSync(join(ROOT,rows[0].before.path),'utf8'),current:fs.readFileSync(join(ROOT,path),'utf8')};
}
test('actual reviewed native-writer sources compose full CST inverses to their complete current image',{timeout:60000},t=>{
 const f=fixture(t),result=knownExactSourceSuccessor({path:f.path,before:f.before},{root:f.root});
 assert.ok(result);assert.equal(result.currentAfter,f.current);assert.equal(result.inverse,f.before);assert.equal(result.history.inverse,f.before);assert.ok(result.stages.length>=2);
 for(const stage of result.stages){assert.equal(stage.inverse,stage.before);assert.equal(stage.history.inverse,stage.before);assert.deepEqual(stage.trace.map(row=>row.phase),['language','repository']);}
 assert.equal(result.nativeBindingQualified,false);assert.equal(result.sourceInstalled,false);
 assert.equal(knownExactSourceSuccessor({path:'../outside',before:'any'},{root:f.root}),null);
 assert.equal(prepareExactSourceSuccessor({path:f.path,before:f.before+'\n'},{root:f.root}),null);
});
test('a caught source change and restoration cannot revive a shared operation; a fresh operation rechecks it',{timeout:60000},t=>{
 const f=fixture(t),input={path:f.path,before:f.before};let caught=false;
 assert.throws(()=>withExactSourceHistoryDataOperation(f.root,()=>{
  assert.ok(knownExactSourceSuccessor(input,{root:f.root}));fs.writeFileSync(join(f.root,f.path),f.current+'\n');
  try{knownExactSourceSuccessor(input,{root:f.root});}catch{caught=true;}finally{fs.writeFileSync(join(f.root,f.path),f.current);}
  assert.throws(()=>knownExactSourceSuccessor(input,{root:f.root}));
 }));assert.equal(caught,true);assert.ok(knownExactSourceSuccessor(input,{root:f.root}));
});
test('source-image closing failures preserve exact falsy/frozen application primaries',{timeout:60000},t=>{
 for(const primary of [undefined,null,false,0,'',Object.freeze(Error('application primary'))]){
  const f=fixture(t),image=f.rows[0].before.path,original=fs.readFileSync(join(f.root,image));let caught=false,value;
  try{withExactSourceHistoryDataOperation(f.root,()=>{knownExactSourceSuccessor({path:f.path,before:f.before},{root:f.root});fs.writeFileSync(join(f.root,image),Buffer.concat([original,Buffer.from('\n')]));throw primary;});}catch(error){caught=true;value=error;}
  assert.equal(caught,true);assert.strictEqual(value,primary);
 }
});
