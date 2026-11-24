// Named-record syntax for original arithmetic projections. Attributes, Vec,
// allocator, trait/Copy and native layouts are deliberately not certified.
import {createHash} from 'node:crypto';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
const seals=new WeakSet(),hash=value=>createHash('sha256').update(value).digest('hex'),word=node=>node?.kind==='token'?node.text:null,identifier=value=>/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value??'');
function parts(nodes){if(!nodes.length)return [];const result=[];let start=0;for(let at=0;at<=nodes.length;at++)if(at===nodes.length||word(nodes[at])===','){if(at===start){if(at===nodes.length)break;throw new TypeError('Arithmetic record has an empty source field');}result.push(nodes.slice(start,at));start=at+1;}return result;}
function fieldType(nodes){if(nodes.length===1&&/^(?:u32|u64|u128|usize|Limb)$/u.test(word(nodes[0])??''))return {kind:'uint',source:word(nodes[0]),tokens:nodes,ownerVerified:false};if(nodes.length===4&&word(nodes[0])==='Vec'&&word(nodes[1])==='<'&&word(nodes[3])==='>')return {kind:'vector',sourcePath:['Vec'],element:fieldType([nodes[2]]),tokens:nodes,ownerVerified:false};throw new TypeError('Arithmetic record source field type has no bounded projection');}
function attributes(nodes,at){if(word(nodes[at-1])==='pub')at--;else if(nodes[at-1]?.delimiter==='('&&word(nodes[at-2])==='pub')at-=2;const result=[];while(nodes[at-1]?.delimiter==='['&&word(nodes[at-2])==='#'){result.unshift(nodes[at-1]);at-=2;}return result;}
export function compileArithmeticRecordSource(source,modulePath){
  if(typeof source!=='string'||!Array.isArray(modulePath)||!modulePath.length||modulePath.length>16||modulePath.some(value=>!identifier(value)))throw new TypeError('Arithmetic record source requires bounded original module syntax');
  const trees=originalMacroTrees(source),layouts=[];
  for(let at=0;at<trees.length;at++)if(word(trees[at])==='struct'){
    const name=word(trees[at+1]),body=trees[at+2];if(!identifier(name)||body?.delimiter!=='{')throw new TypeError('Arithmetic named-record source layout is unsupported');
    const fields=parts(body.children).map(tokens=>{let begin=0;const attrs=[];while(word(tokens[begin])==='#'&&tokens[begin+1]?.delimiter==='['){attrs.push(tokens[begin+1]);begin+=2;}if(word(tokens[begin])==='pub'){begin++;if(tokens[begin]?.delimiter==='(')begin++;}if(!identifier(word(tokens[begin]))||word(tokens[begin+1])!==':')throw new TypeError('Arithmetic record field source binder unsupported');return {name:word(tokens[begin]),type:fieldType(tokens.slice(begin+2)),attributes:attrs,tokens,span:{start:tokens[0].span.start,end:tokens.at(-1).span.end}};});
    if(new Set(fields.map(field=>field.name)).size!==fields.length||layouts.some(layout=>layout.name===name))throw new TypeError('Arithmetic record source layout owner is ambiguous');
    const span={start:trees[at].span.start,end:body.span.end};layouts.push({name,modulePath:[...modulePath],fields,attributes:attributes(trees,at),span,sha256:hash(source.slice(span.start,span.end)),sourceOwnerVerified:false});at+=2;
  }
  const issued={schema:'original-arithmetic-named-record-layout-v1',sourceSha256:hash(source),modulePath:[...modulePath],layouts,projectionOnly:true,typeOwnerVerified:false,attributeOwnerVerified:false,borrowContractVerified:false,copyContractVerified:false,allocatorContractVerified:false,namespaceAuthority:false,parseAdmission:false,runtimeParity:false};const encoded=JSON.stringify(issued),candidate=freezeMacroTree({...JSON.parse(encoded),privateMetaRoundtrip:true,checkedMetaSha256:hash(encoded)});seals.add(candidate);return candidate;
}
export const isArithmeticRecordSource=value=>!!value&&seals.has(value);
export function arithmeticRecordLayout(candidate,name){if(!seals.has(candidate))throw new TypeError('Unsealed original record layout source');const matches=candidate.layouts.filter(layout=>layout.name===name);if(matches.length!==1)throw new TypeError('Original record source layout is absent or ambiguous');return matches[0];}
