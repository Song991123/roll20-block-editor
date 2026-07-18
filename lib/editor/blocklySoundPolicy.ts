export interface BlocklyMoveSoundEvent {
  oldParentId?: string | null;
  newParentId?: string | null;
  reason?: string[];
}

/** Only user-driven drag moves should produce interaction feedback. */
export function shouldPlayBlockSnap(event: BlocklyMoveSoundEvent): boolean {
  const parentChanged =
    event.newParentId !== undefined &&
    event.newParentId !== null &&
    event.newParentId !== event.oldParentId;

  return parentChanged && event.reason?.includes('drag') === true;
}
