// Complete selected output only. Original macro ownership is a separate join;
// a caller-selected definition or matching public digest cannot resolve it.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {compileExpandedControlExpression,builtinSourceControlFacts,originalExpandedMacroInvocation} from './builtin-source-control.mjs';
import {declarativeExpansionLineage,declarativeNestedMacroInvocations,declarativeNestedMacroInput} from './declarative-token-macros.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';

const observations=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Bang output observation: '+message);};
function equal(left,right){
  let cells=1024;
  function compare(a,b,depth=0){
    if(--cells<0||depth>8)return false;
    if(a===null||typeof a!=='object')return a===b;
    if(!b||typeof b!=='object'||types.isProxy(a)||types.isProxy(b)||Array.isArray(a)!==Array.isArray(b))return false;
    const first=Object.getOwnPropertyDescriptors(a),second=Object.getOwnPropertyDescriptors(b),keys=Reflect.ownKeys(first);
    if(keys.length!==Reflect.ownKeys(second).length)return false;
    for(const key of keys)if(typeof key!=='string'||!Object.hasOwn(second,key)||!Object.hasOwn(first[key],'value')||!Object.hasOwn(second[key],'value')||!compare(first[key].value,second[key].value,depth+1))return false;
    return true;
  }
  return compare(left,right);
}
const word=tree=>tree?.kind==='token'?tree.text:null;
const reserved=new Set('as async await break const continue dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return static struct trait true type unsafe use where while abstract become box do final gen macro override priv try typeof unsized virtual yield'.split(' '));
const identifier=value=>typeof value==='string'&&/^(?:r#)?[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(value)&&(!reserved.has(value)||value.startsWith('r#'));
function denseDataArray(array){
  if(!array||types.isProxy(array)||!Array.isArray(array)||Object.getPrototypeOf(array)!==Array.prototype)fail('bounded original child list required');
  const fields=Object.getOwnPropertyDescriptors(array),names=Reflect.ownKeys(fields),length=fields.length;
  if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value>128||names.length!==length.value+1)fail('dense bounded original child list required');
  for(let at=0;at<length.value;at++)if(!Object.hasOwn(fields,String(at))||!Object.hasOwn(fields[at],'value'))fail('child list accessor or hole');
  return array;
}
function path(parts){
  if(!Array.isArray(parts)||!parts.length||parts.length>64||parts.some(part=>!identifier(part)))fail('unsupported original expression path');
}

/** Fold the complete original expression and every genuine nested expansion.
 * Children are already observed outputs, associated with exact private parent
 * and invocation records. They never supply replacement source or AST nodes. */
export function observeBangOutput(expansion,options={}){
  const lineage=declarativeExpansionLineage(expansion);
  if(!options||types.isProxy(options)||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).some(key=>key!=='children'))fail('own child observation options required');
  const option=Object.getOwnPropertyDescriptor(options,'children');if(option&&!Object.hasOwn(option,'value'))fail('child observation accessor');
  const children=option?option.value:[],control=compileExpandedControlExpression(expansion);
  if(!control.controlSyntaxProjected)fail(control.diagnostics[0]?.reason??'complete expression output grammar is unproved');
  const original=builtinSourceControlFacts(control);
  if(original.expansion!==expansion||original.inputKind!=='private-expanded-source-expression')fail('foreign complete expression projection');
  const records=declarativeNestedMacroInvocations(expansion),childList=denseDataArray(children),used=new Set(),links=[];
  const available=childList.map(child=>{
    const state=observations.get(child);if(!state)fail('copied or foreign nested output observation');
    const actual=declarativeExpansionLineage(state.expansion);
    if(actual.parent!==expansion)fail('nested output has another actual parent');
    return {child,state,lineage:actual};
  });
  let cells=32000;
  function count(depth){if(depth>64||--cells<0)fail('complete output grammar bound exhausted');}
  function trees(nodes,depth=0){
    for(const tree of nodes){count(depth);
      if(tree.kind==='token'){if(tree.text==='#')fail('output attribute expansion remains unproved');}
      else if(tree.kind==='group')trees(tree.children,depth+1);
      else if(tree.kind==='fragment'){
        if(!['ident','lifetime','tt'].includes(tree.fragment)||tree.trees.length!==1)fail('opaque copied fragment needs its original AST namespace proof');
        trees(tree.trees,depth+1);
      }else if(tree.kind!=='owner')fail('unproved original output tree');
    }
  }
  function pattern(tokens,depth=0){
    count(depth);if(!tokens.length)fail('empty original pattern');
    let begin=0;
    for(let at=0;at<=tokens.length;at++)if(at===tokens.length||word(tokens[at])==='|'){
      const part=tokens.slice(begin,at);if(!part.length)fail('nullable pattern alternative');begin=at+1;
      let index=0;if(word(part[index])==='&'){index++;if(word(part[index])==='mut')index++;}
      const head=part[index++];
      if(head?.kind==='group'&&head.delimiter==='('&&index===part.length){patternList(head.children,depth+1);continue;}
      if(!(identifier(word(head))||['true','false','..'].includes(word(head))||['number','string','char'].includes(head?.type)))fail('unsupported original pattern atom');
      while(word(part[index])==='::'){if(!identifier(word(part[index+1])))fail('unsupported original pattern path');index+=2;}
      if(part[index]?.kind==='group'&&part[index].delimiter==='('){patternList(part[index++].children,depth+1);}
      if(index!==part.length)fail('pattern attribute, type, binding or expression grammar remains unproved');
    }
  }
  function patternList(tokens,depth){
    if(!tokens.length)return;let begin=0;
    for(let at=0;at<=tokens.length;at++)if(at===tokens.length||word(tokens[at])===','){
      if(at===begin){if(at===tokens.length)return;fail('empty original pattern slot');}
      pattern(tokens.slice(begin,at),depth+1);begin=at+1;
    }
  }
  function nested(node){
    const association=originalExpandedMacroInvocation(control,node);
    const matching=records.filter(record=>association.argumentGroup.children===declarativeNestedMacroInput(expansion,record));
    if(matching.length!==1)fail('original argument-group occurrence is missing or alias-ambiguous');
    const row=matching[0];
    if(used.has(row)||!equal(row.writtenPath,association.originalNode.path)||row.delimiter!==association.argumentGroup.delimiter)fail('macro node lacks its exact original invocation lineage');
    const child=available.find(child=>equal(child.lineage.path,row.path));
    if(!child)fail('unproved nested macro '+node.path.join('::'));
    const expectedOwner=row.writtenPath.length===1?lineage.definition.owner:row.writtenPath.slice(0,-1);
    if(child.lineage.definition.name!==row.writtenPath.at(-1)||!equal(child.lineage.definition.owner,expectedOwner))fail('nested definition needs its actual lexical/qualified owner join; aliases remain unproved');
    if(links.some(link=>link.child===child.child))fail('nested output reused for another invocation');
    used.add(row);links.push({record:row,child:child.child,node});
  }
  function walk(node,depth=0){
    count(depth);if(!node||typeof node!=='object')fail('missing original output expression');
    const visit=child=>walk(child,depth+1),list=values=>values.forEach(visit);
    switch(node.kind){
      case 'literal':if(!['bool','number','string','char'].includes(node.sourceLiteralKind))fail('unsupported original literal');return;
      case 'written-path':path(node.path);return;
      case 'opaque-macro':nested(node);return;
      case 'parenthesized':case 'try':visit(node.value);return;
      case 'unary':if(!['!','-','*','&'].includes(node.operation))fail('unsupported prefix grammar');visit(node.value);return;
      case 'binary':visit(node.left);visit(node.right);return;
      case 'field':if(!identifier(node.name)&&!/^\d+$/u.test(node.name))fail('unsupported field identifier');visit(node.object);return;
      case 'index':visit(node.object);visit(node.index);return;
      case 'call':visit(node.callee);list(node.arguments);return;
      case 'tuple':case 'array':list(node.items);return;
      case 'record':path(node.path);for(const field of node.fields){if(field.kind==='update')visit(field.value);else{if(!identifier(field.name))fail('unsupported original record field');if(field.kind==='field')visit(field.value);else if(field.kind!=='shorthand')fail('unsupported record member');}}return;
      case 'closure':patternList(node.parameterTokens,depth+1);visit(node.body);return;
      case 'if':visit(node.condition);visit(node.then);if(node.otherwise)visit(node.otherwise);return;
      case 'match':visit(node.subject);for(const arm of node.arms){pattern(arm.pattern.tokens,depth+1);if(arm.guard)visit(arm.guard);visit(arm.value);}return;
      case 'condition-let':pattern(node.pattern.tokens,depth+1);visit(node.value);return;
      case 'while':visit(node.condition);visit(node.body);return;
      case 'loop':visit(node.body);return;
      case 'for':pattern(node.pattern.tokens,depth+1);visit(node.iterable);visit(node.body);return;
      case 'return':case 'break':case 'continue':if(node.value)visit(node.value);return;
      case 'block-expression':visit(node.body);return;
      case 'control-block':list(node.statements);if(node.tail)visit(node.tail);return;
      case 'let':pattern(node.pattern.tokens,depth+1);visit(node.initializer);if(node.otherwise)visit(node.otherwise);return;
      case 'assign':visit(node.target);visit(node.value);return;
      case 'expression-statement':visit(node.value);return;
      default:fail('unproved complete expression grammar '+node.kind);
    }
  }
  trees(expansion.trees);walk(control.ir);
  if(used.size!==records.length||links.length!==available.length)fail('missing or extra nested macro output');
  const proof=freezeMacroTree({schema:'original-complete-bang-expression-observation-v1',expansionDigest:expansion.digest,definitionDigest:lineage.definition.digest,control,children:links.map(link=>({invocation:link.record,observationDigest:link.child.digest})),completeSelectedExpressionObserved:true,selectedOutputModuleDeclarations:[],selectedOutputGlobalMacroDeclarations:[],macroOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  const result=freezeMacroTree({...proof,digest:hash(JSON.stringify(proof))});observations.set(result,{expansion,control,children:links});return result;
}
export function bangOutputObservationFacts(observation){
  const state=observations.get(observation);if(!state)fail('copied or foreign output observation');
  if(builtinSourceControlFacts(state.control).expansion!==state.expansion)fail('foreign output projection');
  return Object.freeze({expansion:state.expansion,control:state.control,children:Object.freeze(state.children.map(link=>Object.freeze({...link})))});
}

// A deliberately small executable lane. Primitive boolean source syntax needs
// no trait, allocation, storage or caller-defined method substitution. Both
// branches are lowered before ordinary checking, even when the condition is a
// literal. This does not authorize the macro's binding in an original caller.
export function lowerObservedBooleanExpression(observation){
  bangOutputObservationFacts(observation);let remaining=32000;
  const operations={'&&':'and','||':'or','==':'eq','!=':'ne'};
  function lower(proof,node,depth=0){
    if(depth>64||--remaining<0)fail('boolean output lowering bound exhausted');
    const child=value=>lower(proof,value,depth+1);
    if(node.kind==='literal'&&node.sourceLiteralKind==='bool'&&['true','false'].includes(node.raw))return {k:'bool',value:node.raw==='true'};
    if(node.kind==='parenthesized')return child(node.value);
    if(node.kind==='block-expression')return child(node.body);
    if(node.kind==='control-block'&&!node.statements.length&&node.tail)return child(node.tail);
    if(node.kind==='unary'&&node.operation==='!')return {k:'unary',op:'not',arg:child(node.value)};
    if(node.kind==='binary'&&Object.hasOwn(operations,node.operation))return {k:'binary',op:operations[node.operation],left:child(node.left),right:child(node.right)};
    if(node.kind==='if'&&node.otherwise)return {k:'if',cond:child(node.condition),then:child(node.then),else:child(node.otherwise)};
    if(node.kind==='opaque-macro'){
      const link=observations.get(proof).children.find(link=>link.node===node);if(!link)fail('boolean child lost its exact observed source node');
      return lower(link.child,observations.get(link.child).control.ir,depth+1);
    }
    fail('boolean output requires additional checked semantics: '+node.kind);
  }
  const state=observations.get(observation),surface=lower(observation,state.control.ir);
  return freezeMacroTree({schema:'original-observed-boolean-surface-v1',surface,observationDigest:observation.digest,sourceOrigins:state.control.ir.sourceOrigins,macroOwnerResolved:false,namespaceAuthority:false,traitBehaviorVerified:false,runtimeParity:false});
}
