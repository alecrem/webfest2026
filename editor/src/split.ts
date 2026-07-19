// ドラッグでパネルの大きさを変えられる仕切り (スプリッター)。

export function clampFraction(value: number, min = 0.2, max = 0.8): number {
  return Math.min(max, Math.max(min, value));
}

export function fractionAt(
  pos: number,
  start: number,
  size: number,
  min?: number,
  max?: number,
): number {
  return clampFraction((pos - start) / size, min, max);
}

interface SplitOptions {
  gutter: HTMLElement;
  container: HTMLElement;
  axis: "x" | "y";
  min?: number;
  max?: number;
  onFraction: (fraction: number) => void;
}

export function attachSplit(options: SplitOptions): void {
  const { gutter, container, axis, min, max, onFraction } = options;

  gutter.addEventListener("pointerdown", (down) => {
    down.preventDefault();
    gutter.setPointerCapture(down.pointerId);
    // ドラッグ中は iframe がポインターを奪わないように (style.css 参照)
    document.body.classList.add("dragging");

    const move = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const fraction =
        axis === "x"
          ? fractionAt(e.clientX, rect.left, rect.width, min, max)
          : fractionAt(e.clientY, rect.top, rect.height, min, max);
      onFraction(fraction);
    };

    const up = () => {
      document.body.classList.remove("dragging");
      gutter.removeEventListener("pointermove", move);
      gutter.removeEventListener("pointerup", up);
    };

    gutter.addEventListener("pointermove", move);
    gutter.addEventListener("pointerup", up);
  });
}

export function setupSplit(
  storageKey: string,
  cssVar: string,
  options: Omit<SplitOptions, "onFraction">,
): void {
  const saved = localStorage.getItem(storageKey);
  if (saved) options.container.style.setProperty(cssVar, saved);

  attachSplit({
    ...options,
    onFraction: (fraction) => {
      const value = `${(fraction * 100).toFixed(1)}%`;
      options.container.style.setProperty(cssVar, value);
      localStorage.setItem(storageKey, value);
    },
  });
}
