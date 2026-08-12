import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainAppStackParamList } from "../navigation/types";

type AnyNav = {
  getState?: () => { routeNames?: string[] } | undefined;
  getParent?: () => AnyNav | undefined;
};

function isMainAppNav(nav: AnyNav | undefined): boolean {
  const names = nav?.getState?.()?.routeNames ?? [];
  return names.includes("MainTabs") || names.includes("Teams");
}

/**
 * Resolve the stack above the tabs (Teams, Submissions, member detail, etc.).
 * From a tab screen we must walk up one parent; from an already-pushed stack
 * screen we must stay on that stack — otherwise navigate() hits the root
 * Welcome/Auth navigator and TeamMembers / TeamMemberDetail fail.
 */
export function useMainAppNavigation(): NativeStackNavigationProp<MainAppStackParamList> {
  const nav = useNavigation() as unknown as AnyNav;
  if (isMainAppNav(nav)) {
    return nav as unknown as NativeStackNavigationProp<MainAppStackParamList>;
  }
  let current: AnyNav | undefined = nav.getParent?.();
  while (current) {
    if (isMainAppNav(current)) {
      return current as unknown as NativeStackNavigationProp<MainAppStackParamList>;
    }
    current = current.getParent?.();
  }
  return (nav.getParent?.() ?? nav) as unknown as NativeStackNavigationProp<MainAppStackParamList>;
}
