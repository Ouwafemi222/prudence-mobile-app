/** Shared FlatList props so long screens stay light and taps stay instant. */
export const FAST_LIST = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 40,
  windowSize: 7,
  removeClippedSubviews: true,
  keyboardShouldPersistTaps: "handled" as const,
  keyboardDismissMode: "on-drag" as const,
  automaticallyAdjustKeyboardInsets: true,
};
