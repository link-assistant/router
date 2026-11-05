// Function-local finite constraints over actual independently checked operands.
// No shared cache or public request type can create a pending variable here.
// These DATA equations never issue source, namespace or compiler authority.
import {PRIMITIVE_BITWISE_TYPES,primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
import {ownedIntegerLiteral} from './owned-numeric-literals.mjs';
import {primitiveVectorResultRole} from './owned-source-value-calls.mjs';
const fail=message=>{throw new TypeError('Primitive Vec inference: '+message);};
const domains=['bool',...PRIMITIVE_BITWISE_TYPES.map(row=>row.name)];
export function createPrimitiveVectorInference(){
 const nodes=new Map(),literals=new WeakMap();let work=0;
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
 function array(items,hint=null){
  const type=create();if(hint!==null){if(!primitiveVectorResultRole(hint))fail('actual primitive vector hint required');constrain(type,[hint.slice(4)],true);}
  for(const item of items){tick();const deferred=literals.get(item);if(deferred){constrain(type,deferred.allowed);continue;}if(item.type!=='bool'&&!primitiveBitwiseType(item.type))fail('actual nonliteral vector item requires its precise primitive domain');constrain(type,[item.type],true);}
  const value={kind:'primitive-vector-literal',items,type,root:null};return value;
 }
 function resolved(type){if(!pending(type))return type;const node=nodes.get(find(type));if(!node.anchored||node.allowed.size!==1)fail('ambiguous Vec result requires an actual typed value or written domain');return 'vec:'+node.allowed.values().next().value;}
 function finish(body,result){
  // Resolve the whole current function only. Never traverse original source,
  // external checker objects or future invocations; all nodes are private IR.
  const seen=new Set();function visit(value,depth=0){tick();if(depth>160)fail('bounded complete inferred body');if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);if(typeof value.type==='string'&&pending(value.type))value.type=resolved(value.type);
   if(value.kind==='primitive-vector-literal')for(const item of value.items){const deferred=literals.get(item);if(deferred){const domain=value.type.slice(4);if(!deferred.allowed.includes(domain))fail('literal exceeds inferred actual domain');Object.assign(item,ownedIntegerLiteral((deferred.number<0n?-deferred.number:deferred.number).toString()+'n',{negative:deferred.number<0n,domain}));}}
   if(Array.isArray(value)){for(const item of value)visit(item,depth+1);return;}for(const key of ['items','value','args','left','right','cond','then','else','body'])if(Object.hasOwn(value,key))visit(value[key],depth+1);
  }visit(body);for(const key of nodes.keys())resolved(key);return resolved(result);
 }
 return {pending,vector,join,compatible,literal,array,finish};
}
