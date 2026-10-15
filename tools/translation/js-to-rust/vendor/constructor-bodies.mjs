// Source-expression evidence can never authorize a transplanted parent body.
import {types,isDeepStrictEqual} from 'node:util';
import {ownershipSyntax} from './module-syntax.mjs';
import {lex} from './lexer.mjs';
import {parseJavaScriptItem} from './frontends.mjs';
import {check,toLino} from './ir.mjs';
import {containsThrow} from './completions.mjs';
import {assertConstructorProofData,createConstructorSourceGraph,originalConstructorSourceGraph,issueImportedErrorConstructor,originalImportedErrorConstructor} from './source-constructors.mjs';

const bodies=new WeakMap(),checking=new WeakSet();
const fail=message=>{throw Object.assign(new Error(message),{slug:'collection'});};
export function sourceConstructorItem(item) {
  // Inspect own descriptors before looking at new public proof/body fields.
  if(!item||typeof item!=='object')return false;
  if(types.isProxy(item))fail('a proxy instead of original constructor parent data');
  for(const key of ['sourceConstructors','conditionalConstructors'])if(Object.getOwnPropertyDescriptor(item,key))return true;
  const body=Object.getOwnPropertyDescriptor(item,'body');
  if(body&&!Object.hasOwn(body,'value'))fail('an accessor instead of original constructor body data');
  assertConstructorProofData(body?.value??null);
  return /"kind":"source-error"/u.test(JSON.stringify(body?.value));
}
export const isOriginalConstructorBodyCheck=item=>checking.has(item);
export function assertOriginalConstructorGraph(item,graph) {
  assertConstructorProofData(item);
  const sources=originalConstructorSourceGraph(graph);
  if(!item.sourceConstructors||!isDeepStrictEqual(item.sourceConstructors.sources,sources)
    ||JSON.stringify(item.sourceConstructors.sources)!==JSON.stringify(sources))fail('constructor meta sources differ from the genuine original producer graph');
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
  const token=Object.freeze({});bodies.set(token,{parsed,proof});return token;
}
export function lowerOriginalConstructorBody(token) {
  const state=bodies.get(token);if(!state)fail('a copied or foreign original constructor body');
  const parsed={...state.parsed,lossless:true,conditionalConstructors:true,sourceConstructors:state.proof};
  checking.add(parsed);
  try{return check(parsed,new Map());}finally{checking.delete(parsed);}
}
export function checkOriginalConstructorBody(item) {
  assertConstructorProofData(item);
  const proof=item.sourceConstructors;
  if(!proof||!item.conditionalConstructors)fail('missing original constructor parent proof or qualification');
  const graph=createConstructorSourceGraph(proof.sources),owner=proof.owner;
  if(!owner)fail('missing original constructor owner');
  const token=issueOriginalConstructorBody(graph,owner.path,owner.start,owner.end),state=bodies.get(token);
  if(!isDeepStrictEqual(proof,state.proof)||JSON.stringify(proof)!==JSON.stringify(state.proof))fail('changed original constructor parent sources, imports or proof');
  const expected=lowerOriginalConstructorBody(token);
  if(!isDeepStrictEqual(item.params,expected.params)||toLino(item)!==toLino(expected))fail('changed original constructor parent body, signature or completion');
  return expected;
}
