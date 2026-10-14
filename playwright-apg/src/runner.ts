import { checkUrl, patterns, type PatternDefinition, type PatternId } from "./patterns";

export type CheckStatus = "passed" | "failed" | "skipped";

export interface CheckResult {
  id: string;
  summary: string;
  status: CheckStatus;
  detail?: string;
  url: string;
}

/** A failed check. Throw it, or return its message from a check body. */
export class CheckFailure extends Error {}

export class PatternRun {
  readonly pattern: PatternDefinition;
  private readonly results = new Map<string, CheckResult>();

  constructor(id: PatternId) {
    this.pattern = patterns[id];
  }

  /**
   * Runs one check. The body fails the check by returning a message or throwing.
   * Checks listed in `requires` must have passed, otherwise this one is skipped.
   */
  async check(id: string, body: () => Promise<string | void>, requires: string[] = []): Promise<boolean> {
    const definition = this.pattern.checks.find((c) => c.id === id);
    if (!definition) throw new Error(`Unknown check "${id}" for pattern ${this.pattern.id}`);
    const base = { id, summary: definition.summary, url: checkUrl(this.pattern, definition) };

    const blocker = requires.find((r) => this.results.get(r)?.status !== "passed");
    if (blocker) {
      this.results.set(id, { ...base, status: "skipped", detail: `Not checked because "${blocker}" did not pass.` });
      return false;
    }
    try {
      const failure = await body();
      this.results.set(id, failure ? { ...base, status: "failed", detail: failure } : { ...base, status: "passed" });
    } catch (error) {
      const detail = error instanceof CheckFailure ? error.message : `Error while checking: ${firstLine(error)}`;
      this.results.set(id, { ...base, status: "failed", detail });
    }
    return this.results.get(id)!.status === "passed";
  }

  /** Marks checks as passed because a native HTML element provides the behaviour. */
  native(ids: string[], note: string): void {
    for (const id of ids) {
      const definition = this.pattern.checks.find((c) => c.id === id)!;
      this.results.set(id, { id, summary: definition.summary, status: "passed", detail: note, url: checkUrl(this.pattern, definition) });
    }
  }

  /** Marks every check that did not run as skipped, so the report always lists the full checklist. */
  skipRemaining(reason: string): void {
    for (const c of this.pattern.checks) {
      if (!this.results.has(c.id)) {
        this.results.set(c.id, { id: c.id, summary: c.summary, status: "skipped", detail: reason, url: checkUrl(this.pattern, c) });
      }
    }
  }

  get report(): CheckResult[] {
    this.skipRemaining("Not reached.");
    return this.pattern.checks.map((c) => this.results.get(c.id)!);
  }

  get passed(): boolean {
    return this.report.every((r) => r.status === "passed");
  }

  message(subject: string): string {
    const report = this.report;
    const failed = report.filter((r) => r.status !== "passed").length;
    const header = failed === 0
      ? `${subject} follows the APG ${this.pattern.name} pattern (${report.length}/${report.length} checks passed).`
      : `${subject} does not follow the APG ${this.pattern.name} pattern: ${failed} of ${report.length} checks did not pass.`;
    const lines = report.map((r) => {
      const mark = r.status === "passed" ? "✓" : r.status === "failed" ? "✗" : "-";
      const body = [`  ${mark} ${r.id}: ${r.summary}`];
      if (r.status !== "passed") {
        if (r.detail) body.push(`      ${r.detail}`);
        body.push(`      See ${r.url}`);
      }
      return body.join("\n");
    });
    return [header, `Pattern: ${this.pattern.url}`, "", ...lines].join("\n");
  }
}

function firstLine(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.split("\n")[0];
}
