// Source-expression evidence can never authorize a transplanted parent body.
import {types,isDeepStrictEqual} from 'node:util';
import {ownershipSyntax} from './module-syntax.mjs';
import {lex} from './lexer.mjs';
import {parseJavaScriptItem} from './frontends.mjs';
import {check,toLino} from './ir.mjs';
import {containsThrow} from './completions.mjs';
import {assertConstructorProofData,createConstructorSourceGraph,originalConstructorSourceGraph,issueImportedErrorConstructor,originalImportedErrorConstructor} from './source-constructors.mjs';

const bodies=new WeakMap(),checking=new WeakSet(),parentGraphs=new WeakMap();
// Detection also runs in existing pure checker/emitter paths. It must not call
// JSON serializers, iterable protocols or late-bound collection operations.
const descriptor=Object.getOwnPropertyDescriptor,own=Object.hasOwn,ownKeys=Reflect.ownKeys,prototype=Object.getPrototypeOf,proxy=types.isProxy,apply=Reflect.apply,functionText=Function.prototype.toString;
const objectPrototype=Object.prototype,arrayPrototype=Array.prototype;
const native=(fn,name)=>typeof fn==='function'&&!proxy(fn)&&apply(functionText,fn,[])===`function ${name}() { [native code] }`;
const nativeGuard=native(descriptor,'getOwnPropertyDescriptor')&&native(own,'hasOwn')&&native(ownKeys,'ownKeys')&&native(prototype,'getPrototypeOf')&&native(apply,'apply')&&native(functionText,'toString');
const fail=message=>{throw Object.assign(new Error(message),{slug:'collection'});};
export function sourceConstructorItem(item) {
  if(!item||typeof item!=='object')return false;
  if(!nativeGuard)fail('unavailable native constructor detection infrastructure');
  if(proxy(item))fail('a proxy instead of original constructor parent data');
  if(descriptor(item,'sourceConstructors')||descriptor(item,'conditionalConstructors'))return true;
  const body=descriptor(item,'body');
  if(body&&!own(body,'value'))fail('an accessor instead of original constructor body data');
  const active=[];let cells=200000,bytes=8388608;
  const visit=(value,depth)=>{
    if(depth>160||--cells<0)fail('constructor detection exceeds its depth or cell bound');
    if(typeof value==='string'){bytes-=value.length*2;if(bytes<0)fail('constructor detection exceeds its string bound');return false;}
    if(value===null||value===undefined||typeof value!=='object')return false;
    if(proxy(value))fail('a proxy instead of constructor body data');
    const parent=prototype(value);if(parent!==objectPrototype&&parent!==arrayPrototype&&parent!==null)fail('foreign constructor body data');
    for(let index=0;index<depth;index++)if(active[index]===value)fail('cyclic constructor body data');
    active[depth]=value;
    const kind=descriptor(value,'kind');if(kind&&!own(kind,'value'))fail('an accessor instead of constructor body kind');
    if(kind?.value==='source-error')return true;
    const keys=ownKeys(value);if(keys.length>cells+1)fail('constructor detection exceeds its field bound');
    for(let index=0;index<keys.length;index++){
      const key=keys[index],field=descriptor(value,key);
      if(typeof key!=='string'||!field||!own(field,'value'))fail('an accessor or symbol instead of constructor body data');
      bytes-=key.length*2;if(bytes<0)fail('constructor detection exceeds its key bound');
      if(visit(field.value,depth+1))return true;
    }
    active.length=depth;return false;
  };
  return visit(body?.value,0);
}
export const isOriginalConstructorBodyCheck=item=>checking.has(item);
function requireOriginalConstructorGraph(item,graph) {
  assertConstructorProofData(item);
  const sources=originalConstructorSourceGraph(graph);
  if(!item.sourceConstructors||!isDeepStrictEqual(item.sourceConstructors.sources,sources)
    ||JSON.stringify(item.sourceConstructors.sources)!==JSON.stringify(sources))fail('constructor meta sources differ from the genuine original producer graph');
}
export function assertOriginalConstructorGraph(item,graph) {
  requireOriginalConstructorGraph(item,graph);
  // Only a genuine privately issued graph can establish this association.
  // This saves graph parsing, never the original body/proof recheck below.
  parentGraphs.set(item,graph);
}
export function issueOriginalConstructorBody(graph,path,start,end) {
  const sources=originalConstructorSourceGraph(graph),record=sources.find(row=>row.path===path);
  if(!record||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>record.source.length)fail('invalid original constructor owner coordinates');
  const {ts,file}=ownershipSyntax(record.source);
  const owner=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.getStart(file)===start&&node.end<=end);
  if(!owner||owner.asteriskToken||owner.modifiers?.some(mod=>![ts.SyntaxKind.ExportKeyword].includes(mod.kind)))fail('an unsupported original constructor caller');
  if(lex(record.source.slice(owner.end,end),'JavaScript').some(token=>token.type!=='comment'&&token.text!==';'))fail('active source after the original constructor caller');
  const constructors=new Map();
  const visit=node=>{
    if(node!==owner&&(ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isArrowFunction(node)))fail('nested callable creation in an original constructor caller');
    if(ts.isNewExpression(node))constructors.set(node.getStart(file),issueImportedErrorConstructor(graph,path,node.getStart(file),node.end));
    ts.forEachChild(node,visit);
  };visit(owner);
  if(!constructors.size||constructors.size>8)fail('an original caller without bounded genuine constructor expressions');
  const tokens=lex(record.source,'JavaScript').filter(token=>token.start>=start&&token.end<=owner.end);
  const doc=record.source.slice(owner.getFullStart(),owner.getStart(file));
  const parsed=parseJavaScriptItem(tokens,doc,{source:record.source,sourceConstructors:constructors});
  if(parsed.kind!=='function'||!containsThrow(parsed.body))fail('an original constructor caller without abrupt completion');
  const proof={schema:'original-source-constructor-body-v1',sources,owner:{path,start,end},
    constructors:[...constructors.values()].map(token=>originalImportedErrorConstructor(token).proof),
    conditionalConstructors:true,wholeParentRecheckRequired:true,runtimeParity:false};
  const token=Object.freeze({});bodies.set(token,{parsed,proof,graph});return token;
}
export function lowerOriginalConstructorBody(token) {
  const state=bodies.get(token);if(!state)fail('a copied or foreign original constructor body');
  const parsed={...state.parsed,lossless:true,conditionalConstructors:true,sourceConstructors:state.proof};
  checking.add(parsed);
  try{
    const checked=check(parsed,new Map());
    parentGraphs.set(checked,state.graph);
    return checked;
  }finally{checking.delete(parsed);}
}
export function checkOriginalConstructorBody(item) {
  assertConstructorProofData(item);
  const proof=item.sourceConstructors;
  if(!proof||!item.conditionalConstructors)fail('missing original constructor parent proof or qualification');
  // Copies and foreign objects reconstruct their source graph. Only an actual
  // parsed/checked parent associated above can reuse the private AST/checker.
  const graph=parentGraphs.get(item)??createConstructorSourceGraph(proof.sources),owner=proof.owner;
  requireOriginalConstructorGraph(item,graph);
  if(!owner)fail('missing original constructor owner');
  const token=issueOriginalConstructorBody(graph,owner.path,owner.start,owner.end),state=bodies.get(token);
  if(!isDeepStrictEqual(proof,state.proof)||JSON.stringify(proof)!==JSON.stringify(state.proof))fail('changed original constructor parent sources, imports or proof');
  const expected=lowerOriginalConstructorBody(token);
  if(!isDeepStrictEqual(item.params,expected.params)||toLino(item)!==toLino(expected))fail('changed original constructor parent body, signature or completion');
  return expected;
}
