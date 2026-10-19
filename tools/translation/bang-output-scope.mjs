// Complete supported output syntax only. This does not resolve a macro owner,
// close a caller scope, execute the expansion or discharge runtime effects.
// Prerequisite: the separately sealed, UNVERIFIED 142 expression observer.
import {types} from 'node:util';
import {bangOutputObservationFacts} from './bang-output-observer.mjs';
import {builtinSourceControlFacts} from './builtin-source-control.mjs';
import {declarativeExpansionLineage} from './declarative-token-macros.mjs';

const issued=new WeakMap();
const fail=message=>{throw new TypeError('Bang output scope: '+message);};
const itemWords=new Set(['fn','impl','mod','struct','enum','union','trait','type','use','static','const','extern','macro','macro_rules','pub']);
function samePath(left,right){
  if(left.length!==right.length)return false;
  for(let index=0;index<left.length;index++){
    const a=Object.getOwnPropertyDescriptors(left[index]),b=Object.getOwnPropertyDescriptors(right[index]),keys=Reflect.ownKeys(a);
    if(keys.length!==Reflect.ownKeys(b).length)return false;
    for(const key of keys){
      if(typeof key!=='string'||!Object.hasOwn(b,key))return false;
      const first=a[key],second=b[key];if(!Object.hasOwn(first,'value')||!Object.hasOwn(second,'value'))return false;
      const value=first.value;
      if(value!==null&&!['string','number','boolean'].includes(typeof value)||value!==second.value)return false;
    }
  }
  return true;
}
function options(value,key){
  if(!value||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary own-data options required');
  const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);
  if(keys.some(name=>name!==key))fail('unexpected proof or authority option');
  if(!Object.hasOwn(fields,key))return undefined;
  if(!Object.hasOwn(fields[key],'value'))fail('option accessor');
  return fields[key].value;
}
function children(value){
  if(!value||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary dense child-token array required');
  const fields=Object.getOwnPropertyDescriptors(value),length=fields.length;
  if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value>128||Reflect.ownKeys(fields).length!==length.value+1)fail('bounded dense child-token array required');
  const result=[];
  for(let index=0;index<length.value;index++){
    if(!Object.hasOwn(fields,String(index)))fail('child accessor or hole');
    const field=fields[index];if(!Object.hasOwn(field,'value'))fail('child accessor or hole');result.push(field.value);
  }
  return result;
}
function original(observation){
  const facts=bangOutputObservationFacts(observation),control=builtinSourceControlFacts(facts.control);
  if(control.inputKind!=='private-expanded-source-expression'||control.expansion!==facts.expansion||!facts.control.ir)fail('complete original expression projection required');
  const lineage=declarativeExpansionLineage(facts.expansion);
  return {facts,lineage};
}

/** Children are separately issued scope tokens for every exact original child
 * observation, in any order. Public empty-output arrays are never authority. */
export function proveBangOutputScope(observation,input={}){
  const {facts,lineage}=original(observation),provided=children(options(input,'children')??[]),used=new Set(),links=[],visited=new Set();
  let cells=0,depth=0;
  const count=level=>{depth=Math.max(depth,level);if(depth>64||++cells>32000)fail('complete output syntax bound exhausted');};
  for(const link of facts.children){
    const matches=provided.filter(token=>issued.get(token)?.observation===link.child);
    if(matches.length!==1||used.has(matches[0]))fail('missing or duplicate exact child scope token');
    const token=matches[0],child=issued.get(token),actual=original(child.observation),childLineage=actual.lineage;
    if(child.expansion!==actual.facts.expansion||childLineage.parent!==facts.expansion||!samePath(childLineage.path,link.record.path))fail('foreign child expansion lineage');
    used.add(token);links.push(Object.freeze({node:link.node,record:link.record,token}));
    cells+=child.cells;depth=Math.max(depth,child.depth+1);
    if(cells>32000||depth>64)fail('complete transitive output syntax bound exhausted');
  }
  if(used.size!==provided.length)fail('extra or foreign child scope token');
  function trees(nodes,level=0){
    for(const node of nodes){count(level);
      if(node.kind==='token'){
        if(node.text==='#')fail('attribute output needs a separate original owner/output proof');
        if(node.type==='ident'&&itemWords.has(node.text))fail('item or declaration token remains unproved: '+node.text);
      }else if(node.kind==='group')trees(node.children,level+1);
      else if(node.kind==='fragment'){
        if(!['ident','lifetime','tt'].includes(node.fragment)||node.trees.length!==1)fail('opaque output fragment needs an original AST scope proof');
        trees(node.trees,level+1);
      }else if(node.kind!=='owner')fail('unproved original output tree');
    }
  }
  function walk(node,level=0){
    count(level);if(!node||typeof node!=='object')fail('missing complete expression node');
    const visit=child=>walk(child,level+1),list=values=>{for(const value of values)visit(value);};
    switch(node.kind){
      case 'literal':case 'written-path':return;
      case 'opaque-macro':{
        const link=links.find(link=>link.node===node&&!visited.has(link));if(!link)fail('unproved original nested output');visited.add(link);
        depth=Math.max(depth,level+issued.get(link.token).depth+1);if(depth>64)fail('complete transitive output depth exhausted');return;
      }
      case 'parenthesized':case 'try':case 'unary':visit(node.value);return;
      case 'binary':visit(node.left);visit(node.right);return;
      case 'field':visit(node.object);return;
      case 'index':visit(node.object);visit(node.index);return;
      case 'call':visit(node.callee);list(node.arguments);return;
      case 'tuple':case 'array':list(node.items);return;
      case 'record':for(const field of node.fields)if(field.kind==='field'||field.kind==='update')visit(field.value);else if(field.kind!=='shorthand')fail('unproved original record field');return;
      case 'closure':visit(node.body);return;
      case 'if':visit(node.condition);visit(node.then);if(node.otherwise)visit(node.otherwise);return;
      case 'match':visit(node.subject);for(const arm of node.arms){if(arm.guard)visit(arm.guard);visit(arm.value);}return;
      case 'condition-let':visit(node.value);return;
      case 'while':visit(node.condition);visit(node.body);return;
      case 'loop':visit(node.body);return;
      case 'for':visit(node.iterable);visit(node.body);return;
      case 'return':case 'break':case 'continue':if(node.value)visit(node.value);return;
      case 'block-expression':visit(node.body);return;
      case 'control-block':list(node.statements);if(node.tail)visit(node.tail);return;
      case 'let':visit(node.initializer);if(node.otherwise)visit(node.otherwise);return;
      case 'assign':visit(node.target);visit(node.value);return;
      case 'expression-statement':visit(node.value);return;
      default:fail('unsupported complete output grammar: '+node.kind);
    }
  }
  // Independently inspect both domains; 142's public empty declarations and its
  // executable boolean lane are not used as proof of output-scope confinement.
  trees(facts.expansion.trees);walk(facts.control.ir);
  if(visited.size!==links.length)fail('child scope output was not visited by the complete expression');
  const token=Object.freeze({schema:'private-complete-expanded-output-scope-v1'});
  issued.set(token,Object.freeze({observation,expansion:facts.expansion,control:facts.control,lineage,children:Object.freeze(links),cells,depth}));
  return token;
}

/** Exact private identity check, never a digest lookup or a copied flag. */
export function bangOutputScopeFacts(token,input){
  const state=issued.get(token);if(!state)fail('copied, proxy or unissued scope token');
  const expansion=options(input,'expansion');
  if(expansion!==state.expansion)fail('scope token belongs to another genuine expansion');
  const actual=original(state.observation);
  if(actual.facts.expansion!==expansion||actual.facts.control!==state.control)fail('original observation projection changed');
  return state;
}
