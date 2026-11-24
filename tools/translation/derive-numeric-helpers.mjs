import {DERIVE_SOURCE_PROFILE} from './derive-dependencies.mjs';

// Input confinement for the original Schemars expression parser. These
// descriptors neither execute validation expressions nor implement JsonSchema.
export const SCHEMARS_NUMERIC_HELPER_GRAMMAR=Object.freeze({
  profile:'bounded-schemars-unsigned-literal-validation-v1',
  package:'schemars_derive',version:'1.2.2',parser:'parse_length_or_range',
  members:Object.freeze([
    Object.freeze({path:'src/attr/parse_meta.rs',sha256:'c43f374a1d43fad8da680ffe2052c0984337ad05fe857e5791f0358aedc4feff'}),
    Object.freeze({path:'src/attr/validation.rs',sha256:'2290a7c9daf9d6680cdcc0992e9812858d3c02f6226f3af4c2eafc85aa2eff40'}),
  ]),
  generatedHelperBehavior:false,
});
const original=DERIVE_SOURCE_PROFILE.packages.find(entry=>entry.name===SCHEMARS_NUMERIC_HELPER_GRAMMAR.package&&entry.version===SCHEMARS_NUMERIC_HELPER_GRAMMAR.version);
for(const member of SCHEMARS_NUMERIC_HELPER_GRAMMAR.members)if(original?.members[member.path]!==member.sha256)throw new TypeError('Schemars numeric helper lacks its pinned original parser/output member');

// Only direct decimal literals are admitted. The original parser also accepts
// arbitrary Expr and strings reparsed as Expr; those require separate profiles.
export function boundedSchemarsNumericHelper(tokens,begin,position) {
  const first=tokens[begin],bounds=[],seen=new Set();let at=begin+1;
  if(position!=='field'||!['range','length'].includes(first?.text)||tokens[at++]?.text!=='(')throw new TypeError('Schemars numeric validation requires an original field helper group');
  while(tokens[at]?.text!==')') {
    const name=tokens[at++],equals=tokens[at++],literal=tokens[at++];
    if(name?.type!=='ident'||!['min','max','equal'].includes(name.text)||seen.has(name.text)||equals?.text!=='='||literal?.type!=='number'||!/^(?:0|[1-9][0-9]{0,19})$/u.test(literal.text)||BigInt(literal.text)>18446744073709551615n)throw new TypeError('Schemars numeric validation requires distinct bounded unsigned decimal literal assignments');
    if(name.text==='equal'&&seen.size||name.text!=='equal'&&seen.has('equal'))throw new TypeError('Schemars numeric equal is mutually exclusive with min/max');
    seen.add(name.text);bounds.push({name:name.text,value:literal.text,span:{start:name.start,end:literal.end},literalSpan:{start:literal.start,end:literal.end}});
    if(tokens[at]?.text===')')break;
    if(tokens[at++]?.text!==',')throw new TypeError('Schemars numeric expressions require a separately checked input profile');
  }
  const last=tokens[at++];if(last?.text!==')'||!bounds.length)throw new TypeError('Schemars numeric validation requires a nonempty original group');
  return {end:at,evidence:{profile:SCHEMARS_NUMERIC_HELPER_GRAMMAR.profile,grammar:SCHEMARS_NUMERIC_HELPER_GRAMMAR,helper:first.text,bounds,span:{start:first.start,end:last.end},tokens:tokens.slice(begin,at).map(token=>({type:token.type,text:token.text,span:{start:token.start,end:token.end}})),generatedHelperBehavior:false,obligations:['referenced schema types and generated validation/schema behavior remain unimplemented']}};
}
