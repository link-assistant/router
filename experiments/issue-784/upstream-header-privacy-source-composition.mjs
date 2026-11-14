// Draft receiving DATA: preserve the whole archived module and compose only
// the four known privacy changes. CST reconstruction grants no runtime proof.
import {createHash} from 'node:crypto';
import {createRulePipeline} from '../../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule as literalRule} from '../../tools/translation/literal-substitution-rule.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const originalSha256='4ff0d415248394ab0f70ceb7a26702a11988cdcd8be1441587a59dac5f8daa48';
const currentSha256='2598264fedcc6f55404e03f651141ca1c9892f3cc80b33ec30dc7e5b163565fd';

const exactLiteralSubstitutionRule=(id,before,after)=>literalRule(id,before,after,'Complete source anchor changed: '+id);

export function composeUpstreamHeaderPrivacySource(before){
  if(typeof before!=='string'||hash(before)!==originalSha256)throw Error('Complete pinned upstream-header module required');
  const language=[
    ['reviewed-ingress-addresses',
      '    "cf-connecting-ip",\n',
      '    "cf-connecting-ip",\n    "cf-connecting-ipv6",\n    "cf-pseudo-ipv4",\n'],
    ['forwarded-prefix',
      '    INGRESS_NETWORK_HEADERS.contains(&name)\n',
      '    INGRESS_NETWORK_HEADERS.contains(&name)\n        || name.starts_with("x-forwarded-")\n'],
    ['explicit-location-consent',
      `    let mut headers = HeaderMap::new();
    for (name, value) in incoming {
        if !replaced_or_transport_header(name.as_str()) && !connection_nominated.contains(name) {`,
      `    let mut headers = HeaderMap::new();
    let share_geolocation = crate::geolocation::shares_geolocation(incoming);
    for (name, value) in incoming {
        if !replaced_or_transport_header(name.as_str())
            && !connection_nominated.contains(name)
            && (share_geolocation || !crate::geolocation::is_geolocation_header(name.as_str()))
        {`],
  ];
  const first=createRulePipeline([
    {phase:'language',rules:language.map(([id,expected,replacement])=>exactLiteralSubstitutionRule('upstream-header-privacy:'+id,expected,replacement))},
    {phase:'repository',rules:[]},
  ]).run(before);
  const middle=first.value;
  const second=createRulePipeline([
    {phase:'language',rules:[]},
    {phase:'repository',rules:[exactLiteralSubstitutionRule('upstream-header-privacy:document-location-boundary',
      '//! fields, and Router-internal metadata may change.',
      '//! fields, Router-internal metadata and unconsented location metadata may change.')]},
  ]).run(middle);
  const after=second.value;
  if(hash(after)!==currentSha256)throw Error('Complete reviewed privacy afterimage differs');
  const [equation]=transportConcreteSourcePhases([{before,middle,after,language:'Rust'}]);
  if(equation.inverse!==before)throw Error('Complete archived upstream-header inverse differs');
  return {before,middle,after,originalSha256,afterSha256:hash(after),equation,
    trace:[first.trace,second.trace],semanticAuthority:false,receivingQualified:false};
}
