import test from 'node:test';
import assert from 'node:assert/strict';
import {types} from 'node:util';
import {privateFrozenJsonOwnFieldsAliasHint as hint,createPrivateFrozenJsonCache} from '../private-frozen-json.mjs';
const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const freeze=value=>{if(value&&typeof value==='object'){for(const field of Object.values(value))freeze(field);Object.freeze(value);}return value;};
function legacy(module,original,cache){
 for(const name of ['items','allItems'])if(Object.hasOwn(module,name)&&JSON.stringify(module[name])!==cache(original[name]))throw new TypeError('Bang original scoped item carrier changed');
}
const outcome=run=>{try{return {returned:run()===undefined};}catch(error){return {error:{name:error.name,message:error.message}};}};
function compare(setup){
 const runs=[];
 for(const optimized of [false,true]){
  const tape=[],state=setup(tape),cache=createPrivateFrozenJsonCache();
  try{runs.push({result:outcome(()=>{if(!optimized||hint(state.module,state.original,['items','allItems'])!==true)legacy(state.module,state.original,cache);}),tape});}
  finally{state.restore?.();}
 }
 assert.deepEqual(runs[1],runs[0]);return runs;
}

test('ordinary immutable aliases and omitted carriers compare without changing their original contents',()=>{
 const rows=freeze([{name:'λ😀',span:{start:0,end:7},values:[null,true,1,-0,NaN,Infinity,undefined]}]),original={items:rows,allItems:rows};
 assert.equal(hint({...original},original,['items','allItems']),true);
 assert.equal(hint({},original,['items','allItems']),true);
 assert.equal(hint({items:rows},{items:rows},['items']),true);
 assert.equal(JSON.stringify(rows),'[{"name":"λ😀","span":{"start":0,"end":7},"values":[null,true,1,0,null,null,null]}]');
 const copy=freeze(JSON.parse(JSON.stringify(rows)));assert.equal(hint({items:copy},original,['items']),null);
 const module={...original};assert.strictEqual(module.items,rows);assert.equal(Object.isFrozen(rows[0].span),true);
});

test('different carriers mutable descendants accessors toJSON and proxy inputs retain complete old results and callback order',()=>{
 for(const mode of ['different','mutable','accessor','toJSON-getter','module-getter','module-proxy','array-proxy','omitted','extra','bigint','symbol','cycle'])compare(tape=>{
  let field=mode==='mutable'?{value:1}:freeze({value:1}),array,module,original;
  if(mode==='accessor')field=Object.freeze({get value(){tape.push('field-get');return 1;}});
  if(mode==='toJSON-getter')field=Object.freeze({get toJSON(){tape.push('toJSON-get');return function(){tape.push('toJSON-call');return 1;};}});
  if(mode==='bigint')field=Object.freeze({value:1n});if(mode==='symbol')field=Object.freeze({value:Symbol('original')});
  if(mode==='cycle'){field={};field.self=field;Object.freeze(field);}
  array=Object.freeze([field]);original={items:array,allItems:array};module={...original};
  if(mode==='different')module.items=freeze([{value:2}]);if(mode==='extra')module.items=freeze([{value:1},{value:1}]);if(mode==='omitted')delete module.items;
  if(mode==='module-getter')define(module,'items',{get(){tape.push('get-items');return array;},enumerable:true});
  const observer={get(target,key,receiver){tape.push('get:'+String(key));return Reflect.get(target,key,receiver);},ownKeys(target){tape.push('ownKeys');return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target,key){tape.push('descriptor:'+String(key));return get(target,key);}};
  if(mode==='module-proxy')module=new Proxy(module,observer);if(mode==='array-proxy')module.items=new Proxy(array,observer);
  return {module,original};
 });
});

test('boxed values with erased prototypes and lazy native stack cells remain outside scalar identity reuse',()=>{
 for(const kind of ['string','number','boolean'])for(const parent of [null,Object.prototype]){
  const box=kind==='string'?new String('original'):kind==='number'?new Number(7):new Boolean(true);Object.setPrototypeOf(box,parent);Object.freeze(box);
  const rows=Object.freeze([box]);assert.equal(hint({items:rows},{items:rows},['items']),null);
 }
 compare(tape=>{
  const prior=get(Error,'prepareStackTrace'),field={value:1};Error.captureStackTrace(field);
  define(Error,'prepareStackTrace',{configurable:true,writable:true,value:function(_error,sites){const inside=sites.some(site=>['privateFrozenJsonOwnFieldsAliasHint','immutableCost','immutableJson'].includes(site.getFunctionName()));tape.push({inside});return inside?'unexpected new callback':'original formatter';}});
  Object.freeze(field);const rows=Object.freeze([field]),original={items:rows,allItems:rows};
  return {module:{...original},original,restore(){if(prior)define(Error,'prepareStackTrace',prior);else delete Error.prepareStackTrace;}};
 });
});

test('changed native operations and inherited serialization hooks keep every ordinary fallback callback',()=>{
 for(const [owner,key]of [[JSON,'stringify'],[Object,'hasOwn'],[Object,'getOwnPropertyDescriptor'],[Object,'isFrozen'],[Reflect,'ownKeys'],[types,'isProxy'],[WeakMap.prototype,'get']])compare(tape=>{
  const rows=freeze([{value:1}]),original={items:rows,allItems:rows},prior=get(owner,key);
  define(owner,key,{...prior,value:function(...args){tape.push(key);return apply(prior.value,this,args);}});
  return {module:{...original},original,restore(){define(owner,key,prior);}};
 });
 for(const owner of [Object.prototype,Array.prototype])compare(tape=>{
  const rows=freeze([{value:1}]),original={items:rows,allItems:rows},prior=get(owner,'toJSON');
  define(owner,'toJSON',{configurable:true,value:function(key){tape.push('toJSON:'+key);return this;}});
  return {module:{...original},original,restore(){if(prior)define(owner,'toJSON',prior);else delete owner.toJSON;}};
 });
});

test('a source carrier getter changing stringify preserves callee lookup before the getter and complete throws',()=>{
 for(const throws of [false,true]){
  const runs=compare(tape=>{
   const rows=freeze([{value:1}]),original={items:rows,allItems:rows},module={...original},prior=get(JSON,'stringify');
   const wrapped=label=>function(...args){tape.push(label);return apply(prior.value,this,args);};
   define(JSON,'stringify',{...prior,value:wrapped('old')});
   define(module,'items',{enumerable:true,get(){tape.push('get-items');if(throws)throw Error('original getter stop');define(JSON,'stringify',{...prior,value:wrapped('new')});return rows;}});
   return {module,original,restore(){define(JSON,'stringify',prior);}};
  });
  assert.equal(runs[1].tape[0],'get-items');if(!throws)assert.equal(runs[1].tape[1],'old');else assert.equal(runs[1].result.error.message,'original getter stop');
 }
});

test('source field lists and logical DATA depth and cell budgets fail closed without invoking getters',()=>{
 const rows=freeze([{value:1}]),left={items:rows},right={items:rows};let callbacks=0;
 const accessor=[];define(accessor,'0',{get(){callbacks++;return 'items';}});
 for(const names of [accessor,new Proxy(['items'],{get(){callbacks++;throw Error('unexpected list get');}}),Array(1),['items',undefined],Array(65)])assert.equal(hint(left,right,names),null);
 assert.equal(callbacks,0);
 let deep=Object.freeze({value:1});for(let at=0;at<180;at++)deep=Object.freeze({next:deep});const nested=Object.freeze([deep]);assert.equal(hint({items:nested},{items:nested},['items']),null);
 let shared=Object.freeze({value:1});for(let at=0;at<18;at++)shared=Object.freeze({left:shared,right:shared});const many=Object.freeze([shared]);assert.equal(hint({items:many},{items:many},['items']),null);
 for(const module of [null,undefined,7,'source'])assert.equal(hint(module,right,['items']),null);
 assert.equal(hint(left,right,['items']),true);
});

test('mutable array carriers require a fresh complete dense data census and exact original immutable cell aliases',()=>{
 const first=freeze({name:'first',values:['λ😀',true]}),second=freeze({name:'second',values:[false]}),original=Object.freeze([first,second]),carrier=[first,second];
 assert.equal(hint({items:carrier},{items:original},['items']),true);assert.equal(Object.isFrozen(carrier),false);
 carrier.reverse();assert.equal(hint({items:carrier},{items:original},['items']),null);carrier.reverse();assert.equal(hint({items:carrier},{items:original},['items']),true);
 let callbacks=0;define(carrier,'0',{enumerable:true,configurable:true,get(){callbacks++;return first;}});assert.equal(hint({items:carrier},{items:original},['items']),null);assert.equal(callbacks,0);
 const hidden=[first,second];define(hidden,'stack',{get(){callbacks++;throw Error('unwanted stack');},configurable:true});assert.equal(hint({items:hidden},{items:original},['items']),null);assert.equal(callbacks,0);
 const mutable=[{name:'first'}],privateRows=Object.freeze(mutable);assert.equal(hint({items:[mutable[0]]},{items:privateRows},['items']),null);mutable[0].name='changed';assert.equal(hint({items:[mutable[0]]},{items:privateRows},['items']),null);
});
