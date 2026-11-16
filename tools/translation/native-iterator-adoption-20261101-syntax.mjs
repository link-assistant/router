// Conservative Rust CST-token selection DATA, not Rust owner/type authority.
import {rustTokens} from './rust-structure.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
const fail=message=>{throw new TypeError('Native scalar iterator source selection: '+message);};
const primitive=name=>name==='bool'||primitiveBitwiseType(name)!==null;
const precedence=new Map([['||',1],['&&',2],['|',3],['^',4],['&',5],['==',6],['!=',6],['<',7],['<=',7],['>',7],['>=',7],['<<',8],['>>',8],['+',9],['-',9],['*',10],['/',10],['%',10]]);
export function selectNativeScalarIterators(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>2097152||/\p{Surrogate}/u.test(source))fail('complete bounded Unicode-scalar original Rust module required');
 const tokens=rustTokens(source).filter(token=>token.type!=='comment');if(tokens.length>100000)fail('complete original token bound');
 let at=0,cells=0;const functions=[],names=new Set(),tick=depth=>{if(++cells>100000||depth>160)fail('complete original expression/depth bound');};
 const peek=()=>tokens[at],eat=text=>{if(peek()?.text!==text)return false;at++;return true;},expect=text=>{if(!eat(text))fail('expected original '+text);},identifier=()=>{const node=tokens[at++];if(node?.type!=='ident'||! /^[a-z][A-Za-z0-9_]*$/u.test(node.text)||node.text.startsWith('__ro'))fail('ordinary portable original identifier required');names.add(node.text);return node.text;};
 const closeAngle=()=>{if(peek()?.text==='>>'){const node=peek();tokens[at]={...node,text:'>',start:node.start+1};return;}expect('>');};
 function scalarType(){if(eat('::')){expect('core');expect('::');expect('primitive');expect('::');}const value=identifier();if(!primitive(value))fail('explicit primitive type candidate required');return value;}
 function vectorType(infer=false){if(eat('::')){expect('std');expect('::');expect('vec');expect('::');}expect('Vec');expect('<');let type;if(infer&&eat('_'))type=null;else type=scalarType();closeAngle();return type;}
 function expression(parameter,borrowed,depth=0,minimum=0){
  tick(depth);const token=peek();let value;
  if(eat('(')){value=expression(parameter,borrowed,depth+1);expect(')');}
  else if(eat('if')){const cond=expression(parameter,borrowed,depth+1);expect('{');const yes=expression(parameter,borrowed,depth+1);expect('}');expect('else');expect('{');const no=expression(parameter,borrowed,depth+1);expect('}');value={kind:'choose',cond,yes,no};}
  else if(eat('*')){if(!borrowed||peek()?.text!==parameter)fail('only explicit scalar filter referent copies are selected');at++;value={kind:'item'};}
  else if(eat('!'))value={kind:'unary',op:'!',value:expression(parameter,borrowed,depth+1,11)};
  else if(eat('-'))value={kind:'unary',op:'-',value:expression(parameter,borrowed,depth+1,11)};
  else if(eat('true'))value={kind:'bool',value:true};else if(eat('false'))value={kind:'bool',value:false};
  else if(token?.type==='number'){
   at++;const match=/^((?:0|[1-9][0-9]{0,38}))(?:_?([ui](?:8|16|32|64|128)))?$/u.exec(token.text);if(!match)fail('bounded decimal primitive literal required');value={kind:'integer',digits:match[1],domain:match[2]??null};
  }else if(token?.type==='ident'&&token.text===parameter){if(borrowed)fail('filter reference must be explicitly copied or reference-pattern bound');at++;value={kind:'item'};}
  else fail('capture call field reference pattern block or unsupported scalar expression');
  while(precedence.has(peek()?.text)&&precedence.get(peek().text)>=minimum){const op=tokens[at++].text;value={kind:'binary',op,left:value,right:expression(parameter,borrowed,depth+1,precedence.get(op)+1)};}return value;
 }
 while(at<tokens.length){
  const start=peek().start,pub=eat('pub');expect('fn');const name=identifier();if(functions.some(row=>row.name===name))fail('duplicate original function');expect('(');const input=identifier();expect(':');expect('&');expect('[');const inputDomain=scalarType();expect(']');eat(',');expect(')');expect('->');const outputDomain=vectorType();expect('{');
  if(peek()?.text!==input)fail('one whole original input iterator expression required');at++;expect('.');expect('iter');expect('(');expect(')');expect('.');expect('copied');expect('(');expect(')');const stages=[];
  for(;;){expect('.');const op=peek()?.text;at++;
   if(op==='collect'){
    if(eat('::')){expect('<');const domain=vectorType(true);if(domain!==null&&domain!==outputDomain)fail('collect type differs from written output candidate');closeAngle();}expect('(');expect(')');break;
   }
   if(!['map','filter'].includes(op)||stages.length>=8)fail('bounded capture-free map/filter collection required');expect('(');expect('|');const reference=eat('&');if(reference&&op!=='filter')fail('reference map patterns are outside scalar copied input lane');const parameter=identifier();expect('|');const bodyStart=peek()?.start,body=expression(parameter,op==='filter'&&!reference);const bodyEnd=tokens[at-1]?.end;expect(')');stages.push({operation:op,parameter,referencePattern:reference,body,bodySpan:[bodyStart,bodyEnd],bodyOriginal:source.slice(bodyStart,bodyEnd)});
  }
  expect('}');const end=tokens[at-1].end;functions.push({name,exported:pub,input,inputDomain,outputDomain,stages,span:[start,end],original:source.slice(start,end),originalIteratorOwnerQualified:false,originalBorrowedCallbackEquivalence:false});
  if(functions.length>128)fail('bounded complete original function census');
 }
 if(!functions.length)fail('complete nonempty standalone scalar function module required');return {functions,names:[...names],wholeOriginalScopeSelected:true,sourceAuthority:false,semanticAuthority:false};
}
export function renderNativeScalarExpression(node,{item,inputDomain,outputDomain,imported},depth=0){
 if(depth>160)fail('bounded original scalar expression');
 const fallback=inputDomain==='bool'?outputDomain:inputDomain,render=(value,hint=fallback)=>renderNativeScalarExpression(value,{item,inputDomain,outputDomain:hint,imported},depth+1),metadata=type=>{const row=primitiveBitwiseType(type);if(!row)fail('native integer candidate required');return row.bits+', '+row.signed;};
 if(node.kind==='item')return {source:item,type:inputDomain};if(node.kind==='bool')return {source:String(node.value),type:'bool'};
 if(node.kind==='integer'){const type=node.domain??fallback;if(!primitiveBitwiseType(type))fail('explicit numeric candidate needed for an unconstrained literal');return {source:node.digits+'n',type};}
 if(node.kind==='choose'){const cond=render(node.cond),yes=render(node.yes),no=render(node.no,yes.type);if(cond.type!=='bool'||yes.type!==no.type)fail('scalar conditional candidates differ');return {source:'('+cond.source+'?'+yes.source+':'+no.source+')',type:yes.type};}
 if(node.kind==='unary'){
  const value=render(node.value);if(node.op==='!'&&value.type==='bool')return {source:'(!'+value.source+')',type:'bool'};
  if(node.op==='-'&&node.value.kind==='integer')return {source:'(-'+value.source+')',type:value.type};
  return {source:node.op==='!'?imported('primitiveNot')+'('+value.source+', '+metadata(value.type)+')':imported('integerArithmetic')+'('+value.source+', null, '+metadata(value.type)+', "neg")',type:value.type};
 }
 if(node.kind!=='binary')fail('unselected original scalar expression');const left=render(node.left),right=render(node.right,left.type),op=node.op;
 if(left.type!==right.type)fail('identical primitive operand candidates required');
 if(['==','!=','<','<=','>','>=','&&','||'].includes(op))return {source:'('+left.source+' '+(op==='=='?'===':op==='!='?'!==':op)+' '+right.source+')',type:'bool'};
 if(['&','|','^'].includes(op))return {source:imported('primitiveBitwise')+'('+left.source+', '+right.source+', '+JSON.stringify(op)+', '+(left.type==='bool'?'null, null':metadata(left.type))+')',type:left.type};
 if(['<<','>>'].includes(op))return {source:imported('integerShift')+'('+left.source+', '+right.source+', '+metadata(left.type)+', '+metadata(right.type)+', '+JSON.stringify(op)+')',type:left.type};
 const operation={'+':'add','-':'sub','*':'mul','/':'div','%':'rem'}[op];if(!operation)fail('finite original arithmetic required');return {source:imported('integerArithmetic')+'('+left.source+', '+right.source+', '+metadata(left.type)+', '+JSON.stringify(operation)+')',type:left.type};
}
