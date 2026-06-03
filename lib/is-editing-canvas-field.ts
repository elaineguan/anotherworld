/** True when focus is in a note/memento text field (not canvas shortcuts). */
export function isEditingCanvasField(): boolean {
  if (typeof document === "undefined") return false;

  const el = document.activeElement;
  if (!el) return false;

  if (el.tagName === "TEXTAREA") return true;

  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    const type = input.type || "text";
    return type === "text" || type === "search" || type === "";
  }

  if (el instanceof HTMLElement && el.isContentEditable) return true;

  return false;
}
