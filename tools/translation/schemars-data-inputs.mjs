// Original syntax candidates and source recipes only. The private Schemars
// issuer separately joins the actual module, invocation and helper owners.
import {createHash} from 'node:crypto';
import {builtinDeriveDataInputs} from './builtin-derive-data-inputs.mjs';
import {deriveDependencySource} from './derive-dependencies.mjs';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),plans=new WeakMap();
function rule(origin,written,role){
 const actual=rustTokens(origin.source).filter(row=>row.type!=='comment'),expected=rustTokens(written).filter(row=>row.type!=='comment'),matches=[];
 for(let at=0;at<=actual.length-expected.length;at++)if(expected.every((row,index)=>row.text===actual[at+index].text&&row.type===actual[at+index].type))matches.push({start:actual[at].start,end:actual[at+expected.length-1].end});
 if(matches.length!==1)throw new TypeError('Original Schemars input source rule changed: '+role);const span=matches[0];return{source:origin.path,package:origin.package,sourceSha256:origin.sha256,span,sha256:hash(origin.source.slice(span.start,span.end)),role};
}
export function originalSchemarsDataSourcePlan(dependencies){
 const cached=plans.get(dependencies);if(cached)return cached;
 const attr=deriveDependencySource(dependencies,'syn','src/attr.rs'),derive=deriveDependencySource(dependencies,'syn','src/derive.rs'),data=deriveDependencySource(dependencies,'syn','src/data.rs'),parse=deriveDependencySource(dependencies,'proc-macro2','src/parse.rs'),rules=[
  rule(derive,'let attrs = input.call(Attribute::parse_outer)?; let vis = input.parse::<Visibility>()?;','original DeriveInput outer attributes precede visibility'),
  rule(attr,'pub fn parse_outer(input: ParseStream) -> Result<Vec<Self>> { let mut attrs = Vec::new(); while input.peek(Token![#]) { attrs.push(input.call(parsing::single_parse_outer)?); } Ok(attrs) }','original contiguous outer attribute parser'),
  rule(attr,'pub(crate) fn single_parse_outer(input: ParseStream) -> Result<Attribute> { let content; Ok(Attribute { pound_token: input.parse()?, style: AttrStyle::Outer, bracket_token: bracketed!(content in input), meta: content.parse()?, }) }','original outer attribute style and delimiter construction'),
  rule(parse,'} else if input.starts_with("///") { let input = input.advance(3); if input.starts_with_char(\'/\') { return Err(Reject); } let (input, s) = take_until_newline_or_eof(input); Ok((input, (s, false))) }','original outer line doc lexical branch'),
  rule(parse,'let doc_ident = crate::Ident::_new_fallback(Ident::new_unchecked("doc", fallback_span)); let mut equal = Punct::new(\'=\', Spacing::Alone); equal.set_span(span); let mut literal = crate::Literal::_new_fallback(Literal::string(comment)); literal.set_span(span); let mut bracketed = TokenStreamBuilder::with_capacity(3); bracketed.push_token_from_parser(TokenTree::Ident(doc_ident)); bracketed.push_token_from_parser(TokenTree::Punct(equal)); bracketed.push_token_from_parser(TokenTree::Literal(literal)); let group = Group::new(Delimiter::Bracket, bracketed.build()); let mut group = crate::Group::_new_fallback(group); group.set_span(span); tokens.push_token_from_parser(TokenTree::Group(group));','original line doc NameValue tokens and full comment span'),
  rule(data,'pub fn parse_named(input: ParseStream) -> Result<Self> { let attrs = input.call(Attribute::parse_outer)?; let vis: Visibility = input.parse()?;','original named Field attributes precede visibility'),
  rule(data,'impl ToTokens for Field { fn to_tokens(&self, tokens: &mut TokenStream) { tokens.append_all(&self.attrs); self.vis.to_tokens(tokens); if let Some(ident) = &self.ident { ident.to_tokens(tokens); TokensOrDefault(&self.colon_token).to_tokens(tokens); } self.ty.to_tokens(tokens); if let Some((eq_token, default)) = &self.default { eq_token.to_tokens(tokens); default.to_tokens(tokens); } } }','original Field complete attribute/visibility/name/type token order'),
 ];
 const plan=freezeMacroTree({schema:'original-schemars-data-source-plan-v1',dependenciesDigest:dependencies.digest,rules,namespaceAuthority:false,spanIdentityAuthority:false,generatedImplBehavior:false});plans.set(dependencies,plan);return plan;
}
export function schemarsDeriveDataInputs(options){
 const input=builtinDeriveDataInputs(options),{source}=options,{start}=input.span,items=sourceItems(source).filter(row=>!row.comment),previous=items.filter(row=>row.end<=start).at(-1),prefixStart=previous?.end??0;
 const prefix=rustTokens(source.slice(prefixStart,start));if(prefix.some(row=>row.type!=='comment'))throw new TypeError('Original Schemars leading attributes cross an unresolved item boundary');
 const leading=[];
 for(const token of prefix){if(token.text.startsWith('//!')||token.text.startsWith('/*!')||token.text.startsWith('/**'))throw new TypeError('Original Schemars inner or block documentation requires an independent attachment proof');if(token.text.startsWith('///')&&!token.text.startsWith('////')){const span={start:prefixStart+token.start,end:prefixStart+token.end};const trees=originalMacroTrees(token.text);if(trees.length!==2||trees[0].text!=='#'||trees[1]?.delimiter!=='['||trees[1].children[0]?.text!=='doc')throw new TypeError('Original outer doc token construction is incomplete');leading.push({name:'doc',position:'container',span,source:token.text,sourceFeature:'original-line-doc-comment'});}}
 const attributes=[...leading,...input.attributes],fields=input.fields.map((field,index)=>{const attrs=attributes.filter(row=>row.position==='field'&&row.span.end<=field.fieldDefinitionSpan.start&&(index===0||row.span.start>=input.fields[index-1].fieldDefinitionSpan.end));return{...field,attributes:attrs,synTokenSpan:{start:attrs[0]?.span.start??field.fieldDefinitionSpan.start,end:field.typeSpan.end}};});
 return freezeMacroTree({...input,attributes,fields,leadingDocSpans:leading.map(row=>row.span),namespaceAuthority:false,ownerAuthority:false,generatedImplBehavior:false});
}
