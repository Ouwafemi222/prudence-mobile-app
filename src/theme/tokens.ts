import { prudenceTheme } from "./themes";

/** Default website-brand tokens. Prefer `useAppTheme().tokens` in UI. */
export const tokens = prudenceTheme;

export type Tokens = typeof tokens;
