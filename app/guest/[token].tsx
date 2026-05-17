import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { CheckCircle, Gift } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiFetch } from '@/utils/api';
import { supabase } from '@/utils/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  bg: '#F5F0E8',
  teal: '#1B8A8A',
  tealBg: '#E6F7F7',
  tealText: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#D4C9B8',
  label: '#2C3B32',
  textSecondary: '#5A6354',
  textTertiary: '#8E9A87',
  sage: '#4A7C5F',
  sageBg: '#EFF5F1',
  inputBg: '#FFFFFF',
  placeholder: '#A89F94',
  profileCard: '#FBF9F5',
  profileBorder: '#E8E6E0',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuestItem {
  id: string;
  name: string;
  price: number | null;
  store: string | null;
  notes: string | null;
  image_url: string | null;
  status: 'available' | 'claimed';
}

interface GuestWishlist {
  id: string;
  name: string;
  person: string;
  occasion: string;
  child_age: number | null;
  clothing_size: string | null;
  shoe_size: string | null;
  current_interests: string | null;
  avatar_url: string | null;
  items: GuestItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined | null
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

// ─── Animated list item ───────────────────────────────────────────────────────

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 70,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 70,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Recipient Profile Card ───────────────────────────────────────────────────

function GuestProfileCard({ wishlist }: { wishlist: GuestWishlist }) {
  const hasProfile =
    wishlist.child_age != null ||
    wishlist.clothing_size ||
    wishlist.shoe_size ||
    wishlist.current_interests;

  if (!hasProfile) return null;

  const agePillText = wishlist.child_age != null ? `Age ${wishlist.child_age}` : null;
  const clothingPillText = wishlist.clothing_size ? `Clothing: ${wishlist.clothing_size}` : null;
  const shoePillText = wishlist.shoe_size ? `Shoe: ${wishlist.shoe_size}` : null;

  function handleRequestAddress() {
    console.log('[GuestProfile] Request mailing address pressed for wishlist:', wishlist.id);
    Alert.alert('Coming soon', 'Mailing address requests will be available soon.');
  }

  return (
    <View style={profileStyles.card}>
      <View style={profileStyles.headerRow}>
        <Text style={profileStyles.childName}>{wishlist.person}</Text>
        {agePillText ? (
          <View style={profileStyles.agePill}>
            <Text style={profileStyles.agePillText}>{agePillText}</Text>
          </View>
        ) : null}
      </View>

      {(clothingPillText || shoePillText) ? (
        <View style={profileStyles.sizeRow}>
          {clothingPillText ? (
            <View style={profileStyles.sizePill}>
              <Text style={profileStyles.sizePillText}>{clothingPillText}</Text>
            </View>
          ) : null}
          {shoePillText ? (
            <View style={profileStyles.sizePill}>
              <Text style={profileStyles.sizePillText}>{shoePillText}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {wishlist.current_interests ? (
        <>
          <View style={profileStyles.divider} />
          <View style={profileStyles.interestsSection}>
            <Text style={profileStyles.sectionLabel}>What they're into</Text>
            <Text style={profileStyles.interestsText}>{wishlist.current_interests}</Text>
          </View>
        </>
      ) : null}

      <View style={profileStyles.divider} />
      <TouchableOpacity
        onPress={handleRequestAddress}
        style={profileStyles.requestAddressBtn}
        activeOpacity={0.75}
      >
        <Text style={profileStyles.requestAddressBtnText}>Request mailing address</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: GuestItem;
  index: number;
  onClaim: (item: GuestItem) => void;
  claiming: boolean;
}

function GuestItemCard({ item, index, onClaim, claiming }: ItemCardProps) {
  const isClaimed = item.status === 'claimed';
  const priceDisplay = item.price != null ? `$${Number(item.price).toFixed(2)}` : null;

  function handleClaimPress() {
    console.log('[GuestItem] I\'ll buy this pressed for item:', item.id, item.name);
    onClaim(item);
  }

  return (
    <AnimatedListItem index={index}>
      <View style={[itemStyles.card, isClaimed && itemStyles.cardClaimed]}>
        <Image
          source={resolveImageSource(item.image_url)}
          style={itemStyles.image}
          contentFit="cover"
        />
        <View style={itemStyles.content}>
          <Text style={itemStyles.name} numberOfLines={2}>
            {item.name}
          </Text>
          {priceDisplay ? (
            <Text style={itemStyles.price}>{priceDisplay}</Text>
          ) : null}
          {item.store ? (
            <Text style={itemStyles.store}>{item.store}</Text>
          ) : null}
          {item.notes ? (
            <Text style={itemStyles.notes} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}

          {isClaimed ? (
            <View style={itemStyles.claimedBadge}>
              <CheckCircle size={12} color={C.teal} strokeWidth={2} />
              <Text style={itemStyles.claimedText}>Claimed ✓</Text>
            </View>
          ) : (
            <AnimatedPressable
              onPress={handleClaimPress}
              style={[itemStyles.claimButton, claiming && itemStyles.claimButtonDisabled]}
            >
              {claiming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={itemStyles.claimButtonText}>I'll buy this</Text>
              )}
            </AnimatedPressable>
          )}
        </View>
      </View>
    </AnimatedListItem>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GuestScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();

  const [wishlist, setWishlist] = useState<GuestWishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    console.log('[Guest] Fetching wishlist for token:', token);
    try {
      const data = await apiFetch(`/api/guest/${token}`);
      console.log('[Guest] Wishlist loaded:', data.name, 'items:', data.items?.length);
      setWishlist(data);
      setError(null);
    } catch (err) {
      console.log('[Guest] Error fetching wishlist:', err);
      setError('List not found');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  async function handleClaim(item: GuestItem) {
    if (claimingItemId) return;
    console.log('[Guest] Claiming item via Supabase:', item.id, item.name);
    setClaimingItemId(item.id);
    try {
      const { error: updateError } = await supabase
        .from('wishlist_items')
        .update({ claimed: true })
        .eq('id', item.id);
      if (updateError) {
        console.log('[Guest] Claim update error:', updateError.message);
        return;
      }
      console.log('[Guest] Claim successful, updating local state for item:', item.id);
      setWishlist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id ? { ...i, status: 'claimed' as const } : i
          ),
        };
      });
    } catch (err) {
      console.log('[Guest] Claim exception:', err);
    } finally {
      setClaimingItemId(null);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const itemCount = wishlist?.items?.length ?? 0;
  const itemCountText = String(itemCount);
  const occasionLabel = wishlist
    ? wishlist.occasion.charAt(0).toUpperCase() + wishlist.occasion.slice(1).toLowerCase()
    : '';

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.teal} />
      </View>
    );
  }

  if (error || !wishlist) {
    return (
      <View style={styles.centered}>
        <Gift size={48} color={C.textTertiary} strokeWidth={1.5} />
        <Text style={styles.errorTitle}>List not found</Text>
        <Text style={styles.errorBody}>
          This link may have expired or the list was removed.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.bg }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Child profile card */}
      <GuestProfileCard wishlist={wishlist} />

      {/* Items section */}
      <View style={styles.itemsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gift ideas</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itemCountText}</Text>
          </View>
          {occasionLabel ? (
            <Text style={styles.occasionLabel}>{occasionLabel}</Text>
          ) : null}
        </View>

        <View style={styles.itemsList}>
          {wishlist.items.map((item, index) => (
            <GuestItemCard
              key={item.id}
              item={item}
              index={index}
              onClaim={handleClaim}
              claiming={claimingItemId === item.id}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Profile Styles ───────────────────────────────────────────────────────────

const profileStyles = StyleSheet.create({
  card: {
    backgroundColor: C.profileCard,
    borderWidth: 1,
    borderColor: C.profileBorder,
    borderRadius: 16,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  childName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: C.label,
  },
  agePill: {
    backgroundColor: C.sageBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  agePillText: {
    color: C.sage,
    fontSize: 13,
    fontWeight: '600',
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sizePill: {
    backgroundColor: '#F0EFEC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sizePillText: {
    fontSize: 13,
    color: C.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: C.profileBorder,
    marginVertical: 14,
  },
  interestsSection: {
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: 12,
    color: C.textTertiary,
    marginBottom: 6,
    fontWeight: '500',
  },
  interestsText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    color: C.textSecondary,
  },
  requestAddressBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.teal,
    backgroundColor: 'transparent',
  },
  requestAddressBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.teal,
  },
});

// ─── Item Styles ──────────────────────────────────────────────────────────────

const itemStyles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardClaimed: {
    opacity: 0.55,
  },
  image: {
    width: 88,
    height: 88,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    color: C.label,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: C.label,
    fontVariant: ['tabular-nums'],
  },
  store: {
    fontSize: 13,
    color: C.textSecondary,
  },
  notes: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
    color: C.textTertiary,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.tealBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  claimedText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.teal,
  },
  claimButton: {
    backgroundColor: C.teal,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
    minWidth: 100,
    alignItems: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.7,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: C.bg,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.label,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  itemsSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Georgia',
    color: C.label,
  },
  countBadge: {
    backgroundColor: C.tealBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.teal,
  },
  occasionLabel: {
    fontSize: 13,
    color: C.textTertiary,
    marginLeft: 'auto',
  },
  itemsList: {
    gap: 10,
  },
});
