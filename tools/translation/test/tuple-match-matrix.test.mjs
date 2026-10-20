import {materializeLexicalParentOriginalGit} from './portable-lexical-parent-history.mjs';
import {portableGit} from '../prepare-portable-git-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,mkdirSync,rmSync,cpSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {checkedSourceContext,bindCheckedSourceLinks} from '../extensions/source-links.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const tag=($,fields={})=>Object.freeze({$,...fields});
const tuple=(...fields)=>tag('Tuple',Object.fromEntries(fields.map((value,index)=>['field'+index,value])));
const some=field0=>tag('Some',{field0}),none=tag('None');
const evidence=node=>{
  if(!node||typeof node!=='object')return null;
  if(node.kind==='nested-match-alternatives'&&Array.isArray(node.rows))return node;
  if(node.patternControl?.kind==='nested-match-alternatives')return node.patternControl;
  for(const [key,value]of Object.entries(node))if(key!=='type'){
    const found=Array.isArray(value)?value.map(evidence).find(Boolean):evidence(value);if(found)return found;
  }
  return null;
};

test('actual anonymous boolean products retain exhaustive matrix observations in JS and strict TS',{timeout:60_000},async()=>{
  const result=project('pub fn choose(value:(bool,bool))->u8{match value{(true,true)=>1,(true,false)=>2,(false,true)=>3,(false,false)=>4}}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const [a,b,expected]of [[true,true,1n],[true,false,2n],[false,true,3n],[false,false,4n]])assert.equal(api.choose(tuple(a,b)),expected);
  });
});

test('nested standard constructors and tuples keep their actual field types',{timeout:60_000},async()=>{
  const source='pub fn nested(value:Option<(u8,bool)>)->u8{match value{Some((n,true))=>n,Some((_,false))=>0,None=>9}} pub fn pair(value:(Option<u8>,bool))->u8{match value{(Some(1|2),true)=>7,(Some(n),_)=>n,(None,_)=>8}}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.nested(some(tuple(5n,true))),5n);assert.equal(api.nested(some(tuple(5n,false))),0n);assert.equal(api.nested(none),9n);
    for(const enabled of [true,false])for(const n of [1n,2n,3n])assert.equal(api.pair(tuple(some(n),enabled)),enabled&&n<3n?7n:n);
    assert.equal(api.pair(tuple(none,false)),8n);
  });
});

test('tuple alternatives preserve first-arm priority and identical scalar binding projections',{timeout:60_000},async()=>{
  const result=project('pub fn choose(value:(u8,u8))->u8{match value{(0,_)=>9,(0|2,n)|(3,n)=>n,(_,_)=>1}}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const [left,expected]of [[0n,9n],[1n,1n],[2n,7n],[3n,7n],[4n,1n]])assert.equal(api.choose(tuple(left,7n)),expected);
  });
});

test('unit and grouped patterns lower only after their actual unit and constructor checks',{timeout:60_000},async()=>{
  const result=project('use std::result::Result as R; pub fn unit(value:())->bool{match value{(())=>true}} pub fn outcome(value:R<(),u8>)->u8{match value{R::Ok(())=>0,R::Err(n)=>n}} pub fn grouped(value:u8)->u8{match value{((n))=>n}}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.unit(null),true);assert.equal(api.outcome(tag('Ok',{field0:null})),0n);assert.equal(api.outcome(tag('Err',{field0:7n})),7n);assert.equal(api.grouped(255n),255n);
    assert.throws(()=>api.unit(false),TypeError);assert.throws(()=>api.outcome(tag('Ok',{field0:false})),TypeError);
  });
});

test('computed checked products keep a single source subject and early return semantics',{timeout:60_000},async()=>{
  const source='fn pair(value:u8)->(u8,bool){(value,true)} pub fn choose(value:u8)->Option<u8>{let selected:u8=match pair(value){(0,_)=>return None,(n,true)=>n,(_,false)=>9};Some(selected)}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.choose(0n),none);assert.deepEqual(api.choose(5n),some(5n));});
  const checked=checkProgram(parseRust(source+'fn main(){}')),proof=evidence(checked.declarations.get('choose').body);
  assert.ok(proof);assert.equal(proof.rows.length,3);assert.equal(proof.expandedRows,3);
});

test('computed tuple fields and only the selected arm execute their original effects in source order',{timeout:60_000},async()=>{
  const source='fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} fn subject()->(bool,bool){(mark("first"),mark("second"))} pub fn choose()->u8{match subject(){(true,true)=>{let arm=mark("selected");7},(_,_)=>{let arm=mark("fallback");8}}}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const folder=mkdtempSync(join(tmpdir(),'router-tuple-match-order-'));
  try{
    writeRuntimeAssets(folder);mkdirSync(join(folder,'src'),{recursive:true});
    const js=join(folder,'src/lib.mjs'),ts=join(folder,'src/lib.ts'),compiled=join(folder,'compiled');
    writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000,stdio:'pipe'});
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',folder,'--outDir',compiled,ts],{timeout:30_000,stdio:'pipe'});
    cpSync(join(folder,'runtime'),join(compiled,'runtime'),{recursive:true});
    for(const [modulePath,runtimePath]of [[js,join(folder,'runtime/effects.mjs')],[join(compiled,'src/lib.js'),join(compiled,'runtime/effects.mjs')]]){
      const {translated:api}=await import(pathToFileURL(modulePath)),{withEffectCapabilities}=await import(pathToFileURL(runtimePath));
      const calls=[],capability={fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}};
      assert.equal(withEffectCapabilities(capability,()=>api.choose()),7n);assert.deepEqual(calls,['first','second','selected']);
    }
  }finally{rmSync(folder,{recursive:true,force:true});}
});

test('tuple boundary checks reject hostile layouts before dispatching any caller reads',{timeout:60_000},async()=>{
  const result=project('pub fn choose(value:(bool,u8))->u8{match value{(true,n)=>n,(false,_)=>0}}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    let reads=0;const value=tuple(true,7n);
    const proxy=new Proxy(value,{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');},getPrototypeOf(){reads++;throw Error('prototype');}});
    const getter=Object.freeze({$:'Tuple',get field0(){reads++;return true;},field1:7n});
    for(const invalid of [proxy,getter,{$:'Tuple',field0:true,field1:7n},Object.freeze([true,7n]),tag('Pair',{field0:true,field1:7n}),tuple(true,256n)])assert.throws(()=>api.choose(invalid),TypeError);
    assert.equal(reads,0);
  });
});

test('checked and reparsed target metadata retain original tuple syntax and item coordinates',()=>{
  const source='pub fn choose(value:(u8,u8))->u8{match value{(0|2,n)=>n,(_,_)=>0}}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  for(const program of [result.meta.checkedSemanticProgram,result.meta.targetSemanticProgram]){
    const parsed=parseProgram(JSON.stringify(program)),declaration=[...parsed.declarations.values()].find(entry=>entry.k==='fn'&&evidence(entry.body));
    assert.ok(declaration);const proof=evidence(declaration.body),original=proof.rows[0].sourcePattern;
    assert.equal(original.pattern.k,'routerTuplePattern');assert.equal(original.pattern.items[0].k,'or');
    for(const token of original.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.raw??token.value);
    assert.deepEqual(proof.rows[0].plan.bindings.map(binding=>({name:binding.name,projection:binding.projection})),[{name:'n',projection:['field1']}]);
  }
});

test('tuple source patterns retain the existing parser and checked association freshness guards',()=>{
  const source='pub fn choose(value:(bool,u8))->u8{match value{(true,n)=>n,(false,_)=>0}}fn main(){}';
  const surface=parseRust(source),find=node=>{
    if(!node||typeof node!=='object')return null;if(node.k==='routerTuplePattern')return node;
    for(const value of Object.values(node)){const found=find(value);if(found)return found;}return null;
  };
  const pattern=find(surface.items);assert.ok(pattern);pattern.items[0].value=false;
  assert.throws(()=>checkProgram(surface),/changed after source capture/);
  const checked=checkProgram(parseRust(source)),context=checkedSourceContext(checked);
  const proof=evidence(checked.declarations.get('choose').body);assert.ok(proof);proof.rows[0].sourcePattern.pattern.items[0].value=false;
  assert.throws(()=>bindCheckedSourceLinks(checked,context,{targetProfile:{id:'tuple-matrix-freshness'}}),/checked declaration changed before source binding/);
});

test('source ownership actual arity constructor identity and missing cases stay explicit refusals',()=>{
  for(const source of [
    'struct Pair(u8,bool);pub fn bad(value:Pair)->u8{match value{(n,_)=>n}}',
    'struct Pair{field0:u8,field1:bool}pub fn bad(value:Pair)->u8{match value{(n,_)=>n}}',
    'pub fn bad(value:(u8,u8))->u8{match value{(n,)=>n}}',
    'pub fn bad(value:(u8,u8))->u8{match value{(n,n)=>n}}',
    'pub fn bad(value:(u8,u8))->u8{match value{(mut n,_)=>n}}',
    'pub fn bad(value:(u8,u8))->u8{match value{(ref n,_)=>0}}',
    'pub fn bad(value:(u8,u8))->u8{match value{(n,..)=>n}}',
    'pub fn bad(value:(u8,u8))->u8{match value{all@(n,_)=>n}}',
    'pub fn bad(value:(u8,u8))->u8{match value{(0,n)|(n,0)=>n,(_,_)=>0}}',
    'pub fn bad(value:(bool,u8))->u8{match value{(true,n)=>n}}',
    'pub fn bad(value:bool)->bool{match value{()=>true}}',
    'pub fn bad(value:(String,u8))->u8{match value{(_,n)=>n}}',
    'pub fn bad(value:&(u8,u8))->u8{match value{(n,_)=>n}}',
    'pub const fn bad(value:(bool,u8))->u8{match value{(true,n)=>n,(false,_)=>0}}',
  ]){
    const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);
  }
});

test('tuple Cartesian alternative products retain the existing finite matrix expansion bound',()=>{
  const type=Array(9).fill('u8').join(','),choices=Array(9).fill('0|1').join(','),wildcards=Array(9).fill('_').join(',');
  const result=project('pub fn bad(value:('+type+'))->u8{match value{('+choices+')=>1,('+wildcards+')=>0}}');
  assert.equal(result.meta.executable.some(item=>item.name==='bad'),false);assert.ok(result.meta.refused.some(item=>item.message.includes('expansion bound')));
});

const originals=JSON.parse(readFileSync(new URL('./fixtures/tuple-match-frontier.json',import.meta.url),'utf8'));
for(const pin of originals.sources)test('whole unchanged '+pin.path+' retains '+pin.name+' and its remaining obligations',{timeout:60_000},t=>{
  const historical=materializeLexicalParentOriginalGit(t);
  const source=portableGit(historical.root,['show',historical.revision+':'+pin.path]).toString('utf8');assert.equal(hash(source),pin.sourceSha256);
  const item=sourceItems(source).find(item=>item.term==='fn'&&item.name===pin.name);assert.ok(item);
  assert.deepEqual({start:item.start,end:item.end},pin.span);assert.equal(hash(source.slice(item.start,item.end)),pin.itemSha256);
  const result=translateProject({entry:pin.path,paths:[pin.path],readSource:()=>source});assert.equal(result.meta.runtimeParity,false);
  // These bodies need additional real source contracts, including computed
  // product typing and char Pattern. No isolated declaration replaces them.
  assert.ok(result.meta.refused.some(item=>item.name===pin.name));assert.equal(result.meta.executable.some(item=>item.name===pin.name),false);
});
