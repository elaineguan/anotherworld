function getCol(_hex: string, alpha: number): string {
  return `rgba(148,148,148,${alpha})`;
}

const PIXEL_OFFSETS: [number, number][] = [
  [0, -4],
  [0, -3],
  [0, -2],
  [0, 2],
  [0, 3],
  [0, 4],
  [-4, 0],
  [-3, 0],
  [-2, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [-2, -2],
  [-1, -1],
  [1, -1],
  [2, -2],
  [-2, 2],
  [-1, 1],
  [1, 1],
  [2, 2],
];

export function drawPixLoader(
  ctx: CanvasRenderingContext2D,
  size: number,
  elapsed: number,
  color: string
): void {
  ctx.clearRect(0, 0, size, size);

  const centerX = size / 2;
  const centerY = size / 2;
  const pixel = size > 30 ? 2 : 1;

  PIXEL_OFFSETS.forEach(([sx, sy], index) => {
    const alpha =
      0.12 +
      0.78 * Math.abs(Math.sin(0.002 * elapsed - 0.55 * Math.hypot(sx, sy) + 0.33 * index));
    ctx.fillStyle = getCol(color, alpha);
    ctx.fillRect(
      Math.round(centerX + sx * pixel - pixel / 2),
      Math.round(centerY + sy * pixel - pixel / 2),
      pixel,
      pixel
    );
  });

  ctx.fillStyle = getCol(color, 0.9);
  ctx.fillRect(centerX - pixel / 2, centerY - pixel / 2, pixel, pixel);

  for (let orbit = 0; orbit < 4; orbit++) {
    const angle = 0.0022 * elapsed + (orbit / 4) * Math.PI * 2;
    const radius = size > 30 ? 9 : 4.5;
    const alpha = 0.1 + 0.28 * Math.abs(Math.sin(0.003 * elapsed + 1.4 * orbit));
    ctx.fillStyle = getCol(color, alpha);
    ctx.fillRect(
      Math.round(centerX + Math.cos(angle) * radius),
      Math.round(centerY + Math.sin(angle) * radius),
      1,
      1
    );
  }
}
