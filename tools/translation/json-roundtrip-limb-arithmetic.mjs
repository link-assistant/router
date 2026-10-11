// Exact original power-table arithmetic only; no parser or namespace authority.
import {createHash} from 'node:crypto';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
const proofs=new WeakSet(),hash=source=>createHash('sha256').update(source).digest('hex'),text=node=>node?.kind==='token'?node.text:null;
function inertUnsigned(node,bits=64){const raw=text(node);if(typeof raw!=='string'||!/^\d+$/u.test(raw))throw new TypeError('Limb data needs original inert decimal tokens');const value=BigInt(raw);if(value>=(1n<<BigInt(bits)))throw new TypeError('Original limb data exceeds its checked unsigned type');return value;}
function arrays(source){
  const tokens=originalMacroTrees(source),result=new Map();
  for(let i=0;i<tokens.length;i++){
    if(text(tokens[i])!=='const'||text(tokens[i+2])!==':'||text(tokens[i+4])!=='='||text(tokens[i+6])!==';')continue;
    const name=text(tokens[i+1]),type=tokens[i+3],value=tokens[i+5];
    if(type?.kind!=='group'||type.delimiter!=='['||value?.kind!=='group'||value.delimiter!=='[')continue;
    if(!['u32','u64'].includes(text(type.children[0])))continue;
    if(type.children.length!==3||text(type.children[1])!==';')throw new TypeError('Original limb array type is not closed');
    const bits=Number(text(type.children[0]).slice(1)),length=inertUnsigned(type.children[2]);if(length>1024n)throw new TypeError('Original limb array exceeds the source budget');
    const values=[];for(let j=0;j<value.children.length;j+=2){values.push(inertUnsigned(value.children[j],bits));if(j+1<value.children.length&&text(value.children[j+1])!==',')throw new TypeError('Original limb array contains an unproved expression');}
    if(BigInt(values.length)!==length||result.has(name))throw new TypeError('Original limb array size/name changed');
    const span={start:tokens[i].span.start,end:tokens[i+6].span.end};result.set(name,{name,bits,values,span,sha256:hash(source.slice(span.start,span.end))});
  }
  return {tokens,result};
}
function powerOrder(tokens){
  for(let i=0;i<tokens.length;i++)if(text(tokens[i])==='const'&&text(tokens[i+1])==='POW5'&&text(tokens[i+2])===':'&&text(tokens[i+4])==='='&&tokens[i+5]?.delimiter==='['){
    const nodes=tokens[i+5].children,names=[];for(let j=0;j<nodes.length;j+=3){if(text(nodes[j])!=='&'||!/^POW5_[0-9]+$/u.test(text(nodes[j+1])??'')||j+2<nodes.length&&text(nodes[j+2])!==',')throw new TypeError('Original limb table contains an unproved reference');names.push(text(nodes[j+1]));}
    return names;
  }
  throw new TypeError('Actual original power dispatch table absent');
}
function encoded(values,bits){let result=0n;for(let i=values.length-1;i>=0;i--)result=(result<<BigInt(bits))+values[i];return result;}
export function verifyPinnedJsonLimbArithmetic(dependencies){
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('Limb arithmetic requires private original dependency evidence');
  const small=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/small_powers.rs'),smallData=arrays(small.source),rows=[],sources=[{path:small.path,sha256:small.sha256}],variants=[];
  for(const bits of [32,64]){
    for(const [base,count]of [[5,bits===32?14:28],[10,bits===32?10:20]]){
      const value=smallData.result.get('POW'+base+'_'+bits);if(value?.bits!==bits||value.values.length!==count)throw new TypeError('Actual small limb powers changed');
      for(let index=0;index<count;index++){const actual=value.values[index],expected=BigInt(base)**BigInt(index);if(actual!==expected)throw new TypeError('Original small limb power is not exact');rows.push({kind:'small',bits,base,index,value:actual});}
    }
    const original=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/large_powers'+bits+'.rs'),data=arrays(original.source),order=powerOrder(data.tokens);
    if(order.length!==14||data.result.size!==14||order.some((name,index)=>name!=='POW5_'+(index+1)))throw new TypeError('Original large power dispatch order changed');
    for(let index=0;index<14;index++){
      const declaration=data.result.get(order[index]);if(declaration?.bits!==bits||!declaration.values.length||declaration.values.at(-1)===0n)throw new TypeError('Original large limb power is not normalized');
      const exponent=2**index,value=encoded(declaration.values,bits);if(value!==5n**BigInt(exponent))throw new TypeError('Original large limb power is not exact');
      rows.push({kind:'large',bits,index,exponent,limbs:declaration.values.length,value,span:declaration.span,declarationSha256:declaration.sha256});
    }
    sources.push({path:original.path,sha256:original.sha256});
    const q=1n<<BigInt(bits),scalarMax=(q-1n)**2n+(q-1n),accumulationMax=(q-1n)**2n+2n*(q-1n);
    if(scalarMax!==q*q-q||accumulationMax!==q*q-1n)throw new TypeError('Bounded limb arithmetic invariant changed');
    variants.push({bits,scalarMax,accumulationMax,wideBits:bits*2,scalarWideOverflow:false,accumulationWideOverflow:false});
  }
  const math=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/math.rs'),build=jsonMacroOriginalSource(dependencies,'serde_json','build.rs');
  // Original fixed source is recorded, not interpreted as a callable runtime.
  sources.push({path:math.path,sha256:math.sha256},{path:build.path,sha256:build.sha256});
  const proof=freezeMacroTree({schema:'original-json-limb-power-arithmetic-only-v1',sources,rows,variants,originalPowerTablesExact:true,limbCarryBoundsVerified:true,
    boundedDomain:{rawMantissaDigits:768,negativePow5Max:1099,positiveBitsMax:1093},sourceLoopEquivalenceVerified:false,boundedDispatchVerified:false,hi64StickyEquivalenceVerified:false,
    parseAdmission:false,algorithmEquivalenceVerified:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false,rustExecution:false});
  proofs.add(proof);return proof;
}
export const isPinnedJsonLimbArithmetic=value=>!!value&&proofs.has(value);
