import type { CheckDefinition, SpecDefinition } from "./registry/types";

export type CheckStatus = "passed" | "failed" | "skipped" | "not-applicable";

export interface CheckResult {
  id: string;
  summary: string;
  howToPass: string;
  status: CheckStatus;
  detail?: string;
  url: string;
}

/** A failed check. Throw it, or return its message from a check body. */
export class CheckFailure extends Error {}

/**
 * Runs the checks of one spec (an APG pattern or the WCAG criteria). Every check runs, because
 * later checks depend on the state earlier ones leave; `selection` only decides which checks are
 * reported and count towards passing.
 */
export class PatternRun {
  readonly spec: SpecDefinition;
  readonly selection: string[] | null;
  private readonly results = new Map<string, CheckResult>();

  constructor(spec: SpecDefinition, selection?: readonly string[] | null) {
    this.spec = spec;
    if (selection) {
      const unknown = selection.filter((id) => !spec.checks.some((c) => c.id === id));
      if (unknown.length) {
        throw new Error(`Unknown check(s) ${unknown.map((u) => `"${u}"`).join(", ")} for ${spec.matcher}. Valid checks: ${spec.checks.map((c) => `"${c.id}"`).join(", ")}.`);
      }
      if (selection.length === 0) throw new Error(`${spec.matcher} was given an empty list of checks; omit it to run every check.`);
    }
    this.selection = selection ? [...selection] : null;
  }

  /** Whether the check is reported. Checks that are not selected may still run as prerequisites. */
  selected(id: string): boolean {
    return this.selection === null || this.selection.includes(id);
  }

  private definition(id: string): CheckDefinition {
    const definition = this.spec.checks.find((c) => c.id === id);
    if (!definition) throw new Error(`Unknown check "${id}" for ${this.spec.id}`);
    return definition;
  }

  private set(id: string, status: CheckStatus, detail?: string): void {
    const { summary, howToPass, url } = this.definition(id);
    this.results.set(id, { id, summary, howToPass, url, status, ...(detail ? { detail } : {}) });
  }

  /**
   * Runs one check. The body fails the check by returning a message or throwing.
   * Checks listed in `requires` must have passed, otherwise this one is skipped.
   */
  async check(id: string, body: () => Promise<string | void>, requires: string[] = []): Promise<boolean> {
    this.definition(id);
    const blocker = requires.find((r) => this.results.get(r)?.status !== "passed");
    if (blocker) {
      const cause = this.results.get(blocker);
      const why = cause?.detail && !this.selected(blocker) ? ` (${cause.detail})` : "";
      this.set(id, "skipped", `Not checked because "${blocker}" did not pass${why}.`);
      return false;
    }
    try {
      const failure = await body();
      this.set(id, failure ? "failed" : "passed", failure || undefined);
    } catch (error) {
      this.set(id, "failed", error instanceof CheckFailure ? error.message : `Error while checking: ${firstLine(error)}`);
    }
    return this.results.get(id)!.status === "passed";
  }

  /** Marks checks as passed because a native HTML element provides the behaviour. */
  native(ids: string[], note: string): void {
    for (const id of ids) this.set(id, "passed", note);
  }

  /** Marks a check that does not apply to this component (it doesn't count as a failure). */
  notApplicable(id: string, reason: string): void {
    this.set(id, "not-applicable", reason);
  }

  status(id: string): CheckStatus | undefined {
    return this.results.get(id)?.status;
  }

  /** Marks every check that did not run as skipped, so the report always lists the full checklist. */
  skipRemaining(reason: string): void {
    for (const c of this.spec.checks) if (!this.results.has(c.id)) this.set(c.id, "skipped", reason);
  }

  /** Every check, selected or not. */
  get fullReport(): CheckResult[] {
    this.skipRemaining("Not reached.");
    return this.spec.checks.map((c) => this.results.get(c.id)!);
  }

  /** The selected checks (all of them when there is no selection). */
  get report(): CheckResult[] {
    return this.fullReport.filter((r) => this.selected(r.id));
  }

  get passed(): boolean {
    return this.report.every((r) => r.status === "passed" || r.status === "not-applicable");
  }

  message(subject: string): string {
    const report = this.report;
    const failed = report.filter((r) => r.status === "failed" || r.status === "skipped").length;
    const scope = this.selection ? ` (selected: ${this.selection.join(", ")})` : "";
    const header = failed === 0
      ? `${subject} ${this.spec.passPhrase} (${report.length}/${report.length} checks passed${scope}).`
      : `${subject} ${this.spec.failPhrase}: ${failed} of ${report.length} checks did not pass${scope}.`;
    const lines = report.map((r) => {
      const mark = { passed: "✓", failed: "✗", skipped: "-", "not-applicable": "○" }[r.status];
      const body = [`  ${mark} ${r.id}: ${r.summary}`];
      if (r.status === "not-applicable" && r.detail) body.push(`      ${r.detail}`);
      if (r.status === "failed" || r.status === "skipped") {
        if (r.detail) body.push(...r.detail.split("\n").map((l) => `      ${l}`));
        body.push(`      How to pass: ${r.howToPass}`);
        body.push(`      See ${r.url}`);
      }
      return body.join("\n");
    });
    return [header, `Reference: ${this.spec.url}`, "", ...lines].join("\n");
  }
}

function firstLine(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.split("\n")[0];
}
