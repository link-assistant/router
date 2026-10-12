// Field defaults select and check the actual pinned Rust trait body. There is
// no owner-to-value table and no owner-specific target function template.
import { createHash } from 'node:crypto';
import { isDeriveDependencyProof, deriveDependencySource } from '../derive-dependencies.mjs';
import { HostRustParser, HostChecker } from '../extensions/host-contracts.mjs';
import { pinnedDefaultBody, parsePinnedBody, parsedPinnedBodyEvidence, STANDARD_BODY_SOURCE_PROFILE } from '../extensions/standard-body-source.mjs';
import { BOOL, rustFixedType, sameType } from '../checked-types.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sources=[['serde_derive','src/de.rs'],['serde','src/private/mod.rs'],['serde','src/lib.rs']];
export function primitiveFieldDefault(type,dependencies) {
  if(!isDeriveDependencyProof(dependencies)||dependencies.rustVersion+'.0'!==STANDARD_BODY_SOURCE_PROFILE.rust)
    throw new TypeError('Primitive default requires the actual locked derive and standard Rust source profile');
  if(type.kind!=='primitive'||type.owner!=='rust-prelude::'+type.name)
    throw new TypeError('Default requires a separately checked original primitive owner');
  const expected=type.name==='bool'?BOOL:rustFixedType(type.name);
  if(!expected||expected.kind==='fixed'&&![8,16,32,64].includes(expected.bits))
    throw new TypeError('Default requires a separately checked serialization scalar visitor');
  const target=expected.kind==='fixed'?{...expected,rustPrimitiveName:type.name}:expected;
  const selection=pinnedDefaultBody(type.name),original=parsePinnedBody(HostRustParser,selection),syntax=parsedPinnedBodyEvidence(original);
  if(selection.evidence.trait!=='core::default::Default'||selection.evidence.owner!==type.name||selection.method.parameters.length)
    throw new TypeError('Selected Default differs from the actual primitive zero-argument trait method');
  const checker=new HostChecker('rust',[]),checked=checker.expr(original,new Map(),[],target);
  if(checked.k!=='lit'||!sameType(checked.type,target))
    throw new TypeError('Default body needs a separately checked non-literal interpreter');
  checker.expectedPrimitiveIdentity(checked.type,target,[],original.span);
  const value=checked.value;
  if(target.kind==='bool'?typeof value!=='boolean':typeof value!=='string'||!/^-(?:0|[1-9]\d*)$|^(?:0|[1-9]\d*)$/.test(value))
    throw new TypeError('Checked Default literal has no exact descriptor representation');
  return {
    schema:'original-primitive-field-default-v1',owner:type.owner,
    selection,syntaxSha256:syntax.syntaxSha256,checkedLiteral:{type:target,value},checkedLiteralSha256:hash(checked),
    serdeSources:sources.map(([packageName,path])=>{const {source,...evidence}=deriveDependencySource(dependencies,packageName,path);return evidence;}),
    runtimeAuthority:false,generatedTraitBehavior:false,
  };
}
