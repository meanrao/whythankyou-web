// PROTOTYPE: Circle-based home screen (Apple/Netflix profile grid style).
// Swap back to cards layout in index.ios.tsx by toggling USE_PROTO = false.

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AvatarCircle } from '@/components/AvatarCircle';
import { supabase } from '@/utils/supabase';
import { StatusBar } from 'expo-status-bar';
import { useOnboardingHints } from '@/hooks/useOnboardingHints';
import { useSharedLists, SavedSharedList } from '@/hooks/useSharedLists';
import { Wishlist } from '@/data/placeholder';

// ─── Constants ────────────────────────────────────────────────────────────────

const CIRCLE = 72;

// ─── Data mapper (identical to original) ─────────────────────────────────────

function mapDbRowWithItems(row: Record<string, unknown>): Wishlist {
  const items = Array.isArray(row.wishlist_items)
    ? (row.wishlist_items as { id: string; claimed: boolean }[])
    : [];
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    person: String(row.person ?? ''),
    occasion: String(row.occasion ?? ''),
    date: String(row.occasion_date ?? ''),
    emoji: '',
    itemCount: items.length,
    claimedCount: items.filter(i => i.claimed === true).length,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    items: [],
    childProfile: row.child_age ? {
      age: Number(row.child_age),
      clothingSize: String(row.clothing_size ?? ''),
      shoeSize: String(row.shoe_size ?? ''),
      favoriteColors: [],
      currentInterests: String(row.current_interests ?? ''),
    } : undefined,
  };
}

// ─── ProfileCircle — one wishlist ─────────────────────────────────────────────

function ProfileCircle({
  wishlist,
  onPress,
  onLongPress,
}: {
  wishlist: Wishlist;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const label = wishlist.person || wishlist.name;
  const occasionLabel = wishlist.occasion
    ? wishlist.occasion.charAt(0).toUpperCase() + wishlist.occasion.slice(1).toLowerCase()
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.72}
      style={circleStyles.item}
    >
      <View style={circleStyles.avatarRing}>
        <AvatarCircle uri={wishlist.avatarUrl ?? null} name={label} size={CIRCLE} />
      </View>
      <Text style={circleStyles.name} numberOfLines={1}>{label}</Text>
      {occasionLabel ? (
        <Text style={circleStyles.occasion} numberOfLines={1}>{occasionLabel}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── AddCircle ────────────────────────────────────────────────────────────────

function AddCircle({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72} style={circleStyles.item}>
      <View style={circleStyles.addRing}>
        <Plus size={26} color="#1B8A8A" strokeWidth={2} />
      </View>
      <Text style={circleStyles.addLabel}>New list</Text>
    </TouchableOpacity>
  );
}

// ─── SharedCircle — one received shared list ──────────────────────────────────

function SharedCircle({
  item,
  onPress,
  onRemove,
}: {
  item: SavedSharedList;
  onPress: () => void;
  onRemove: () => void;
}) {
  function handleLongPress() {
    Alert.alert(
      'Remove from Shared With Me?',
      `This removes "${item.person}'s list" from your home screen. You can still reopen it from the original link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ]
    );
  }

  const occasionLabel = item.occasion
    ? item.occasion.charAt(0).toUpperCase() + item.occasion.slice(1).toLowerCase()
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.72}
      style={circleStyles.item}
    >
      <View style={circleStyles.sharedRing}>
        <AvatarCircle uri={item.avatarUrl} name={item.person} size={CIRCLE} />
      </View>
      <Text style={circleStyles.name} numberOfLines={1}>{item.person}</Text>
      {occasionLabel ? (
        <Text style={circleStyles.occasion} numberOfLines={1}>{occasionLabel}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── FAB hint tooltip ─────────────────────────────────────────────────────────

function HintBubble({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <View style={hintStyles.bubble}>
      <TouchableOpacity
        onPress={onDismiss}
        style={hintStyles.closeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Dismiss hint"
      >
        <X size={13} color="#9AA89A" strokeWidth={2.5} />
      </TouchableOpacity>
      <Text style={hintStyles.text}>{text}</Text>
    </View>
  );
}

const hintStyles = StyleSheet.create({
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,107,111,0.16)',
    paddingTop: 10,
    paddingBottom: 11,
    paddingLeft: 12,
    paddingRight: 32,
    shadowColor: '#1F2A24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    color: '#3A4A3E',
    maxWidth: 195,
  },
  arrowDown: {
    width: 11,
    height: 11,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(15,107,111,0.16)',
    transform: [{ rotate: '45deg' }],
    marginTop: -6,
  },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={sectionStyles.title}>{title}</Text>
  );
}

const sectionStyles = StyleSheet.create({
  title: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '600',
    color: '#1C2820',
    letterSpacing: -0.4,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreenProto() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { showPlusHint, hintsLoaded, dismissPlus } = useOnboardingHints();
  const { savedLists, remove: removeSharedList, reload: reloadSharedLists } = useSharedLists();

  // ── Data fetching (identical to original) ────────────────────────────────

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const metaName = user.user_metadata?.display_name as string | undefined;
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      const name: string = profile?.display_name || metaName || '';
      if (name) setDisplayName(name);
    }
    fetchProfile();
  }, []);

  async function fetchWishlists() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { setWishlists([]); return; }
    const { data, error } = await supabase
      .from('wishlists')
      .select('*, wishlist_items(id, claimed)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (error) { console.log('[HomeProto] Fetch error:', error.message); return; }
    setWishlists(data ? data.map(mapDbRowWithItems) : []);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('wishlists').delete().eq('id', id);
    if (error) {
      Alert.alert('Could not delete', error.message);
      return;
    }
    setWishlists(prev => prev.filter(w => w.id !== id));
  }

  useEffect(() => { fetchWishlists(); }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWishlists();
      reloadSharedLists();
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchWishlists();
    setRefreshing(false);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleNewList() {
    dismissPlus();
    router.push('/create-list');
  }

  function handleProfilePress() {
    router.push('/(tabs)/(profile)');
  }

  function handleWishlistPress(id: string) {
    dismissPlus();
    router.push(`/wishlist/${id}`);
  }

  function handleWishlistLongPress(w: Wishlist) {
    Alert.alert(
      'Delete list?',
      `This will permanently delete "${w.name}" and all its items.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(w.id) },
      ]
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const greetingText = displayName ? `Hi, ${displayName}!` : 'Why, Thank You!';
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : 'W';
  const showFabHint = hintsLoaded && showPlusHint && wishlists.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />

      {/* Header — identical to original */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerGreeting}>{greetingText}</Text>
        <TouchableOpacity
          onPress={handleProfilePress}
          style={styles.headerAvatar}
          activeOpacity={0.8}
        >
          <Text style={styles.headerAvatarText}>{avatarInitial}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F6B6F" />
        }
      >
        {/* ── My Lists ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="My Lists" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.circleRow}
          >
            {wishlists.map(w => (
              <ProfileCircle
                key={w.id}
                wishlist={w}
                onPress={() => handleWishlistPress(w.id)}
                onLongPress={() => handleWishlistLongPress(w)}
              />
            ))}
            <AddCircle onPress={handleNewList} />
          </ScrollView>

          {wishlists.length === 0 && (
            <Text style={styles.emptyHint}>
              Tap "New list" to create your first wishlist
            </Text>
          )}
        </View>

        {/* ── Shared With Me ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Shared With Me" />
          {savedLists.length === 0 ? (
            <Text style={[styles.sharedEmptyText, { paddingHorizontal: 20 }]}>
              When someone shares a list with you, it will appear here.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.circleRow}
            >
              {savedLists.map(item => (
                <SharedCircle
                  key={item.token}
                  item={item}
                  onPress={() => router.push(`/guest/${item.token}`)}
                  onRemove={() => removeSharedList(item.token)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* FAB — same position and style as original */}
      <AnimatedPressable
        onPress={handleNewList}
        scaleValue={0.94}
        style={[styles.fab, { backgroundColor: '#0F6B6F' }]}
        accessibilityLabel="Create new wishlist"
        accessibilityRole="button"
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </AnimatedPressable>

      {/* FAB hint — shown when no lists */}
      {showFabHint && (
        <View pointerEvents="box-none" style={styles.fabHintAnchor}>
          <HintBubble
            text="Add a child profile to start building wish lists."
            onDismiss={dismissPlus}
          />
          <View style={[hintStyles.arrowDown, styles.fabHintArrow]} />
        </View>
      )}
    </View>
  );
}

// ─── Circle Styles ────────────────────────────────────────────────────────────

const circleStyles = StyleSheet.create({
  item: {
    width: 84,
    alignItems: 'center',
    gap: 7,
  },
  avatarRing: {
    borderRadius: CIRCLE / 2,
    shadowColor: '#1C2820',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  // Shared lists: subtle teal-tinted ring to distinguish from owned
  sharedRing: {
    borderRadius: CIRCLE / 2,
    shadowColor: '#1B8A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addRing: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 2,
    borderStyle: Platform.OS === 'android' ? 'solid' : 'dashed',
    borderColor: '#1B8A8A',
    backgroundColor: '#EBF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C2820',
    textAlign: 'center',
    maxWidth: 80,
  },
  occasion: {
    fontSize: 11,
    color: '#8E9A87',
    textAlign: 'center',
    maxWidth: 80,
    marginTop: -3,
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1B8A8A',
    textAlign: 'center',
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header — identical to original
  headerBar: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerGreeting: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    fontWeight: '700',
    color: '#1C2820',
    flex: 1,
    marginRight: 12,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F28C79',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },

  scrollContent: {
    paddingTop: 28,
    gap: 0,
  },

  section: {
    marginBottom: 32,
  },

  circleRow: {
    paddingHorizontal: 20,
    gap: 20,
    alignItems: 'flex-start',
  },

  emptyHint: {
    fontSize: 13,
    color: '#8E9A87',
    paddingHorizontal: 20,
    marginTop: 12,
    lineHeight: 18,
  },

  sharedEmptyText: {
    fontSize: 14,
    color: '#8E9A87',
    lineHeight: 20,
    maxWidth: 280,
  },

  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(15,107,111,0.35)',
  },

  fabHintAnchor: {
    position: 'absolute',
    bottom: 168,
    right: 20,
    alignItems: 'flex-end',
  },
  fabHintArrow: {
    marginRight: 21,
    alignSelf: 'flex-end',
  },
});
