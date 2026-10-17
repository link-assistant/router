import { renderStringLengthExpression, readStringMapRefusal, renderStringTestExpression, readStringTestHelper, readStringTestSupport } from './frontend-rules.js';
// Rocq emitter. Naturals become binary `N` and integers `Z`, so programs
// run at their source sizes (unary `nat` cannot hold 20!). Structural
// recursion over data is a `Fixpoint`; recursion that decreases a natural is
// a `Function` with the measure `N.to_nat`, whose obligations `lia`
// discharges and whose equation lemma the reconstructed proofs rewrite with.
// A JavaScript Number is a primitive `float`, which the kernel computes with,
// so assertions about Numbers are still theorems closed by computation.

import { unsupported } from './diagnostics.js';
import { propFunctions } from './proof.js';
import { renameFunction, renameMain, renameTheorem } from './ir.js';
import { threadOutput } from './output.js';
import { EmitState, mutualGroups, orderDeclarations, unthreaded } from './emit-common.js';

const KEYWORDS = new Set([
  'as', 'at', 'cofix', 'else', 'end', 'exists', 'exists2', 'fix', 'for', 'forall', 'fun', 'if', 'IF', 'in', 'let',
  'match', 'mod', 'Prop', 'return', 'Set', 'SProp', 'then', 'Type', 'using', 'where', 'with', 'struct', 'measure',
  'wf', 'Definition', 'Fixpoint', 'Function', 'Theorem', 'Lemma', 'Proof', 'Qed', 'Defined', 'Module', 'End',
  'Inductive', 'Import', 'Require', 'From', 'Open', 'Scope', 'Eval', 'Compute', 'Check', 'Print',
  // Standard-library names the emitted code uses unqualified.
  'N', 'Z', 'String', 'EmptyString', 'negb', 'andb', 'orb', 'true', 'false', 'bool', 'string', 'list', 'nil', 'cons',
  'unit', 'tt', 'nat', 'O', 'S', 'Bool', 'Ascii', 'main', 'lia', 'nia', 'float', 'PrimFloat',
  // Imported constructors: a pattern variable with one of these names would match the constructor instead.
  'left', 'right', 'inleft', 'inright', 'Some', 'None', 'pair', 'inl', 'inr', 'exist', 'existT', 'I', 'conj', 'or_introl',
  'or_intror', 'ex_intro', 'eq_refl', 'Eq', 'Lt', 'Gt', 'CompEq', 'CompLt', 'CompGt', 'xI', 'xO', 'xH', 'N0', 'Npos', 'Z0',
  'Zpos', 'Zneg', 'ReflectT', 'ReflectF', 'identity_refl',
]);

export const ROCQ_PRELUDE = [
  'From Stdlib Require Import NArith ZArith Lia Recdef String List Ascii.',
];

// Number literals are written as in the source; Rocq reads each one as the
// nearest float, as JavaScript does, and would otherwise warn that it rounds.
const FLOAT_PRELUDE = [
  'From Stdlib Require Import NArith ZArith Lia Recdef String List Ascii Floats.',
  'Set Warnings "-inexact-float".',
];

// How many times one proof step rewrites with one hypothesis or lemma.
const REWRITE_BOUND = 8;

const HELPERS = {
  digits: `Fixpoint ml_digits (fuel : nat) (n : N) (acc : string) : string :=
  match fuel with
  | O => acc
  | S rest =>
      let acc' := String (ascii_of_N (48 + N.modulo n 10)) acc in
      if N.ltb n 10 then acc' else ml_digits rest (N.div n 10) acc'
  end.
Definition ml_N_to_string (n : N) : string := ml_digits (S (N.size_nat n)) n EmptyString.`,
  zToString: `Definition ml_Z_to_string (z : Z) : string :=
  if Z.ltb z 0 then String.append "-" (ml_N_to_string (Z.to_N (Z.opp z))) else ml_N_to_string (Z.to_N z).`,
  boolToString: `Definition ml_bool_to_string (b : bool) : string := if b then "true" else "false".`,
  euclid: `(* Euclidean division, the rounding of Lean's Int / and %: the remainder is never negative. *)
Definition ml_Z_ediv (a b : Z) : Z := Z.mul (Z.sgn b) (Z.div a (Z.abs b)).
Definition ml_Z_emod (a b : Z) : Z := Z.modulo a (Z.abs b).`,
  tactics: `Ltac ml_N_norm := repeat first
  [ rewrite N.pred_succ
  | rewrite (proj2 (N.eqb_neq (N.succ _) 0) (N.neq_succ_0 _))
  | rewrite N.eqb_refl ].
Ltac ml_obligation := intros; repeat match goal with H : N.eqb _ _ = false |- _ => apply N.eqb_neq in H end; lia.
Ltac ml_close := first [reflexivity | lia | nia | congruence].`,
  // A closed assertion computes to connectives over literal (in)equalities:
  // prove the goal, or refute a hypothesis, one connective at a time.
  jsNumber: `(* ECMAScript Number::toString for binary64: the shortest decimal that rounds
   back to the value (the nearest one, the even one on a tie), laid out as
   JavaScript prints it. Exact Z arithmetic on the decomposed float. *)
Fixpoint ml_js_zeros (n : nat) : string :=
  match n with O => EmptyString | S k => String "0"%char (ml_js_zeros k) end.
Fixpoint ml_js_trim (s : string) : string :=
  match s with
  | EmptyString => EmptyString
  | String c rest =>
      let r := ml_js_trim rest in
      if andb (Ascii.eqb c "0"%char) (String.eqb r EmptyString) then EmptyString else String c r
  end.
Definition ml_js_layout (digits : string) (n : Z) : string :=
  let len := String.length digits in
  let k := Z.of_nat len in
  if andb (Z.leb k n) (Z.leb n 21) then (digits ++ ml_js_zeros (Z.to_nat (n - k)))%string
  else if andb (Z.ltb 0 n) (Z.leb n 21) then
    (substring 0 (Z.to_nat n) digits ++ "." ++ substring (Z.to_nat n) len digits)%string
  else if andb (Z.ltb (-6) n) (Z.leb n 0) then ("0." ++ ml_js_zeros (Z.to_nat (- n)) ++ digits)%string
  else
    let e := (n - 1)%Z in
    let exp := ((if Z.ltb e 0 then "e-" else "e+") ++ ml_N_to_string (Z.abs_N e))%string in
    if Z.eqb k 1 then (digits ++ exp)%string
    else (substring 0 1 digits ++ "." ++ substring 1 len digits ++ exp)%string.
(* The value is v * 2^sh for a scaled mantissa v. c * 10^q compared with
   x * 2^sh, and floor (v * 2^sh / 10^q), with shifts for the powers of 2. *)
Definition ml_js_cmp (c q x sh : Z) : comparison :=
  Z.compare (Z.shiftl (c * 10 ^ Z.max q 0) (Z.max (- sh) 0))
            (Z.shiftl (x * 10 ^ Z.max (- q) 0) (Z.max sh 0)).
Definition ml_js_floor (v q sh : Z) : Z :=
  Z.div (Z.shiftl (v * 10 ^ Z.max (- q) 0) (Z.max sh 0))
        (Z.shiftl (10 ^ Z.max q 0) (Z.max (- sh) 0)).
(* With p significant digits: the candidate in the rounding interval nearest
   to the value (the even one on a tie), as (digits, exponent). *)
Definition ml_js_candidate (p e10 v lo hi sh : Z) (inclusive : bool) : option (Z * Z) :=
  let q := (e10 - p + 1)%Z in
  let c := ml_js_floor v q sh in
  let inside (c : Z) :=
    andb (match ml_js_cmp c q lo sh with Gt => true | Eq => inclusive | Lt => false end)
         (match ml_js_cmp c q hi sh with Lt => true | Eq => inclusive | Gt => false end) in
  let low := inside c in
  let high := inside (c + 1)%Z in
  if andb low high then
    match ml_js_cmp (2 * c + 1) q (2 * v) sh with
    | Gt => Some (c, q) | Lt => Some ((c + 1)%Z, q) | Eq => Some (if Z.even c then c else (c + 1)%Z, q)
    end
  else if low then Some (c, q) else if high then Some ((c + 1)%Z, q) else None.
(* A candidate with p digits is one with p + 1 digits too, so the fewest
   digits are found by bisection over [first, last]; 17 always suffice. *)
Fixpoint ml_js_fewest (fuel : nat) (first last e10 v lo hi sh : Z) (inclusive : bool) : Z * Z :=
  match fuel with
  | S fuel =>
      if Z.ltb first last then
        let middle := Z.div (first + last) 2 in
        match ml_js_candidate middle e10 v lo hi sh inclusive with
        | Some _ => ml_js_fewest fuel first middle e10 v lo hi sh inclusive
        | None => ml_js_fewest fuel (middle + 1) last e10 v lo hi sh inclusive
        end
      else match ml_js_candidate last e10 v lo hi sh inclusive with Some r => r | None => (0, 0)%Z end
  | O => match ml_js_candidate last e10 v lo hi sh inclusive with Some r => r | None => (0, 0)%Z end
  end.
Definition ml_js_shortest (m e : Z) (lowerCloser : bool) : string :=
  let sh := (e - 2)%Z in
  let v := (4 * m)%Z in
  let lo := if lowerCloser then (v - 1)%Z else (v - 2)%Z in
  let guess := Z.div ((Z.log2 m + e) * 78913) 262144 in
  let e10 :=
    match ml_js_cmp 1 (guess + 1) v sh with
    | Gt => match ml_js_cmp 1 guess v sh with Gt => (guess - 1)%Z | _ => guess end
    | _ => (guess + 1)%Z
    end in
  let (pick, q) := ml_js_fewest 5 1 17 e10 v lo (v + 2) sh (Z.even m) in
  let text := ml_N_to_string (Z.to_N pick) in
  ml_js_layout (ml_js_trim text) (q + Z.of_nat (String.length text)).
Definition ml_js_number (x : float) : string :=
  match Prim2SF x with
  | S754_zero _ => "0"
  | S754_infinity negative => if negative then "-Infinity" else "Infinity"
  | S754_nan => "NaN"
  | S754_finite negative m e =>
      let body := ml_js_shortest (Zpos m) e (andb (Pos.eqb m (2 ^ 52)) (Z.ltb (-1074) e)) in
      if negative then ("-" ++ body)%string else body
  end.`,
  jsConsole: `(* What console.log prints: -0 as "-0", where String(-0) is "0". *)
Definition ml_js_console (x : float) : string :=
  if andb (PrimFloat.is_zero x) (PrimFloat.get_sign x) then "-0" else ml_js_number x.`,
  floatSame: `(* SameValue: NaN equals NaN, and 0 and -0 differ. *)
Definition ml_float_same (a b : float) : bool :=
  if PrimFloat.is_nan a then PrimFloat.is_nan b
  else andb (PrimFloat.eqb a b) (Bool.eqb (PrimFloat.get_sign a) (PrimFloat.get_sign b)).`,
  floatRem: `(* ECMAScript % on binary64 (C fmod): the exact truncated remainder with the
   sign of the dividend, computed on the mantissas, so it is exact. *)
Definition ml_float_rem (x y : float) : float :=
  if orb (orb (PrimFloat.is_nan x) (PrimFloat.is_nan y)) (orb (PrimFloat.is_infinity x) (PrimFloat.is_zero y))
  then PrimFloat.div 0 0
  else if orb (PrimFloat.is_infinity y) (PrimFloat.is_zero x) then x
  else match Prim2SF x, Prim2SF y with
  | S754_finite sx mx ex, S754_finite _ my ey =>
      let e := Z.min ex ey in
      let r := Z.modulo (Z.pos mx * 2 ^ (ex - e)) (Z.pos my * 2 ^ (ey - e)) in
      let magnitude := Z.ldexp (PrimFloat.of_uint63 (Uint63.of_Z r)) e in
      if sx then PrimFloat.opp magnitude else magnitude
  | _, _ => x
  end.`,
  math: `(* Math.trunc, exactly from the binary form: towards zero, a zero result
   keeping the sign of the argument. *)
Definition ml_trunc (x : float) : float :=
  match Prim2SF x with
  | S754_finite negative m e =>
      if Z.leb 0 e then x
      else
        let magnitude := PrimFloat.of_uint63 (Uint63.of_Z (Z.div (Z.pos m) (2 ^ (- e)))) in
        if negative then PrimFloat.opp magnitude else magnitude
  | _ => x
  end.
Definition ml_floor (x : float) : float :=
  let t := ml_trunc x in if PrimFloat.ltb x t then PrimFloat.sub t 1%float else t.
Definition ml_ceil (x : float) : float :=
  let t := ml_trunc x in if PrimFloat.ltb t x then PrimFloat.add t 1%float else t.
(* Math.round: the nearest integer, the one towards +Infinity on a tie, and -0
   from -0.5 up to 0. *)
Definition ml_round (x : float) : float :=
  if orb (orb (PrimFloat.is_nan x) (PrimFloat.is_infinity x)) (PrimFloat.is_zero x) then x
  else if andb (PrimFloat.ltb 0%float x) (PrimFloat.ltb x 0.5%float) then 0%float
  else if andb (PrimFloat.ltb x 0%float) (PrimFloat.leb (PrimFloat.opp 0.5%float) x) then PrimFloat.opp 0%float
  else let f := ml_floor x in if PrimFloat.leb 0.5%float (PrimFloat.sub x f) then PrimFloat.add f 1%float else f.
(* Math.sign: 1 or -1, and -0, 0 and NaN as they are. *)
Definition ml_sign (x : float) : float :=
  if PrimFloat.ltb 0%float x then 1%float else if PrimFloat.ltb x 0%float then PrimFloat.opp 1%float else x.
(* Math.max and Math.min of two Numbers: NaN when either is, and 0 above -0. *)
Definition ml_max (a b : float) : float :=
  if PrimFloat.ltb b a then a else if PrimFloat.ltb a b then b
  else if PrimFloat.eqb a b then (if PrimFloat.get_sign a then b else a) else PrimFloat.nan.
Definition ml_min (a b : float) : float :=
  if PrimFloat.ltb a b then a else if PrimFloat.ltb b a then b
  else if PrimFloat.eqb a b then (if PrimFloat.get_sign a then a else b) else PrimFloat.nan.
Definition ml_is_finite (x : float) : bool := negb (orb (PrimFloat.is_nan x) (PrimFloat.is_infinity x)).
Definition ml_is_integer (x : float) : bool := andb (ml_is_finite x) (PrimFloat.eqb (ml_trunc x) x).
Definition ml_is_safe_integer (x : float) : bool :=
  andb (ml_is_integer x) (PrimFloat.leb (PrimFloat.abs x) 9007199254740991%float).`,
  stringStartsWith: readStringTestSupport('Rocq', 'startsWith'),
  stringEndsWith: readStringTestSupport('Rocq', 'endsWith'),
  stringIncludes: readStringTestSupport('Rocq', 'includes'),
  listAt: `(* The element at an index, walking the list; a read outside it, undefined
   in JavaScript, is outside the in-bounds assumption. *)
Fixpoint ml_list_at {A : Type} (values : list A) (index : Z) (fallback : A) : A :=
  match values with
  | nil => fallback
  | cons value rest => if Z.eqb index 0 then value else ml_list_at rest (Z.pred index) fallback
  end.`,
  floatIndex: `(* The index a Number names, exactly from its binary form; -1 when it names none. *)
Definition ml_float_index (x : float) : Z :=
  match Prim2SF x with
  | S754_zero _ => 0%Z
  | S754_finite false m e =>
      if Z.leb 0 e then Z.shiftl (Z.pos m) e
      else if Z.eqb (Z.modulo (Z.pos m) (2 ^ (- e))) 0 then Z.div (Z.pos m) (2 ^ (- e)) else (-1)%Z
  | _ => (-1)%Z
  end.`,
  fix: `(* The least fixed point of a one-step unfolding F, unfolded lazily: level k
   nests 2^k calls of F before it would reach the fallback. *)
Fixpoint ml_fix {A B : Type} (k : nat) (F : (A -> B) -> A -> B) (fallback : A -> B) : A -> B :=
  match k with
  | O => F fallback
  | S k => fun a => ml_fix k F (ml_fix k F fallback) a
  end.`,
  decide: `Ltac ml_prove := first
  [ reflexivity | discriminate | exact I | lia
  | split; ml_prove
  | left; ml_prove
  | right; ml_prove
  | let H := fresh "H" in intro H; first [ml_prove | ml_refute H] ]
with ml_refute H := first
  [ discriminate H | exact H | lia
  | let A := fresh "H" in let B := fresh "H" in destruct H as [A B]; first [ml_refute A | ml_refute B]
  | let A := fresh "H" in let B := fresh "H" in destruct H as [A | B]; [ml_refute A | ml_refute B]
  | apply H; ml_prove ].
Ltac ml_decide := vm_compute; ml_prove.`,
  emit: `(* The lines a step of main prints, before the lines the rest of main prints
   and the message of the abort that stops it, if one does. *)
Definition ml_emit (lines : list string) (rest : list string * option string) : list string * option string :=
  (app lines (fst rest), snd rest).`,
};

function ident(name) {
  let result = name.replace(/[^A-Za-z0-9_']/gu, '_');
  if (/^[0-9']/u.test(result)) result = `x${result}`;
  if (KEYWORDS.has(result)) result = `${result}_`;
  return result;
}

export function emitRocq(source) {
  const program = threadOutput(source);
  const state = new EmitState(program, 'Rocq', ident, KEYWORDS, {
    ctorStyle: 'module',
    // Rocq derives these from inductives and Functions in the same namespace.
    generated: (name) => ['_ind', '_rect', '_rec', '_sind', '_equation', '_tcc', '_terminate', '_F', '_graph', '_complete', '_correct', '_ind_', '_rect_']
      .map((suffix) => `${name}${suffix}`).concat([`R_${name}`]),
  });
  const emitter = new RocqEmitter(program, state);
  return emitter.file();
}

/** The injection of the `index`th of `count` types into their sum `A + (B + (C + …))`. */
function injection(index, count, text) {
  let wrapped = index < count - 1 ? `(inl ${text})` : text;
  for (let level = 0; level < index; level += 1) wrapped = `(inr ${wrapped})`;
  return wrapped;
}

class RocqEmitter {
  constructor(program, state) {
    this.program = program;
    this.state = state;
    this.helpers = new Set(['tactics']);
    this.natFunctions = new Map();
    this.current = null;
    this.usesFloat = false;
  }

  file() {
    const blocks = [];
    const order = orderDeclarations(this.program, { requireContiguousModules: true });
    let openModules = [];
    const moveTo = (path) => {
      let common = 0;
      while (common < openModules.length && common < path.length && openModules[common] === path[common]) common += 1;
      while (openModules.length > common) blocks.push(`End ${this.state.moduleName(openModules.slice(0, openModules.length))}.`) && openModules.pop();
      while (openModules.length < path.length) {
        openModules.push(path[openModules.length]);
        blocks.push(`Module ${this.state.moduleName(openModules)}.`);
      }
    };
    const groups = mutualGroups(this.program);
    for (const entry of order) {
      moveTo(entry.modulePath);
      const group = groups.get(entry.fullName);
      if (group) {
        if (group[0] === entry) blocks.push(this.mutual(group));
      } else if (entry.k === 'data') blocks.push(this.data(entry));
      else if (entry.k === 'fn') blocks.push(this.fn(entry));
      else if (entry.k === 'theorem') blocks.push(this.theorem(entry));
    }
    moveTo([]);
    const mainText = this.program.main ? this.main(this.program.main) : null;
    const helperText = ['digits', 'zToString', 'boolToString', 'euclid', 'jsNumber', 'jsConsole', 'floatSame', 'floatRem', 'math', 'listAt', 'stringStartsWith', 'stringEndsWith', 'stringIncludes', 'floatIndex', 'fix', 'tactics', 'decide', 'emit']
      .filter((name) => this.helpers.has(name) || (name === 'digits' && (this.helpers.has('zToString') || this.helpers.has('jsNumber'))))
      .map((name) => HELPERS[name]);
    const text = [
      `(* Translated from ${this.program.sourceLanguage} by meta-language: portable core, Rocq target. *)`,
      ...(this.usesFloat ? FLOAT_PRELUDE : ROCQ_PRELUDE),
      '',
      ...helperText.flatMap((helper) => [helper, '']),
      ...blocks.flatMap((block) => [block, '']),
      ...(mainText ? [mainText, '', 'Eval vm_compute in main.', ''] : []),
    ].join('\n');
    return {
      language: 'Rocq',
      text,
      mappings: this.state.mappings,
      assumptions: this.state.assumptionList(),
      encodings: this.state.encodingList(),
      theorems: this.state.theorems,
      entry: mainText ? 'main' : null,
    };
  }

  type(type) {
    switch (type.kind) {
      case 'nat':
        return 'N';
      case 'int':
        return 'Z';
      case 'fixed':
        this.state.machineInteger(type, type.signed ? 'Z' : 'N');
        return type.signed ? 'Z' : 'N';
      case 'float':
        this.floats();
        return 'float';
      case 'bool':
        return 'bool';
      case 'string':
        return 'string';
      case 'unit':
        return 'unit';
      case 'output':
        return 'list string';
      case 'data':
        return this.state.ref(type.name);
      case 'array':
        this.state.encode('arrays', 'a JavaScript array, which the portable core never mutates, is a Rocq list; a read walks it to the index');
        return `(list ${this.type(type.element)})`;
      default:
        throw new Error(`no Rocq type for ${type.kind}`);
    }
  }

  data(entry) {
    const name = this.state.localName(entry.fullName);
    const ctors = entry.ctors.map((ctor) => {
      const fields = ctor.fields.map((field) => `${this.type(field.type)} -> `).join('');
      return `| ${this.state.ctorLocal(entry.fullName, ctor.name)} : ${fields}${name}`;
    });
    this.state.map(entry, name);
    // A type nested through list has no registered All scheme, which Rocq would warn of on every definition.
    const lists = (type) => type.kind === 'array' && (type.element.kind === 'data' || lists(type.element));
    const nested = entry.ctors.some((ctor) => ctor.fields.some((field) => lists(field.type)));
    return [...(nested ? ['#[warnings="-register-all"]'] : []), `Inductive ${name} : Type :=`, ...ctors].join('\n') + '.';
  }

  fn(entry) {
    const general = entry.recursive && entry.decreasing === null && !entry.mutual;
    const { params, body } = renameFunction(entry, ident, this.state.localReserved());
    const name = this.state.localName(entry.fullName);
    this.state.map(entry, name);
    // A threaded function calling itself more than once matches on one call's pair around the next, whose equation Function cannot generate.
    const fuel = !general && entry.recursive && !entry.mutual && params[entry.decreasing]?.type.kind !== 'data'
      && this.program.declarations.get(entry.ret.name)?.output === true && selfCalls(body, entry.fullName) > 1;
    this.current = { entry, name, general, fuel };
    const binders = params.map((param) => ` (${param.name} : ${this.type(param.type)})`).join('');
    const result = this.type(entry.ret);
    const text = this.expr(body);
    this.current = null;
    if (!entry.recursive) return `Definition ${name}${binders} : ${result} :=\n  ${text}.`;
    if (general) return this.generalRecursion(name, params, binders, result, text, entry.ret);
    const decreasing = params[entry.decreasing];
    if (decreasing.type.kind === 'data') {
      return `Fixpoint ${name}${binders} {struct ${decreasing.name}} : ${result} :=\n  ${text}.`;
    }
    if (fuel) return this.fuelRecursion(name, params, binders, result, text, decreasing.name, entry.ret);
    this.natFunctions.set(entry.fullName, { index: entry.decreasing, arity: params.length });
    this.state.encode('nat-recursion', 'recursion that decreases a natural is a Rocq Function with measure N.to_nat; lia discharges the decrease obligations');
    return `Function ${name}${binders} {measure N.to_nat ${decreasing.name}} : ${result} :=\n  ${text}.\nProof. all: ml_obligation. Defined.`;
  }

  /**
   * Recursion that decreases a natural by one each call, in a function whose
   * output or abort is threaded, is a structural fixpoint over a fuel one more
   * than the natural: every call spends one fuel and decreases the natural, so
   * the fuel never runs out before the natural reaches zero.
   */
  fuelRecursion(name, params, binders, result, text, decreasing, ret) {
    this.state.encode('nat-fuel-recursion', 'a threaded function that decreases a natural through more than one call is a fixpoint over a fuel of one more than the natural, which every call spends as it decreases the natural, so the fuel outlasts every run');
    const args = params.map((param) => param.name).join(' ');
    return `Definition ${name}${binders} : ${result} :=\n  (fix ml_go (ml_fuel : nat)${binders} {struct ml_fuel} : ${result} :=\n    match ml_fuel with\n    | O => ${this.inhabitant(ret)}\n    | S ml_fuel => ${text}\n    end) (S (N.to_nat ${decreasing})) ${args}.`;
  }

  /**
   * Recursion with no termination argument Rocq could check is `ml_fix`
   * applied to the function's one-step unfolding: the parameters travel as
   * one tuple, a self-call is a call of `ml_rec`, and a run nested deeper than
   * 2^64 calls, which no machine reaches, would fall back to an inhabitant.
   */
  generalRecursion(name, params, binders, result, text, ret) {
    this.helpers.add('fix');
    this.state.encode('general-recursion', 'recursion without a termination argument Rocq could check is ml_fix over the function\'s one-step unfolding, which unfolds lazily to 2^64 nested calls: every run that terminates computes the same value, and Rocq accepts it as a plain Definition');
    const domain = params.length ? params.map((param) => this.type(param.type)).join(' * ') : 'unit';
    const tuple = params.length === 1 ? params[0].name : `(${params.map((param) => param.name).join(', ')})`;
    const unpack = params.length > 1 ? `let '${tuple} := ml_args in ` : '';
    const args = params.length ? tuple : 'tt';
    const input = params.length === 1 ? params[0].name : params.length ? 'ml_args' : '_';
    return `Definition ${name}${binders} : ${result} :=\n  ml_fix 64 (fun (ml_rec : ${domain} -> ${result}) (${input} : ${domain}) =>\n    ${unpack}${text})\n    (fun _ => ${this.inhabitant(ret)}) ${args}.`;
  }

  /**
   * Mutually recursive functions are one `ml_fix` over the sum of their
   * parameter tuples, returning the sum of their results: the case of a
   * function is its injection, a call of any of them is a call of `ml_rec`
   * projected back, and each function is its projection of the whole.
   */
  mutual(group) {
    this.helpers.add('fix');
    this.state.encode('mutual-recursion', 'mutually recursive functions are one ml_fix over the sum of their parameter tuples, which unfolds lazily to 2^64 nested calls: every run that terminates computes the same value, and Rocq accepts each function as a plain Definition, its projection of the whole');
    const members = group.map((entry) => {
      const { params, body } = renameFunction(entry, ident, this.state.localReserved());
      const name = this.state.localName(entry.fullName);
      this.state.map(entry, name);
      const tuple = params.length === 1 ? params[0].name : params.length ? `(${params.map((param) => param.name).join(', ')})` : 'tt';
      return {
        entry,
        name,
        params,
        body,
        tuple,
        domain: params.length > 1 ? `(${params.map((param) => this.type(param.type)).join(' * ')})` : params.length ? this.type(params[0].type) : 'unit',
        result: this.type(entry.ret),
        inhabitant: this.inhabitant(entry.ret),
      };
    });
    const whole = `ml_mutual_${members[0].name}`;
    const inject = (index, text) => injection(index, members.length, text);
    const sum = (parts) => parts.reduceRight((rest, part) => `(${part} + ${rest})`);
    const domain = sum(members.map((member) => member.domain));
    const result = sum(members.map((member) => member.result));
    const indices = new Map(members.map((member, index) => [member.entry.fullName, index]));
    const cases = members.map((member, index) => {
      this.current = { entry: member.entry, name: member.name, general: false, mutual: { indices, members } };
      const text = this.expr(member.body);
      this.current = null;
      const pattern = member.params.length ? member.tuple : '_';
      return `    | ${inject(index, pattern)} => ${inject(index, `(${text})`)}`;
    });
    const fallback = members.map((member, index) => `${inject(index, '_')} => ${inject(index, member.inhabitant)}`).join(' | ');
    const definition = `Definition ${whole} : ${domain} -> ${result} :=\n  ml_fix 64 (fun (ml_rec : ${domain} -> ${result}) (ml_args : ${domain}) =>\n    match ml_args with\n${cases.join('\n')}\n    end)\n    (fun ml_args => match ml_args with ${fallback} end).`;
    const projections = members.map((member, index) => {
      const binders = member.params.map((param) => ` (${param.name} : ${this.type(param.type)})`).join('');
      return `Definition ${member.name}${binders} : ${member.result} :=\n  match ${whole} ${inject(index, member.tuple)} with ${inject(index, 'ml_r')} => ml_r | _ => ${member.inhabitant} end.`;
    });
    return [definition, ...projections].join('\n\n');
  }

  theorem(entry) {
    const { binders, prop, plan } = renameTheorem(entry, ident, this.state.localReserved());
    const name = this.state.localName(entry.fullName);
    this.state.map(entry, name);
    const statement = `Theorem ${name}${binders.map((binder) => ` (${binder.name} : ${this.type(binder.type)})`).join('')} : ${this.prop(prop)}.`;
    const functions = [...new Set([...propFunctions(prop), ...collectHintFunctions(plan)])];
    const script = this.plan(plan, functions, binders.length === 0, 1);
    this.state.theorem(entry, name, { closedGoal: binders.length === 0 });
    return `${statement}\nProof.\n${script}\nQed.`;
  }

  plan(plan, functions, closed, depth) {
    const indent = '  '.repeat(depth);
    if (plan.k === 'close') return `${indent}${this.closer(plan.hints, functions, closed)}.`;
    const kase = plan.cases;
    let pattern;
    if (plan.type.kind === 'nat') {
      const succ = kase.find((item) => item.ctor === 'succ');
      const ih = plan.k === 'induction' ? succ.ihs[0] : '_';
      pattern = `induction ${plan.variable} as [|${succ.fields[0]} ${ih}] using N.peano_ind.`;
    } else {
      const groups = kase.map((item) => {
        const names = [];
        item.fields.forEach((field, index) => {
          names.push(field);
          if (plan.k === 'induction' && item.recursive[index]) names.push(item.ihs[item.recursive.slice(0, index).filter(Boolean).length]);
        });
        return names.join(' ');
      });
      pattern = `${plan.k === 'induction' ? 'induction' : 'destruct'} ${plan.variable} as [${groups.join(' | ')}].`;
    }
    const lines = [`${indent}${pattern}`];
    for (const item of kase) {
      lines.push(`${indent}{`);
      lines.push(this.plan(item.plan, functions, false, depth + 1));
      lines.push(`${indent}}`);
    }
    return lines.join('\n');
  }

  closer(hints, functions, closed) {
    const steps = [];
    const unfoldAll = [...new Set([...functions, ...hints.unfold])];
    const plain = unfoldAll.filter((name) => !this.natFunctions.has(name)).map((name) => this.state.ref(name));
    if (plain.length) steps.push(`cbn [${plain.join(' ')}]`);
    for (const name of unfoldAll.filter((fn) => this.natFunctions.has(fn))) {
      const { index, arity } = this.natFunctions.get(name);
      const ref = this.state.ref(name);
      const args = (value) => Array.from({ length: arity }, (_, position) => (position === index ? value : `?a${position}`));
      const uses = (value) => Array.from({ length: arity }, (_, position) => (position === index ? value : `a${position}`));
      steps.push(`repeat match goal with |- context [${ref} ${args('(N.succ ?k)').join(' ')}] => rewrite (${ref}_equation ${uses('(N.succ k)').join(' ')}) end`);
      steps.push(`repeat match goal with |- context [${ref} ${args('0%N').join(' ')}] => rewrite (${ref}_equation ${uses('0%N').join(' ')}) end`);
    }
    steps.push('ml_N_norm', 'cbv beta iota zeta');
    const alternatives = [];
    if (closed) alternatives.push('(vm_compute; reflexivity)');
    alternatives.push('ml_close');
    const rewrites = [...hints.hyps, ...hints.lemmas.map((lemma) => this.state.ref(lemma))];
    if (rewrites.length) {
      // Each rule rewrites at most REWRITE_BOUND times: an unbounded `?ih` never
      // stops when the rewritten side reappears in the result (`rewrite <- ih`
      // with `ih : f l = l` turns `l` into `f l` forever), so a false obligation
      // must fail instead of searching without end.
      const rules = rewrites.map((rule) => `${REWRITE_BOUND}?${rule}`).join(', ');
      alternatives.push(`(rewrite ${rules}; ml_close)`);
      alternatives.push(`(rewrite <- ${rules}; ml_close)`);
    }
    return `${steps.join('; ')}; first [${alternatives.join(' | ')}]`;
  }

  prop(prop) {
    switch (prop.p) {
      case 'forall':
        return `(forall ${prop.binders.map((binder) => `(${binder.name} : ${this.type(binder.type)})`).join(' ')}, ${this.prop(prop.body)})`;
      case 'and':
        return `(${this.prop(prop.left)} /\\ ${this.prop(prop.right)})`;
      case 'or':
        return `(${this.prop(prop.left)} \\/ ${this.prop(prop.right)})`;
      case 'implies':
        return `(${this.prop(prop.left)} -> ${this.prop(prop.right)})`;
      case 'not':
        return `(~ ${this.prop(prop.arg)})`;
      case 'bool':
        return `(${this.expr(prop.expr)} = true)`;
      case 'eq':
      case 'ne':
        if (prop.left.type?.kind === 'float') return this.floatProp(prop);
        return `(${this.expr(prop.left)} ${prop.p === 'eq' ? '=' : '<>'} ${this.expr(prop.right)})`;
      default: {
        if (prop.domain.kind === 'float') return this.floatProp(prop);
        const module = this.numericModule(prop.domain);
        const [left, right] = [this.expr(prop.left), this.expr(prop.right)];
        const relation = { lt: 'lt', le: 'le', gt: 'lt', ge: 'le' }[prop.p];
        return prop.p === 'gt' || prop.p === 'ge'
          ? `(${module}.${relation} ${right} ${left})`
          : `(${module}.${relation} ${left} ${right})`;
      }
    }
  }

  /** Number propositions are the source's Boolean tests computing to true. */
  floatProp(prop) {
    const [left, right] = [this.expr(prop.left), this.expr(prop.right)];
    if (prop.sameValue) {
      this.helpers.add('floatSame');
      return `(ml_float_same ${left} ${right} = ${prop.p === 'eq'})`;
    }
    return `(${this.comparison(prop.p, { kind: 'float' }, left, right)} = true)`;
  }

  floats() {
    this.usesFloat = true;
    this.state.encode('floats', 'a JavaScript Number is a Rocq primitive float, the same IEEE-754 binary64 with the same arithmetic, which the kernel computes with; % is ml_float_rem, the exact truncated remainder, and ml_js_number prints a value as JavaScript does');
  }

  numericModule(type) {
    if (type.kind === 'nat') return 'N';
    if (type.kind === 'int') return 'Z';
    if (type.kind === 'fixed') {
      this.state.machineInteger(type, type.signed ? 'Z' : 'N');
      return type.signed ? 'Z' : 'N';
    }
    if (type.kind === 'float') {
      this.floats();
      return 'PrimFloat';
    }
    throw new Error(`not numeric: ${type.kind}`);
  }

  expr(e) {
    switch (e.k) {
      case 'lit':
        return this.literal(e);
      case 'unit':
        return 'tt';
      case 'outNil':
        return '(@nil string)';
      case 'outCons':
        return `(${this.expr(e.head)} :: ${this.expr(e.tail)})`;
      case 'var':
        return e.name;
      case 'call': {
        const member = this.current?.mutual?.indices.get(e.fn);
        if (member !== undefined) {
          const args = e.args.map((arg) => this.expr(arg));
          const tuple = args.length === 1 ? args[0] : args.length ? `(${args.join(', ')})` : 'tt';
          const inject = (text) => injection(member, this.current.mutual.members.length, text);
          return `(match ml_rec ${inject(tuple)} with ${inject('ml_r')} => ml_r | _ => ${this.current.mutual.members[member].inhabitant} end)`;
        }
        const self = this.current && e.fn === this.current.entry.fullName && this.current.entry.recursive;
        if (self && this.current.fuel) return `(ml_go ml_fuel ${e.args.map((arg) => this.expr(arg)).join(' ')})`;
        if (self && this.current.general) {
          const args = e.args.map((arg) => this.expr(arg));
          return `(ml_rec ${args.length === 1 ? args[0] : args.length ? `(${args.join(', ')})` : 'tt'})`;
        }
        const head = self ? this.current.name : this.state.ref(e.fn);
        return e.args.length ? `(${head} ${e.args.map((arg) => this.expr(arg)).join(' ')})` : head;
      }
      case 'ctor': {
        const head = this.state.ctorRef(e.data, e.ctor);
        return e.args.length ? `(${head} ${e.args.map((arg) => this.expr(arg)).join(' ')})` : head;
      }
      case 'unary':
        if (e.op === 'not') return `(negb ${this.expr(e.arg)})`;
        if (e.semantics === 'checked') throw unthreaded('a machine-integer negation');
        if (e.type.kind === 'float') return `(PrimFloat.opp ${this.expr(e.arg)})`;
        return `(Z.opp ${this.expr(e.arg)})`;
      case 'binary':
        return this.binary(e);
      case 'if':
        return `(if ${this.expr(e.cond)} then ${this.expr(e.then)} else ${this.expr(e.else)})`;
      case 'let':
        return `(let ${e.name} := ${this.expr(e.value)} in ${this.expr(e.body)})`;
      case 'match':
        return this.match(e);
      case 'toString':
        return this.toText(e.arg, e.console);
      case 'stringMap':
        throw unsupported(`.${e.op}()`, readStringMapRefusal('Rocq', e.op), e.span);
      case 'stringTest': {
        const helper = readStringTestHelper('Rocq', e.op);
        this.helpers.add(helper);
        return renderStringTestExpression('Rocq', e.op, this.expr(e.string), this.expr(e.search));
      }
      case 'cast':
        return this.cast(e);
      case 'abort':
        throw unthreaded('an abort');
      case 'array':
        return `(${[...e.items.map((item) => this.expr(item)), `@nil ${this.type(e.type.element)}`].join(' :: ')})`;
      case 'append':
        return `(List.app ${this.expr(e.left)} ${this.expr(e.right)})`;
      case 'index': {
        this.state.arrayRead();
        this.helpers.add('listAt');
        let index = this.expr(e.index);
        if (e.index.type.kind === 'float') {
          this.helpers.add('floatIndex');
          index = `(ml_float_index ${index})`;
        } else if (e.index.type.kind === 'nat') index = `(Z.of_N ${index})`;
        return `(ml_list_at ${this.expr(e.array)} ${index} ${this.inhabitant(e.type)})`;
      }
      case 'length': {
        if (e.array.type.kind === 'string') {
          this.floats();
          return renderStringLengthExpression('Rocq', this.expr(e.array));
        }
        const length = `(Z.of_nat (List.length ${this.expr(e.array)}))`;
        if (e.type.kind !== 'float') return length;
        this.floats();
        return `(PrimFloat.of_uint63 (Uint63.of_Z ${length}))`;
      }
      case 'math':
        return this.math(e);
      default:
        throw new Error(`no Rocq expression for ${e.k}`);
    }
  }

  /** Math and Number functions: PrimFloat's where they agree with JavaScript, the math helpers otherwise. */
  math(e) {
    this.floats();
    const args = e.args.map((arg) => this.expr(arg));
    const native = { abs: 'PrimFloat.abs', sqrt: 'PrimFloat.sqrt', isNaN: 'PrimFloat.is_nan' }[e.op];
    if (native) return `(${native} ${args[0]})`;
    this.helpers.add('math');
    switch (e.op) {
      case 'max':
      case 'min':
        if (!args.length) return e.op === 'max' ? 'PrimFloat.neg_infinity' : 'PrimFloat.infinity';
        return args.reduce((left, right) => `(ml_${e.op} ${left} ${right})`);
      case 'maxOf':
      case 'minOf':
        return `(List.fold_left ml_${e.op.slice(0, 3)} ${args[0]} ${e.op === 'maxOf' ? 'PrimFloat.neg_infinity' : 'PrimFloat.infinity'})`;
      default:
        return `(ml_${{ isFinite: 'is_finite', isInteger: 'is_integer', isSafeInteger: 'is_safe_integer' }[e.op] ?? e.op} ${args[0]})`;
    }
  }

  literal(e) {
    switch (e.type.kind) {
      case 'nat':
        return `${e.value}%N`;
      case 'int':
        return e.value.startsWith('-') ? `(${e.value})%Z` : `${e.value}%Z`;
      case 'fixed':
        this.state.machineInteger(e.type, e.type.signed ? 'Z' : 'N');
        if (!e.type.signed) return `${e.value}%N`;
        return e.value.startsWith('-') ? `(${e.value})%Z` : `${e.value}%Z`;
      case 'bool':
        return String(e.value);
      case 'string':
        return `"${String(e.value).replace(/"/gu, '""')}"%string`;
      case 'float': {
        this.floats();
        const special = { NaN: 'PrimFloat.nan', Infinity: 'PrimFloat.infinity', '-Infinity': 'PrimFloat.neg_infinity' }[e.value];
        if (special) return special;
        return e.value.startsWith('-') ? `(PrimFloat.opp ${e.value.slice(1)}%float)` : `${e.value}%float`;
      }
      default:
        throw new Error(`no Rocq literal for ${e.type.kind}`);
    }
  }

  inhabitant(type) {
    switch (type.kind) {
      case 'nat':
        return '0%N';
      case 'int':
        return '0%Z';
      case 'fixed':
        return type.signed ? '0%Z' : '0%N';
      case 'bool':
        return 'false';
      case 'string':
        return 'EmptyString';
      case 'float':
        return '0%float';
      case 'unit':
        return 'tt';
      case 'output':
        return '(@nil string)';
      case 'array':
        return `(@nil ${this.type(type.element)})`;
      case 'data': {
        const entry = this.program.declarations.get(type.name);
        const ctor = entry.ctors.find((candidate) => candidate.fields.every((field) => field.type.kind !== 'data'))
          ?? entry.ctors[0];
        const args = ctor.fields.map((field) => this.inhabitant(field.type));
        const head = this.state.ctorRef(type.name, ctor.name);
        return args.length ? `(${head} ${args.join(' ')})` : head;
      }
      default:
        throw new Error(`no Rocq inhabitant for ${type.kind}`);
    }
  }

  binary(e) {
    const left = this.expr(e.left);
    const right = this.expr(e.right);
    switch (e.op) {
      case 'and':
        return `(andb ${left} ${right})`;
      case 'or':
        return `(orb ${left} ${right})`;
      case 'concat':
        return `(String.append ${left} ${right})`;
      case 'eq':
      case 'ne':
      case 'lt':
      case 'le':
      case 'gt':
      case 'ge':
        return this.comparison(e.op, e.domain, left, right);
      default:
        return this.arithmetic(e, left, right);
    }
  }

  comparison(op, domain, left, right) {
    let module;
    if (domain.kind === 'bool') module = 'Bool';
    else if (domain.kind === 'string') module = 'String';
    else module = this.numericModule(domain);
    const test = {
      eq: `(${module}.eqb ${left} ${right})`,
      ne: `(negb (${module}.eqb ${left} ${right}))`,
      lt: `(${module}.ltb ${left} ${right})`,
      le: `(${module}.leb ${left} ${right})`,
      gt: `(${module}.ltb ${right} ${left})`,
      ge: `(${module}.leb ${right} ${left})`,
    }[op];
    if (!test) throw new Error(`no Rocq comparison ${op}`);
    return test;
  }

  arithmetic(e, left, right) {
    const module = this.numericModule(e.domain);
    // A machine-integer operation, one that may abort, reaches here as its abort test and its value computed on the representation (output.js).
    if (e.semantics === 'checked' || e.byZero === 'abort' || e.type.kind === 'fixed') throw unthreaded(`a machine-integer ${e.op}`);
    if (e.semantics === 'ieee') {
      if (e.op !== 'rem') return `(PrimFloat.${e.op} ${left} ${right})`;
      this.helpers.add('floatRem');
      return `(ml_float_rem ${left} ${right})`;
    }
    switch (e.op) {
      case 'add':
        return `(${module}.add ${left} ${right})`;
      case 'mul':
        return `(${module}.mul ${left} ${right})`;
      case 'sub':
        // N.sub truncates at zero, which is exactly natural subtraction.
        return `(${module}.sub ${left} ${right})`;
      case 'div':
      case 'rem': {
        const division = e.op === 'div';
        if (module === 'N') return `(N.${division ? 'div' : 'modulo'} ${left} ${right})`;
        if (e.rounding === 'trunc') return `(Z.${division ? 'quot' : 'rem'} ${left} ${right})`;
        if (e.rounding === 'floor') return `(Z.${division ? 'div' : 'modulo'} ${left} ${right})`;
        this.helpers.add('euclid');
        return `(ml_Z_${division ? 'ediv' : 'emod'} ${left} ${right})`;
      }
      default:
        throw new Error(`no Rocq arithmetic ${e.op}`);
    }
  }

  match(e) {
    if (e.scrutinee.k !== 'var') {
      const name = `ml_scrutinee`;
      return `(let ${name} := ${this.expr(e.scrutinee)} in ${this.match({ ...e, scrutinee: { k: 'var', name, type: e.scrutinee.type } })})`;
    }
    const subject = e.scrutinee.name;
    if (e.scrutinee.type.kind !== 'data') {
      // Natural-number matches test for zero; the successor case binds the predecessor.
      const zero = e.cases.find((kase) => kase.pattern.k === 'natZero');
      const succ = e.cases.find((kase) => kase.pattern.k === 'natSucc');
      const fallback = e.cases.find((kase) => kase.pattern.k === 'wild' || kase.pattern.k === 'bind');
      const bindFallback = (kase) => (kase.pattern.k === 'bind' ? `(let ${kase.pattern.name} := ${subject} in ${this.expr(kase.body)})` : this.expr(kase.body));
      const zeroText = zero ? this.expr(zero.body) : bindFallback(fallback);
      const succText = succ
        ? `(let ${succ.pattern.name} := N.pred ${subject} in ${this.expr(succ.body)})`
        : bindFallback(fallback);
      return `(if N.eqb ${subject} 0%N then ${zeroText} else ${succText})`;
    }
    const entry = this.program.declarations.get(e.scrutinee.type.name);
    const arms = [];
    for (const ctor of entry.ctors) {
      const kase = e.cases.find((item) => item.pattern.k === 'ctor' && item.pattern.ctor === ctor.name)
        ?? e.cases.find((item) => item.pattern.k === 'wild' || item.pattern.k === 'bind');
      const binds = kase.pattern.k === 'ctor' ? kase.pattern.binds.map((bind) => bind ?? '_') : ctor.fields.map(() => '_');
      let body = this.expr(kase.body);
      if (kase.pattern.k === 'bind') body = `(let ${kase.pattern.name} := ${subject} in ${body})`;
      arms.push(`| ${[this.state.ctorRef(entry.fullName, ctor.name), ...binds].join(' ')} => ${body}`);
    }
    return `(match ${subject} with ${arms.join(' ')} end)`;
  }

  toText(arg, console = false) {
    const text = this.expr(arg);
    switch (arg.type.kind) {
      case 'string':
        return text;
      case 'bool':
        this.helpers.add('boolToString');
        return `(ml_bool_to_string ${text})`;
      case 'nat':
        this.helpers.add('digits');
        return `(ml_N_to_string ${text})`;
      case 'int':
        this.helpers.add('zToString');
        return `(ml_Z_to_string ${text})`;
      case 'fixed':
        this.state.machineInteger(arg.type, arg.type.signed ? 'Z' : 'N');
        this.helpers.add(arg.type.signed ? 'zToString' : 'digits');
        return arg.type.signed ? `(ml_Z_to_string ${text})` : `(ml_N_to_string ${text})`;
      case 'float':
        this.helpers.add('jsNumber');
        if (console) this.helpers.add('jsConsole');
        return `(${console ? 'ml_js_console' : 'ml_js_number'} ${text})`;
      default:
        throw unsupported('output of structured values', `a ${arg.type.kind} value has no portable textual form`, arg.span);
    }
  }

  cast(e) {
    const arg = this.expr(e.arg);
    const from = e.from.kind === 'fixed' ? (e.from.signed ? 'Z' : 'N') : (e.from.kind === 'nat' ? 'N' : 'Z');
    const to = e.to.kind === 'fixed' ? (e.to.signed ? 'Z' : 'N') : (e.to.kind === 'nat' ? 'N' : 'Z');
    if (e.flavor === 'checked') throw unthreaded('a checked conversion to a natural');
    if (from === to) return arg;
    if (from === 'N') return `(Z.of_N ${arg})`;
    return `(Z.to_N ${arg})`;
  }

  main(main) {
    const { effects } = renameMain(main, ident, this.state.localReserved());
    let assertion = 0;
    const theorems = [];
    // A program that may abort is the lines it prints and the message of the abort that stops it, if one does.
    const aborts = this.program.abortsThreaded;
    if (aborts) this.helpers.add('emit');
    const arms = (effect, made, aborted) => {
      const [mk, abort] = effect.ctors.map((ctor) => this.state.ctorRef(effect.data, ctor));
      return `match ${this.expr(effect.pair)} with ${mk} _ ${effect.name} => ${made} | ${abort} _ ${aborted.bind} => ${aborted.body} end`;
    };
    const build = (index) => {
      if (index >= effects.length) return aborts ? '(nil, None)' : 'nil';
      const effect = effects[index];
      if (effect.k === 'print') {
        return aborts ? `ml_emit (${this.expr(effect.expr)} :: nil)\n  (${build(index + 1)})` : `${this.expr(effect.expr)} ::\n  ${build(index + 1)}`;
      }
      if (effect.k === 'output') {
        return `${aborts ? 'ml_emit' : 'app'} (List.rev ${this.expr(effect.expr)})\n  (${build(index + 1)})`;
      }
      if (effect.k === 'let') return `let ${effect.name} := ${this.expr(effect.value)} in\n  ${build(index + 1)}`;
      if (effect.k === 'unwrap') return `(${arms(effect, build(index + 1), { bind: 'ml_m', body: '(nil, Some ml_m)' })})`;
      assertion += 1;
      // The assertion is stated of the values main computes before it; a run that aborts before it never reaches it.
      const statement = effects.slice(0, index).reduceRight((rest, item) => {
        if (item.k === 'let') return `let ${item.name} := ${this.expr(item.value)} in ${rest}`;
        if (item.k === 'unwrap') return `(${arms(item, rest, { bind: '_', body: 'True' })})`;
        return rest;
      }, this.prop(effect.prop));
      const name = `ml_assertion_${assertion}`;
      theorems.push(`Theorem ${name} : ${statement}.\nProof. ml_decide. Qed.`);
      this.helpers.add('decide');
      this.state.assertionTheorem(name, effect);
      return build(index + 1);
    };
    const body = build(0);
    if (main.sequentialAsync) this.state.encode('sequential-async', 'an async function is the function its body computes and await is its call: every call of one is awaited where it is made, so nothing runs concurrently and the output is the same, in the same order');
    this.state.encode('program-output', 'main is the list of lines the source program prints, in order; evaluating it with vm_compute runs the program');
    if (this.program.outputThreaded) this.state.encode('output-threading', 'a function that prints, directly or through a function it calls, takes the lines printed before it and returns them, with its own in front, paired with its value in a generated ml_io data type; main lists the lines of each step in the order they were printed');
    if (aborts) this.state.encode('abort-threading', 'a function that may abort, directly or through a function it calls, returns the source\'s abort message with the lines printed before it in the generated ml_io data type; main is the pair of the lines printed and Some message when the program aborts, None when it does not');
    return [...theorems, `Definition main : ${aborts ? 'list string * option string' : 'list string'} :=\n  ${body}.`].join('\n\n');
  }
}

function collectHintFunctions(plan) {
  if (plan.k === 'close') return plan.hints.unfold;
  return plan.cases.flatMap((kase) => collectHintFunctions(kase.plan));
}

/** How many times a function body calls the function itself. */
function selfCalls(node, name) {
  if (Array.isArray(node)) return node.reduce((count, item) => count + selfCalls(item, name), 0);
  if (node === null || typeof node !== 'object') return 0;
  const own = node.k === 'call' && node.fn === name ? 1 : 0;
  return Object.entries(node).reduce((count, [key, value]) => (key === 'type' ? count : count + selfCalls(value, name)), own);
}
