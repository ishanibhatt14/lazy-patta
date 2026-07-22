/**
 * Test-only visual seam for capturing end-of-game celebration overlays.
 *
 * When the page URL carries `?preview=result`, the screenshot shooter wants the
 * board to open directly on its `phase:'result'` Play-Again overlay instead of
 * an empty opening table. Rather than fabricate a fake result (which would drift
 * from the real UI), we run the game's OWN controller reducer synchronously,
 * auto-picking a legal move on every turn until the match completes, then seed
 * that terminal state as the board's initial reducer state.
 *
 * This runs the real engine and reducer — no game logic is added or changed. It
 * is inert unless the `?preview=result` flag is present, so the production
 * setup → play → result path is completely untouched.
 */

/** True only when the page URL opts into the result-overlay preview. */
export function previewResultRequested(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('preview') === 'result';
}

interface DriveToResultOptions<State, View, Intent> {
  /** The reducer's starting state (already merged with any initial config). */
  readonly initialState: State;
  /** The controller's pure `dispatch(state, intent)` reducer. */
  readonly dispatch: (state: State, intent: Intent) => State;
  /** Projects a state into the view the picker reasons about. */
  readonly selectView: (state: State) => View;
  /**
   * Chooses the next intent for a view, or `null` when the run should stop
   * (result reached, or no legal move — a safety valve against a stuck loop).
   */
  readonly pickIntent: (view: View) => Intent | null;
  /** Recognises the terminal celebration state. */
  readonly isResult: (view: View) => boolean;
  /** Hard cap on dispatched intents so a bug can never spin forever. */
  readonly maxSteps?: number;
}

/**
 * Synchronously drives `initialState` to its `result` phase by repeatedly
 * asking `pickIntent` for a legal move and folding it through `dispatch`.
 * Returns the terminal state (or the last state reached if the cap trips).
 */
export function driveToResult<State, View, Intent>({
  initialState,
  dispatch,
  selectView,
  pickIntent,
  isResult,
  maxSteps = 5000,
}: DriveToResultOptions<State, View, Intent>): State {
  let state = initialState;
  for (let step = 0; step < maxSteps; step += 1) {
    const view = selectView(state);
    if (isResult(view)) break;
    const intent = pickIntent(view);
    if (intent === null) break;
    state = dispatch(state, intent);
  }
  return state;
}
