// Original literal constant/import syntax for mathematical source projections.
// The sealed output does not prove module/type/macro owner completeness.
import {createHash} from 'node:crypto';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
const seals=new WeakSet(),hash=value=>createHash('sha256').update(value).digest('hex'),text=node=>node?.kind==='token'?node.text:null;
const identifier=value=>/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value??'');
function separated(nodes){if(!nodes.length)return [];const result=[];let start=0;for(let i=0;i<=nodes.length;i++)if(i===nodes.length||text(nodes[i])===','){if(i===start){if(i===nodes.length)break;throw new TypeError('Source data has an empty element');}result.push(nodes.slice(start,i));start=i+1;}return result;}
function dataType(nodes){
  if(text(nodes[0])==='&'){let at=1;if(text(nodes[at])==="'static")at++;return {kind:'ref',inner:dataType(nodes.slice(at))};}
  if(nodes.length===1&&identifier(text(nodes[0]))&&/^(?:u32|u64|u128|usize|Limb)$/u.test(text(nodes[0])))return {kind:'uint',source:text(nodes[0])};
  if(nodes.length===1&&nodes[0]?.delimiter==='['){const parts=nodes[0].children,at=parts.findIndex(node=>text(node)===';');if(at<0)return {kind:'slice',element:dataType(parts)};if(at+2!==parts.length||!/^\d+$/u.test(text(parts[at+1])??'')||BigInt(text(parts[at+1]))>1024n)throw new TypeError('Source data fixed array bound');return {kind:'array',element:dataType(parts.slice(0,at)),length:Number(text(parts[at+1]))};}
  throw new TypeError('Source data type is outside the literal integer profile');
}
function dataExpression(nodes){
  if(text(nodes[0])==='&')return {kind:'borrow',value:dataExpression(nodes.slice(1))};
  if(nodes.length===1&&nodes[0]?.delimiter==='[')return {kind:'array',items:separated(nodes[0].children).map(dataExpression)};
  if(nodes.length===1&&/^\d+$/u.test(text(nodes[0])??''))return {kind:'literal',value:text(nodes[0])};
  if(nodes.length%2===1&&nodes.every((node,index)=>index%2?text(node)==='::':identifier(text(node))))return {kind:'name',path:nodes.filter((_,index)=>index%2===0).map(text)};
  throw new TypeError('Source constant expression has no bounded inert data proof');
}
function precedingAttributes(nodes,start){let at=start;if(text(nodes[at-1])==='pub')at--;else if(nodes[at-1]?.delimiter==='('&&text(nodes[at-2])==='pub')at-=2;const result=[];while(nodes[at-1]?.delimiter==='['&&text(nodes[at-2])==='#'){result.unshift(nodes[at-1]);at-=2;}return result;}
function walk(nodes,source,scope,result){
  for(let i=0;i<nodes.length;i++){
    if(text(nodes[i])==='mod'&&nodes[i+2]?.delimiter==='{'){walk(nodes[i+2].children,source,[...scope,text(nodes[i+1])],result);i+=2;continue;}
    if(text(nodes[i])==='use'){
      let end=i+1;while(end<nodes.length&&text(nodes[end])!==';')end++;const parts=nodes.slice(i+1,end),path=parts.filter((_,index)=>index%2===0).map(text),valid=parts.length%2===1&&parts.every((node,index)=>index%2?text(node)==='::':identifier(text(node))||text(node)==='*');
      const span={start:nodes[i].span.start,end:nodes[end]?.span.end??source.length};result.imports.push({scope,path,syntaxSupported:valid,glob:path.at(-1)==='*',span,sha256:hash(source.slice(span.start,span.end))});i=end;continue;
    }
    if(text(nodes[i])!=='const'||!identifier(text(nodes[i+1]))||text(nodes[i+2])!==':')continue;
    let equal=i+3;while(equal<nodes.length&&!['=',';'].includes(text(nodes[equal])))equal++;if(text(nodes[equal])!=='=')continue;let end=equal+1;while(end<nodes.length&&text(nodes[end])!==';')end++;if(end===nodes.length)throw new TypeError('Source constant is unterminated');
    const typeNodes=nodes.slice(i+3,equal),valueNodes=nodes.slice(equal+1,end),span={start:nodes[i].span.start,end:nodes[end].span.end},attributes=precedingAttributes(nodes,i);
    // Unsupported source declarations are retained as unknown, never discarded
    // into a claim that the source namespace is complete.
    let type=null,value=null,diagnostic=null;try{type=dataType(typeNodes);value=dataExpression(valueNodes);}catch(error){diagnostic=error.message;}
    result.declarations.push({scope,name:text(nodes[i+1]),type,value,diagnostic,attributes,span,sha256:hash(source.slice(span.start,span.end))});i=end;
  }
}
export function compileArithmeticSourceData(source,modulePath){
  if(!Array.isArray(modulePath)||!modulePath.length||modulePath.length>16||modulePath.some(part=>!identifier(part)))throw new TypeError('Source data needs a bounded explicit projection module path');
  const result={declarations:[],imports:[]};walk(originalMacroTrees(source),source,modulePath,result);
  const issued={schema:'original-arithmetic-literal-data-v1',modulePath,sourceSha256:hash(source),...result,projectionOnly:true,namespaceComplete:false,typeOwnerVerified:false,attributeOwnerVerified:false,parseAdmission:false};
  const encoded=JSON.stringify(issued),data=freezeMacroTree({...JSON.parse(encoded),checkedMetaSha256:hash(encoded),privateMetaRoundtrip:true});seals.add(data);return data;
}
export const isArithmeticSourceData=value=>!!value&&seals.has(value);
export function arithmeticDataCondition(declaration,limbBits){
  let active=true;for(const attr of declaration.attributes){const nodes=attr.children;if(text(nodes[0])==='doc')continue;if(text(nodes[0])!=='cfg'||nodes.length!==2||nodes[1]?.delimiter!=='(')throw new TypeError('Source data attribute owner/phase remains unsupported');const parts=nodes[1].children;if(parts.length!==3||text(parts[0])!=='fast_arithmetic'||text(parts[1])!=='='||!['"32"','"64"'].includes(text(parts[2])))throw new TypeError('Source data cfg is outside both modeled word variants');active&&=Number(JSON.parse(text(parts[2])))===limbBits;}return active;
}
