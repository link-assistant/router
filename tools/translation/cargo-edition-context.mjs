// Only an explicit original Cargo [package] edition permits edition-specific
// syntax; workspace inheritance and other unproved layouts remain unknown.
import {createHash} from 'node:crypto';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
const originals=new WeakMap(),parsers=new WeakMap();
const hash=source=>createHash('sha256').update(source).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const limit=1_048_576;
function statements(source){
  const result=[],stack=[];let start=0,clean='',quote=null,triple=false;
  const finish=end=>{if(clean.trim())result.push({start,end,text:clean.trim()});start=end;clean='';};
  for(let at=0;at<source.length;at++){
    const char=source[at];
    if(quote){
      if(quote==='"'&&char==='\\'){clean+=char;if(at+1>=source.length)throw Error('unfinished Cargo string escape');clean+=source[++at];continue;}
      if(char===quote){
        if(triple&&source.slice(at,at+3)===quote.repeat(3)){clean+=quote.repeat(3);at+=2;quote=null;triple=false;continue;}
        if(!triple){clean+=char;quote=null;continue;}
      }
      if(!triple&&(char==='\n'||char==='\r'))throw Error('unfinished Cargo single-line string');
      clean+=char;continue;
    }
    if(char==='"'||char==="'"){
      quote=char;triple=source.slice(at,at+3)===char.repeat(3);
      if(triple){clean+=char.repeat(3);at+=2;}else clean+=char;
      continue;
    }
    if(char==='#'){while(at+1<source.length&&source[at+1]!=='\n')at++;continue;}
    if(char==='['||char==='{'){stack.push(char==='['?']':'}');if(stack.length>128)throw Error('Cargo edition context nesting budget');}
    else if(char===']'||char==='}'){if(stack.pop()!==char)throw Error('Cargo edition context delimiter mismatch');}
    clean+=char;
    if(char==='\n'&&!stack.length)finish(at+1);
  }
  if(quote||stack.length)throw Error('unfinished Cargo edition context');
  finish(source.length);return result;
}
// TOML quoted keys can spell the same package/edition identity. Escaped
// basic keys and unproved key layouts stay unknown rather than hiding a
// duplicate or dotted edition behind a different textual spelling.
function keyPath(text){
  const result=[];let at=0;
  const spaces=()=>{while(at<text.length&&/\s/u.test(text[at]))at++;};
  spaces();
  for(;;){
    const quote=text[at];let value='';
    if(quote==='"'||quote==="'"){
      at++;const start=at;
      while(at<text.length&&text[at]!==quote){if(text[at]==='\n'||text[at]==='\r'||quote==='"'&&text[at]==='\\')return null;at++;}
      if(at>=text.length)return null;value=text.slice(start,at++);
    }else{
      const start=at;while(at<text.length&&/[A-Za-z0-9_-]/u.test(text[at]))at++;
      if(start===at)return null;value=text.slice(start,at);
    }
    result.push(value);spaces();
    if(at===text.length)return result;
    if(text[at++]!=='.')return null;spaces();
  }
}
function assignmentKey(text){
  let quote=null;
  for(let at=0;at<text.length;at++){
    const char=text[at];
    if(quote){if(quote==='"'&&char==='\\')return null;if(char===quote)quote=null;continue;}
    if(char==='"'||char==="'")quote=char;
    else if(char==='=')return keyPath(text.slice(0,at));
  }
  return null;
}
function inspect(source,sourcePath){
  const base={schema:'original-cargo-edition-context-v1',sourcePath,sourceBytes:Buffer.byteLength(source),sourceCoordinateUnit:'utf16',sourceSha256:hash(source),completeTomlValidation:false,workspaceInheritanceAdmitted:false};
  if(base.sourceBytes>limit)return {...base,status:'unknown',edition:null,diagnostic:'Cargo edition context source budget'};
  let rows;try{rows=statements(source);}catch(error){return {...base,status:'unknown',edition:null,diagnostic:error.message};}
  let section=null,packageHeaders=0;const editions=[],unsupportedPackage=[];
  for(const row of rows){
    if(row.text.startsWith('[')){
      const arrayTable=row.text.startsWith('[['),open=arrayTable?2:1,close=arrayTable?']]':']';
      if(!row.text.endsWith(close))return {...base,status:'unknown',edition:null,diagnostic:'unproved Cargo section declaration'};
      const path=keyPath(row.text.slice(open,-open));
      if(!path)return {...base,status:'unknown',edition:null,diagnostic:'unproved original Cargo section key identity'};
      if(path.length===1&&path[0]==='package'){
        if(arrayTable)return {...base,status:'unknown',edition:null,diagnostic:'Cargo package cannot be an array table'};
        section='package';packageHeaders++;
      }else{
        section='other';
        if(path[0]==='package'&&path[1]==='edition')unsupportedPackage.push(row);
      }
      continue;
    }
    const path=assignmentKey(row.text);
    if(!path)return {...base,status:'unknown',edition:null,diagnostic:'unproved original Cargo assignment key identity'};
    if(section===null&&path[0]==='package')unsupportedPackage.push(row);
    if(section!=='package')continue;
    const actual=/^(?:edition|"edition"|'edition')\s*=\s*(?:"(2015|2018|2021|2024)"|'(2015|2018|2021|2024)')$/u.exec(row.text);
    if(actual){
      const raw=source.slice(row.start,row.end),keyAt=raw.indexOf(row.text);
      if(keyAt<0)return {...base,status:'unknown',edition:null,diagnostic:'edition key lacks original Cargo coordinates'};
      editions.push({edition:actual[1]??actual[2],originalSpan:{start:row.start+keyAt,end:row.end},sha256:hash(raw.slice(keyAt))});
    }else if(path[0]==='edition')unsupportedPackage.push(row);
  }
  if(packageHeaders!==1||editions.length!==1||unsupportedPackage.length)return {...base,status:'unknown',edition:null,diagnostic:'requires one explicit original package edition; absent, duplicate, inherited or unproved edition is not admitted'};
  return {...base,status:'explicit-package-edition',edition:editions[0].edition,declaration:editions[0]};
}
export function captureOriginalCargoEdition(source,{sourcePath='Cargo.toml'}={}){
  if(typeof source!=='string'||typeof sourcePath!=='string'||!sourcePath)throw new TypeError('Cargo edition context requires complete original manifest text and path');
  const evidence=freeze(inspect(source,sourcePath)),token=Object.freeze({schema:evidence.schema,kind:'private-original-cargo-edition-context'});
  originals.set(token,{source,evidence});return token;
}
export const originalCargoEditionEvidence=token=>originals.get(token)?.evidence??null;
export function configureRustEditionParser(parser,token){
  if(token!==null&&token!==undefined&&!originals.has(token))throw new TypeError('Rust edition parser requires a private original Cargo context');
  parsers.set(parser,token??null);return parser;
}
export function requireParserEdition(parser,edition,span){
  const record=originals.get(parsers.get(parser));
  if(!record||record.evidence.status!=='explicit-package-edition'||record.evidence.edition!==edition)throw unsupported('source crate edition',`requires actual original Cargo [package] edition ${edition}; an unknown or different source edition remains refused`,span);
  if(hash(record.source)!==record.evidence.sourceSha256)throw new TypeError('Original Cargo edition source changed');
  return record.evidence;
}
