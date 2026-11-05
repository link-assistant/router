// Complete function-local inference copy; wide constants need actual typed uses. No source/semantic authority.
// Function-local finite constraints over actual independently checked operands.
// No shared cache or public request type can create a pending variable here.
// These DATA equations never issue source, namespace or compiler authority.
import {PRIMITIVE_BITWISE_TYPES,primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
import {ownedSourceIntegerLiteral as ownedIntegerLiteral,narrowOwnedNumericLiteral} from './owned-numeric-literals.mjs';
import {primitiveVectorResultRole} from './owned-source-effect-calls.mjs';
const fail=message=>{throw new TypeError('Primitive Vec inference: '+message);};
const domains=['bool',...PRIMITIVE_BITWISE_TYPES.map(row=>row.name)];
export function createPrimitiveConstantInference(){
 const nodes=new Map(),literals=new WeakMap(),literalChoices=new WeakMap();let work=0;
 const tick=()=>{if(++work>100000)fail('complete function-local inference budget');};
 const pending=type=>typeof type==='string'&&nodes.has(type);
 const vector=type=>pending(type)||primitiveVectorResultRole(type);
 function find(type){tick();const node=nodes.get(type);if(!node)fail('private current function variable required');if(node.parent!==type)node.parent=find(node.parent);return node.parent;}
 function create(allowed=domains,anchored=false){tick();if(nodes.size>=4096)fail('bounded function-local Vec variables required');const id='@router-private-vec:'+nodes.size;nodes.set(id,{parent:id,allowed:new Set(allowed),anchored});return id;}
 function constrain(type,allowed,anchored=false){const node=nodes.get(find(type)),next=new Set([...node.allowed].filter(item=>allowed.includes(item)));if(!next.size)fail('actual Vec element domains conflict');node.allowed=next;node.anchored||=anchored;return type;}
 function reference(type){return pending(type)?type:primitiveVectorResultRole(type)?create([type.slice(4)],true):fail('actual primitive Vec domain required');}
 function join(left,right){if(!vector(left)||!vector(right))fail('Vec and non-Vec branches cannot join');const a=find(reference(left)),b=find(reference(right));if(a!==b){const first=nodes.get(a),second=nodes.get(b);constrain(a,[...second.allowed],second.anchored);second.parent=a;}return a;}
 function compatible(actual,written){if(!pending(actual))return actual===written;if(written==='vec:usize'){constrain(actual,PRIMITIVE_BITWISE_TYPES.map(row=>row.name));return true;}if(!primitiveVectorResultRole(written))return false;constrain(actual,[written.slice(4)],true);return true;}
 function literal(ts,node){
  tick();let depth=0;while(ts.isParenthesizedExpression(node)){if(++depth>160)fail('bounded literal parentheses');node=node.expression;}
  const negative=ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken,operand=negative?node.operand:node;if(!ts.isBigIntLiteral(operand))return null;
  const digits=operand.text.replace(/n$/u,'').replaceAll('_','');if(!digits.length||digits.length>130)fail('bounded actual 128-bit integer spelling required');let number;try{number=BigInt(digits);}catch{fail('actual native integer spelling required');}if(number<0n)fail('unsigned token digits required');if(negative)number=-number;
  const allowed=PRIMITIVE_BITWISE_TYPES.filter(row=>number>=(row.signed?-BigInt(row.minimumAbs):0n)&&number<=BigInt(row.maximum)).map(row=>row.name);if(!allowed.length)fail('literal outside every supported primitive domain');
  const value={kind:'integer',value:number.toString(),type:'@router-private-vector-literal',root:null};literals.set(value,{allowed,number});return value;
 }
 function deferredLiteral(value){return literals.has(value)&&value.type==='@router-private-vector-literal';}
 function copyLiteral(value){tick();const row=literals.get(value);if(!row||!deferredLiteral(value))fail('actual current deferred source literal required');const copy={...value};literals.set(copy,row);return copy;}
 function wideLiteral(ts,node){const value=literal(ts,node);if(!value)return null;const number=literals.get(value).number;return number>18446744073709551615n||number< -9223372036854775808n?value:null;}
 function reifyLiteral(value,domain,depth=0){tick();if(depth>160)fail('bounded complete literal reification required');if(deferredLiteral(value)){const row=literals.get(value);if(!row.allowed.includes(domain))fail('deferred literal exceeds actual source primitive domain');Object.assign(value,ownedIntegerLiteral((row.number<0n?-row.number:row.number).toString()+'n',{negative:row.number<0n,domain}));return;}if(value?.kind==='choose'){reifyLiteral(value.then,domain,depth+1);reifyLiteral(value.else,domain,depth+1);if(value.then.type===domain&&value.else.type===domain)value.type=domain;}}
 function literalTree(value,depth=0){tick();if(depth>160)fail('bounded complete literal choice required');if(deferredLiteral(value))return true;if(value?.kind==='integer'&&value.root===null&&['usize','i64'].includes(value.type)){const number=BigInt(value.value);return value.type==='usize'?number>=0n&&number<=18446744073709551615n:number>= -9223372036854775808n&&number<=9223372036854775807n;}return value?.kind==='choose'&&value.root===null&&value.cond?.type==='bool'&&literalTree(value.then,depth+1)&&literalTree(value.else,depth+1);}
 function containsDeferred(value,depth=0){tick();if(depth>160)fail('bounded deferred literal choice required');return deferredLiteral(value)||value?.kind==='choose'&&(containsDeferred(value.then,depth+1)||containsDeferred(value.else,depth+1));}
 function deferTree(value,depth=0){tick();if(depth>160)fail('bounded literal choice deferral required');if(value.kind==='integer'){if(!deferredLiteral(value)){const number=BigInt(value.value),allowed=PRIMITIVE_BITWISE_TYPES.filter(row=>number>=(row.signed?-BigInt(row.minimumAbs):0n)&&number<=BigInt(row.maximum)).map(row=>row.name);literals.set(value,{number,allowed});value.type='@router-private-vector-literal';}return;}deferTree(value.then,depth+1);deferTree(value.else,depth+1);value.type='@router-private-vector-literal';}
 function joinScalarLiterals(left,right){tick();if(primitiveBitwiseType(left?.type)&&!literalTree(left))reifyLiteral(right,left.type);if(primitiveBitwiseType(right?.type)&&!literalTree(right))reifyLiteral(left,right.type);if((containsDeferred(left)||containsDeferred(right))&&literalTree(left)&&literalTree(right)){deferTree(left);deferTree(right);}}

 function literalChoice(value){const values=[];function visit(node,depth){tick();if(depth>160)fail('bounded complete literal element choice');if(!node||node.root!==null)return false;if(node.kind==='integer'&&typeof node.value==='string'){values.push(BigInt(node.value));return true;}return node.kind==='choose'&&node.cond?.type==='bool'&&visit(node.then,depth+1)&&visit(node.else,depth+1);}return visit(value,0)?values:null;}
 function array(items,hint=null){
  const type=create();if(hint!==null){if(!primitiveVectorResultRole(hint))fail('actual primitive vector hint required');constrain(type,[hint.slice(4)],true);}
  for(const item of items){tick();const deferred=literals.get(item);if(deferred){constrain(type,deferred.allowed);continue;}const choices=literalChoice(item);if(choices){const allowed=PRIMITIVE_BITWISE_TYPES.filter(row=>choices.every(number=>number>=(row.signed?-BigInt(row.minimumAbs):0n)&&number<=BigInt(row.maximum))).map(row=>row.name);constrain(type,allowed);literalChoices.set(item,allowed);continue;}if(item.type!=='bool'&&!primitiveBitwiseType(item.type))fail('actual nonliteral vector item requires its precise primitive domain');constrain(type,[item.type],true);}
  const value={kind:'primitive-vector-literal',items,type,root:null};return value;
 }
 function resolved(type){if(!pending(type))return type;const node=nodes.get(find(type));if(!node.anchored||node.allowed.size!==1)fail('ambiguous Vec result requires an actual typed value or written domain');return 'vec:'+node.allowed.values().next().value;}
 function finish(body,result){
  // Resolve the whole current function only. Never traverse original source,
  // external checker objects or future invocations; all nodes are private IR.
  const seen=new Set();function visit(value,depth=0){tick();if(depth>160)fail('bounded complete inferred body');if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);if(typeof value.type==='string'&&pending(value.type))value.type=resolved(value.type);
   if(value.kind==='primitive-vector-literal')for(const item of value.items){const choices=literalChoices.get(item);if(choices){const domain=value.type.slice(4);if(!choices.includes(domain))fail('literal choice exceeds inferred actual domain');narrowOwnedNumericLiteral(item,domain);}const deferred=literals.get(item);if(deferred){const domain=value.type.slice(4);if(!deferred.allowed.includes(domain))fail('literal exceeds inferred actual domain');Object.assign(item,ownedIntegerLiteral((deferred.number<0n?-deferred.number:deferred.number).toString()+'n',{negative:deferred.number<0n,domain}));}}
   if(deferredLiteral(value))fail('unresolved source integer requires an actual typed use');if(Array.isArray(value)){for(const item of value)visit(item,depth+1);return;}for(const key of ['items','value','args','left','right','cond','then','else','body'])if(Object.hasOwn(value,key))visit(value[key],depth+1);
  }visit(body);for(const key of nodes.keys())resolved(key);return resolved(result);
 }
 return {pending,vector,join,compatible,literal,array,finish,deferredLiteral,copyLiteral,wideLiteral,joinScalarLiterals};
}
