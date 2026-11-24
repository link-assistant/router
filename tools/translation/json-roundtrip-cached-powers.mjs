// Arithmetic facts from private pinned original constant arrays, not a proof
// of the complete parser algorithm or authority to change its admission guard.
import {createHash} from 'node:crypto';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {isJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-sources.mjs';
const proofSet=new WeakSet(),hash=value=>createHash('sha256').update(value).digest('hex');
const text=node=>node?.kind==='token'?node.text:null;
function integer(nodes,type) {
  const negative=text(nodes[0])==='-',raw=text(nodes[negative?1:0]);
  if(nodes.length!==(negative?2:1)||typeof raw!=='string'||!/^[0-9]+$/u.test(raw))throw new TypeError('Cached power requires actual inert integer tokens');
  const value=BigInt(raw)*(negative?-1n:1n),valid=type==='u64'?value>=0n&&value<(1n<<64n):type==='i32'?value>=-2147483648n&&value<=2147483647n:false;
  if(!valid)throw new TypeError('Cached power integer is outside its actual source type');return value;
}
function arrays(source) {
  const trees=originalMacroTrees(source),result=new Map();
  for(let at=0;at<trees.length;at++) {
    if(text(trees[at])!=='const'||text(trees[at+2])!==':'||text(trees[at+4])!=='='||text(trees[at+6])!==';')continue;
    const name=text(trees[at+1]),type=trees[at+3],value=trees[at+5];
    if(type?.kind!=='group'||type.delimiter!=='['||value?.kind!=='group'||value.delimiter!=='[')continue;
    if(type.children.length!==3||text(type.children[1])!==';'||!['u64','i32'].includes(text(type.children[0])))throw new TypeError('Cached array has an unproved original type');
    const length=integer([type.children[2]],'u64');if(length>128n)throw new TypeError('Cached array exceeds its bounded source layout');
    const values=[];let start=0;
    for(let end=0;end<=value.children.length;end++)if(end===value.children.length||text(value.children[end])===','){
      const tokens=value.children.slice(start,end);start=end+1;if(!tokens.length){if(end===value.children.length)break;throw new TypeError('Cached array has an empty element');}values.push(integer(tokens,text(type.children[0])));
    }
    if(BigInt(values.length)!==length||result.has(name))throw new TypeError('Cached array layout/name is not unique');
    const span={start:trees[at].span.start,end:trees[at+6].span.end};result.set(name,{name,type:text(type.children[0]),values,span,sha256:hash(source.slice(span.start,span.end))});
  }
  return result;
}
const magnitude=value=>value<0n?-value:value;
function scaledPower(exponent,binaryExponent) {
  let numerator=1n,denominator=1n;
  if(exponent>=0)numerator=10n**BigInt(exponent);else denominator=10n**BigInt(-exponent);
  if(binaryExponent>=0)denominator<<=BigInt(binaryExponent);else numerator<<=BigInt(-binaryExponent);
  return {numerator,denominator};
}
export function verifyPinnedJsonCachedPowerArithmetic(dependencies) {
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('Cached arithmetic needs private original locked source evidence');
  const source=jsonMacroOriginalSource(dependencies,'serde_json','src/lexical/cached_float80.rs'),data=arrays(source.source);
  const read=(name,type)=>{const value=data.get(name);if(value?.type!==type)throw new TypeError('Original cached constant identity is absent');return value;};
  const smallM=read('BASE10_SMALL_MANTISSA','u64'),smallE=read('BASE10_SMALL_EXPONENT','i32'),largeM=read('BASE10_LARGE_MANTISSA','u64'),largeE=read('BASE10_LARGE_EXPONENT','i32'),smallInt=read('BASE10_SMALL_INT_POWERS','u64');
  if(smallM.values.length!==10||smallE.values.length!==10||smallInt.values.length!==10||largeM.values.length!==66||largeE.values.length!==66)throw new TypeError('Original cached-power shape changed');
  // The actual pinned module binds step=10/bias=350 and these five arrays in
  // BASE10_POWERS. This module certifies their arithmetic, not callable binding.
  const rows=[];
  for(const [kind,mantissas,exponents]of [['small',smallM.values,smallE.values],['large',largeM.values,largeE.values]])for(let index=0;index<mantissas.length;index++){
    const decimalExponent=kind==='small'?index:index*10-350,binaryExponent=Number(exponents[index]),mantissa=mantissas[index];
    if(mantissa<(1n<<63n)||mantissa>=(1n<<64n)||Math.abs(binaryExponent)>2048)throw new TypeError('Cached value is not an actual bounded normalized representation');
    const {numerator,denominator}=scaledPower(decimalExponent,binaryExponent),delta=mantissa*denominator-numerator;
    if(magnitude(delta)>=denominator||kind==='small'&&delta!==0n)throw new TypeError('Original cached power exceeds the strict one-unit arithmetic envelope');
    if(kind==='small'&&smallInt.values[index]!==10n**BigInt(index))throw new TypeError('Original small integer power is not exact');
    rows.push({kind,index,decimalExponent,binaryExponent,mantissa,scaledNumerator:numerator,scaledDenominator:denominator,signedErrorNumerator:delta,exact:delta===0n,nearest:magnitude(delta)*2n<=denominator});
  }
  const proof=freezeMacroTree({schema:'original-json-cached-power-arithmetic-only-v1',source:{path:source.path,sha256:source.sha256,arrays:[...data.values()].map(({values,...declaration})=>declaration)},rows,
    normalizedPowerArithmeticVerified:true,coefficientTruncationPropagationVerified:false,moderateAcceptanceVerified:false,stickyTailBehaviorEquivalent:false,
    parseAdmission:false,algorithmEquivalenceVerified:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false,rustExecution:false});proofSet.add(proof);return proof;
}
export const isPinnedJsonCachedPowerArithmetic=value=>!!value&&proofSet.has(value);
