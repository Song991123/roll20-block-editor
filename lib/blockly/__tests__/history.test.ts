import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';

type HistoryEvent = Blockly.Events.Abstract;
type ChangeListener = (event: HistoryEvent) => void;

function historyEvent(group = ''): HistoryEvent {
  return {
    group,
    recordUndo: true,
    isUiEvent: false,
    type: Blockly.Events.BLOCK_CHANGE,
  } as HistoryEvent;
}

class FakeWorkspace {
  readonly calls: boolean[] = [];
  private readonly listeners = new Set<ChangeListener>();
  private readonly undoStack: HistoryEvent[] = [];
  private readonly redoStack: HistoryEvent[] = [];

  getUndoStack(): HistoryEvent[] {
    return this.undoStack;
  }

  getRedoStack(): HistoryEvent[] {
    return this.redoStack;
  }

  addChangeListener(listener: ChangeListener): ChangeListener {
    this.listeners.add(listener);
    return listener;
  }

  removeChangeListener(listener: ChangeListener): void {
    this.listeners.delete(listener);
  }

  record(event: HistoryEvent): void {
    this.undoStack.push(event);
    this.redoStack.length = 0;
    for (const listener of this.listeners) listener(event);
  }

  undo(redo: boolean): void {
    this.calls.push(redo);
    const input = redo ? this.redoStack : this.undoStack;
    const output = redo ? this.undoStack : this.redoStack;
    const first = input.pop();
    if (!first) return;
    output.push(first);
    if (!first.group) return;
    while (input.at(-1)?.group === first.group) {
      output.push(input.pop()!);
    }
  }
}

const adapter = getBlocklyAdapter();

{
  const workspace = new FakeWorkspace();
  adapter.registerWorkspace('html', workspace as unknown as Blockly.Workspace);
  try {
    workspace.record(historyEvent());
    assert.equal(adapter.canUndo('html'), true);
    assert.equal(adapter.canRedo('html'), false);
    assert.equal(adapter.undo('html'), true);
    assert.deepEqual(workspace.calls, [false]);
    assert.equal(adapter.canUndo('html'), false);
    assert.equal(adapter.canRedo('html'), true);
    assert.equal(adapter.redo('html'), true);
    assert.deepEqual(workspace.calls, [false, true]);
    assert.equal(adapter.canRedo('html'), false);
    assert.equal(adapter.canUndo('html'), true);
  } finally {
    adapter.unregisterWorkspace('html');
  }
}

{
  const html = new FakeWorkspace();
  const css = new FakeWorkspace();
  adapter.registerWorkspace('html', html as unknown as Blockly.Workspace);
  adapter.registerWorkspace('css', css as unknown as Blockly.Workspace);
  try {
    html.record(historyEvent());
    css.record(historyEvent());

    assert.equal(adapter.canUndoLatest(['html', 'css']), true);
    assert.deepEqual(adapter.undoLatest(['html', 'css']), ['css']);
    assert.deepEqual(adapter.undoLatest(['html', 'css']), ['html']);
    // Redo follows the order the user undid actions, not original timestamps.
    assert.deepEqual(adapter.redoLatest(['html', 'css']), ['html']);
    assert.deepEqual(adapter.redoLatest(['html', 'css']), ['css']);
    assert.deepEqual(html.calls, [false, true]);
    assert.deepEqual(css.calls, [false, true]);
  } finally {
    adapter.unregisterWorkspace('html');
    adapter.unregisterWorkspace('css');
  }
}

{
  const html = new FakeWorkspace();
  const css = new FakeWorkspace();
  adapter.registerWorkspace('html', html as unknown as Blockly.Workspace);
  adapter.registerWorkspace('css', css as unknown as Blockly.Workspace);
  try {
    adapter.runInEventGroup(() => {
      const group = Blockly.Events.getGroup();
      assert.notEqual(group, '');
      html.record(historyEvent(group));
      css.record(historyEvent(group));
      css.record(historyEvent(group));
    });

    assert.deepEqual(adapter.undoLatest(['html', 'css']), ['html', 'css']);
    assert.equal(html.getUndoStack().length, 0);
    assert.equal(css.getUndoStack().length, 0);
    assert.equal(css.getRedoStack().length, 2);
    assert.equal(adapter.canRedoLatest(['html', 'css']), true);
    assert.deepEqual(adapter.redoLatest(['html', 'css']), ['html', 'css']);
    assert.equal(html.getUndoStack().length, 1);
    assert.equal(css.getUndoStack().length, 2);

    assert.deepEqual(adapter.undoLatest(['html', 'css']), ['html', 'css']);
    html.record(historyEvent());
    // A new branch invalidates the global redo even if another workspace
    // still has an old Blockly redo stack.
    assert.equal(adapter.canRedoLatest(['html', 'css']), false);
    assert.deepEqual(adapter.redoLatest(['html', 'css']), []);
  } finally {
    adapter.unregisterWorkspace('html');
    adapter.unregisterWorkspace('css');
  }
}

console.log('blockly unified history adapter test PASS');
