export interface CheckDefinition {
  id: string;
  /** The requirement, as one sentence. */
  summary: string;
  /** Concrete markup, attributes or keys that make the check pass. */
  howToPass: string;
  /** The APG section or WCAG Understanding page the check comes from. */
  url: string;
}

export interface SpecDefinition {
  id: string;
  /** Shown in messages and the README, e.g. "APG Modal Dialog pattern". */
  name: string;
  /** Verb phrase for messages: "follows the APG Modal Dialog pattern". */
  passPhrase: string;
  failPhrase: string;
  matcher: string;
  /** Prefix of the generated check-id types, e.g. "Modal" gives `ModalCheck`. */
  typeName: string;
  url: string;
  checks: CheckDefinition[];
}
