import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'wty_shared_lists_v1';
const MAX_ENTRIES  = 20;

export interface SavedSharedList {
  token:     string;
  name:      string;
  person:    string;
  occasion:  string;
  avatarUrl: string | null;
  savedAt:   number;
}

// ─── Standalone utilities (safe to call outside React) ───────────────────────

export async function saveSharedListEntry(entry: SavedSharedList): Promise<void> {
  try {
    const raw      = await AsyncStorage.getItem(STORAGE_KEY);
    const existing: SavedSharedList[] = raw ? JSON.parse(raw) : [];
    // Upsert by token, most-recent first, cap at MAX_ENTRIES
    const filtered = existing.filter(e => e.token !== entry.token);
    const updated  = [entry, ...filtered].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Convenience feature — fail silently
  }
}

export async function removeSharedListEntry(token: string): Promise<void> {
  try {
    const raw      = await AsyncStorage.getItem(STORAGE_KEY);
    const existing: SavedSharedList[] = raw ? JSON.parse(raw) : [];
    const updated  = existing.filter(e => e.token !== token);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSharedLists() {
  const [savedLists, setSavedLists] = useState<SavedSharedList[]>([]);

  const reload = useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => setSavedLists(raw ? JSON.parse(raw) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const remove = useCallback((token: string) => {
    setSavedLists(prev => prev.filter(e => e.token !== token));
    removeSharedListEntry(token);
  }, []);

  return { savedLists, remove, reload };
}
