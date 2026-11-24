// Literal associated constants from sealed original declarative expansions.
// A syntax seal never resolves an impl's trait, primitive or attribute owner.
import {createHash} from 'node:crypto';
import {isDeclarativeExpansion,declarativeExpansionLineage} from './declarative-macros.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const seals=new WeakSet(),text=node=>node?.kind==='token'?node.text:null;
function transparent(nodes){return nodes.map(node=>{if(node.kind==='fragment'){if(!['ident','tt'].includes(node.fragment)||node.trees.length!==1||node.trees[0].kind!=='token')throw new TypeError('Associated constant capture remains opaque');return node.trees[0];}if(node.kind==='group')return {...node,children:transparent(node.children)};if(node.kind!=='token')throw new TypeError('Associated constant has unresolved hygiene syntax');return node;});}
export function compileArithmeticAssociatedSource(expansions){
  if(!Array.isArray(expansions)||expansions.length>16||expansions.some(value=>!isDeclarativeExpansion(value)))throw new TypeError('Associated source requires private actual declarative expansions');
  const items=[],sources=[];
  for(const expansion of expansions){const lineage=declarativeExpansionLineage(expansion);sources.push({sha256:lineage.definition.sourceSha256,definitionDigest:lineage.definition.digest,expansionDigest:expansion.digest});const trees=transparent(expansion.trees);
    for(let at=0;at<trees.length;at++)if(text(trees[at])==='impl'){
      const trait=text(trees[at+1]),target=text(trees[at+3]),body=trees[at+4];if(text(trees[at+2])!=='for'||body?.delimiter!=='{'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(trait??'')||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(target??''))throw new TypeError('Associated impl needs actual simple source paths');
      for(let i=0;i<body.children.length;i++)if(text(body.children[i])==='const'){const tokens=body.children.slice(i,i+7);if(tokens.length!==7||text(tokens[2])!==':'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(text(tokens[1])??'')||text(tokens[3])!=='Self'||text(tokens[4])!=='='||!/^\d+$/u.test(text(tokens[5])??'')||text(tokens[6])!==';')throw new TypeError('Associated source constant is not an inert Self integer');items.push({trait,target,name:text(tokens[1]),literal:text(tokens[5]),tokens,sourceSha256:lineage.definition.sourceSha256,expansionDigest:expansion.digest});i+=6;}at+=4;
    }
  }
  const issued={schema:'source-associated-literal-constants-v1',sources,items,projectionOnly:true,traitOwnerVerified:false,primitiveTypeOwnerVerified:false,attributeOwnerVerified:false,generatedBehaviorVerified:false,namespaceAuthority:false,parseAdmission:false};const encoded=JSON.stringify(issued),candidate=freezeMacroTree({...JSON.parse(encoded),privateMetaRoundtrip:true,checkedMetaSha256:createHash('sha256').update(encoded).digest('hex')});seals.add(candidate);return candidate;
}
export const isArithmeticAssociatedSource=value=>!!value&&seals.has(value);
export function projectedArithmeticAssociatedValue(candidate,trait,target,name){if(!seals.has(candidate))throw new TypeError('Unsealed associated source');const matches=candidate.items.filter(item=>item.trait===trait&&item.target===target&&item.name===name);if(matches.length!==1)throw new TypeError('Associated literal source is absent or ambiguous');return BigInt(matches[0].literal);}
