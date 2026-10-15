const TRUTH_VALUE_NAMES = new Set(['True', 'False', 'Unknown', 'Both']);
const PROBABILITY_SCALE_BASIS_POINTS = 10_000;
const PROBABILITY_SCALE_BIGINT = 10_000n;

/**
 * A many-valued truth value: the `logic-model.belnap-four-valued` model of
 * data/foundation-models.json, one logic among the recorded models rather than
 * a built-in universal logic.
 */
export class TruthValue {
  constructor(value) {
    if (!TRUTH_VALUE_NAMES.has(value)) {
      throw new TypeError(`truth value must be one of True, False, Unknown, or Both; got ${value}`);
    }
    this.value = value;
  }

  static from(value) {
    if (value instanceof TruthValue) {
      return TruthValue.from(value.value);
    }
    switch (value) {
      case 'True':
        return TruthValue.True;
      case 'False':
        return TruthValue.False;
      case 'Unknown':
        return TruthValue.Unknown;
      case 'Both':
        return TruthValue.Both;
      default:
        return new TruthValue(value);
    }
  }

  and(other) {
    const left = TruthValue.from(this);
    const right = TruthValue.from(other);
    if (left === TruthValue.False || right === TruthValue.False) {
      return TruthValue.False;
    }
    if (left === TruthValue.True) {
      return right;
    }
    if (right === TruthValue.True) {
      return left;
    }
    if (left === TruthValue.Both || right === TruthValue.Both) {
      return TruthValue.Both;
    }
    return TruthValue.Unknown;
  }

  or(other) {
    const left = TruthValue.from(this);
    const right = TruthValue.from(other);
    if (left === TruthValue.True || right === TruthValue.True) {
      return TruthValue.True;
    }
    if (left === TruthValue.False) {
      return right;
    }
    if (right === TruthValue.False) {
      return left;
    }
    if (left === TruthValue.Both || right === TruthValue.Both) {
      return TruthValue.Both;
    }
    return TruthValue.Unknown;
  }

  negate() {
    switch (TruthValue.from(this)) {
      case TruthValue.True:
        return TruthValue.False;
      case TruthValue.False:
        return TruthValue.True;
      case TruthValue.Unknown:
        return TruthValue.Unknown;
      case TruthValue.Both:
        return TruthValue.Both;
      default:
        return TruthValue.from(this.value).negate();
    }
  }

  equals(other) {
    return this.value === TruthValue.from(other).value;
  }

  toJSON() {
    return this.value;
  }

  toString() {
    return this.value;
  }
}

TruthValue.True = Object.freeze(new TruthValue('True'));
TruthValue.False = Object.freeze(new TruthValue('False'));
TruthValue.Unknown = Object.freeze(new TruthValue('Unknown'));
TruthValue.Both = Object.freeze(new TruthValue('Both'));
Object.freeze(TruthValue);

export class Probability {
  constructor(basisPoints) {
    if (!isBasisPoints(basisPoints)) {
      throw new TypeError(
        `probability basis points must be an integer from 0 to 10000, got ${basisPoints}`,
      );
    }
    this._basisPoints = Number(basisPoints);
  }

  static from(value) {
    return value instanceof Probability ? value : new Probability(value);
  }

  static fromBasisPoints(basisPoints) {
    return isBasisPoints(basisPoints) ? new Probability(basisPoints) : undefined;
  }

  static from_basis_points(basisPoints) {
    return Probability.fromBasisPoints(basisPoints);
  }

  static fromRatio(numerator, denominator) {
    const normalizedNumerator = toNonNegativeInteger(numerator);
    const normalizedDenominator = toNonNegativeInteger(denominator);
    if (
      normalizedNumerator === undefined ||
      normalizedDenominator === undefined ||
      normalizedDenominator === 0n ||
      normalizedNumerator > normalizedDenominator
    ) {
      return undefined;
    }

    const scaled = (
      normalizedNumerator * PROBABILITY_SCALE_BIGINT +
      normalizedDenominator / 2n
    ) / normalizedDenominator;
    return Probability.fromBasisPoints(Number(scaled));
  }

  static from_ratio(numerator, denominator) {
    return Probability.fromRatio(numerator, denominator);
  }

  basisPoints() {
    return this._basisPoints;
  }

  basis_points() {
    return this.basisPoints();
  }

  complement() {
    return new Probability(PROBABILITY_SCALE_BASIS_POINTS - this._basisPoints);
  }

  equals(other) {
    return this._basisPoints === Probability.from(other)._basisPoints;
  }

  toJSON() {
    return this._basisPoints;
  }

  valueOf() {
    return this._basisPoints;
  }
}

Probability.ZERO = Object.freeze(new Probability(0));
Probability.ONE = Object.freeze(new Probability(PROBABILITY_SCALE_BASIS_POINTS));

/** A probabilistic truth value: the `logic-model.probabilistic-truth` model of data/foundation-models.json. */
export class ProbabilisticTruthValue {
  constructor(trueProbability) {
    this._trueProbability = Probability.from(trueProbability);
  }

  static fromRatio(numerator, denominator) {
    const probability = Probability.fromRatio(numerator, denominator);
    return probability ? new ProbabilisticTruthValue(probability) : undefined;
  }

  static from_ratio(numerator, denominator) {
    return ProbabilisticTruthValue.fromRatio(numerator, denominator);
  }

  trueProbability() {
    return this._trueProbability;
  }

  true_probability() {
    return this.trueProbability();
  }

  falseProbability() {
    return this._trueProbability.complement();
  }

  false_probability() {
    return this.falseProbability();
  }

  negate() {
    return new ProbabilisticTruthValue(this.falseProbability());
  }

  and(other) {
    const right = other instanceof ProbabilisticTruthValue
      ? other
      : new ProbabilisticTruthValue(other);
    return new ProbabilisticTruthValue(
      multiplyProbabilities(this.trueProbability(), right.trueProbability()),
    );
  }

  or(other) {
    const right = other instanceof ProbabilisticTruthValue
      ? other
      : new ProbabilisticTruthValue(other);
    return this.negate().and(right.negate()).negate();
  }

  equals(other) {
    const right = other instanceof ProbabilisticTruthValue
      ? other
      : new ProbabilisticTruthValue(other);
    return this._trueProbability.equals(right._trueProbability);
  }

  toJSON() {
    return {
      trueProbability: this._trueProbability.basisPoints(),
    };
  }
}

function multiplyProbabilities(left, right) {
  const product = left.basisPoints() * right.basisPoints();
  const rounded = Math.floor(
    (product + PROBABILITY_SCALE_BASIS_POINTS / 2) / PROBABILITY_SCALE_BASIS_POINTS,
  );
  return new Probability(rounded);
}

function isBasisPoints(value) {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= PROBABILITY_SCALE_BASIS_POINTS
  );
}

function toNonNegativeInteger(value) {
  if (typeof value === 'bigint') {
    return value >= 0n ? value : undefined;
  }
  if (Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }
  return undefined;
}
