// A byte-oriented serde_json Value decoder; no JavaScript numeric JSON coercion.
import {parseJsonNumber} from './json-numbers.mjs';
import {parseJsonRoundtripNumber} from './json-roundtrip-numbers.mjs';
import {tagged,JSON_NULL,jsonMap,jsonError,ok,err} from './json-values.mjs';
const digit=byte=>byte >= 48 && byte <= 57;
const whitespace=byte=>[32,9,10,13].includes(byte);
class JsonFailure extends Error {constructor(value){super(value.message);this.value=value;}}
class JsonReader {
  constructor(bytes,roundtrip=false) {this.bytes=bytes;this.at=0;this.depth=128;this.roundtrip=roundtrip;}
  peek(){return this.bytes[this.at];}
  eat(){this.at++;}
  next(){return this.at < this.bytes.length?this.bytes[this.at++]:undefined;}
  skip(){while(whitespace(this.peek()))this.eat();}
  fail(message,peek=true) {
    const stop=Math.min(this.bytes.length,this.at+(peek?1:0));let line=1,column=0;
    for(let index=0;index<stop;index++){if(this.bytes[index] === 10){line++;column=0;}else column++;}
    throw new JsonFailure(jsonError(message,line,column,message.startsWith('EOF ')?'Eof':'Syntax'));
  }
  hex() {
    let value=0;for(let index=0;index<4;index++) {
      const byte=this.next();if(byte === undefined)this.fail('EOF while parsing a string',false);
      const digit=byte>=48&&byte<=57?byte-48:byte>=65&&byte<=70?byte-55:byte>=97&&byte<=102?byte-87:-1;
      if(digit<0)this.fail('invalid escape',false);value=value*16+digit;
    }
    return value;
  }
  string() {
    this.eat();const bytes=[];
    for (;;) {
      const byte=this.next();if(byte === undefined)this.fail('EOF while parsing a string',false);
      if(byte === 34) {
        try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Uint8Array.from(bytes));}
        catch{this.fail('invalid unicode code point',false);}
      }
      if(byte < 32)this.fail('control character (\\u0000-\\u001F) found while parsing a string',false);
      if(byte !== 92){bytes.push(byte);continue;}
      const escape=this.next();if(escape === undefined)this.fail('EOF while parsing a string',false);
      const escapes={34:34,92:92,47:47,98:8,102:12,110:10,114:13,116:9};
      if(Object.hasOwn(escapes,escape)){bytes.push(escapes[escape]);continue;}
      if(escape !== 117)this.fail('invalid escape',false);
      let codepoint=this.hex();
      if(codepoint >= 0xdc00 && codepoint <= 0xdfff)this.fail('lone leading surrogate in hex escape',false);
      if(codepoint >= 0xd800 && codepoint <= 0xdbff) {
        for(const expected of [92,117]) {
          const actual=this.next();if(actual === undefined)this.fail('EOF while parsing a string',false);
          if(actual !== expected)this.fail('unexpected end of hex escape',false);
        }
        const low=this.hex();if(low < 0xdc00 || low > 0xdfff)this.fail('lone leading surrogate in hex escape',false);
        codepoint=0x10000+(codepoint-0xd800)*1024+(low-0xdc00);
      }
      bytes.push(...Buffer.from(String.fromCodePoint(codepoint),'utf8'));
    }
  }
  literal(text,value) {
    for(const byte of Buffer.from(text)) {
      const actual=this.next();if(actual === undefined)this.fail('EOF while parsing a value',false);
      if(actual !== byte)this.fail('expected ident',false);
    }
    return value;
  }
  value() {
    this.skip();const byte=this.peek();
    if(byte === undefined)this.fail('EOF while parsing a value');
    if(byte === 34)return tagged('String',{field0:this.string()});
    if(byte === 110)return this.literal('null',JSON_NULL);
    if(byte === 116)return this.literal('true',tagged('Bool',{field0:true}));
    if(byte === 102)return this.literal('false',tagged('Bool',{field0:false}));
    if(byte === 45 || digit(byte))return tagged('Number',{field0:this.roundtrip?parseJsonRoundtripNumber(this):parseJsonNumber(this)});
    if(byte !== 91 && byte !== 123)this.fail('expected value');
    if(--this.depth === 0)this.fail('recursion limit exceeded');
    this.eat();this.skip();const array=byte === 91,end=array?93:125,items=[];
    if(this.peek() === end){this.eat();this.depth++;return array?tagged('Array',{field0:Object.freeze(items)}):tagged('Object',{field0:jsonMap(items)});}
    for (;;) {
      if(this.peek() === undefined)this.fail(array?'EOF while parsing a list':'EOF while parsing an object');
      if(array)items.push(this.value());
      else {
        if(this.peek() !== 34)this.fail('key must be a string');
        const key=this.string();this.skip();
        if(this.peek() !== 58)this.fail(this.peek() === undefined?'EOF while parsing an object':'expected `:`');
        this.eat();items.push([key,this.value()]);
      }
      this.skip();if(this.peek() === end){this.eat();break;}
      if(this.peek() === undefined)this.fail(array?'EOF while parsing a list':'EOF while parsing an object');
      if(this.peek() !== 44)this.fail(array?'expected `,` or `]`':'expected `,` or `}`');
      this.eat();this.skip();if(this.peek() === end)this.fail('trailing comma');
    }
    this.depth++;return array?tagged('Array',{field0:Object.freeze(items)}):tagged('Object',{field0:jsonMap(items)});
  }
}
export function parseJsonBytes(bytes) {
  return parse(new JsonReader(bytes));
}
export function parseJsonBytesRoundtrip(bytes) {
  return parse(new JsonReader(bytes,true));
}
function parse(reader) {
  try {const value=reader.value();reader.skip();if(reader.peek() !== undefined)reader.fail('trailing characters');return ok(value);}
  catch(error){if(error instanceof JsonFailure)return err(error.value);throw error;}
}
