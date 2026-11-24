// Derive a bounded digit-retention control plan from original Rust tokens.
// Numeric trait/call, allocation and namespace closure are separate obligations.
import {createHash} from 'node:crypto';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
const states=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex'),word=node=>node?.kind==='token'?node.text:null;
const name=node=>node?.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.text??'');
function flatten(nodes,result=[]) {for(const node of nodes){result.push(node);if(node.children)flatten(node.children,result);}return result;}
function findFunction(source,functionName) {
  const nodes=originalMacroTrees(source),rows=[];
  for(let at=0;at<nodes.length;at++)if(word(nodes[at])==='fn'&&word(nodes[at+1])===functionName){let body=at+2;while(body<nodes.length&&nodes[body]?.delimiter!=='{'&&word(nodes[body])!==';')body++;if(nodes[body]?.delimiter==='{')rows.push({header:nodes.slice(at,body),body:nodes[body],span:{start:nodes[at].span.start,end:nodes[body].span.end}});at=body;}
  if(rows.length!==1)throw new TypeError('Original digit-control function is absent or ambiguous');return rows[0];
}
function simpleLet(nodes,binder) {
  const matches=[];
  for(let at=0;at<nodes.length;at++)if(word(nodes[at])==='let') {let next=at+1;if(word(nodes[next])==='mut')next++;if(word(nodes[next])!==binder)continue;let equal=next+1;while(equal<nodes.length&&!['=',';'].includes(word(nodes[equal])))equal++;if(word(nodes[equal])!=='=')throw new TypeError('Original digit counter lacks initializer');let end=equal+1;while(end<nodes.length&&word(nodes[end])!==';')end++;matches.push({tokens:nodes.slice(at,end+1),value:nodes.slice(equal+1,end),start:at});}
  if(matches.length!==1)throw new TypeError('Original digit-control binding is absent or ambiguous');return matches[0];
}
function associatedLiteral(source,trait,target,constant) {
  const nodes=originalMacroTrees(source),matches=[];
  for(let at=0;at<nodes.length;at++)if(word(nodes[at])==='impl'&&word(nodes[at+1])===trait&&word(nodes[at+2])==='for'&&word(nodes[at+3])===target&&nodes[at+4]?.delimiter==='{') {
    const body=nodes[at+4].children;
    for(let i=0;i<body.length;i++)if(word(body[i])==='const'&&word(body[i+1])===constant) {
      if(word(body[i+2])!==':'||word(body[i+3])!=='usize'||word(body[i+4])!=='='||!/^\d+$/u.test(word(body[i+5])??'')||word(body[i+6])!==';')throw new TypeError('Source digit bound is not a direct usize literal');
      const span={start:body[i].span.start,end:body[i+6].span.end};matches.push({value:Number(word(body[i+5])),span,sha256:hash(source.slice(span.start,span.end)),implHeader:nodes.slice(at,at+4)});
    }
    at+=4;
  }
  if(matches.length!==1||!Number.isSafeInteger(matches[0].value)||matches[0].value<2||matches[0].value>4096)throw new TypeError('Original associated digit bound is absent, ambiguous or outside budget');return matches[0];
}
export function compileOriginalDigitRetentionControl(source,constantSource,{functionName,trait,target}) {
  const fn=findFunction(source,functionName),nodes=fn.body.children,loops=nodes.map((node,index)=>word(node)==='for'?index:-1).filter(index=>index>=0);
  if(loops.length!==1)throw new TypeError('Digit-retention control requires one original source loop');const at=loops[0];
  if(word(nodes[at+1])!=='&'||!name(nodes[at+2])||word(nodes[at+3])!=='in'||!name(nodes[at+4])||word(nodes[at+5])!=='.'||word(nodes[at+6])!=='iter'||nodes[at+7]?.delimiter!=='('||nodes[at+7].children.length||word(nodes[at+8])!=='.'||word(nodes[at+9])!=='chain'||nodes[at+10]?.delimiter!=='('||nodes[at+10].children.length!==1||!name(nodes[at+10].children[0])||nodes[at+11]?.delimiter!=='{')throw new TypeError('Original digit loop is outside immutable chained-slice syntax');
  const inputs=[word(nodes[at+4]),word(nodes[at+10].children[0])],loop=nodes[at+11],all=flatten(fn.body.children),breaks=all.filter(node=>word(node)==='break');
  if(inputs[0]===inputs[1]||breaks.length!==1)throw new TypeError('Original retention inputs or exits are ambiguous');
  const stop=loop.children.findIndex((node,index)=>word(node)==='if'&&loop.children[index+4]?.delimiter==='{'&&loop.children[index+4].children.length===2&&word(loop.children[index+4].children[0])==='break'&&word(loop.children[index+4].children[1])===';');
  if(stop<0||!name(loop.children[stop+1])||word(loop.children[stop+2])!=='=='||!name(loop.children[stop+3]))throw new TypeError('Original digit break condition is outside checked scalar equality');
  const counter=word(loop.children[stop+1]),boundName=word(loop.children[stop+3]),initial=simpleLet(nodes.slice(0,at),counter),bound=simpleLet(nodes.slice(0,at),boundName),expr=bound.value;
  if(initial.value.length!==1||word(initial.value[0])!=='0'||expr.length!==5||!name(expr[0])||word(expr[1])!=='::'||!name(expr[2])||word(expr[3])!=='-'||word(expr[4])!=='1')throw new TypeError('Original counter/limit dataflow is not zero and associated-minus-one');
  const increments=all.map((node,index)=>word(node)===counter&&['+=','=','-=','*=','/='].includes(word(all[index+1]))?{index,op:word(all[index+1]),operand:word(all[index+2])}:null).filter(Boolean);
  // Ignore exactly the original zero initialization; all later changes must be
  // the single direct +1 before the checked break in the same loop scope.
  const initialName=initial.tokens.find(node=>word(node)===counter);const changes=increments.filter(row=>!(row.op==='='&&row.operand==='0'&&all[row.index].span.start===initialName.span.start));
  const plus=loop.children.findIndex((node,index)=>word(node)===counter&&word(loop.children[index+1])==='+='&&word(loop.children[index+2])==='1'&&word(loop.children[index+3])===';');
  if(word(initial.tokens[1])!=='mut'||all.filter(node=>word(node)===counter).length!==4||changes.length!==1||changes[0].op!=='+='||changes[0].operand!=='1'||plus<0||plus>=stop||all.filter((node,index)=>word(node)==='let'&&[word(all[index+1]),word(all[index+2])].includes(counter)).length!==1)throw new TypeError('Original digit counter update/shadowing remains unresolved');
  const constant=associatedLiteral(constantSource,trait,target,word(expr[2])),retained=constant.value-1;
  const tail=nodes.slice(at+12),branch=tail.findIndex((node,index)=>word(node)==='if'&&word(tail[index+1])===counter);
  const condition=branch<0?[]:tail.slice(branch+1,branch+12),actions=branch<0?null:tail[branch+12];
  // i < integer.len() + fraction.len(); groups retain their own source syntax.
  if(condition.length!==11||word(condition[0])!==counter||word(condition[1])!=='<'||word(condition[2])!==inputs[0]||word(condition[3])!=='.'||word(condition[4])!=='len'||condition[5]?.delimiter!=='('||condition[5].children.length||word(condition[6])!=='+'||word(condition[7])!==inputs[1]||word(condition[8])!=='.'||word(condition[9])!=='len'||condition[10]?.delimiter!=='('||condition[10].children.length||actions?.delimiter!=='{')throw new TypeError('Original remaining-tail condition is not exact input-length comparison');
  const calls=[];for(let i=0;i<actions.children.length;i+=5){const row=actions.children.slice(i,i+5);if(row.length!==5||!name(row[0])||word(row[1])!=='.'||!name(row[2])||row[3]?.delimiter!=='('||row[3].children.length!==1||!/^\d+$/u.test(word(row[3].children[0])??'')||word(row[4])!==';')throw new TypeError('Original sticky-tail arithmetic call syntax remains unresolved');calls.push({receiver:word(row[0]),method:word(row[2]),argument:word(row[3].children[0]),tokens:row});}
  if(calls.length!==2||calls[0].receiver!==calls[1].receiver||calls[0].argument!=='10'||calls[1].argument!=='1')throw new TypeError('Original tail is not a single decimal synthetic digit');
  const issued={schema:'original-digit-retention-control-v1',sourceSha256:hash(source),constantSourceSha256:hash(constantSource),functionName,trait,target,functionSpan:fn.span,functionSha256:hash(source.slice(fn.span.start,fn.span.end)),originalHeader:fn.header,originalBody:fn.body,inputs,counter,constant,retainedDigits:retained,emittedDigitsBound:constant.value,tailComparison:condition,tailCalls:calls,retentionControlShapeVerified:true,numericCallOwnerVerified:false,traitOwnerVerified:false,allocatorEffectsVerified:false,sourceBehaviorFidelityVerified:false,parseAdmission:false,namespaceAuthority:false,runtimeParity:false};
  const encoded=JSON.stringify(issued),plan=freezeMacroTree({...JSON.parse(encoded),privateMetaRoundtrip:true,checkedMetaSha256:hash(encoded)});states.set(plan,{retained,maximum:constant.value});return plan;
}
export function projectOriginalDigitRetention(plan,integer,fraction) {
  const state=states.get(plan);if(!state)throw new TypeError('Unsealed original digit-retention control');
  if(typeof integer!=='string'||typeof fraction!=='string'||! /^(?:[1-9][0-9]*|)$/u.test(integer)||! /^[0-9]*$/u.test(fraction)||fraction.endsWith('0')||!integer.length&&!fraction.length||integer.length+fraction.length>4096)throw new TypeError('Original retention needs bounded canonical digits and trimmed fraction');
  const digits=integer+fraction,kept=digits.slice(0,state.retained),tail=digits.slice(state.retained),synthetic=tail.length>0;
  return freezeMacroTree({coefficient:BigInt(kept)*(synthetic?10n:1n)+(synthetic?1n:0n),count:Math.min(state.maximum,digits.length),tailSynthesized:synthetic,tailActuallyNonzero:/[1-9]/u.test(tail),sourceControlSha256:plan.checkedMetaSha256,numericCallOwnerVerified:false,allocatorEffectsVerified:false,sourceBehaviorFidelityVerified:false,parseAdmission:false,namespaceAuthority:false,runtimeParity:false});
}
