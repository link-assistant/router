// Canonical comparison DATA only. Whole original receiving/native source,
// signature, loan and semantic checks remain mandatory at every consumer.
import {ownedPlainData} from './owned-vector-candidate-source.mjs';
import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
import {totalNativeIntegerMethod} from './owned-native-total-operators.mjs';
export const primitiveScalarModelEligible=item=>['primitive-scalar','primitive-expression-vector'].includes(item.vectorOrigin?.kind)&&item.params.every(param=>['bool','str'].includes(param.type)||primitiveBitwiseType(param.type));
export function normalizePrimitiveScalarBodyTree(input){
 const root=ownedPlainData(input);let work=0,leaves=0;
 const fail=message=>{throw new TypeError('Canonical primitive body comparison: '+message);};
 const charge=depth=>{if(++work>100000||depth>64)fail('bounded complete body comparison required');};
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function pure(node,available,depth=0){
  charge(depth);if(!Array.isArray(node))return false;const [kind,a,b,c]=node;
  if(kind==='vector')return node.length===2&&Array.isArray(a)&&a.length<=4096&&a.every(item=>pure(item,available,depth+1));
  if(kind==='unit')return node.length===1;
  if(kind==='bool')return node.length===2&&typeof a==='boolean';
  if(kind==='str')return node.length===2&&typeof a==='string';
  if(kind==='integer'){const row=primitiveBitwiseType(a);if(node.length!==3||!row||typeof b!=='string'||!/^[-]?(?:0|[1-9][0-9]{0,38})$/u.test(b))return false;const value=BigInt(b);return value>=(row.signed?-BigInt(row.minimumAbs):0n)&&value<=BigInt(row.maximum);}
  if(kind==='parameter')return node.length===2&&Number.isSafeInteger(a)&&a>=0;
  if(kind==='effect')return node.length===2&&Number.isSafeInteger(a)&&a>=0&&a<available;
  if(kind==='not')return node.length===2&&pure(a,available,depth+1);
  if(['and','or'].includes(kind))return node.length===3&&pure(a,available,depth+1)&&pure(b,available,depth+1);
  if(kind==='compare')return node.length===5&&['eq','ne','lt','le','gt','ge'].includes(a)&&(['bool','str'].includes(b)||!!primitiveBitwiseType(b))&&pure(node[3],available,depth+1)&&pure(node[4],available,depth+1);
  if(kind==='choose')return node.length===4&&pure(a,available,depth+1)&&pure(b,available,depth+1)&&pure(c,available,depth+1);
  if(kind==='fixed-not')return node.length===3&&!!primitiveBitwiseType(a)&&pure(b,available,depth+1);
  if(kind==='fixed-cast')return node.length===4&&!!primitiveBitwiseType(a)&&!!primitiveBitwiseType(b)&&pure(c,available,depth+1);
  if(kind==='fixed-bitwise')return node.length===4&&['&','|','^'].includes(a)&&(b==='bool'||primitiveBitwiseType(b))&&Array.isArray(c)&&c.length===2&&c.every(value=>pure(value,available,depth+1));
  if(kind==='fixed-method'){const method=totalNativeIntegerMethod(a);return node.length===4&&!!method&&!!primitiveBitwiseType(b)&&Array.isArray(c)&&c.length===method.arity&&c.every(value=>pure(value,available,depth+1));}
  // Unknown and historical inline helper-call forms are never called pure.
  return false;
 }
 const isBool=(node,value)=>node?.[0]==='bool'&&node.length===2&&node[1]===value;
 const not=node=>node?.[0]==='not'?node[1]:isBool(node,true)?['bool',false]:isBool(node,false)?['bool',true]:['not',node];
 function choose(condition,yes,no,available,depth){
  charge(depth);if(!pure(condition,available,depth+1)||!pure(yes,available,depth+1)||!pure(no,available,depth+1))return ['choose',condition,yes,no];
  if(condition[0]==='not'){condition=condition[1];[yes,no]=[no,yes];}
  if(isBool(condition,true))return yes;if(isBool(condition,false))return no;
  if(equal(yes,no))return yes;
  if(yes[0]==='choose'&&equal(yes[3],no))return choose(['and',condition,yes[1]],yes[2],no,available,depth+1);
  if(no[0]==='choose'&&equal(no[2],yes))return choose(['or',condition,no[1]],yes,no[3],available,depth+1);
  if(isBool(yes,true)&&isBool(no,false))return condition;
  if(isBool(yes,false)&&isBool(no,true))return not(condition);
  if(isBool(yes,true))return ['or',condition,no];
  if(isBool(no,false))return ['and',condition,yes];
  if(isBool(yes,false))return ['and',not(condition),no];
  if(isBool(no,true))return ['or',not(condition),yes];
  return ['choose',condition,yes,no];
 }
 function expression(node,available,depth=0){
  charge(depth);if(!Array.isArray(node))return node;const result=node.map(value=>Array.isArray(value)?expression(value,available,depth+1):value);
  if(result[0]==='compare'&&result.length===5&&['eq','ne'].includes(result[1])&&result[2]==='bool'&&pure(result[3],available,depth+1)&&pure(result[4],available,depth+1)){const left=result[3],right=result[4],literal=left[0]==='bool'?left:right[0]==='bool'?right:null;if(literal){const value=literal===left?right:left;return (result[1]==='eq')===literal[1]?value:not(value);}}
  if(result[0]==='choose'&&result.length===4)return choose(result[1],result[2],result[3],available,depth+1);
  if(result[0]==='not'&&result.length===2&&pure(result[1],available,depth+1))return not(result[1]);
  return result;
 }
 function body(tree,inherited=[],depth=0){
  charge(depth);if(!Array.isArray(tree)||tree.length!==2||!Array.isArray(tree[0])||tree[0].length>16384)fail('complete ordered body pair required');
  const events=tree[0].map((row,index)=>{charge(depth+1);if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||!Array.isArray(row[1]))fail('complete ordered event row required');return [row[0],row[1].map(argument=>expression(argument,index,depth+1))];});
  if(events.length<inherited.length||!events.slice(0,inherited.length).every((row,index)=>equal(row,inherited[index])))fail('branch cannot change its complete ordered prefix');
  const terminal=tree[1];
  if(terminal?.[0]==='if'){
   if(terminal.length!==4)fail('complete conditional body branches required');let condition=expression(terminal[1],events.length,depth+1),yes=body(terminal[2],events,depth+1),no=body(terminal[3],events,depth+1);
   if(condition?.[0]==='not'&&pure(condition,events.length,depth+1)){condition=condition[1];[yes,no]=[no,yes];}
   if(isBool(condition,true))return yes;if(isBool(condition,false))return no;
   if(yes[0].length===events.length&&no[0].length===events.length&&pure(yes[1],events.length,depth+1)&&pure(no[1],events.length,depth+1))return [events,choose(condition,yes[1],no[1],events.length,depth+1)];
   return [events,['if',condition,yes,no]];
  }
  if(++leaves>64)fail('complete branch count bound exceeded');return [events,expression(terminal,events.length,depth+1)];
 }
 return body(root);
}
