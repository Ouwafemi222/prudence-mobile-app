import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

/** Matches floating tab bar offset in `AppTabs` (absolute `bottom`). */
const TAB_FLOAT_BOTTOM = 12;
/** Breathing room above the tab bar so primary actions stay tappable. */
const EXTRA_BELOW_CONTENT = 20;

/**
 * Bottom padding for scroll content on tab screens so the floating tab bar
 * does not cover buttons (e.g. Sign out) or last list items.
 */
export function useTabBarContentPaddingBottom() {
  const tabBarHeight = useBottomTabBarHeight();
  return TAB_FLOAT_BOTTOM + tabBarHeight + EXTRA_BELOW_CONTENT;
}
