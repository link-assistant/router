// Original condition clauses become checked common control nodes. This pin
// records compiler input and source coordinates; it grants no ownership,
// namespace, const, Drop or runtime parity authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {requireParserEdition} from '../cargo-edition-context.mjs';
const root=new URL('../source-profiles/let-chains/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
if(manifest.rust!=='1.89.0'||manifest.edition!=='2024'||manifest.differentEditionAdmission!==false)throw new Error('let-chain syntax profile differs from its pinned Rust 2024 domain');
for(const pin of manifest.sources){
  const compressed=readFileSync(new URL(pin.file,root)),raw=gunzipSync(compressed,{maxOutputLength:128000});
  if(hash(compressed)!==pin.compressedSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==pin.gitBlobSha)throw new Error('let-chain compiler input differs from full pinned original');
}
for(const pin of manifest.licenses){const raw=readFileSync(new URL(pin.file,root));if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)throw new Error('let-chain original source license differs');}
export const LET_CHAIN_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,edition:manifest.edition,differentEditionAdmission:false,limits:Object.freeze({...manifest.limits}),constEligible:false,namespaceComplete:false,dropSemanticsComplete:false});
const opening=new Map([['(',')'],['[',']'],['{','}']]);
const inputs=()=>manifest.sources.map(({url,sha256})=>({url,sha256}));
const spanOf=tokens=>({start:tokens[0].start,end:tokens.at(-1).end});
export function hasSourceLetChain(cursor){
  const stack=[];let letClause=false,and=false,pattern=false,clauseStart=cursor.index+1;
  for(let i=cursor.index+1;i<cursor.tokens.length;i++){
    const token=cursor.tokens[i];
    if(token.kind==='eof')break;
    if(!stack.length&&i===clauseStart&&token.kind==='identifier'&&token.value==='let'){letClause=true;pattern=true;}
    if(token.kind!=='punct')continue;
    if(!stack.length&&token.value==='{'&&!pattern)break;
    if(!stack.length&&token.value==='=')pattern=false;
    if(!stack.length&&token.value==='&&'){and=true;pattern=false;clauseStart=i+1;}
    if(opening.has(token.value))stack.push(opening.get(token.value));
    else if(stack.at(-1)===token.value)stack.pop();
  }
  return letClause&&and;
}
function clauseEnd(cursor,first){
  const stack=[];
  for(let i=cursor.index;i<cursor.tokens.length;i++){
    const token=cursor.tokens[i];
    if(i-cursor.index>manifest.limits.conditionTokens)throw unsupported('let-chain token budget','requires a bounded original condition',first);
    if(token.kind==='eof')throw unsupported('let-chain condition','requires its original body delimiter',first);
    if(token.kind!=='punct')continue;
    if(!stack.length&&['&&','{'].includes(token.value))return i;
    if(!stack.length&&token.value==='||')throw unsupported('let-chain disjunction','Rust let clauses require an && chain; a boolean disjunction must be inside its own parentheses',token);
    if(opening.has(token.value))stack.push(opening.get(token.value));
    else if(stack.at(-1)===token.value)stack.pop();
    else if([')',']','}'].includes(token.value))throw unsupported('let-chain delimiter','requires a complete original condition clause',token);
  }
  throw unsupported('let-chain condition','requires its original body delimiter',first);
}
export function parseSourceLetChain(parser,path,kind){
  const cursor=parser.cursor,begin=cursor.index,first=cursor.next(),clauses=[];
  if(first.value!==kind)throw new Error('let-chain parser entered at a different condition owner');
  const editionInput=requireParserEdition(parser,'2024',{start:first.start,end:first.end});
  for(;;){
    if(clauses.length>=manifest.limits.clauses)throw unsupported('let-chain clause budget','requires a bounded original condition',first);
    const clauseStart=cursor.index,letToken=cursor.eat('let');
    const pattern=letToken?parser.controlPattern(path,letToken):null;
    if(letToken)cursor.expect('=','let-chain condition');
    const subjectStart=cursor.index,stop=clauseEnd(cursor,first),endToken=cursor.tokens[stop];
    if(stop===subjectStart)throw unsupported('let-chain clause expression','requires a nonempty original scalar or immutable subject; unparenthesized block subjects need a separate grammar',endToken);
    class ClauseCursor extends TokenCursor{
      peek(offset=0){return this.index+offset>=stop?{kind:'eof',value:'',start:endToken.start,end:endToken.start}:super.peek(offset);}
    }
    const bounded=new ClauseCursor(cursor.tokens,cursor.language);bounded.index=subjectStart;parser.cursor=bounded;
    let subject;
    try{subject=parser.expr(path,{noStruct:true});if(bounded.index!==stop)throw unsupported('let-chain clause suffix','requires the complete original expression',bounded.peek());}
    finally{parser.cursor=cursor;cursor.index=bounded.index;}
    clauses.push({kind:letToken?'let':'bool',...(pattern?{pattern}:{}),subject,span:spanOf(cursor.tokens.slice(clauseStart,stop)),subjectSyntaxSpan:spanOf(cursor.tokens.slice(subjectStart,stop))});
    if(!cursor.eat('&&'))break;
  }
  const tokens=cursor.tokens.slice(begin,cursor.index),conditionSpan={start:first.start,end:cursor.peek().start};
  if(tokens.length>manifest.limits.conditionTokens||conditionSpan.end-conditionSpan.start>manifest.limits.conditionCharacters)throw unsupported('let-chain condition budget','requires a bounded original source condition',conditionSpan);
  if(clauses.length<2||!clauses.some(clause=>clause.kind==='let'))throw new Error('let-chain parser requires an actual compound let condition');
  const proof={profile:manifest.profile,edition:manifest.edition,differentEditionAdmission:false,editionInput,owner:kind,condition:{span:conditionSpan},clauses:clauses.map(clause=>({kind:clause.kind,span:{...clause.span},subjectSyntaxSpan:{...clause.subjectSyntaxSpan},...(clause.pattern?{patternSpan:{...clause.pattern.span}}:{})})),tokens:tokens.map(token=>({kind:token.kind,value:token.value,raw:token.raw??token.value,span:{start:token.start,end:token.end}})),sourceInputs:inputs(),evaluationOrder:[...manifest.evaluationOrder],constEligible:false,namespaceComplete:false,dropSemanticsComplete:false};
  return {k:'routerLetChainCondition',clauses,sourceCondition:proof,span:conditionSpan};
}
export function requireSourceLetChain(node){
  const proof=node.patternControl?.sourceCondition,validSpan=span=>span&&Number.isSafeInteger(span.start)&&Number.isSafeInteger(span.end)&&span.start>=0&&span.end>=span.start;
  const edition=proof?.editionInput,validDigest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
  const validEdition=edition?.schema==='original-cargo-edition-context-v1'&&edition.status==='explicit-package-edition'&&edition.edition===manifest.edition&&edition.sourceCoordinateUnit==='utf16'&&edition.completeTomlValidation===false&&edition.workspaceInheritanceAdmitted===false&&typeof edition.sourcePath==='string'&&edition.sourcePath.length>0&&Number.isSafeInteger(edition.sourceBytes)&&edition.sourceBytes>0&&edition.sourceBytes<=1_048_576&&validDigest(edition.sourceSha256)&&edition.declaration?.edition===manifest.edition&&validDigest(edition.declaration.sha256)&&validSpan(edition.declaration.originalSpan)&&edition.declaration.originalSpan.end>edition.declaration.originalSpan.start&&edition.declaration.originalSpan.end<=edition.sourceBytes;
  if(!validEdition||node.patternControl?.kind!=='let-chain'||proof?.profile!==manifest.profile||proof.edition!==manifest.edition||proof.differentEditionAdmission!==false||!['if','while'].includes(proof.owner)||proof.constEligible!==false||proof.namespaceComplete!==false||proof.dropSemanticsComplete!==false||!validSpan(proof.condition?.span)||proof.condition.span.end-proof.condition.span.start>manifest.limits.conditionCharacters||!Array.isArray(proof.clauses)||proof.clauses.length<2||proof.clauses.length>manifest.limits.clauses||!proof.clauses.some(clause=>clause.kind==='let')||!isDeepStrictEqual(proof.sourceInputs,inputs())||!isDeepStrictEqual(proof.evaluationOrder,manifest.evaluationOrder)||!Array.isArray(proof.tokens)||proof.tokens.length>manifest.limits.conditionTokens||proof.tokens[0]?.value!==proof.owner)throw new Error('missing actual checked let-chain source condition');
  let previous=proof.condition.span.start;
  for(const token of proof.tokens){if(!['identifier','punct','number','string','rustChar','rustFloat','macro'].includes(token.kind)||typeof token.value!=='string'||typeof token.raw!=='string'||!validSpan(token.span)||token.span.start<previous||token.span.end>proof.condition.span.end)throw new Error('missing actual checked let-chain source tokens');previous=token.span.end;}
  previous=proof.condition.span.start;
  for(const clause of proof.clauses){if(!['let','bool'].includes(clause.kind)||!validSpan(clause.span)||!validSpan(clause.subjectSyntaxSpan)||clause.span.start<previous||clause.span.end>proof.condition.span.end||clause.subjectSyntaxSpan.start<clause.span.start||clause.subjectSyntaxSpan.end>clause.span.end||clause.kind==='let'&&(!validSpan(clause.patternSpan)||clause.patternSpan.start<clause.span.start||clause.patternSpan.end>clause.subjectSyntaxSpan.start))throw new Error('missing actual checked let-chain source clauses');previous=clause.span.end;}
}
