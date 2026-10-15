export class ReplacementRule {
  constructor(captureName, replacementText) {
    this.captureName = captureName;
    this.replacementText = replacementText;
  }

  static capturedText(captureName, replacementText) {
    return new ReplacementRule(captureName, replacementText);
  }
}

export class TextReplacement {
  constructor(linkId, oldText, newText) {
    this.linkId = linkId;
    this.oldText = oldText;
    this.newText = newText;
  }
}

export class ReplacementReport {
  constructor(replacements = [], substitutionReport = undefined) {
    this.replacements = replacements;
    this.substitutionReport = substitutionReport;
  }

  static empty() {
    return new ReplacementReport();
  }

  isEmpty() {
    return this.replacements.length === 0 && !this.substitutionReport;
  }

  substitution() {
    return this.substitutionReport;
  }
}
