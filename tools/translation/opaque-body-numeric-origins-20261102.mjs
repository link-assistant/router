// DATA collected only from a direct fresh project call in the production lane.
// This helper is not a source/type/ownership issuer. SOURCE / UNRUN.
import {rustTokens} from './rust-structure.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const need=(yes,message)=>{if(!yes)throw TypeError('Actual whole-project body literal origins: '+message);};
function primitive(node){
 if(node.k!=='lit'||!node.span)return null;
 if(node.type?.kind==='string'&&typeof node.value==='string')return {kind:'string',value:node.value,domain:null};
 if(node.type?.kind==='bool'&&typeof node.value==='boolean')return {kind:'bool',value:node.value,domain:null};
 const type=node.type;
 if(type?.kind!=='fixed'||!/^[ui](?:8|16|32|64|128|size)$/u.test(type.rustPrimitiveName??'')||!Number.isInteger(type.bits)||type.bits<1||type.bits>128||typeof type.signed!=='boolean')return null;
 if(!(typeof node.value==='bigint'||typeof node.value==='string'&&/^-?\d+$/u.test(node.value)||typeof node.value==='number'&&Number.isSafeInteger(node.value)))return null;
 return {kind:'integer',value:BigInt(node.value).toString(),domain:{name:type.rustPrimitiveName,bits:type.bits,signed:type.signed}};
}
function actualToken(source,tokens,start,end,scalar){
 const at=tokens.byStart.get(start);if(at===undefined)return null;const token=tokens.rows[at];
 if(scalar.kind==='integer'&&BigInt(scalar.value)<0n){const next=tokens.rows[at+1];if(token.text==='-'&&next?.type==='number'&&next.end===end&&/^\s*$/u.test(source.slice(token.end,next.start)))return source.slice(start,end);return null;}
 if(token.end!==end)return null;
 if(scalar.kind==='bool')return token.text===(scalar.value?'true':'false')?token.text:null;
 if(scalar.kind==='integer')return token.type==='number'?token.text:null;
 if(token.type!=='string')return null;const lexical=tokenizeRust(token.text),strings=lexical.filter(row=>row.kind==='string');
 return strings.length===1&&strings[0].start===0&&strings[0].end===token.text.length&&strings[0].value===scalar.value?token.text:null;
}
// Static operation spellings only; every origin still comes from a fresh
// checked original body, exact source interval and actual target binding.
export const OPAQUE_BODY_OPERATIONS=Object.freeze([
 {op:'div',kind:'division',target:'/',rust:'/'},{op:'rem',kind:'division',target:'%',rust:'%'},
 {op:'add',kind:'arithmetic',target:'+',rust:'+'},{op:'sub',kind:'arithmetic',target:'-',rust:'-'},{op:'mul',kind:'arithmetic',target:'*',rust:'*'},
 {op:'eq',kind:'equality',target:'===',rust:'=='},{op:'ne',kind:'equality',target:'!==',rust:'!='},
 {op:'lt',kind:'comparison',target:'<',rust:'<'},{op:'le',kind:'comparison',target:'<=',rust:'<='},
 {op:'gt',kind:'comparison',target:'>',rust:'>'},{op:'ge',kind:'comparison',target:'>=',rust:'>='},
 {op:'and',kind:'logic',target:'&&',rust:'&&'},{op:'or',kind:'logic',target:'||',rust:'||'},
].map(Object.freeze));
function predicate(node){
 if(node.k!=='binary'||!node.left?.span||!node.right?.span)return null;
 const operation=OPAQUE_BODY_OPERATIONS.find(row=>row.op===node.op),left=node.left.type,right=node.right.type,scalar=type=>type&&['fixed','bool','string'].includes(type.kind)&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
 if(!operation||!scalar(left)||!scalar(right)||left.kind!==right.kind)return null;
 if(left.kind==='fixed'&&(!/^[ui](?:8|16|32|64|128|size)$/u.test(left.rustPrimitiveName??'')||!Number.isInteger(left.bits)||left.bits<1||left.bits>128||typeof left.signed!=='boolean'||left.bits!==right.bits||left.signed!==right.signed||left.rustPrimitiveName!==right.rustPrimitiveName))return null;
 if(operation.kind==='arithmetic'||operation.kind==='division'){
  const result=node.type;if(left.kind!=='fixed'||!scalar(result)||result?.kind!=='fixed'||result.rustPrimitiveName!==left.rustPrimitiveName||result.bits!==left.bits||result.signed!==left.signed||['wrapping','wrap','saturating','truncated','ieee'].includes(node.semantics))return null;
  if(operation.kind==='division'&&(node.semantics!=='checked'||node.rounding!=='trunc'||node.byZero!=='abort'))return null;
 }else if(node.type?.kind!=='bool'||operation.kind==='logic'&&left.kind!=='bool'||operation.kind==='comparison'&&left.kind!=='fixed')return null;
 return operation;
}
function predicateToken(source,index,start,end,operation){
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length||end-start>65536)return null;
 let low=0,high=index.rows.length;while(low<high){const middle=(low+high)>>>1;if(index.rows[middle].start<start)low=middle+1;else high=middle;}let selected=null,count=0;
 for(let at=low;at<index.rows.length&&index.rows[at].start<end;at++){const token=index.rows[at];if(++count>128||token.end>end)return null;if(token.type==='comment')continue;if(selected||token.text!==operation.rust)return null;selected=token;}
 return selected;
}
export function collectOpaqueBodyNumericOriginData(fresh,readSource){
 need(fresh&&Array.isArray(fresh.executableDeclarations)&&Array.isArray(fresh.meta?.executable)&&typeof readSource==='function','direct complete actual project and its actual source reader required');
 const admitted=new Set(fresh.meta.executable.filter(row=>row.term==='fn').map(row=>row.source+'\0'+row.name)),groups=new Map(),result=new Map();let totalNodes=0,retained=0;
 for(const declaration of fresh.executableDeclarations){if(!admitted.has(declaration.source+'\0'+declaration.qualifiedName))continue;if(!groups.has(declaration.source)){need(groups.size<20000,'bounded source group count');groups.set(declaration.source,[]);}groups.get(declaration.source).push(declaration);}
 // Keep one physical source/token index live at a time. All semantic proofs
 // remain fresh; grouping shares only this invocation's ordinary source DATA.
 for(const [sourcePath,declarations]of groups){
  const source=readSource(sourcePath);need(typeof source==='string'&&Buffer.byteLength(source)<=8388608,'complete actual native source required');retained+=Buffer.byteLength(source);need(retained<=67108864,'original complete source occurrence bound');const rows=rustTokens(source),tokens={rows,byStart:new Map(rows.map((token,index)=>[token.start,index]))};
  for(const declaration of declarations){
  const proof=declaration.checkedSource(),binding=declaration.targetBinding();
  need(proof.schema==='original-checked-executable-source-v1'&&binding.schema==='original-checked-project-target-binding-v1'&&proof.source===declaration.source&&binding.source===proof.source&&proof.qualifiedName===declaration.qualifiedName&&binding.qualifiedName===proof.qualifiedName&&typeof binding.javascriptName==='string','genuine current complete checked function/target association required');
  need(proof.source===sourcePath,'actual checked body source group differs');const deltas=new Set([0,proof.span.start-proof.checkedSpan.start]);let cells=0;
  function visit(node,depth){
   if(!node||typeof node!=='object')return;need(++cells<=100000&&++totalNodes<=2000000&&depth<=160,'actual checked body traversal bounds');const scalar=primitive(node);
   const operation=predicate(node);if(operation)for(const delta of deltas){
    const start=node.left.span.end+delta,end=node.right.span.start+delta;if(start<proof.span.start||end>proof.span.end)continue;const token=predicateToken(source,tokens,start,end,operation);if(!token)continue;
    const key=proof.qualifiedName+':'+proof.source+':'+token.start+':'+token.end,row={kind:operation.kind,value:operation.target,nativeToken:operation.rust,domain:['arithmetic','division'].includes(operation.kind)?{name:node.type.rustPrimitiveName,bits:node.type.bits,signed:node.type.signed}:null,source:proof.source,qualifiedName:proof.qualifiedName,targetFunction:binding.javascriptName,span:{start:token.start,end:token.end},before:source.slice(token.start,token.end),ownerSpan:{...proof.span},sourceAuthority:false,semanticAuthority:false},previous=result.get(key);
    need(!previous||JSON.stringify(previous)===JSON.stringify(row),'one consistent actual predicate/source relation required');result.set(key,row);need(result.size<=20000,'bounded complete body scalar/predicate record count');
   }
   if(scalar)for(const delta of deltas){
    const start=node.span.start+delta,end=node.span.end+delta;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<proof.span.start||end>proof.span.end||end<=start)continue;
    const before=actualToken(source,tokens,start,end,scalar);if(before===null)continue;
    const key=proof.qualifiedName+':'+proof.source+':'+start+':'+end,row={...scalar,source:proof.source,qualifiedName:proof.qualifiedName,targetFunction:binding.javascriptName,span:{start,end},before,ownerSpan:{...proof.span},sourceAuthority:false,semanticAuthority:false},previous=result.get(key);
    need(!previous||JSON.stringify(previous)===JSON.stringify(row),'one consistent actual body literal/source relation required');result.set(key,row);need(result.size<=20000,'bounded complete body literal record count');
   }
   for(const [key,value]of Object.entries(node))if(!['type','span','compatibilityCore','sourceFrameProof','pinnedStandardBodyProof','originalCallbackProof','originalLoanProof','sharedBodyProof','sourceSharedPatternProof'].includes(key)){
    if(Array.isArray(value))for(const child of value)visit(child,depth+1);else visit(value,depth+1);
   }
  }
  visit(proof.declaration.body,0);
  }
 }
 const rows=[...result.values()].sort((a,b)=>a.source<b.source?-1:a.source>b.source?1:a.span.start-b.span.start);account(rows);return rows;
}
