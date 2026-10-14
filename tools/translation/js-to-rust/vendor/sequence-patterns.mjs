// Stateless whole-input regular sequences. The checked network carries atoms,
// never executable regexp source. All matching states are bounded independently
// of input length; arbitrary ECMAScript coercion is outside this capability.
import {refuse} from './constructs.mjs';
import {parseCharacterClass,classPattern,validateCharacterClass} from './character-classes.mjs';

const SPACE='\\u0009-\\u000d\\u0020\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff';
const SHORTHAND={s:SPACE,d:'0-9',w:'A-Za-z0-9_'};
const fail=message=>refuse('unsupported',message);

export function parseSequencePattern(text) {
  const end=text.lastIndexOf('/'),flags=text.slice(end+1);
  if(text[0]!=='/'||!['','u'].includes(flags))fail('stateful or unsupported sequence flags');
  const unicode=flags==='u',pattern=text.slice(1,end);
  if(!pattern.startsWith('^')||!pattern.endsWith('$'))fail('a sequence without both whole-input anchors');
  const body=pattern.slice(1,-1),atoms=[];let at=0;
  if(unicode&&/(?:\\u[dD][89aAbB][0-9a-fA-F]{2}[\udc00-\udfff]|[\ud800-\udbff]\\u[dD][c-fC-F][0-9a-fA-F]{2})/u.test(body))fail('mixed literal and escaped surrogate spellings');
  const escaped=(inClass=false)=>{
    const begin=at++;if(at>=body.length)fail('a trailing sequence escape');
    const tag=body[at++];
    if(!inClass&&(tag==='b'||unicode&&tag==='-'))fail('a boundary or invalid literal escape');
    if('.*+?^$[]{}()'.includes(tag))return {text:unicode?'\\u{'+tag.charCodeAt(0).toString(16)+'}':'\\u'+tag.charCodeAt(0).toString(16).padStart(4,'0'),set:false};
    if(Object.hasOwn(SHORTHAND,tag))return {text:SHORTHAND[tag],set:true};
    if(tag==='x'||tag==='u') {
      if(tag==='u'&&body[at]==='{') {
        const close=body.indexOf('}',at);if(close<0)fail('an incomplete sequence codepoint escape');at=close+1;
      } else {
        at+=tag==='x'?2:4;
        // A Unicode escaped surrogate pair is one regexp atom.
        if(unicode&&tag==='u'&&/^\\u[dD][89aAbB][0-9a-fA-F]{2}$/u.test(body.slice(begin,at))&&/^\\u[dD][c-fC-F][0-9a-fA-F]{2}/u.test(body.slice(at)))at+=6;
      }
    } else if(!'\\/.*+?^$[]{}()-tnvfrb'.includes(tag))fail('a nonliteral sequence escape');
    return {text:body.slice(begin,at),set:false};
  };
  while(at<body.length) {
    let spelling;
    if(body[at]==='[') {
      const begin=at++;let expanded='';
      if(body[at]==='^')expanded+=body[at++];
      while(at<body.length&&body[at]!==']') {
        if(body[at]==='\\') {
          const before=body[at-1],part=escaped(true);
          if(part.set&&(before==='-'||body[at]==='-'))fail('a shorthand class used as a range endpoint');
          expanded+=part.text;
        } else expanded+=body[at++];
      }
      if(body[at++]!==']'||at<=begin+1)fail('an incomplete sequence class');
      spelling='['+expanded+']';
    } else if(body[at]==='\\') {
      const part=escaped();spelling='['+part.text+']';
    } else {
      const unit=unicode?body.codePointAt(at):body.charCodeAt(at);
      if('/.*+?^$(){}|]'.includes(body[at]))fail('an unsupported sequence operator');
      at+=unicode&&unit>0xffff?2:1;
      spelling='['+(unicode?'\\u{'+unit.toString(16)+'}':'\\u'+unit.toString(16).padStart(4,'0'))+']';
    }
    const model=parseCharacterClass('/'+spelling+'/'+flags);let minimum=1,maximum=1;
    if(body[at]==='+'||body[at]==='*'||body[at]==='?') {
      const tag=body[at++];minimum=tag==='+'?1:0;maximum=tag==='?'?1:null;
    } else if(body[at]==='{') {
      const quantifier=/^\{(0|[1-9]\d*)(?:(,)(0|[1-9]\d*)?)?\}/u.exec(body.slice(at));
      if(!quantifier)fail('a malformed bounded repetition');
      at+=quantifier[0].length;minimum=Number(quantifier[1]);maximum=quantifier[2]?quantifier[3]===undefined?null:Number(quantifier[3]):minimum;
    }
    atoms.push({negated:model.negated,ranges:model.ranges,minimum,maximum});
  }
  const model={unicode,atoms};validateSequencePattern(model);return model;
}

export function validateSequencePattern(model) {
  if(typeof model.unicode!=='boolean'||!Array.isArray(model.atoms)||model.atoms.length<1||model.atoms.length>64)fail('a malformed or oversized sequence');
  let states=1;
  for(const atom of model.atoms) {
    if(!atom||Object.keys(atom).sort().join(',')!=='maximum,minimum,negated,ranges')fail('a malformed sequence atom');
    validateCharacterClass({unicode:model.unicode,anchored:false,negated:atom.negated,ranges:atom.ranges});
    if(atom.ranges.some(range=>Object.keys(range).sort().join(',')!=='high,low'))fail('an extra or missing sequence range field');
    if(!Number.isInteger(atom.minimum)||atom.minimum<0||atom.minimum>512||atom.maximum!==null&&(!Number.isInteger(atom.maximum)||atom.maximum<atom.minimum||atom.maximum>512))fail('an oversized or inconsistent repetition');
    states+=(atom.maximum??atom.minimum)+1;
  }
  if(states>4096)fail('an oversized sequence state network');
}

export function sequencePattern(model) {
  validateSequencePattern(model);
  return '^'+model.atoms.map(atom=>classPattern({unicode:model.unicode,anchored:false,negated:atom.negated,ranges:atom.ranges})+(atom.minimum===1&&atom.maximum===1?'':atom.maximum===atom.minimum?`{${atom.minimum}}`:`{${atom.minimum},${atom.maximum??''}}`)).join('')+'$';
}

export function sequenceStates(model) {
  validateSequencePattern(model);const states=[];
  for(const atom of model.atoms) {
    const begin=states.length,limit=atom.maximum??atom.minimum,next=begin+limit+1;
    for(let count=0;count<=limit;count++)states.push({negated:atom.negated,ranges:atom.ranges,next:count<limit?begin+count+1:atom.maximum===null?begin+count:null,epsilon:count>=atom.minimum?next:null});
  }
  states.push({negated:false,ranges:[],next:null,epsilon:null});return states;
}

export function matchesSequence(model,value) {
  const states=sequenceStates(model),close=active=>{for(let at=0;at<states.length;at++)if(active[at]&&states[at].epsilon!==null)active[states[at].epsilon]=true;};
  let active=Array(states.length).fill(false);active[0]=true;close(active);
  // for..of retains lone surrogate codepoints; the non-u branch observes units.
  const input=model.unicode?value:Array.from({length:value.length},(_,at)=>value[at]);
  for(const character of input) {
    const unit=character.codePointAt(0),next=Array(states.length).fill(false);
    for(let at=0;at<states.length;at++) {
      const state=states[at];if(active[at]&&state.next!==null&&state.negated!==state.ranges.some(range=>unit>=range.low&&unit<=range.high))next[state.next]=true;
    }
    close(next);active=next;
  }
  return active.at(-1);
}

export const RUST_SEQUENCE_HELPER=`#[rustfmt::skip]
fn js_sequence_test<I: Iterator<Item = u32>>(input: I, states: &[(bool, &[(u32, u32)], Option<usize>, Option<usize>)]) -> bool {
    let close = |active: &mut Vec<bool>| {
        for index in 0..states.len() {
            if active[index] { if let Some(next) = states[index].3 { active[next] = true; } }
        }
    };
    let mut active = vec![false; states.len()]; active[0] = true; close(&mut active);
    for unit in input {
        let mut next = vec![false; states.len()];
        for index in 0..states.len() {
            let (negated, ranges, target, _) = states[index];
            if active[index] && negated != ranges.iter().any(|(low, high)| unit >= *low && unit <= *high) {
                if let Some(target) = target { next[target] = true; }
            }
        }
        close(&mut next); active = next;
    }
    active[states.len()-1]
}`;
