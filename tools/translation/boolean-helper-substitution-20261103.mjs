// Pure expression substitution DATA only. The original private source reader
// must check the imported declaration, whole helper and caller before using it.
import {createRulePipeline} from './rule-pipeline.mjs';
const fail=message=>{throw TypeError('Boolean helper substitution: '+message);};
export function substituteBooleanHelperExpression20261103(helper,args,charge){
 if(helper.returns!=='bool'||helper.params.some(row=>row.type!=='bool')||helper.body.length!==1||helper.body[0].kind!=='return'||helper.hostCalls.length||helper.sourceCalls?.length||args.length!==helper.params.length||args.some(row=>row.type!=='bool'||row.root!==null||!['variable','bool'].includes(row.kind)))fail('whole pure Boolean helper and inert once-read operands required');
 const values=new Map(helper.params.map((row,at)=>[row.name,args[at]]));let cells=0;
 function expression(row,depth=0){
  if(++cells>100000||depth>160)fail('original complete expression work bound');charge(depth);
  if(!row||row.type!=='bool'||row.root!==null)fail('copy-only Boolean expression required');
  if(row.kind==='variable'){const value=values.get(row.name);if(!value)fail('helper captures or locals need another theorem');return {...value};}
  if(row.kind==='bool'&&typeof row.value==='boolean')return {...row};
  if(row.kind==='not')return {...row,value:expression(row.value,depth+1)};
  if(row.kind==='binary'&&['&&','||','===','!=='].includes(row.op))return {...row,left:expression(row.left,depth+1),right:expression(row.right,depth+1)};
  if(row.kind==='choose')return {...row,cond:expression(row.cond,depth+1),then:expression(row.then,depth+1),else:expression(row.else,depth+1)};
  fail('effect, ownership carrier or unsupported operation in helper');
 }
 return createRulePipeline([
  {phase:'language',rules:[{id:'language:substitute-checked-copy-Boolean-helper-operands',apply:()=>expression(helper.body[0].value)}]},
  {phase:'repository',rules:[{id:'repository:retain-existing-owned-expression-shape-and-hygienic-caller-names',apply:value=>value}]},
 ]).run(null).value;
}
