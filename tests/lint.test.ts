import { HTMLHint } from "htmlhint";
import { describe, expect, it } from "vitest";
import { jaMessage, RULES } from "../editor/src/lint";

function lintOne(html: string) {
  const messages = HTMLHint.verify(html, RULES);
  expect(messages.length).toBeGreaterThan(0);
  return jaMessage(messages[0]);
}

describe("lint メッセージの日本語化", () => {
  it("閉じタグ忘れ (tag-pair)", () => {
    const message = lintOne("<h1>タイトル");
    expect(message).toContain("閉じタグ");
    expect(message).toContain("</h1>");
  });

  it("id の重複 (id-unique)", () => {
    const message = lintOne('<p id="a"></p><p id="a"></p>');
    expect(message).toContain("id「a」");
  });

  it("属性の重複 (attr-no-duplication)", () => {
    const message = lintOne('<p class="x" class="y"></p>');
    expect(message).toContain("属性「class」");
  });

  it("src が空 (src-not-empty)", () => {
    const message = lintOne('<img src="">');
    expect(message).toContain("空です");
  });

  it("大文字のタグ名 (tagname-lowercase)", () => {
    const message = lintOne("<DIV></DIV>");
    expect(message).toContain("小文字");
  });

  it("未知のルールは元のメッセージのまま", () => {
    const original = "Some other message";
    expect(
      jaMessage({
        line: 1,
        col: 1,
        type: "warning",
        message: original,
        rule: { id: "somewhere-else" },
      }),
    ).toBe(original);
  });
});
