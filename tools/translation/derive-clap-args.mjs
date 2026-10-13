import {createHash} from 'node:crypto';
import {deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {inventoryDeriveQuoteMeta,createQuoteFragmentCompiler,inspectQuoteFragment} from './derive-quote-meta.mjs';
import {originalClapSourceRule as rule,originalClapSourceFunction as definition,originalClapQuoteText as quoteText,originalClapAsciiKebab as kebab} from './derive-clap-value-enum.mjs';
import {rustTokens,sourceItems} from './rust-structure.mjs';
import {originalMacroTrees,originalMacroInvocation} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeNamespaceObservation} from './declarative-token-macros.mjs';
import {boundedClapArgHelper} from './derive-clap-helpers.mjs';
import {originalClapDocumentFeaturePlan,originalClapValueDocuments} from './derive-clap-documentation.mjs';
import {proveConcatLiteralSourceExpansion} from './derive-clap-concat.mjs';
import {isPlainSourceIdentifier} from './module-paths.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const plans=new WeakMap(),proofs=new WeakMap();
const ident=node=>node?.kind==='token'&&node.type==='ident'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.text)&&isPlainSourceIdentifier(node.text);

function sourcePlan(dependencies) {
  if(plans.has(dependencies))return plans.get(dependencies);
  const path='src/derives/args.rs',item='src/item.rs',rules=[
    ...rule(dependencies,'clap','src/lib.rs','#[cfg(feature = "derive")] #[doc(hidden)] pub use clap_derive::{self, Args, Parser, Subcommand, ValueEnum};','actual-args-feature-reexport'),
    ...rule(dependencies,'clap','src/lib.rs','pub use clap_builder::*;','actual-builder-macro-reexport'),
    ...rule(dependencies,'clap_derive','src/lib.rs','#[proc_macro_derive(Args, attributes(clap, command, arg, group))] pub fn args(input: TokenStream) -> TokenStream { let input: DeriveInput = parse_macro_input!(input); derives::derive_args(&input)','args-registration-entry'),
    ...rule(dependencies,'clap_derive','src/derives/mod.rs','pub(crate) use args::derive_args;','args-entry-owner'),
    ...rule(dependencies,'clap_derive',item,'let kind = Sp::new(Kind::Arg(ty), span);','field-kind-arg'),
    ...rule(dependencies,'clap_derive',item,'let group_id = Name::Derived(ident);','unchanged-group-id'),
    ...rule(dependencies,'clap_derive',item,'skip_group: false,','default-group-present'),
    ...rule(dependencies,'clap_derive',item,'if name == "short" || name == "long" { self.is_positional = false; }','long-nonpositional-binding'),
    ...rule(dependencies,'clap_derive',item,'pub(crate) fn value_name(&self) -> TokenStream { self.name.clone().translate(CasingStyle::ScreamingSnake) }','value-name-casing'),
    ...rule(dependencies,'heck','src/shouty_snake.rs','transform(self.0.as_ref(), uppercase, |f| write!(f, "_"), f)','ascii-shouty-snake-sink'),
    ...rule(dependencies,'heck','src/lib.rs','fn uppercase(s: &str, f: &mut fmt::Formatter) -> fmt::Result { for c in s.chars() { write!(f, "{}", c.to_uppercase())?; } Ok(()) }','ascii-uppercase-sink'),
    ...rule(dependencies,'clap_derive','src/attr.rs','else if attr.path().is_ident("arg") { Sp::new(AttrKind::Arg, attr.path().span()) }','arg-helper-owner'),
    ...rule(dependencies,'clap_derive',item,'Some(MagicAttrName::Long) if attr.value.is_none() => { assert_attr_kind(attr, &[AttrKind::Arg])?; self.push_method(*attr.kind.get(), attr.name.clone(), self.name.clone().translate(*self.casing)); }','bare-long-binding'),
    ...rule(dependencies,'clap_derive','src/utils/doc_comments.rs','fn remove_period(mut s: String) -> String { if s.ends_with(\'.\') && !s.ends_with("..") { s.pop(); } s }','plain-doc-period-removal'),
    ...rule(dependencies,'clap_derive',item,'let long = Method::new(long_name, long_help.map(|h| quote!(#h)).unwrap_or_else(|| quote!(None)), ); self.doc_comment.push(long);','absent-long-doc-method-binding'),
    ...rule(dependencies,'clap_derive',item,'Method::new(short_name, short_help.map(|h| quote!(#h)).unwrap_or_else(|| quote!(None)), )','short-doc-method-binding'),
    ...rule(dependencies,'clap_derive',path,'let convert_type = inner_type(&field.ty);','parser-inner-type'),
    ...rule(dependencies,'clap_derive',path,'Ty::Option => { quote_spanned! { ty.span()=> .value_name(#value_name) #value_parser #action } }','option-implicit-branch'),
    ...rule(dependencies,'clap_derive',item,'Some(MagicAttrName::DefaultValueT) => {','typed-default-branch-start'),
    ...rule(dependencies,'clap_derive',item,'Some(MagicAttrName::DefaultValuesT) => {','typed-default-branch-end'),
    ...rule(dependencies,'clap_derive',item,'if is_simple_ty(field_type, "bool") { quote_spanned! { span=> clap::ArgAction::SetTrue } }','bool-set-true-action'),
    ...rule(dependencies,'clap_derive',item,'if is_simple_ty(field_type, "bool") { quote_spanned! { span=> clap::ArgAction::SetTrue } } else { quote_spanned! { span=> clap::ArgAction::Set } }','scalar-action-branch'),
    ...rule(dependencies,'clap_derive',path,'Ty::Vec => { if item.is_positional() { quote_spanned! { ty.span()=> .value_name(#value_name) .num_args(1..) #value_parser #action } } else { quote_spanned! { ty.span()=> .value_name(#value_name) #value_parser #action } } }','vec-implicit-branch'),
    ...rule(dependencies,'clap_derive',item,'Ty::Option | Ty::OptionOption => { quote_spanned! { span=> clap::ArgAction::Set } }','option-set-action-branch'),
    ...rule(dependencies,'clap_derive','src/utils/ty.rs','Ty::Vec | Ty::Option => sub_type(field_ty).unwrap_or(field_ty),','vec-option-inner-type'),
    ...rule(dependencies,'clap_builder','src/builder/value_parser.rs','#[macro_export] macro_rules! value_parser { ($name:ty) => {{ use $crate::builder::impl_prelude::*; let auto = $crate::builder::_infer_ValueParser_for::<$name>::new(); (&&&&&&auto).value_parser() }}; }','original-value-parser-expression'),
  ];
  // The required selector belongs to the original Args generator, not Item.
  rules.push(...rule(dependencies,'clap_derive',path,'let required = item.find_default_method().is_none();','scalar-default-required-selector'));
  const typedStart=rules.find(row=>row.role==='typed-default-branch-start'),typedEnd=rules.find(row=>row.role==='typed-default-branch-end'),typedSource=deriveDependencySource(dependencies,'clap_derive',item);rules.push({role:'typed-default-selected-branch',package:'clap_derive',source:item,sourceSha256:typedSource.sha256,span:{start:typedStart.span.start,end:typedEnd.span.start},sha256:hash(typedSource.source.slice(typedStart.span.start,typedEnd.span.start))});
  const inventory=inventoryDeriveQuoteMeta(dependencies,'clap_derive'),definitions={};
  for(const name of ['derive_args','gen_for_struct','gen_augment','gen_constructor','gen_updater','gen_parsers'])definitions[name]=definition(dependencies,path,name);
  for(const name of ['from_args_struct','from_args_field','initial_top_level_methods','final_top_level_methods','field_methods','deprecations','group_methods','default_value_parser','default_action','value_parser','action','push_doc_comment','push_attrs','push_method_','find_default_method'])definitions[name]=definition(dependencies,item,name);
  definitions.attributeParser=definition(dependencies,'src/attr.rs','parse',value=>value.includes('let name: Ident = input.parse()?'));
  for(const name of ['extract_doc_comment','format_doc_comment','remove_period','parse_markdown','merge_lines'])definitions[name]=definition(dependencies,'src/utils/doc_comments.rs',name);
  for(const name of ['from_syn_ty','inner_type','sub_type','only_last_segment','subty_if','subty_if_name','is_generic_ty','only_one','is_simple_ty'])definitions[name]=definition(dependencies,'src/utils/ty.rs',name);
  definitions.pushAttrs=definitions.push_attrs;
  definitions.method=definition(dependencies,item,'to_tokens',value=>value.includes('let Self { name, args }'));
  definitions.name=definition(dependencies,item,'to_tokens',value=>value.includes('Self::Assigned(t)'));
  definitions.rawAllow=definition(dependencies,path,'raw_deprecated',value=>value.includes('not(feature'));
  definitions.rawEmpty=definition(dependencies,path,'raw_deprecated',value=>!value.includes('not(feature'));
  const select=(name,predicate,role=null)=>{const def=definitions[name],bound=role?rules.find(rule=>rule.role===role):def,rows=inventory.members.find(member=>member.source===def.source).quotes.filter(row=>row.span.start>=bound.span.start&&row.span.end<=bound.span.end&&predicate(quoteText(row.syntax)));if(rows.length!==1)throw new TypeError('Args original quote selection is not unique: '+name+' ('+rows.length+')');return rows[0];};
  const templates={
    impl:select('gen_for_struct',s=>s.includes('clap :: FromArgMatches')),groupId:select('gen_for_struct',s=>s.startsWith('Some')),
    ctor:select('gen_constructor',s=>s.includes('#fields')),updater:select('gen_updater',s=>s.includes('#genned_fields')),
    access:select('gen_updater',s=>s.includes('& mut self')),getMany:select('gen_parsers',s=>s.startsWith('remove_many')),getOne:select('gen_parsers',s=>s.startsWith('remove_one')),
    vecValue:select('gen_parsers',s=>s.startsWith('#arg_matches . #get_many')&&!s.includes('contains_id')),optionValue:select('gen_parsers',s=>s==='#arg_matches . #get_one (#id)'),
    scalarValue:select('gen_parsers',s=>s.startsWith('#arg_matches . #get_one')&&s.includes('concat !')),
    ctorField:select('gen_parsers',s=>s==='#field_name : #field_value'),updateField:select('gen_parsers',s=>s.startsWith('if #arg_matches . contains_id')&&s.includes('#access')),
    augment:select('gen_augment',s=>s.includes('#group_app_methods')),arg:select('gen_augment',s=>s.includes('clap :: Arg :: new')),
    implicitOption:select('gen_augment',s=>s.includes('. value_name'),'option-implicit-branch'),
    implicitScalar:select('gen_augment',s=>s.includes('#required')&&s.includes('takes_values')),
    implicitVec:select('gen_augment',s=>s.includes('. value_name')&&!s.includes('num_args'),'vec-implicit-branch'),
    implicitPositional:select('gen_augment',s=>s.includes('num_args'),'vec-implicit-branch'),override:select('gen_augment',s=>s==='. required (false)'),
    members:select('gen_augment',s=>s.includes('#literal_group_members_len')),group:select('gen_augment',s=>s.includes('clap :: ArgGroup')),
    valueParser:select('default_value_parser',()=>true),append:select('default_action',s=>s==='clap :: ArgAction :: Append'),set:select('default_action',s=>s==='clap :: ArgAction :: Set','option-set-action-branch'),
    setTrue:select('default_action',s=>s==='clap :: ArgAction :: SetTrue','bool-set-true-action'),
    scalarSet:select('default_action',s=>s==='clap :: ArgAction :: Set','scalar-action-branch'),
    typedExpr:select('pushAttrs',s=>s==='#expr','typed-default-selected-branch'),typedDefault:select('pushAttrs',s=>s.includes('ToString :: to_string'),'typed-default-selected-branch'),
    method:select('method',()=>true),name:select('name',s=>s==='#s'),initial:select('initial_top_level_methods',()=>true),final:select('final_top_level_methods',()=>true),
    docNone:select('push_doc_comment',s=>s==='None','absent-long-doc-method-binding'),docLiteral:select('push_doc_comment',s=>s==='#h','short-doc-method-binding'),docLongLiteral:select('push_doc_comment',s=>s==='#h','absent-long-doc-method-binding'),
    fields:select('field_methods',()=>true),deprecations:select('deprecations',()=>true),groupMethods:select('group_methods',()=>true),rawAllow:select('rawAllow',()=>true),rawEmpty:select('rawEmpty',()=>true),
  };
  const original=deriveDependencySource(dependencies,'clap_builder','src/builder/value_parser.rs'),macro=sourceItems(original.source).find(item=>item.term==='macro_rules!'&&item.name==='value_parser');
  const compiled=compileDeclarativeMacro(original.source.slice(macro.start,macro.end),{name:'value_parser',owner:['clap_builder']}),expansion=expandDeclarativeMacro(compiled,originalMacroInvocation('clap::value_parser!(String)').trees),observation=declarativeNamespaceObservation(expansion);
  const inspect=nodes=>{for(const node of nodes){if(node.kind==='token'&&['#','!','macro_rules','macro_export'].includes(node.text))throw new TypeError('Original value_parser expression emits namespace-affecting macro syntax');if(node.kind==='group')inspect(node.children);if(node.kind==='fragment')inspect(node.trees);}};inspect(expansion.trees);
  if(expansion.trees.length!==1||expansion.trees[0].kind!=='group'||expansion.trees[0].delimiter!=='{'||observation.declarations.length)throw new TypeError('Original value_parser expansion lacks its expression block sink');
  const expandValueParser=type=>{const expansion=expandDeclarativeMacro(compiled,originalMacroInvocation('clap::value_parser!('+type+')').trees),observation=declarativeNamespaceObservation(expansion);inspect(expansion.trees);if(expansion.trees.length!==1||expansion.trees[0].kind!=='group'||expansion.trees[0].delimiter!=='{'||observation.declarations.length)throw new TypeError('Original typed value_parser lacks its expression sink');return freeze({type,source:original.path,sourceSha256:original.sha256,span:{start:macro.start,end:macro.end},expansionDigest:expansion.digest,observation,trees:expansion.trees});};
  const plan={inventory,definitions:freeze(definitions),rules:freeze(rules),templates,expandValueParser,documentFeatures:originalClapDocumentFeaturePlan(dependencies),valueParserExpansion:freeze({source:original.path,sourceSha256:original.sha256,span:{start:macro.start,end:macro.end},expansionDigest:expansion.digest,observation})};plans.set(dependencies,plan);return plan;
}

function docs(source,begin,end) {
  const attributes=originalMacroTrees(source.slice(begin,end)).filter(node=>node.kind==='group'&&node.delimiter==='['),output=originalClapValueDocuments(attributes);output.inputs=output.inputs.map(input=>({...input,span:{start:begin+input.span.start,end:begin+input.span.end}}));
  const rows=output.short===null?[]:[{value:output.short,span:{start:output.inputs[0].span.start,end:output.inputs.at(-1).span.end}}];return {rows,output};
}
function boundedInput(source,span) {
  if(typeof source!=='string'||Buffer.byteLength(source)>256000||!Number.isSafeInteger(span?.start)||!Number.isSafeInteger(span?.end)||span.start<0||span.end<=span.start||span.end>source.length)throw new TypeError('Args output needs bounded complete original source and declaration span');
  const writtenSource=source.slice(span.start,span.end),selected=sourceItems(writtenSource).find(item=>item.start===0&&item.end===writtenSource.length&&item.term==='struct'),item=selected?{...selected,start:span.start,end:span.end}:null;if(!item)throw new TypeError('Args original declaration span changed');
  const written=source.slice(item.start,item.end),trees=originalMacroTrees(written),at=trees.findIndex(node=>node.text==='struct'),name=trees[at+1],body=trees[at+2];
  if(!ident(name)||body?.kind!=='group'||body.delimiter!=='{'||at+3!==trees.length)throw new TypeError('Args route requires an original nongeneric named struct');
  for(let header=0;header<at;header++)if(trees[header]?.text==='#'&&trees[header+1]?.delimiter==='[') {
    const attr=trees[++header],first=attr.children[0];if(!['derive','allow','warn','deny','forbid','must_use'].includes(first?.text)&&!(first?.text==='doc'&&first.sourceFeature==='original-line-doc-comment'))throw new TypeError('Args container attributes require an independent source output route');
  }
  const preceding=rustTokens(source).filter(token=>token.end<=span.start);let docStart=span.start;
  for(let before=preceding.length-1;before>=0;before--){const previous=preceding[before];if(previous?.type!=='comment'||!previous.text.startsWith('///')||source.slice(previous.end,docStart).trim()!=='')break;docStart=previous.start;}
  const containerDocs=docs(source,docStart,span.start+trees[at].span.start),fields=[],nodes=body.children;let index=0,begin=body.span.start+1;
  while(index<nodes.length) {
    const helpers=[];
    while(nodes[index]?.text==='#'&&nodes[index+1]?.kind==='group'&&nodes[index+1].delimiter==='[') {
      const attr=nodes[index+1],group=attr.children[1];
      if(attr.children[0]?.text==='doc'){index+=2;continue;}
      if(attr.children[0]?.text!=='arg'||group?.kind!=='group'||group.delimiter!=='('||attr.children.length!==2)throw new TypeError('Args field attribute lacks its original literal output route');
      const tokens=rustTokens(written.slice(group.span.start+1,group.span.end-1));let helper=0;
      while(helper<tokens.length){const parsed=boundedClapArgHelper(tokens,helper,'field','struct');if(helpers.some(row=>row.key===parsed.key))throw new TypeError('Args duplicate helper needs original validation/error evidence');helpers.push({key:parsed.key,value:parsed.value});helper=parsed.end;if(helper<tokens.length&&tokens[helper++]?.text!==',')throw new TypeError('Args helper separator is unresolved');}
      if(!helpers.length)throw new TypeError('Args helper requires a nonempty original list');index+=2;
    }
    if(nodes[index]?.text==='pub'){index++;if(nodes[index]?.kind==='group'&&nodes[index].delimiter==='(')index++;}
    const field=nodes[index++];if(!ident(field)||fields.some(row=>row.name===field.text)||nodes[index++]?.text!==':')throw new TypeError('Args field requires its unique original identifier');
    const typeStart=index,typeName=nodes[index++];let typeKind=typeName?.text;
    if(['Vec','Option'].includes(typeKind)){if(nodes[index++]?.text!=='<'||nodes[index++]?.text!=='String'||nodes[index++]?.text!=='>')throw new TypeError('Args container field type requires original Vec<String> or Option<String>');}
    else if(['bool','u8','u16','u32','u64','usize','i8','i16','i32','i64','isize'].includes(typeKind))typeKind='Other';else throw new TypeError('Args field type requires its independently proved container or scalar route');
    const typeEnd=nodes[index-1].span.end,doc=docs(written,begin,field.span.start);fields.push({name:field.text,span:field.span,typeKind,typeSource:written.slice(nodes[typeStart].span.start,typeEnd),helpers,docs:doc.rows,documentOutput:doc.output});begin=typeEnd;
    if(index<nodes.length&&nodes[index++]?.text!==',')throw new TypeError('Args field type has unsupported trailing syntax');
  }
  if(!fields.length||fields.length>32)throw new TypeError('Args route requires one to 32 bounded named fields');
  return {name:name.text,span:name.span,fields,containerDocs:containerDocs.rows,containerDocumentOutput:containerDocs.output};
}

export function proveClapArgsSourceOutput({dependencies,source,span}={}) {
  if(!isDeriveDependencyProof(dependencies))throw new TypeError('Args output requires sealed original dependencies');
  const input=boundedInput(source,span),plan=sourcePlan(dependencies),compiler=createQuoteFragmentCompiler(plan.inventory),bindings=[];
  const provenance=role=>({role,inputSourceSha256:hash(source),originalDeclarationSpan:span,dependenciesDigest:dependencies.digest});
  const inst=(template,values,role)=>{bindings.push({role,templateDigest:template.digest,bindings:Object.keys(values)});return compiler.instantiate(template,new Map(Object.entries(values)),provenance(role));};
  const leaf=(value,type,role)=>compiler.token(value,type,provenance(role)),seq=(values,role)=>compiler.sequence(values,provenance(role)),empty=role=>compiler.empty(provenance(role));
  const name=(value,role)=>inst(plan.templates.name,{s:leaf(JSON.stringify(value),'string',role)},'Name::Derived::to_tokens');
  const method=(key,arg)=>inst(plan.templates.method,{name:leaf(key,'ident','original known helper method'),args:arg},'Method::to_tokens');
  const documentation=(doc,key)=>doc.short===null?[]:[method(key,inst(plan.templates.docLiteral,{h:leaf(JSON.stringify(doc.short),'string','original short documentation text')},'original short document literal quote')),method('long_'+key,doc.long===null?inst(plan.templates.docNone,{},'original absent long-help Option quote'):inst(plan.templates.docLongLiteral,{h:leaf(JSON.stringify(doc.long),'string','original long paragraph documentation text')},'original long document literal quote'))];
  const deprecations=()=>inst(plan.templates.deprecations,{deprecations:seq([],'no old Clap helper attributes')},'empty Item::deprecations');
  const fieldNames=input.fields.map(field=>leaf(field.name,'ident','unchanged original named field'));
  const ids=input.fields.map(field=>name(field.name,'original Name::Derived field Id without casing'));
  const argMatches=leaf('__clap_arg_matches','ident','original format_ident call'),app=leaf('__clap_app','ident','original fixed app Ident'),converts=input.fields.map(field=>compiler.sourceType(field.typeKind==='Other'?field.typeSource:'String',provenance('actual selected inner_type of original field')));
  const values=input.fields.map((field,index)=>inst(field.typeKind==='Vec'?plan.templates.vecValue:field.typeKind==='Other'?plan.templates.scalarValue:plan.templates.optionValue,field.typeKind==='Vec'?{arg_matches:argMatches,get_many:inst(plan.templates.getMany,{convert_type:converts[index]},'original remove_many inner type'),id:ids[index]}:{arg_matches:argMatches,get_one:inst(plan.templates.getOne,{convert_type:converts[index]},'original remove_one inner type'),id:ids[index]},'gen_parsers bounded type branch'));
  const constructor=inst(plan.templates.ctor,{fields:seq(input.fields.map((field,index)=>inst(plan.templates.ctorField,{field_name:fieldNames[index],field_value:values[index]},'original constructor field')),'source ordered fields')},'gen_constructor');
  const updater=inst(plan.templates.updater,{genned_fields:seq(input.fields.map((field,index)=>inst(plan.templates.updateField,{arg_matches:argMatches,id:ids[index],access:inst(plan.templates.access,{field_name:fieldNames[index]},'use_self=true original access'),field_name:fieldNames[index],field_value:values[index]},'original conditional updater field')),'source ordered updater fields')},'gen_updater');
  const groupId=name(input.name,'unchanged original group id');
  const groupMethods=inst(plan.templates.groupMethods,{group_methods:seq([],'no original group helpers')},'empty group methods');
  const members=inst(plan.templates.members,{literal_group_members_len:leaf(String(input.fields.length),'number','source field count'),literal_group_members:seq(ids,'source ordered literal ids')},'gen_augment original group members');
  const group=inst(plan.templates.group,{group_id:groupId,group_methods:groupMethods,literal_group_members:members},'original group present');
  function augment(update) {
    const args=input.fields.map((field,index)=>{
      const explicitParser=field.helpers.find(helper=>helper.key==='value_parser'),parser=method('value_parser',explicitParser?compiler.sourceExpression(explicitParser.value,provenance('original explicit parser ExprPath')):inst(plan.templates.valueParser,{inner_type:converts[index]},'original default_value_parser inner type'));
      const actionValue=inst(field.typeKind==='Vec'?plan.templates.append:field.typeSource==='bool'?plan.templates.setTrue:field.typeKind==='Other'?plan.templates.scalarSet:plan.templates.set,{},'original default field action'),action=method('action',actionValue);
      const positional=field.typeKind==='Vec'&&!field.helpers.some(helper=>helper.key==='long');
      const implicit=inst(field.typeKind==='Other'?plan.templates.implicitScalar:positional?plan.templates.implicitPositional:field.typeKind==='Vec'?plan.templates.implicitVec:plan.templates.implicitOption,{value_name:leaf(JSON.stringify(kebab(field.name).replaceAll('-','_').toUpperCase()),'string','original ASCII ScreamingSnake field name'),value_parser:parser,action,...(field.typeKind==='Other'?{required:leaf(String(!field.helpers.some(helper=>['default_value','default_value_t'].includes(helper.key))),'ident','original find_default_method selected result'),action_value:actionValue}:{})},'original implicit field methods');
      const methods=field.helpers.filter(helper=>helper.key!=='value_parser').map(helper=>{
        if(helper.key==='default_value_t')return method('default_value',inst(plan.templates.typedDefault,{ty:compiler.sourceType(field.typeSource,provenance('unchanged original default_value_t field type')),val:inst(plan.templates.typedExpr,{expr:compiler.sourceExpression(helper.value,provenance('original assigned scalar/default Expr'))},'original assigned typed-default value quote')},'original non-enum typed-default OnceLock ToString quote'));
        return method(helper.key,helper.key==='num_args'?compiler.sourceExpression(helper.value,provenance('original closed integer range Expr')):helper.value===null?leaf(JSON.stringify(kebab(field.name)),'string','original bare long casing'):typeof helper.value==='boolean'?leaf(String(helper.value),'ident','original boolean literal Expr'):leaf(JSON.stringify(helper.value),'string','original string literal Expr'));
      });
      const explicit=inst(plan.templates.fields,{doc_comment:seq(documentation(field.documentOutput,'help'),'original field docs'),methods:seq(methods,'source ordered literal/helper expression methods')},'Item::field_methods');
      return inst(plan.templates.arg,{app_var:app,deprecations:update?empty('original update branch'):deprecations(),id:ids[index],implicit_methods:implicit,explicit_methods:explicit,override_methods:update?inst(plan.templates.override,{},'original override_required=true'):empty('no override')},'gen_augment original arg block');
    });
    return inst(plan.templates.augment,{deprecations:update?empty('original update deprecations branch'):deprecations(),app_var:app,group_app_methods:group,args:seq(args,'source ordered argument statements')},'gen_augment '+String(update));
  }
  const augmentation=augment(false),augmentationUpdate=augment(true),initial=inst(plan.templates.initial,{next_display_order:seq([],'none'),next_help_heading:seq([],'none')},'original initial methods');
  const final=inst(plan.templates.final,{doc_comment:seq(documentation(input.containerDocumentOutput,'about'),'original associated container documentation'),methods:seq([],'no container helper methods')},'original final methods');
  const outputs=['rawEmpty','rawAllow'].map(feature=>{
    const output=compiler.roundTrip(inst(plan.templates.impl,{impl_generics:empty('nongeneric original header'),ty_generics:empty('nongeneric type'),where_clause:empty('no where'),item_name:leaf(input.name,'ident','unchanged original struct'),constructor,updater,raw_deprecated:inst(plan.templates[feature],{},'original feature branch'),app_var:app,augmentation,augmentation_update:augmentationUpdate,initial_app_methods:initial,final_app_methods:final,group_id:inst(plan.templates.groupId,{group_id:groupId},'default group id')},'original Args two impl sink'));
    const observation=inspectQuoteFragment(output);
    const scalarFields=input.fields.filter(field=>field.typeKind==='Other'),defaultParsers=input.fields.filter(field=>!field.helpers.some(helper=>helper.key==='value_parser')),concatExpansions=[];
    const walk=nodes=>{for(let at=0;at<nodes.length;at++){if(nodes[at].text==='concat'&&nodes[at+1]?.text==='!'&&nodes[at+2]?.tag==='group')concatExpansions.push(proveConcatLiteralSourceExpansion({dependencies,source:'concat!'+quoteText([nodes[at+2]])}));if(nodes[at].tag==='group')walk(nodes[at].nodes);}};walk(output.syntax);
    if(output.syntax.filter(node=>node.text==='impl').length!==2||observation.definitions.length||observation.macroExports.length||observation.bangCalls.length!==(scalarFields.length+defaultParsers.length)*2||observation.bangCalls.some(call=>!['clap::value_parser','concat'].includes(call.writtenPath.join('::')))||concatExpansions.length!==scalarFields.length*2||observation.attributes.some(attr=>!['allow','automatically_derived'].includes(attr.name)))throw new TypeError('Args output failed original impl/macro sink confinement');
    return {feature,syntax:output.syntax,outputGrammarDigest:observation.fragmentSha256,observation,concatExpansions,semanticSyntaxRoundTrip:true};
  });
  const valueParserExpansions=input.fields.filter(field=>!field.helpers.some(helper=>helper.key==='value_parser')).map(field=>({...plan.expandValueParser(field.typeKind==='Other'?field.typeSource:'String'),field:field.name}));
  const evidence={schema:'original-clap-args-source-output-v1',sourceSha256:hash(source),span,input,dependenciesDigest:dependencies.digest,originalRules:plan.rules,originalDefinitions:plan.definitions,inventoryDigest:plan.inventory.digest,documentFeatures:plan.documentFeatures,bindingProofs:bindings,outputs,valueParserExpansion:plan.valueParserExpansion,valueParserExpansions,
    selectedSuccessOutputComplete:true,featureCases:'both original raw-deprecated output branches retained',generatedAttributeOwnersResolved:false,errorBranchComplete:false,generatedImplBehavior:false,obligations:['original generated builtin attributes and Clap paths need context owner checks','complete joined bang closure and error stream remain independent','Args/FromArgMatches runtime trait methods and full parity remain unimplemented']};
  const result=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(result,{dependencies,source,span:JSON.stringify(span)});return result;
}
export const isClapArgsSourceOutput=value=>!!value&&proofs.has(value);
export function assertClapArgsSourceOutput(proof,{dependencies,source,span}={}) {const state=proofs.get(proof);if(!state||state.dependencies!==dependencies||state.source!==source||state.span!==JSON.stringify(span))throw new TypeError('Unsealed or mismatched original Args output');return proof;}
