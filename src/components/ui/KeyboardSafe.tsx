import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  type MutableRefObject,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import {
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

type ScrollLike = ScrollView & {
  scrollResponderScrollNativeHandleToKeyboard?: (node: number, extraHeight?: number, preventNegative?: boolean) => void;
  scrollToOffset?: (opts: { offset: number; animated?: boolean }) => void;
};

const KeyboardScrollContext = createContext<RefObject<ScrollLike | null> | null>(null);

export function scrollFocusedInputIntoView(
  scrollRef: RefObject<ScrollLike | null> | null,
  target: unknown,
) {
  if (!scrollRef?.current || target == null) return;
  const handle = findNodeHandle(target as number);
  if (!handle) return;
  const scroll = scrollRef.current;
  if (typeof scroll.scrollResponderScrollNativeHandleToKeyboard === "function") {
    scroll.scrollResponderScrollNativeHandleToKeyboard(handle, 72, true);
    return;
  }
  scroll.scrollToEnd?.({ animated: true });
}

export function useKeyboardInputFocus() {
  const scrollRef = useContext(KeyboardScrollContext);
  return useCallback(
    (e: { nativeEvent?: { target?: unknown }; target?: unknown }) => {
      const target = e.nativeEvent?.target ?? e.target;
      setTimeout(() => scrollFocusedInputIntoView(scrollRef, target), 140);
    },
    [scrollRef],
  );
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };
}

type SafeScrollProps = ScrollViewProps & {
  /** Modals ignore Android window resize — always pad with the keyboard. */
  inModal?: boolean;
  keyboardOffset?: number;
};

export const KeyboardSafeScroll = forwardRef<ScrollView, SafeScrollProps>(function KeyboardSafeScroll(
  {
    children,
    inModal,
    keyboardOffset = 0,
    keyboardShouldPersistTaps = "handled",
    keyboardDismissMode = "on-drag",
    automaticallyAdjustKeyboardInsets = true,
    style,
    ...rest
  },
  ref,
) {
  const innerRef = useRef<ScrollLike | null>(null);
  const avoid = Platform.OS === "ios" || inModal;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={avoid ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      <KeyboardScrollContext.Provider value={innerRef}>
        <ScrollView
          ref={mergeRefs(innerRef, ref) as Ref<ScrollView>}
          style={style}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode={keyboardDismissMode}
          automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
          {...rest}
        >
          {children}
        </ScrollView>
      </KeyboardScrollContext.Provider>
    </KeyboardAvoidingView>
  );
});

export function KeyboardSafeView({
  children,
  inModal,
  keyboardOffset = 0,
  style,
}: {
  children: ReactNode;
  inModal?: boolean;
  keyboardOffset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const avoid = Platform.OS === "ios" || inModal;
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={avoid ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

export function FocusAwareTextInput(props: TextInputProps) {
  const intoView = useKeyboardInputFocus();
  return (
    <TextInput
      {...props}
      onFocus={(e) => {
        intoView(e);
        props.onFocus?.(e);
      }}
    />
  );
}

export function KeyboardDismissArea({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} onStartShouldSetResponder={() => true}>
      {children}
    </View>
  );
}
