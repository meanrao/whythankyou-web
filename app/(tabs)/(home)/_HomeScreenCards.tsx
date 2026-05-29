// ORIGINAL: Card-based home screen layout.
// To restore: set USE_PROTO = false in index.ios.tsx.

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
import { Plus, Gift, X } from 'lucide-react-native';
import Svg, { Circle, Ellipse, Path, Rect, Line } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Wishlist } from '@/data/placeholder';
import { AvatarCircle } from '@/components/AvatarCircle';
import { supabase } from '@/utils/supabase';
import { StatusBar } from 'expo-status-bar';
import { useOnboardingHints } from '@/hooks/useOnboardingHints';
import { useSharedLists, SavedSharedList } from '@/hooks/useSharedLists';

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const TEAL = '#0F6B6F';
const DELETE_THRESHOLD = -80;
const DELETE_BTN_WIDTH = 80;

function WishlistIcon({ occasion, color }: { occasion: string; color: string }) {
  const key = occasion.toLowerCase();
  if (key === 'birthday') {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36">
        <Rect x="6" y="18" width="24" height="14" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        <Rect x="4" y="13" width="28" height="6" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        <Path d="M18 13 C14 8 8 8 10 11 C12 14 18 13 18 13Z" stroke={color} strokeWidth="1.8" fill="none" />
        <Path d="M18 13 C22 8 28 8 26 11 C24 14 18 13 18 13Z" stroke={color} strokeWidth="1.8" fill="none" />
        <Circle cx="18" cy="13" r="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        <Line x1="18" y1="19" x2="18" y2="32" stroke={color} strokeWidth="1.8" />
        <Line x1="6" y1="25" x2="30" y2="25" stroke={color} strokeWidth="1.8" />
      </Svg>
    );
  }
  if (key === 'christmas') {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36">
        <Path
          d="M18 4 L20.9 13.1 L30.4 13.1 L22.8 18.9 L25.6 28 L18 22.2 L10.4 28 L13.2 18.9 L5.6 13.1 L15.1 13.1 Z"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
        />
        <Circle cx="18" cy="3" r="1.5" stroke={color} strokeWidth="1.8" fill="none" />
      </Svg>
    );
  }
  if (key === 'graduation') {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36">
        <Rect x="8" y="10" width="20" height="16" rx="3" stroke={color} strokeWidth="1.8" fill="none" />
        <Ellipse cx="8" cy="18" rx="2.5" ry="8" stroke={color} strokeWidth="1.8" fill="none" />
        <Ellipse cx="28" cy="18" rx="2.5" ry="8" stroke={color} strokeWidth="1.8" fill="none" />
        <Line x1="12" y1="18" x2="24" y2="18" stroke={color} strokeWidth="1.8" />
        <Circle cx="18" cy="22" r="2" stroke={color} strokeWidth="1.8" fill="none" />
      </Svg>
    );
  }
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      <Ellipse cx="18" cy="14" rx="9" ry="11" stroke={color} strokeWidth="1.8" fill="none" />
      <Path d="M15 25 L18 29 L21 25" stroke={color} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      <Line x1="18" y1="29" x2="18" y2="34" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function WishlistCard({
  wishlist,
  index,
  pulseAvatar,
  onDismissHint,
}: {
  wishlist: Wishlist;
  index: number;
  pulseAvatar?: boolean;
  onDismissHint?: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    if (!pulseAvatar) {
      pulseScale.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.1, duration: 680, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1,   duration: 680, useNativeDriver: true }),
      ]),
      { iterations: 2 },
    );
    const timer = setTimeout(() => pulse.start(), 450);
    return () => {
      clearTimeout(timer);
      pulse.stop();
      pulseScale.setValue(1);
    };
  }, [pulseAvatar]);

  const formattedDate = formatDate(wishlist.date);
  const allClaimed = wishlist.claimedCount === wishlist.itemCount && wishlist.itemCount > 0;
  const claimedText = wishlist.itemCount === 0
    ? 'No gifts yet'
    : allClaimed
      ? 'All claimed'
      : `${wishlist.claimedCount} of ${wishlist.itemCount} claimed`;
  const claimedColor = wishlist.itemCount === 0 ? '#6E776A' : allClaimed ? '#B85C3C' : '#0F6B6F';

  const today = new Date();
  const occasionDate = wishlist.date ? new Date(wishlist.date) : null;
  const daysUntil = occasionDate
    ? Math.ceil((occasionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const showCountdown =
    wishlist.occasion.toLowerCase() === 'birthday' &&
    daysUntil !== null &&
    daysUntil >= 0 &&
    daysUntil <= 30;

  function handlePress() {
    console.log('[HomeScreen] Wishlist card pressed:', wishlist.id, wishlist.name);
    onDismissHint?.();
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
            borderLeftColor: '#F28C79',
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
          <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
            <AvatarCircle uri={wishlist.avatarUrl} name={wishlist.person} size={90} />
          </Animated.View>
          <View style={styles.cardTextCol}>
            <Text style={[styles.cardListName, { color: colors.text }]} numberOfLines={1}>
              {wishlist.name}
            </Text>
            <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
              {wishlist.occasion
                ? `${wishlist.occasion.charAt(0).toUpperCase() + wishlist.occasion.slice(1).toLowerCase()} · ${formattedDate}`
                : formattedDate}
            </Text>
            <Text style={[styles.cardClaimed, { color: claimedColor }]}>
              {claimedText}
            </Text>
            {showCountdown && daysUntil !== null && (
              <Text style={styles.cardCountdown}>
                {daysUntil === 0 ? 'Birthday today!' : `Birthday in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
              </Text>
            )}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

function SwipeableCard({
  wishlist,
  index,
  onDelete,
  pulseAvatar,
  onDismissHint,
}: {
  wishlist: Wishlist;
  index: number;
  onDelete: (id: string) => void;
  pulseAvatar?: boolean;
  onDismissHint?: () => void;
}) {
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
      <View style={[swipeStyles.deleteBtn, { width: DELETE_BTN_WIDTH }]}>
        <TouchableOpacity onPress={handleDeletePress} style={swipeStyles.deleteBtnInner}>
          <Text style={swipeStyles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <WishlistCard
          wishlist={wishlist}
          index={index}
          pulseAvatar={pulseAvatar}
          onDismissHint={onDismissHint}
        />
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

function SharedListCard({
  item,
  onPress,
  onRemove,
}: {
  item: SavedSharedList;
  onPress: () => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  const occasionLabel = item.occasion
    ? item.occasion.charAt(0).toUpperCase() + item.occasion.slice(1).toLowerCase()
    : null;

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderLeftWidth: 5,
          borderLeftColor: '#7AA7A3',
          borderTopWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderTopColor: colors.border,
          borderRightColor: colors.border,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={sharedCardStyles.row}>
        <AvatarCircle uri={item.avatarUrl} name={item.person} size={52} />
        <View style={sharedCardStyles.textCol}>
          <Text style={[sharedCardStyles.personName, { color: colors.text }]} numberOfLines={1}>
            {item.person}
          </Text>
          <Text style={[sharedCardStyles.listName, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.name}
          </Text>
          {occasionLabel ? (
            <Text style={sharedCardStyles.occasion}>{occasionLabel}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={sharedCardStyles.removeBtn}
          accessibilityLabel="Remove from list"
        >
          <X size={14} color="#9AA89A" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </AnimatedPressable>
  );
}

const sharedCardStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Georgia',
    letterSpacing: -0.2,
  },
  listName: {
    fontSize: 13,
  },
  occasion: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7AA7A3',
  },
  removeBtn: {
    paddingLeft: 8,
  },
});

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const colors = useColors();

  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryMuted }]}>
        <Gift size={36} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No lists yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Create your first wishlist and share it with family
      </Text>
      <AnimatedPressable
        onPress={onCreate}
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.emptyButtonText}>Create a list</Text>
      </AnimatedPressable>
    </View>
  );
}

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

function mapDbRowWithItems(row: Record<string, unknown>): Wishlist {
  const items = Array.isArray(row.wishlist_items) ? row.wishlist_items as { id: string; claimed: boolean }[] : [];
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

export default function HomeScreenCards() {
  const colors  = useColors();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [wishlists,    setWishlists]    = useState<Wishlist[]>([]);
  const [displayName,  setDisplayName]  = useState('');
  const [refreshing,   setRefreshing]   = useState(false);

  const { showPlusHint, showProfileHint, hintsLoaded, dismissPlus, dismissProfile } = useOnboardingHints();
  const { savedLists, remove: removeSharedList, reload: reloadSharedLists } = useSharedLists();

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
      .select(`*, wishlist_items(id, claimed)`)
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
      reloadSharedLists();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function handleNewList() {
    console.log('[HomeScreen] FAB new list button pressed');
    dismissPlus();
    router.push('/create-list');
  }

  function handleCreateFromEmpty() {
    console.log('[HomeScreen] Empty state navigating to create-list');
    dismissPlus();
    router.push('/create-list');
  }

  function handleProfilePress() {
    console.log('[HomeScreen] Profile avatar pressed, navigating to /(tabs)/(profile)');
    router.push('/(tabs)/(profile)');
  }

  const greetingText  = displayName ? `Hi, ${displayName}!` : 'Why, Thank You!';
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : 'W';

  const showFabHint     = hintsLoaded && showPlusHint    && wishlists.length === 0;
  const showProfileHintActive = hintsLoaded && showProfileHint && wishlists.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
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
        {wishlists.length === 0 ? (
          <EmptyState onCreate={handleCreateFromEmpty} />
        ) : (
          <View style={styles.listContainer}>
            {showProfileHintActive && (
              <View style={styles.profileHintWrapper}>
                <HintBubble
                  text="Tap here to view and edit this person's details."
                  onDismiss={dismissProfile}
                />
                <View style={[hintStyles.arrowDown, styles.profileHintArrow]} />
              </View>
            )}
            {wishlists.map((wishlist, index) => (
              <SwipeableCard
                key={wishlist.id}
                wishlist={wishlist}
                index={index}
                onDelete={handleDelete}
                pulseAvatar={index === 0 && showProfileHintActive}
                onDismissHint={index === 0 ? dismissProfile : undefined}
              />
            ))}
          </View>
        )}

        {savedLists.length > 0 && (
          <View style={[
            styles.sharedSection,
            wishlists.length > 0 && styles.sharedSectionDivider,
          ]}>
            <Text style={styles.sharedSectionLabel}>Shared with me</Text>
            <View style={styles.sharedListContainer}>
              {savedLists.map(item => (
                <SharedListCard
                  key={item.token}
                  item={item}
                  onPress={() => router.push(`/guest/${item.token}`)}
                  onRemove={() => removeSharedList(item.token)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <AnimatedPressable
        onPress={handleNewList}
        scaleValue={0.94}
        style={[styles.fab, { backgroundColor: '#0F6B6F' }]}
        accessibilityLabel="Create new wishlist"
        accessibilityRole="button"
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </AnimatedPressable>

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

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  scrollContentEmpty: { flexGrow: 1 },
  listContainer: { gap: 14 },
  profileHintWrapper: { marginBottom: -4 },
  profileHintArrow: { marginLeft: 52, marginTop: -6 },
  fabHintAnchor: {
    position: 'absolute',
    bottom: 168,
    right: 20,
    alignItems: 'flex-end',
  },
  fabHintArrow: { marginRight: 21, alignSelf: 'flex-end' },
  card: {
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    shadowColor: '#1F2A24',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  cardTextCol: { flex: 1, gap: 4 },
  cardListName: { fontSize: 18, fontWeight: '700', fontFamily: 'Georgia', letterSpacing: -0.3 },
  cardChildName: { fontSize: 14, fontWeight: '500' },
  cardDate: { fontSize: 13 },
  cardClaimed: { fontSize: 12, fontWeight: '600' },
  cardCountdown: { fontSize: 11, fontWeight: '500', color: '#F28C79' },
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
  emptyTitle: { fontSize: 18, fontWeight: '600', fontFamily: 'Georgia' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  emptyButton: { marginTop: 8, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
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
  sharedSection: { marginTop: 28 },
  sharedSectionDivider: { borderTopWidth: 1, borderTopColor: '#EAE6DF', paddingTop: 24 },
  sharedSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7AA7A3',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingLeft: 2,
  },
  sharedListContainer: { gap: 10 },
});
