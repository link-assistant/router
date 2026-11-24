import {repositorySourceURL,repositoryCratePaths} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof,deriveDependencySource} from '../derive-dependencies.mjs';
import {originalClapDocumentFeaturePlan,originalClapValueDocuments} from '../derive-clap-documentation.mjs';
import {proveClapValueEnumSourceOutput,isClapValueEnumSourceOutput} from '../derive-clap-value-enum.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const hash=value=>createHash('sha256').update(value).digest('hex');
const historicalRustPaths=JSON.parse(readFileSync(new URL('../fixtures/static-source-performance/original-rust-inputs.json',import.meta.url),'utf8')).rustSources.map(row=>row.path);
assert.equal(historicalRustPaths.length,804);assert.equal(new Set(historicalRustPaths).size,804);
const retain=(name,value)=>{const directory=process.env.ROUTER_DERIVE_CLAP_DOCUMENTATION_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item instanceof Map?{$map:[...item]}:item)+'\n');}};
const context=source=>createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});
const docAttrs=source=>originalMacroTrees(source).filter(node=>node.kind==='group'&&node.delimiter==='[');
function helpLiterals(nodes) {
  const values=[];
  for(let at=0;at<nodes.length;at++) {
    const node=nodes[at];if(node.text==='help'&&nodes[at+1]?.tag==='group'&&nodes[at+1].delimiter==='(')values.push(JSON.parse(nodes[at+1].nodes[0].text));
    if(node.tag==='group')values.push(...helpLiterals(node.nodes));
  }
  return values;
}

test('actual Cargo feature edges and generator document bindings retain original bytes and spans',()=>{
  const plan=originalClapDocumentFeaturePlan(dependencies);assert.deepEqual(plan.rootFeatures,['derive','env','string','default']);assert.equal(plan.markdown,false);assert.equal(plan.unstableV5,false);assert.equal(plan.wholeCargoFeatureUnification,false);
  assert.ok(plan.selected.some(row=>row.package==='clap_derive'&&row.name==='default'&&row.values.length===0));
  for(const row of [...plan.selected,plan.dependency]){const source=deriveDependencySource(dependencies,row.package,row.source);assert.equal(source.sha256,row.sourceSha256);assert.equal(hash(source.source.slice(row.span.start,row.span.end)),row.sha256);}
  assert.throws(()=>plan.selected.push({}),TypeError);assert.throws(()=>plan.selected[0].values.push('unstable-markdown'),TypeError);
  assert.throws(()=>originalClapDocumentFeaturePlan(structuredClone(dependencies)),/sealed/);
  const proof=proveClapValueEnumSourceOutput({dependencies,source:'enum Kind{/// Original help.\nFirst}'});
  for(const row of Object.values(proof.originalDefinitions)){const source=deriveDependencySource(dependencies,'clap_derive',row.source);assert.equal(source.sha256,row.sourceSha256);assert.equal(hash(source.source.slice(row.span.start,row.span.end)),row.sha256);}
  for(const name of ['extract_doc_comment','format_doc_comment','parse_markdown','split_paragraphs','merge_lines','remove_period','is_blank'])assert.ok(proof.originalDefinitions[name],name);
  assert.ok(proof.originalRules.some(row=>row.role==='other-attribute-paths-ignored'));assert.ok(proof.bindingProofs.some(row=>row.role==='original default-feature document literal quote'));
});

test('independent document goldens cover blank edges paragraphs exact punctuation and source-order doc literals',()=>{
  const vectors=[
    ['#[doc="help"]','help',null],
    ['/// help\n','help',null],
    ['/// First line.\n/// Second line.\n','First line. Second line',null],
    ['///   \n/// First paragraph.\n///\n/// Second paragraph.\n///\n','First paragraph','First paragraph.\n\nSecond paragraph.'],
    ['#[doc=" first\\n second.\\n\\n more..."]','first second','first second.\n\nmore...'],
    ['/// Wait...\n','Wait...',null],
    ['/// Literal `code` **bold** [link](target).\n','Literal `code` **bold** [link](target)',null],
    ['#[doc=" "] #[doc=""]',null,null],
  ];
  for(const [source,short,long]of vectors){const result=originalClapValueDocuments(docAttrs(source));assert.equal(result.short,short,source);assert.equal(result.long,long,source);assert.equal(result.generatedHelperBehavior,false);const proof=proveClapValueEnumSourceOutput({dependencies,source:'enum Kind{'+source+' First}'});assert.deepEqual(helpLiterals(proof.syntax),short===null?[]:[short],source);assert.deepEqual(proof.outputObservation.bangCalls,[]);}
  const opaque='#[doc="#[macro_export] macro_rules! escape {}."]';assert.deepEqual(helpLiterals(proveClapValueEnumSourceOutput({dependencies,source:'enum Kind{'+opaque+' First}'}).syntax),['#[macro_export] macro_rules! escape {}']);
  for(const source of ['#[derive(clap::ValueEnum)] enum Choice {#[doc="help"] First}', '#[derive(clap::ValueEnum)] enum Choice {/// help\n First}']){const result=context(source);assert.equal(result.certificates.length,1);assert.deepEqual(helpLiterals(result.certificates[0].clapValueEnumOutput.syntax),['help']);}
});

test('Clap ignores original sibling attributes but only the separate closed original owner context admits them',()=>{
  const source='#[derive(Clone,Copy,Default,serde::Serialize,clap::ValueEnum)] enum Kind {#[default] #[serde(rename="first")] /// Help.\n First, #[serde(alias="second")] Second}';
  const proof=proveClapValueEnumSourceOutput({dependencies,source});assert.deepEqual(proof.input.variants[0].ignoredAttributes.map(row=>row.path),['default','serde','doc']);assert.deepEqual(helpLiterals(proof.syntax),['Help']);assert.deepEqual(proof.input.variants.map(row=>row.canonicalName),['first','second']);
  for(const variant of proof.input.variants)for(const attribute of variant.ignoredAttributes)assert.ok(attribute.syntax.length&&source.slice(attribute.span.start,attribute.span.end).length);
  const result=context(source);assert.deepEqual(result.diagnostics,[]);assert.ok(isClapValueEnumSourceOutput(result.certificates[0].clapValueEnumOutput));assert.equal(result.certificates[0].generatedImplBehavior,false);assert.equal(result.certificates[0].dimensions.bangMacroComplete,false);
  for(const original of ['#[derive(clap::ValueEnum)] enum Kind{#[unknown] First}', '#[derive(clap::ValueEnum)] enum Kind{#[serde(rename="first")] First}', '#[derive(clap::ValueEnum)] enum Kind{#[default] First}', '#[derive(clap::ValueEnum)] enum Kind{First} #[derive(clap::Args)] struct Sibling{value:String}', 'use unknown::automatically_derived; #[derive(clap::ValueEnum)] enum Kind{/// help\n First}', 'mod clap; #[derive(clap::ValueEnum)] enum Kind{/// help\n First}'])assert.equal(context(original).certificates.length,0,original);
});

test('unsupported docs and actual Clap helper/configuration effects retain independent source refusals',()=>{
  for(const source of ['#[doc="é"]','#[doc="\\u0041"]','#[doc="\\b"]','/** help */','#[value(verbatim_doc_comment)]','#[value(skip)]','#[arg(long)]','#[command(name="first")]','#[group(skip)]','#[clap(alias="first")]','#[cfg(any())]','#[cfg_attr(any(),value(skip))]'])assert.throws(()=>proveClapValueEnumSourceOutput({dependencies,source:'enum Kind{'+source+' First}'}),TypeError,source);
  for(const source of ['#[doc=make!()]','#[doc=make()]','#[doc(hidden)]','/// é\n'])assert.equal(context('#[derive(clap::ValueEnum)] enum Kind{'+source+' First}').certificates.length,0,source);
  for(const source of ['#[value(rename_all="snake_case")] enum Kind{First}', '#[command(name="other")] enum Kind{First}', '#[cfg(any())] enum Kind{First}', 'const X = enum Kind{First}'])assert.throws(()=>proveClapValueEnumSourceOutput({dependencies,source}),/original.*route|original.*header/,source);
});

for(const [path,digest,owner,variants,certificateCount,constants]of [
  ['src/subscription_usage_types.rs','82d1cd22e3f51589a10197244374b7c00ccb3fdfc3573c09291e1e6463ca7145','UsageProvider',[['Anthropic','anthropic'],['OpenAi','openai'],['ZAi','z-ai'],['Lefine','lefine'],['Gemini','gemini'],['Qwen','qwen']],11,[]],
  ['src/deploy_config.rs','3ae8cf1934d158188b5685421eb38e9b39adab01a0d89873ce91ba663ae4483c','ProviderKeyMode',[['Keep','keep'],['IfAbsent','if-absent'],['Replace','replace']],13,['RESERVED_ENV','RESERVED_ENV_PREFIXES','VERIFIABLE_CLIENTS']],
])test('complete unchanged '+path+' admits source data and original methods in emitted JS and strict TS',{timeout:60000},async()=>{
  const source=readFileSync(repositorySourceURL(path,root),'utf8');assert.equal(hash(source),digest);
  const paths=repositoryCratePaths(execFileSync('git',['ls-files','*.rs'],{cwd:root,encoding:'utf8',timeout:10000}).trim().split('\n'),root),currentPaths=new Set(paths);assert.equal(currentPaths.size,paths.length);assert.ok(currentPaths.has(path));for(const original of historicalRustPaths)assert.ok(currentPaths.has(original),original+' historical input remains present');const addedRustPaths=paths.filter(path=>!historicalRustPaths.includes(path));
  const result=translateProject({entry:path,paths,readSource:path=>readFileSync(repositorySourceURL(path,root),'utf8'),cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  retain('complete-'+path.replaceAll('/','-'),{source,path,paths,historicalRustPaths,addedRustPaths,cargoManifest:manifest,lock,result});
  assert.equal(result.meta.sources.find(row=>row.source===path).sha256,digest);assert.equal(result.meta.deriveNamespaceFootprints.certificates.length,certificateCount);assert.equal(result.meta.runtimeParity,false);assert.deepEqual(result.meta.executable.map(row=>row.name),constants);if(path==='src/deploy_config.rs'){const standard=result.meta.deriveNamespaceFootprints.certificates.filter(row=>row.standardInput);assert.deepEqual(standard.map(row=>row.name),['SecretSource','EnvSpec','SshSettings','ProviderKeySpec','DeploySection','DeployConfig','ResolvedProviderKey','ResolvedDeploy','Merged']);for(const row of standard){assert.deepEqual(row.dimensions,{typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:true,bangMacroComplete:false});assert.equal(row.generatedImplBehavior,false);assert.equal(row.standardInput.namespaceAuthority,false);assert.equal(row.standardInput.runtimeAuthority,false);}}
  const certificate=result.meta.deriveNamespaceFootprints.certificates.find(row=>row.name===owner);assert.ok(certificate);const item=sourceItems(source).find(row=>row.name===owner);assert.equal(certificate.itemSha256,hash(source.slice(item.start,item.end)));assert.deepEqual(certificate.span,{start:item.start,end:item.end});assert.equal(certificate.generatedImplBehavior,false);assert.equal(certificate.dimensions.bangMacroComplete,false);
  const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),method=[...program.declarations.values()].find(row=>row.impl?.method==='as_str');assert.ok(result.meta.checkedMethods.some(row=>row.name===owner+'.as_str'));assert.ok(method);assert.equal(method.sourceMethodProof.originalTokenTransformVerified,true);assert.equal(method.impl.copyCertificate.verified,true);
  let parse=null;
  if(path==='src/deploy_config.rs'){
    const original=result.meta.checkedMethods.find(row=>row.name===owner+'.parse');assert.ok(original);assert.equal(original.source,path);assert.deepEqual(original.span,{start:10132,end:10475});assert.equal(original.receiver,null);
    const methods=[...program.declarations.values()].filter(row=>{const origin=row.sourceMethodProof?.parse?.transform?.owner;return row.impl?.method==='parse'&&origin?.owner?.length===2&&origin.owner[0]==='crate'&&origin.owner[1]===owner&&origin.file===original.source&&origin.sourceSha256===digest&&origin.originalSpan?.start===original.span.start&&origin.originalSpan?.end===original.span.end;});assert.equal(methods.length,1);parse=methods[0];
    const transform=parse.sourceMethodProof.parse.transform;assert.deepEqual(transform.owner.owner,['crate',owner]);assert.equal(transform.owner.schema,'original-method-namespace-owner-v1');assert.equal(transform.sourcePath,path);assert.equal(transform.sourceSha256,digest);assert.deepEqual(transform.owner.originalSpan,original.span);assert.deepEqual(parse.span,original.span);
    assert.equal(parse.impl.receiver,null);assert.equal(parse.sourceMethodProof.originalTokenTransformVerified,true);assert.equal(result.meta.refused.some(row=>row.name===owner+'.parse'),false);
  }
  const errorInputs=['','Keep','KEEP',' keep','keep ','if_absent','IF-ABSENT','replace\n','é','😀','k\0eep','\0'];
  const errors=errorInputs.map(input=>({input,expected:'provider key mode `'+input+'` must be keep, if-absent or replace'}));
  const alias='\nexport {'+method.fullName+' as original_as_str'+(parse?', '+parse.fullName+' as original_parse':'')+'};\n',targets={...result,javascript:result.javascript+alias,typescript:result.typescript+alias},observations=[];
  retain('checked-method-targets-'+path.replaceAll('/','-'),{path,alias,javascript:targets.javascript,typescript:targets.typescript,variants,errors});
  try{await verifyTypedTargets(targets,(api,_result,module)=>{
    const observed={targetIndex:observations.length,parse:[],invalidInputs:[]};observations.push(observed);
    for(const [variant,value]of variants)assert.equal(module.original_as_str(Object.freeze({$:variant})),value);assert.throws(()=>module.original_as_str(Object.freeze({$:'Unknown'})),TypeError);assert.throws(()=>module.original_as_str({$:variants[0][0]}),TypeError);
    if(path==='src/deploy_config.rs'){
      assert.deepEqual(api.VERIFIABLE_CLIENTS,['claude','codex','qwen-code','gemini','opencode']);assert.deepEqual(api.RESERVED_ENV_PREFIXES,['ROUTER_DEPLOY_','TLS_','VERIFY_','PRESERVATION_']);assert.ok(Object.isFrozen(api.RESERVED_ENV));assert.ok(api.RESERVED_ENV.includes('TOKEN_SECRET'));
      for(const [variant,input]of variants){const actual=module.original_parse(input);observed.parse.push({input,actual});assert.deepEqual(actual,{$:'Ok',field0:{$:variant}});assert.ok(Object.isFrozen(actual));assert.ok(Object.isFrozen(actual.field0));}
      for(const {input,expected}of errors){const actual=module.original_parse(input);observed.parse.push({input,actual,expected});assert.deepEqual(actual,{$:'Err',field0:expected});assert.ok(Object.isFrozen(actual));}
      for(const [label,input]of [['undefined',undefined],['null',null],['boolean',true],['number',1],['bigint',1n],['object',{}],['array',[]],['boxed-string',new String('keep')],['lone-high-surrogate','\ud800'],['lone-low-surrogate','\udc00']]){
        assert.throws(()=>module.original_parse(input),TypeError,label);observed.invalidInputs.push({label,refusedAs:'TypeError'});
      }
    }
  }, {childTimeoutMs:30000});}finally{retain('checked-method-observations-'+path.replaceAll('/','-'),observations);}
  if(path==='src/subscription_usage_types.rs')assert.ok(result.meta.refused.some(row=>row.message.includes('SubscriptionProvider')));
});
