import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
  Alert,
  PanResponder,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Gift } from 'lucide-react-native';
import Svg, { Circle, Ellipse, Path, Rect, Line } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PLACEHOLDER_WISHLISTS, Wishlist } from '@/data/placeholder';
import { AvatarCircle } from '@/components/AvatarCircle';
import { supabase } from '@/utils/supabase';

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const TEAL = '#1B8A8A';
const DELETE_THRESHOLD = -80;
const DELETE_BTN_WIDTH = 80;

function WishlistIcon({ occasion, color }: { occasion: string; color: string }) {
  const key = occasion.toLowerCase();
  if (key === 'birthday') {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36">
        {/* Box body */}
        <Rect x="6" y="18" width="24" height="14" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        {/* Lid */}
        <Rect x="4" y="13" width="28" height="6" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        {/* Bow left loop */}
        <Path d="M18 13 C14 8 8 8 10 11 C12 14 18 13 18 13Z" stroke={color} strokeWidth="1.8" fill="none" />
        {/* Bow right loop */}
        <Path d="M18 13 C22 8 28 8 26 11 C24 14 18 13 18 13Z" stroke={color} strokeWidth="1.8" fill="none" />
        {/* Knot */}
        <Circle cx="18" cy="13" r="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        {/* Ribbon vertical */}
        <Line x1="18" y1="19" x2="18" y2="32" stroke={color} strokeWidth="1.8" />
        {/* Ribbon horizontal */}
        <Line x1="6" y1="25" x2="30" y2="25" stroke={color} strokeWidth="1.8" />
      </Svg>
    );
  }
  if (key === 'christmas') {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36">
        {/* 5-point star */}
        <Path
          d="M18 4 L20.9 13.1 L30.4 13.1 L22.8 18.9 L25.6 28 L18 22.2 L10.4 28 L13.2 18.9 L5.6 13.1 L15.1 13.1 Z"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
        />
        {/* Cap circle at top */}
        <Circle cx="18" cy="3" r="1.5" stroke={color} strokeWidth="1.8" fill="none" />
      </Svg>
    );
  }
  if (key === 'graduation') {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36">
        {/* Scroll body */}
        <Rect x="8" y="10" width="20" height="16" rx="3" stroke={color} strokeWidth="1.8" fill="none" />
        {/* Left roll */}
        <Ellipse cx="8" cy="18" rx="2.5" ry="8" stroke={color} strokeWidth="1.8" fill="none" />
        {/* Right roll */}
        <Ellipse cx="28" cy="18" rx="2.5" ry="8" stroke={color} strokeWidth="1.8" fill="none" />
        {/* Ribbon line */}
        <Line x1="12" y1="18" x2="24" y2="18" stroke={color} strokeWidth="1.8" />
        {/* Seal dot */}
        <Circle cx="18" cy="22" r="2" stroke={color} strokeWidth="1.8" fill="none" />
      </Svg>
    );
  }
  // Default: balloon
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      {/* Balloon oval */}
      <Ellipse cx="18" cy="14" rx="9" ry="11" stroke={color} strokeWidth="1.8" fill="none" />
      {/* Triangle knot at bottom */}
      <Path d="M15 25 L18 29 L21 25" stroke={color} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      {/* String */}
      <Line x1="18" y1="29" x2="18" y2="34" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function WishlistCard({ wishlist, index }: { wishlist: Wishlist; index: number }) {
  const colors = useColors();
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formattedDate = formatDate(wishlist.date);
  const allClaimed = wishlist.claimedCount === wishlist.itemCount;
  const claimedText = allClaimed
    ? 'All claimed'
    : `${wishlist.claimedCount} of ${wishlist.itemCount} claimed`;

  function handlePress() {
    console.log('[HomeScreen] Wishlist card pressed:', wishlist.id, wishlist.name);
    router.push(`/wishlist/${wishlist.id}`);
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable
        onPress={handlePress}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderLeftWidth: 5,
            borderLeftColor: TEAL,
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: colors.border,
            borderRightColor: colors.border,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardRow}>
          <AvatarCircle uri={wishlist.avatarUrl} name={wishlist.person} size={90} />
          <View style={styles.cardTextCol}>
            <Text style={[styles.cardListName, { color: colors.text }]} numberOfLines={1}>
              {wishlist.name}
            </Text>
            <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
              {wishlist.occasion
                ? `${wishlist.occasion.charAt(0).toUpperCase() + wishlist.occasion.slice(1).toLowerCase()} · ${formattedDate}`
                : formattedDate}
            </Text>
            <Text style={[styles.cardClaimed, { color: allClaimed ? '#B85C3C' : '#1B8A8A' }]}>
              {claimedText}
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

function SwipeableCard({ wishlist, index, onDelete }: { wishlist: Wishlist; index: number; onDelete: (id: string) => void }) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) translateX.setValue(Math.max(gs.dx, -DELETE_BTN_WIDTH));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < DELETE_THRESHOLD) {
          Animated.spring(translateX, { toValue: -DELETE_BTN_WIDTH, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  function handleDeletePress() {
    console.log('[HomeScreen] Delete button pressed for wishlist:', wishlist.id);
    Alert.alert(
      'Delete list?',
      'This will permanently delete the list and all its items.',
      [
        { text: 'Cancel', onPress: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start() },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(wishlist.id) },
      ]
    );
  }

  return (
    <View style={{ overflow: 'hidden', borderRadius: 20 }}>
      {/* Delete button behind */}
      <View style={[swipeStyles.deleteBtn, { width: DELETE_BTN_WIDTH }]}>
        <TouchableOpacity onPress={handleDeletePress} style={swipeStyles.deleteBtnInner}>
          <Text style={swipeStyles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
      {/* Card on top */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <WishlistCard wishlist={wishlist} index={index} />
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  deleteBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#C0392B',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const colors = useColors();

  function handleCreate() {
    console.log('[HomeScreen] Empty state create button pressed');
    onCreate();
  }

  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryMuted }]}>
        <Gift size={36} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No lists yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Create a list, add gift ideas from any store — Amazon, Target, Etsy, Nike, LEGO, and more — then share one link with family.
      </Text>
      <AnimatedPressable
        onPress={handleCreate}
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.emptyButtonText}>Create a list</Text>
      </AnimatedPressable>
    </View>
  );
}

function mapDbRow(row: Record<string, unknown>): Wishlist {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    person: String(row.person ?? ''),
    occasion: String(row.occasion ?? ''),
    date: String(row.occasion_date ?? ''),
    emoji: '',
    itemCount: Number(row.item_count ?? 0),
    claimedCount: Number(row.claimed_count ?? 0),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    items: [],
    childProfile: row.child_age
      ? {
          age: Number(row.child_age),
          clothingSize: String(row.clothing_size ?? ''),
          shoeSize: String(row.shoe_size ?? ''),
          favoriteColors: Array.isArray(row.favorite_colors) ? (row.favorite_colors as string[]) : [],
          currentInterests: String(row.current_interests ?? ''),
        }
      : undefined,
  };
}

function mapDbRowWithItems(row: Record<string, unknown>): Wishlist {
  const items = Array.isArray(row.wishlist_items) ? row.wishlist_items as {id: string, claimed: boolean}[] : [];
  const itemCount = items.length;
  const claimedCount = items.filter(i => i.claimed === true).length;
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    person: String(row.person ?? ''),
    occasion: String(row.occasion ?? ''),
    date: String(row.occasion_date ?? ''),
    emoji: '',
    itemCount,
    claimedCount,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    items: [],
    childProfile: row.child_age ? {
      age: Number(row.child_age),
      clothingSize: String(row.clothing_size ?? ''),
      shoeSize: String(row.shoe_size ?? ''),
      favoriteColors: Array.isArray(row.favorite_colors) ? (row.favorite_colors as string[]) : [],
      currentInterests: String(row.current_interests ?? ''),
    } : undefined,
  };
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchWishlists();
    setRefreshing(false);
  }

  useEffect(() => {
    async function fetchProfile() {
      console.log('[HomeScreen] Fetching user profile for header');
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
    console.log('[HomeScreen] Fetching wishlists from Supabase');
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      console.log('[HomeScreen] No authenticated user, skipping fetch');
      setWishlists([]);
      return;
    }
    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        *,
        wishlist_items(id, claimed)
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.log('[HomeScreen] Fetch error:', error.message);
      return;
    }
    console.log('[HomeScreen] Fetched', data?.length ?? 0, 'wishlists for user', currentUser.id);
    setWishlists(data ? data.map(mapDbRowWithItems) : []);
  }

  async function handleDelete(id: string) {
    console.log('[HomeScreen] Deleting wishlist:', id);
    const { error } = await supabase.from('wishlists').delete().eq('id', id);
    if (error) {
      console.error('[HomeScreen] Delete error:', error.message);
      Alert.alert('Could not delete', error.message);
      return;
    }
    setWishlists(prev => prev.filter(w => w.id !== id));
  }

  useEffect(() => {
    fetchWishlists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[HomeScreen] Screen focused, re-fetching wishlists');
      fetchWishlists();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function handleNewList() {
    console.log('[HomeScreen] FAB new list button pressed');
    router.push('/create-list');
  }

  function handleCreateFromEmpty() {
    console.log('[HomeScreen] Empty state navigating to create-list');
    router.push('/create-list');
  }

  function handleProfilePress() {
    console.log('[HomeScreen] Profile avatar pressed, navigating to /(tabs)/(profile)');
    router.push('/(tabs)/(profile)');
  }

  const greetingText = displayName ? `Hi, ${displayName}.` : 'Why, Thank You!';
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : 'W';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Custom teal header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerGreeting}>{greetingText}</Text>
        <TouchableOpacity onPress={handleProfilePress} style={styles.headerAvatar} activeOpacity={0.8}>
          <Text style={styles.headerAvatarText}>{avatarInitial}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          wishlists.length === 0 && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F6B6F" />}
      >
        {/* List or empty state */}
        {wishlists.length === 0 ? (
          <EmptyState onCreate={handleCreateFromEmpty} />
        ) : (
          <View style={styles.listContainer}>
            {wishlists.map((wishlist, index) => (
              <SwipeableCard key={wishlist.id} wishlist={wishlist} index={index} onDelete={handleDelete} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <AnimatedPressable
        onPress={handleNewList}
        scaleValue={0.94}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        accessibilityLabel="Create new wishlist"
        accessibilityRole="button"
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerGreeting: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 26,
    fontStyle: 'italic',
    color: '#1C2820',
    flex: 1,
    marginRight: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1B8A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  scrollContentEmpty: {
    flexGrow: 1,
  },
  listContainer: {
    gap: 14,
  },
  card: {
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  cardTextCol: {
    flex: 1,
    gap: 4,
  },
  cardListName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Georgia',
    letterSpacing: -0.3,
  },
  cardChildName: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardDate: {
    fontSize: 13,
  },
  cardClaimed: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B8A8A',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
    boxShadow: '0 4px 16px rgba(27,138,138,0.35)',
  },
});
