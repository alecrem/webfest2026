declare module "htmlhint" {
  export interface LintMessage {
    line: number;
    col: number;
    type: "error" | "warning" | "info";
    message: string;
    raw?: string;
    rule: { id: string };
  }
  export const HTMLHint: {
    verify(code: string, rules?: Record<string, boolean>): LintMessage[];
  };
}
