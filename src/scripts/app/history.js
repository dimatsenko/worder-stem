/** Undo every answer in the current session, without a daily or step limit. */
export function createHistory() {
  const entries = [];
  return {
    get canUndo() {
      return entries.length > 0;
    },
    clear() {
      entries.length = 0;
    },
    record(state) {
      const id = state.session?.queue[state.session.index];
      if (!id) return;
      // Only the answered word changes; don't duplicate the whole vocabulary.
      entries.push(
        structuredClone({
          id,
          progress: state.progress[id],
          session: state.session,
          today: state.today,
        }),
      );
    },
    undo(state) {
      const entry = entries.pop();
      if (!entry) return false;
      if (entry.progress) state.progress[entry.id] = entry.progress;
      else delete state.progress[entry.id];
      state.session = entry.session;
      // An answer from yesterday must not replace today's statistics.
      if (state.today.date === entry.today.date) state.today = entry.today;
      return true;
    },
  };
}
