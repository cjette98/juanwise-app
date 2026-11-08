import { useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';

/**
 * Routes every way out of a play screen through one decision (Adjustment 3,
 * item 2): the on-screen Back button (which calls `router.back()`), Android's
 * hardware back and the iOS swipe-back all arrive here as a blocked removal.
 *
 * While `guarding`, `decide` is asked what to do: `'leave'` lets the exit go
 * through, `'stay'` keeps the player on the screen (for example because the
 * screen recorded a failed attempt and is about to show its pop-up).
 */
export function useExitGuard(guarding: boolean, decide: () => 'leave' | 'stay') {
  const navigation = useNavigation();
  const [leaving, setLeaving] = useState<NavigationAction | null>(null);

  usePreventRemove(guarding && !leaving, ({ data }) => {
    if (decide() === 'leave') setLeaving(data.action);
  });

  // Replays the exit once the guard is down.
  useEffect(() => {
    if (leaving) navigation.dispatch(leaving);
  }, [leaving, navigation]);
}
