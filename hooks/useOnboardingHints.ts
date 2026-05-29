import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const KEY_PLUS    = 'wty_hint_plus_v1';
const KEY_PROFILE = 'wty_hint_profile_v1';

export function useOnboardingHints() {
  const [plusSeen,    setPlusSeen]    = useState<boolean | null>(null);
  const [profileSeen, setProfileSeen] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEY_PLUS),
      AsyncStorage.getItem(KEY_PROFILE),
    ])
      .then(([p, pr]) => {
        setPlusSeen(p === '1');
        setProfileSeen(pr === '1');
      })
      .catch(() => {
        // Fail open: if storage is unavailable, suppress hints rather than
        // repeatedly showing them on every launch.
        setPlusSeen(true);
        setProfileSeen(true);
      });
  }, []);

  const dismissPlus = useCallback(() => {
    setPlusSeen(true);
    AsyncStorage.setItem(KEY_PLUS, '1').catch(() => {});
  }, []);

  // Persists the "seen" flag without hiding the hint in the current session.
  // Use this to record first-view immediately so the hint never re-appears on
  // the next launch, even if the user navigates away without tapping dismiss.
  const markPlusSeen = useCallback(() => {
    AsyncStorage.setItem(KEY_PLUS, '1').catch(() => {});
  }, []);

  const dismissProfile = useCallback(() => {
    setProfileSeen(true);
    AsyncStorage.setItem(KEY_PROFILE, '1').catch(() => {});
  }, []);

  return {
    showPlusHint:    plusSeen === false,
    showProfileHint: profileSeen === false,
    hintsLoaded:     plusSeen !== null,
    dismissPlus,
    dismissProfile,
    markPlusSeen,
  };
}
