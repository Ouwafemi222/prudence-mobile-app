import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainAppStackParamList } from "../navigation/types";

/** Parent stack (above bottom tabs) so `navigate("MySubmissions")` etc. works from tab screens. */
export function useMainAppNavigation(): NativeStackNavigationProp<MainAppStackParamList> {
  const nav = useNavigation();
  const parent = nav.getParent();
  // Tab navigator's `useNavigation()` is not typed as the parent stack; bridge at runtime.
  return (parent ?? nav) as unknown as NativeStackNavigationProp<MainAppStackParamList>;
}
