import {DERIVE_SOURCE_PROFILE} from './derive-dependencies.mjs';

// Both audited expanders use the identical attr parser. These descriptors
// certify input confinement only; referenced functions are never executed.
export const SERDE_HELPER_GRAMMAR=Object.freeze({
  profile:'bounded-serde-helper-ExprPath-v1',
  members:Object.freeze([
    Object.freeze({package:'serde_derive',version:'1.0.229',path:'src/internals/attr.rs'}),
    Object.freeze({package:'serde_derive_internals',version:'0.30.0',path:'src/attr.rs'}),
  ]),
  sha256:'7abe82fde303a3c31f967c13e0ee1afe49ea584d882b9d2c32b067888e1c8225',
  parser:'parse_lit_into_expr_path',
  generatedHelperBehavior:false,
});
for(const member of SERDE_HELPER_GRAMMAR.members) {
  const actual=DERIVE_SOURCE_PROFILE.packages.find(entry=>entry.name===member.package&&entry.version===member.version);
  if(actual?.members[member.path]!==SERDE_HELPER_GRAMMAR.sha256)throw new TypeError('Serde helper grammar lacks its pinned source member');
}

const keywords=new Set('as async await break const continue dyn else enum extern false fn for gen if impl in let loop match mod move mut pub ref return static struct trait true type unsafe use where while abstract become box do final macro override priv typeof unsized virtual yield try'.split(' '));
const prefixes=new Set(['self','Self','super','crate']);

export function boundedSerdeExprPath(value) {
  if(typeof value!=='string'||value.length>4096)throw new TypeError('Serde helper path requires a bounded original string literal');
  const text=value.trim(),absolute=text.startsWith('::'),segments=(absolute?text.slice(2):text).split('::').map(part=>part.trim());
  if(!segments.length||segments.length>32)throw new TypeError('Serde helper path exceeds the bounded ExprPath profile');
  for(const [index,segment]of segments.entries()) {
    const raw=segment.startsWith('r#'),name=raw?segment.slice(2):segment;
    if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)||name==='_'||name.length>128||raw&&prefixes.has(name)||!raw&&(keywords.has(name)||prefixes.has(name)&&(absolute||index>0&&name!=='super')))throw new TypeError('Serde helper path requires a macro-free nongeneric ExprPath');
    if(index>0&&name==='super'&&segments.slice(0,index).some(part=>part!=='super'))throw new TypeError('Serde super path requires an original leading parent chain');
  }
  return {profile:SERDE_HELPER_GRAMMAR.profile,grammar:SERDE_HELPER_GRAMMAR,leadingColon:absolute,segments,generatedHelperBehavior:false,obligations:['referenced helper resolution and generated trait behavior remain unimplemented']};
}
