import {createHash} from 'node:crypto';
import {deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {inventoryDeriveQuoteMeta,createQuoteFragmentCompiler,inspectQuoteFragment} from './derive-quote-meta.mjs';
import {rustTokens,sourceItems} from './rust-structure.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {isPlainSourceIdentifier} from './module-paths.mjs';
import {originalClapDocumentFeaturePlan,originalClapValueDocuments} from './derive-clap-documentation.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const cache=new WeakMap(),proofs=new WeakMap(),sourceInventories=new WeakMap();
const significant=source=>rustTokens(source).filter(token=>token.type!=='comment');
const text=nodes=>nodes.map(node=>node.tag==='slot'?'#'+node.name:node.tag==='repeat'?'#('+text(node.nodes)+')'+(node.separator?.text??'')+node.quantifier:node.tag==='group'?node.delimiter+text(node.nodes)+({'(':')','[':']','{':'}'}[node.delimiter]):node.text).join(' ');

// Retain only static syntax scalar values inside the actual dependency issuer.
// Rule matching, callback predicates and fresh evidence remain call-local.
function sourceInventory(dependencies,packageName,path){
  const original=deriveDependencySource(dependencies,packageName,path);
  let origins=sourceInventories.get(dependencies);if(!origins){origins=new Map();sourceInventories.set(dependencies,origins);}
  let value=origins.get(original);
  if(value){if(value.source!==original.source||value.sha256!==original.sha256||!Object.isFrozen(original))throw new TypeError('Clap retained original syntax source changed');return value;}
  if(!Object.isFrozen(original))throw new TypeError('Clap original syntax source is not frozen');
  value={source:original.source,sha256:original.sha256,significant:null,declarations:null};origins.set(original,value);return value;
}
function originalSignificant(dependencies,packageName,path){
  const inventory=sourceInventory(dependencies,packageName,path);
  if(!inventory.significant)inventory.significant=freeze(significant(inventory.source).map(({text,type,start,end})=>({text,type,start,end})));
  return inventory.significant;
}
function originalDeclarations(dependencies,path){
  const inventory=sourceInventory(dependencies,'clap_derive',path);if(inventory.declarations)return inventory.declarations;
  const source=inventory.source,roots=sourceItems(source),items=[...roots];
  for(const impl of roots.filter(item=>item.term==='impl')) {
    const open=impl.tokens.find(token=>token.text==='{'),close=impl.tokens.at(-1);
    items.push(...sourceItems(source.slice(open.end,close.start)).map(item=>({...item,start:item.start+open.end,end:item.end+open.end})));
  }
  inventory.declarations=freeze(items.map(({term,name,start,end})=>({term,name,start,end})));return inventory.declarations;
}
function rule(dependencies,packageName,path,written,role,count=1) {
  const original=deriveDependencySource(dependencies,packageName,path),tokens=originalSignificant(dependencies,packageName,path),expected=significant(written),rows=[];
  for(let at=0;at<=tokens.length-expected.length;at++)if(expected.every((token,index)=>token.text===tokens[at+index].text&&token.type===tokens[at+index].type)) {
    const span={start:tokens[at].start,end:tokens[at+expected.length-1].end};rows.push({role,package:packageName,source:path,sourceSha256:original.sha256,span,sha256:hash(original.source.slice(span.start,span.end))});
  }
  if(rows.length!==count)throw new TypeError('Clap original source binding changed or is ambiguous: '+role);return rows;
}
function definition(dependencies,path,name,predicate=()=>true) {
  const original=deriveDependencySource(dependencies,'clap_derive',path),items=originalDeclarations(dependencies,path);
  const matches=items.filter(item=>item.term==='fn'&&item.name===name&&predicate(original.source.slice(item.start,item.end)));
  if(matches.length!==1)throw new TypeError('Clap original generator definition is not unique: '+name);
  const item=matches[0];return {source:path,sourceSha256:original.sha256,span:{start:item.start,end:item.end},sha256:hash(original.source.slice(item.start,item.end))};
}
function sourcePlan(dependencies) {
  if(cache.has(dependencies))return cache.get(dependencies);
  const item='src/item.rs',derive='src/derives/value_enum.rs',rules=[
    ...rule(dependencies,'clap','src/lib.rs','#[cfg(feature = "derive")] #[doc(hidden)] pub use clap_derive::{self, Args, Parser, Subcommand, ValueEnum};','actual-feature-reexport'),
    ...rule(dependencies,'clap_derive','src/lib.rs','#[proc_macro_derive(ValueEnum, attributes(clap, value))] pub fn value_enum(input: TokenStream) -> TokenStream { let input: DeriveInput = parse_macro_input!(input); derives::derive_value_enum(&input)','actual-derive-registration-entry'),
    ...rule(dependencies,'clap_derive','src/derives/mod.rs','pub(crate) use value_enum::derive_value_enum;','selected-generator-module'),
    ...rule(dependencies,'clap_derive',derive,'use quote::quote; use quote::quote_spanned;','original-quote-owners'),
    ...rule(dependencies,'clap_derive',item,'pub(crate) const DEFAULT_CASING: CasingStyle = CasingStyle::Kebab;','default-name-casing'),
    ...rule(dependencies,'clap_derive',item,'doc_comment: vec![], methods: vec![], deprecations: vec![],','initial-empty-method-doc-deprecation-bindings'),
    ...rule(dependencies,'clap_derive',item,'else if name == "name" { match kind {','name-assignment-selector'),
    ...rule(dependencies,'clap_derive',item,'Self::Assigned(tokens) => tokens,','assigned-name-forwarding',1),
    ...rule(dependencies,'clap_derive',item,'Kebab => s.to_kebab_case(),','heck-kebab-binding',2),
    ...rule(dependencies,'clap_derive',item,'pub(crate) fn field_methods(&self) -> TokenStream { let methods = &self.methods; let doc_comment = &self.doc_comment; quote!( #(#doc_comment)* #(#methods)* ) }','field-method-sequences'),
    ...rule(dependencies,'clap_derive',item,'pub(crate) fn deprecations(&self) -> TokenStream { let deprecations = &self.deprecations; quote!( #(#deprecations)* ) }','deprecation-sequence'),
    ...rule(dependencies,'clap_derive',item,'pub(crate) fn cased_name(&self) -> TokenStream { self.name.clone().translate(*self.casing) }','cased-name-call'),
    ...rule(dependencies,'clap_derive',item,'AttrKind::Command | AttrKind::Value | AttrKind::Clap | AttrKind::StructOpt => { self.name = Name::Assigned(arg); }','name-assignment'),
    ...rule(dependencies,'clap_derive',item,'_ => self.methods.push(Method::new(name, arg)),','alias-method-storage'),
    ...rule(dependencies,'clap_derive',item,'None | Some(MagicAttrName::Short) | Some(MagicAttrName::Long) | Some(MagicAttrName::Env) | Some(MagicAttrName::About) | Some(MagicAttrName::LongAbout) | Some(MagicAttrName::LongHelp) | Some(MagicAttrName::Author) | Some(MagicAttrName::Version) => { let expr = attr.value_or_abort()?; self.push_method(*attr.kind.get(), attr.name.clone(), expr); }','nonmagic-literal-forwarding'),
    ...rule(dependencies,'clap_derive','src/attr.rs','else if attr.path().is_ident("value") { Sp::new(AttrKind::Value, attr.path().span()) }','value-helper-owner'),
    ...rule(dependencies,'clap_derive','src/attr.rs','else if attr.path().is_ident("value") { Sp::new(AttrKind::Value, attr.path().span()) } else { continue; };','other-attribute-paths-ignored'),
    ...rule(dependencies,'clap_derive',item,'res.push_doc_comment(&variant.attrs, "help", None);','value-document-help-only'),
    ...rule(dependencies,'clap_derive',item,'verbatim_doc_comment: false, force_long_help: false,','default-document-mode-bindings'),
    ...rule(dependencies,'clap_derive',item,'short_help.map(|h| quote!(#h)).unwrap_or_else(|| quote!(None))','default-feature-short-document-binding'),
    ...rule(dependencies,'clap_derive','src/utils/doc_comments.rs','let (short, long) = parse_markdown(lines); let long = long.or_else(|| force_long.then(|| short.clone())); (Some(remove_period(short)), long)','default-document-preprocessing'),
    ...rule(dependencies,'clap_derive','src/utils/doc_comments.rs','fn remove_period(mut s: String) -> String { if s.ends_with(\'.\') && !s.ends_with("..") { s.pop(); } s }','document-final-single-period-removal'),
    ...rule(dependencies,'clap_derive','src/attr.rs','let value = if input.peek(Token![=]) { let assign_token = input.parse::<Token![=]>()?; match input.parse::<Expr>() { Ok(expr) => Some(AttrValue::Expr(expr)),','literal-expression-parser'),
    ...rule(dependencies,'heck','src/kebab.rs','transform(self.0.as_ref(), lowercase, |f| write!(f, "-"), f)','heck-word-boundary-sink'),
    ...rule(dependencies,'heck','src/lib.rs','for word in s.split(|c: char| !c.is_alphanumeric())','heck-ascii-word-split'),
    ...rule(dependencies,'heck','src/lib.rs','if next_mode == WordMode::Lowercase && next.is_uppercase()','heck-lower-upper-boundary'),
    ...rule(dependencies,'heck','src/lib.rs','else if mode == WordMode::Uppercase && c.is_uppercase() && next.is_lowercase()','heck-acronym-boundary'),
    ...rule(dependencies,'heck','src/lib.rs','write!(f, "{}", c.to_lowercase())?;','heck-lowercase-scalar-sink'),
  ];
  const inventory=inventoryDeriveQuoteMeta(dependencies,'clap_derive');
  const definitions={};for(const name of ['derive_value_enum','gen_for_enum','lits','gen_value_variants','gen_to_possible_value'])definitions[name]=definition(dependencies,derive,name);
  for(const name of ['from_value_enum','from_value_enum_variant','field_methods','deprecations','cased_name','translate','infer_kind','push_attrs','push_method','push_method_','push_doc_comment','assert_no_defer','has_explicit_methods'])definitions[name]=definition(dependencies,item,name);
  definitions.initialization=definition(dependencies,item,'new',value=>value.includes('let group_id = Name::Derived(ident)'));
  definitions.methodInitialization=definition(dependencies,item,'new',value=>value.includes('Self { name, args }'));
  definitions.attributeParser=definition(dependencies,'src/attr.rs','parse',value=>value.includes('let name: Ident = input.parse()?'));
  definitions.attributeLists=definition(dependencies,'src/attr.rs','parse_all');
  for(const name of ['extract_doc_comment','format_doc_comment','remove_period','split_paragraphs','merge_lines','is_blank'])definitions[name]=definition(dependencies,'src/utils/doc_comments.rs',name);
  definitions.parse_markdown=definition(dependencies,'src/utils/doc_comments.rs','parse_markdown',value=>value.includes('split_paragraphs(lines)'));
  definitions.method=definition(dependencies,item,'to_tokens',value=>value.includes('let Self { name, args }'));
  const template=(name,predicate=()=>true)=>{
    const def=definitions[name],rows=inventory.members.find(member=>member.source===def.source).quotes.filter(row=>row.span.start>=def.span.start&&row.span.end<=def.span.end&&predicate(text(row.syntax)));
    if(rows.length!==1)throw new TypeError('Clap selected quote template is not unique: '+name);return rows[0];
  };
  const docBinding=rules.find(row=>row.role==='default-feature-short-document-binding'),docQuotes=inventory.members.find(member=>member.source===docBinding.source).quotes.filter(row=>row.span.start>=docBinding.span.start&&row.span.end<=docBinding.span.end&&text(row.syntax)==='#h');
  if(docQuotes.length!==1)throw new TypeError('Clap original short-document quote is not unique');
  const templates={impl:template('gen_for_enum'),literal:template('lits'),variants:template('gen_value_variants'),possible:template('gen_to_possible_value'),method:template('method'),fields:template('field_methods'),deprecations:template('deprecations'),derivedName:template('translate',value=>value==='#s'),docLiteral:docQuotes[0]};
  const plan={rules:freeze(rules),inventory,definitions:freeze(definitions),templates,documentFeatures:originalClapDocumentFeaturePlan(dependencies)};cache.set(dependencies,plan);return plan;
}

// Translate the actual Heck word-mode algorithm on its bounded ASCII input.
// Unicode identifier case mapping requires its own scalar/category proof.
function kebab(value) {
  const output=[];
  for(const word of value.split(/[^A-Za-z0-9]/u)) {
    if(!word)continue;let begin=0,mode='boundary';
    for(let at=0;at<word.length;at++) {
      const c=word[at],next=word[at+1];if(next===undefined){output.push(word.slice(begin).toLowerCase());break;}
      const nextMode=/[a-z]/u.test(c)?'lower':/[A-Z]/u.test(c)?'upper':mode;
      if(nextMode==='lower'&&/[A-Z]/u.test(next)){output.push(word.slice(begin,at+1).toLowerCase());begin=at+1;mode='boundary';}
      else if(mode==='upper'&&/[A-Z]/u.test(c)&&/[a-z]/u.test(next)){output.push(word.slice(begin,at).toLowerCase());begin=at;mode='boundary';}
      else mode=nextMode;
    }
  }
  return output.join('-');
}
const ident=node=>node?.kind==='token'&&node.type==='ident'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.text)&&isPlainSourceIdentifier(node.text);
function boundedInput(source) {
  if(typeof source!=='string'||Buffer.byteLength(source)>128000)throw new TypeError('Clap input exceeds original enum grammar budget');
  const trees=originalMacroTrees(source),at=trees.findIndex(node=>node.text==='enum'),name=trees[at+1],body=trees[at+2];
  if(at<0||!ident(name)||body?.kind!=='group'||body.delimiter!=='{'||at+3!==trees.length)throw new TypeError('Clap ValueEnum route requires an original nongeneric unit enum');
  const ignoredContainerAttributes=[];let header=0;
  while(trees[header]?.text==='#'&&trees[header+1]?.kind==='group'&&trees[header+1].delimiter==='[') {
    const attribute=trees[header+1],path=attribute.children[0];
    if(path?.kind!=='token'||!isPlainSourceIdentifier(path.text)||['cfg','cfg_attr','clap','structopt','command','group','arg','value'].includes(path.text))throw new TypeError('Clap container attributes require an independent original input/output route');
    ignoredContainerAttributes.push({path:path.text,span:attribute.span,syntax:attribute.children});header+=2;
  }
  if(trees[header]?.text==='pub'){header++;if(trees[header]?.kind==='group'&&trees[header].delimiter==='('){if(trees[header].children.some(node=>node.kind!=='token'||['!','#'].includes(node.text)))throw new TypeError('Clap visibility needs an independent original input route');header++;}}
  if(header!==at)throw new TypeError('Clap ValueEnum route requires its original enum declaration header');
  const variants=[],nodes=body.children;let index=0;
  while(index<nodes.length) {
    const helpers=[],attributes=[],ignoredAttributes=[];
    while(nodes[index]?.text==='#'&&nodes[index+1]?.kind==='group'&&nodes[index+1].delimiter==='[') {
      const attr=nodes[index+1],path=attr.children[0],group=attr.children[1];
      attributes.push(attr);
      if(path?.kind!=='token'||!isPlainSourceIdentifier(path.text)||['cfg','cfg_attr'].includes(path.text))throw new TypeError('Clap variant configuration requires an independent original input route');
      if(path.text!=='value') {
        if(['clap','structopt','command','group','arg'].includes(path.text))throw new TypeError('Clap variant attribute needs an independent original output route');
        ignoredAttributes.push({path:path.text,span:attr.span,syntax:attr.children});index+=2;continue;
      }
      if(group?.kind!=='group'||group.delimiter!=='('||attr.children.length!==2)throw new TypeError('Clap variant attribute needs an independent original output route');
      let helper=0;while(helper<group.children.length) {
        const key=group.children[helper++],eq=group.children[helper++],literal=group.children[helper++];let value;
        if(literal?.type!=='string'||!literal.text.startsWith('"'))throw new TypeError('Clap helper requires an actual original string literal');
        for(let escape=1;escape<literal.text.length-1;escape++)if(literal.text[escape]==='\\'&&!['"','\\','n','r','t'].includes(literal.text[++escape]))throw new TypeError('Clap literal escape requires an independent Rust literal profile');
        try{value=JSON.parse(literal?.text);}catch{throw new TypeError('Clap helper requires an original bounded string literal');}
        if(!['name','alias'].includes(key?.text)||eq?.text!=='='||typeof value!=='string'||value.length>4096||helpers.some(row=>row.key==='name'&&key.text==='name'))throw new TypeError('Clap helper requires distinct name and ordered alias strings');
        helpers.push({key:key.text,value,span:literal.span});
        if(helper<group.children.length&&group.children[helper++]?.text!==',')throw new TypeError('Clap helper expression is outside the literal route');
      }
      if(!helpers.length)throw new TypeError('Clap helper requires a nonempty original list');index+=2;
    }
    const variant=nodes[index++];if(!ident(variant)||variants.some(row=>row.name===variant.text))throw new TypeError('Clap route requires distinct ASCII unit variant identifiers');
    variants.push({name:variant.text,span:variant.span,helpers,ignoredAttributes,documentation:originalClapValueDocuments(attributes),canonicalName:helpers.find(row=>row.key==='name')?.value??kebab(variant.text),aliases:helpers.filter(row=>row.key==='alias').map(row=>row.value)});
    if(index<nodes.length&&nodes[index++]?.text!==',')throw new TypeError('Clap route excludes fields and discriminants');
  }
  if(!variants.length||variants.length>128)throw new TypeError('Clap route requires one to 128 bounded unit variants');
  return {name:name.text,span:name.span,ignoredContainerAttributes,variants};
}
export function proveClapValueEnumSourceOutput({dependencies,source}={}) {
  if(!isDeriveDependencyProof(dependencies))throw new TypeError('Clap output requires sealed original source dependencies');
  const input=boundedInput(source),plan=sourcePlan(dependencies),compiler=createQuoteFragmentCompiler(plan.inventory),bindings=[];
  const provenance=role=>({role,inputSha256:hash(source),dependenciesDigest:dependencies.digest});
  const leaf=(value,type,role)=>compiler.token(value,type,provenance(role));
  const sequence=(values,role)=>compiler.sequence(values,provenance(role));
  const inst=(template,values,role)=>{bindings.push({role,templateDigest:template.digest,bindings:Object.keys(values)});return compiler.instantiate(template,new Map(Object.entries(values)),provenance(role));};
  const emptyDeprecations=()=>inst(plan.templates.deprecations,{deprecations:sequence([],'no old Clap/id/arg attributes')},'empty original deprecation sequence');
  const literals=input.variants.map(variant=>{
    const methods=variant.helpers.filter(helper=>helper.key==='alias').map(helper=>inst(plan.templates.method,{name:leaf('alias','ident','actual original helper key'),args:leaf(JSON.stringify(helper.value),'string','original helper literal Expr')},'Method::to_tokens'));
    const docMethods=variant.documentation.short===null?[]:[inst(plan.templates.method,{name:leaf('help','ident','original value document short_name'),args:inst(plan.templates.docLiteral,{h:leaf(JSON.stringify(variant.documentation.short),'string','original formatted short help')},'original default-feature document literal quote')},'original value document Method::to_tokens')];
    const fields=inst(plan.templates.fields,{doc_comment:sequence(docMethods,'original default-feature value documentation'),methods:sequence(methods,'source-ordered aliases')},'Item::field_methods');
    const literal=leaf(JSON.stringify(variant.canonicalName),'string','Name::Assigned literal or actual Heck ASCII case output');
    const name=variant.helpers.some(helper=>helper.key==='name')?literal:inst(plan.templates.derivedName,{s:literal},'Name::Derived Kebab quote');
    return inst(plan.templates.literal,{deprecations:emptyDeprecations(),name,fields},'lits source unit variant');
  });
  const variants=input.variants.map(variant=>leaf(variant.name,'ident','unchanged original unit variant'));
  const valueVariants=inst(plan.templates.variants,{lit:sequence(variants,'lits.iter().map(|l| &l.1)')},'gen_value_variants');
  const possible=inst(plan.templates.possible,{deprecations:emptyDeprecations(),lit:sequence(literals,'lits.iter().cloned().unzip literals'),variant:sequence(variants,'lits.iter().cloned().unzip identifiers')},'gen_to_possible_value');
  const output=compiler.roundTrip(inst(plan.templates.impl,{item_name:leaf(input.name,'ident','unchanged original enum ident'),value_variants:valueVariants,to_possible_value:possible},'gen_for_enum one original trait impl'));
  const observation=inspectQuoteFragment(output),body=output.syntax.find(node=>node.tag==='group'&&node.delimiter==='{');
  if(observation.bangCalls.length||observation.definitions.length||observation.macroExports.length||output.syntax.filter(node=>node.text==='impl').length!==1||body?.nodes.filter(node=>node.text==='fn').length!==2||observation.attributes.some(attr=>!['allow','automatically_derived'].includes(attr.name)))throw new TypeError('Clap output failed original one-impl/two-method confinement');
  const evidence={schema:'original-clap-value-enum-source-output-v1',dependenciesDigest:dependencies.digest,inputSha256:hash(source),input,
    inventoryDigest:plan.inventory.digest,inventoryCounts:{sourceMembers:plan.inventory.sourceMemberCount,quoteGroups:plan.inventory.quoteCount},originalRules:plan.rules,originalDefinitions:plan.definitions,documentFeatures:plan.documentFeatures,bindingProofs:bindings,
    syntax:output.syntax,outputGrammarDigest:observation.fragmentSha256,semanticSyntaxRoundTrip:true,outputObservation:observation,
    selectedSuccessOutputComplete:true,selectedOutputKind:'one trait impl containing two methods',generatedAttributeOwnersResolved:false,errorBranchComplete:false,
    generatedImplBehavior:false,obligations:['original context must resolve generated builtin attribute owners','generator error stream has independent obligations','ValueEnum method execution and full runtime parity remain unimplemented']};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{dependencies,source});return proof;
}
export const isClapValueEnumSourceOutput=value=>!!value&&proofs.has(value);
export function assertClapValueEnumSourceOutput(proof,{dependencies,source}={}) {
  const state=proofs.get(proof);if(!state||state.dependencies!==dependencies||state.source!==source)throw new TypeError('Unsealed or mismatched original Clap output');return proof;
}
// Shared original-source readers; these confer no derive certificate authority.
export {rule as originalClapSourceRule,definition as originalClapSourceFunction,text as originalClapQuoteText,kebab as originalClapAsciiKebab};
