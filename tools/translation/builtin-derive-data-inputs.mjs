// Syntax candidates from complete original source. The actual private derive
// output issuer separately joins owner, helper, namespace and profile evidence.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {sourceItems} from './rust-structure.mjs';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {isPlainSourceIdentifier} from './module-paths.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const identifier=node=>node?.kind==='token'&&node.type==='ident'&&isPlainSourceIdentifier(node.text);
function own(object,key){if(!object||typeof object!=='object'||types.isProxy(object))throw new TypeError('Builtin data source inputs require plain own data');const descriptor=Object.getOwnPropertyDescriptor(object,key);if(!descriptor||!('value'in descriptor))throw new TypeError('Builtin data source input accessor or missing data');return descriptor.value;}
export function builtinDeriveDataInputs(options){
 const source=own(options,'source'),span=own(options,'span'),start=own(span,'start'),end=own(span,'end');
 if(typeof source!=='string'||Buffer.byteLength(source)>256000||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>source.length)throw new TypeError('Builtin data input requires bounded complete source and exact span');
 const written=source.slice(start,end),items=sourceItems(written).filter(item=>!item.comment);
 if(items.length!==1||items[0].start!==0||items[0].end!==written.length||!['struct','enum'].includes(items[0].term))throw new TypeError('Builtin data input requires one complete original struct or enum declaration');
 const trees=originalMacroTrees(written),attributes=[];let at=0;
 const attrs=(nodes,position)=>{let cursor=0;while(nodes[cursor]?.text==='#'){
  const group=nodes[cursor+1];if(group?.delimiter!=='['||!group.children[0]?.text)throw new TypeError('Builtin data attribute syntax remains unproved');
  const name=group.children[0].text;if(['cfg','cfg_attr'].includes(name))throw new TypeError('Builtin data conditional attributes remain outside this syntax domain');
  attributes.push({name,position,span:{start:start+nodes[cursor].span.start,end:start+group.span.end},source:written.slice(nodes[cursor].span.start,group.span.end),sourceFeature:nodes[cursor].sourceFeature??null});cursor+=2;
 }return cursor;};
 at=attrs(trees,'container');if(trees[at]?.text==='pub'){at++;if(trees[at]?.delimiter==='(')at++;}
 const kind=trees[at++]?.text,name=trees[at++];if(!['struct','enum'].includes(kind)||!identifier(name))throw new TypeError('Builtin data original header is unsupported');
 const body=trees[at];if(body?.text==='<'||body?.text==='where')throw new TypeError('Builtin data generic or where headers remain unproved');
 const fields=[],variants=[];let style;
 if(kind==='struct'&&body?.text===';'&&at+1===trees.length)style='unit-struct';
 else{
  if(body?.delimiter!=='{'||at+1!==trees.length)throw new TypeError('Builtin data requires named struct fields or unit enum variants');
  if(kind==='struct'){
   style='named-struct';let index=0;
   while(index<body.children.length){index+=attrs(body.children.slice(index),'field');const definitionStart=body.children[index]?.span.start;if(body.children[index]?.text==='pub'){index++;if(body.children[index]?.delimiter==='(')index++;}
    const field=body.children[index++];if(!identifier(field)||fields.some(row=>row.name===field.text)||body.children[index++]?.text!==':')throw new TypeError('Builtin data field identity or separator remains unproved');
    const begin=index;let angle=0;
    for(;index<body.children.length;index++){const node=body.children[index];if(node.text==='<')angle++;if(node.text==='>')angle--;if(angle<0)throw new TypeError('Builtin data field generic type is unbalanced');if(node.text===','&&!angle)break;}
    if(angle||begin===index)throw new TypeError('Builtin data field type is incomplete');
    const typeNodes=body.children.slice(begin,index);
    const check=nodes=>{for(const node of nodes){if(node.text==='!'||node.text?.endsWith('!')||['#','=','where','const','macro','macro_rules','macro_rules!'].includes(node.text)||node.delimiter==='{')throw new TypeError('Builtin data field macro, default or const syntax remains unproved');if(node.kind==='group')check(node.children);}};check(typeNodes);
    const typeSpan={start:start+typeNodes[0].span.start,end:start+typeNodes.at(-1).span.end},nameSpan={start:start+field.span.start,end:start+field.span.end};fields.push({name:field.text,span:nameSpan,nameSpan,fieldDefinitionSpan:{start:start+definitionStart,end:typeSpan.end},typeSpan,typeSource:source.slice(typeSpan.start,typeSpan.end)});if(body.children[index]?.text===',')index++;
   }
  }else{
   style='unit-enum';let index=0;
   while(index<body.children.length){index+=attrs(body.children.slice(index),'variant');const variant=body.children[index++];if(!identifier(variant)||variants.some(row=>row.name===variant.text))throw new TypeError('Builtin data variant identity remains unproved');variants.push({name:variant.text,span:{start:start+variant.span.start,end:start+variant.span.end}});if(index<body.children.length&&body.children[index++]?.text!==',')throw new TypeError('Builtin data enum payload or explicit discriminant remains unproved');}
   if(!variants.length)throw new TypeError('Builtin data requires an original nonempty unit enum');
  }
 }
 if(fields.length>128||variants.length>128)throw new TypeError('Builtin data layout exceeds its source syntax budget');
 const evidence={schema:'original-builtin-data-syntax-candidate-v1',wholeSourceSha256:hash(source),span:{start,end},itemSha256:hash(written),kind,name:name.text,style,attributes,fields,variants,namespaceAuthority:false,ownerAuthority:false,copyAuthority:false,noDropAuthority:false,generatedImplBehavior:false};
 return freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});
}
