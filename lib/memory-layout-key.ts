export function memoryLayoutKey(
  items: { id: string; x: number; y: number; width: number; height: number }[]
): string {
  return items
    .map((item) => `${item.id}:${item.x}:${item.y}:${item.width}:${item.height}`)
    .join("|");
}
