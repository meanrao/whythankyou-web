import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  ImageSourcePropType,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Pressable,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { CheckCircle, Gift } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AvatarCircle } from '@/components/AvatarCircle';
import { apiFetch } from '@/utils/api';
import { saveSharedListEntry, removeSharedListEntry } from '@/hooks/useSharedLists';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  bg: '#F5F0E8',
  teal: '#1B8A8A',
  tealBg: '#E6F7F7',
  surface: '#FFFFFF',
  border: '#D4C9B8',
  label: '#2C3B32',
  textSecondary: '#5A6354',
  textTertiary: '#8E9A87',
  sage: '#4A7C5F',
  sageBg: '#EFF5F1',
  placeholder: '#A89F94',
  profileCard: '#FBF9F5',
  profileBorder: '#E8E6E0',
  coral: '#F28C79',
  imagePlaceholder: '#EDE8E0',
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
            <Text style={profileStyles.sectionLabel}>What they&apos;re into</Text>
            <Text style={profileStyles.interestsText}>{wishlist.current_interests}</Text>
          </View>
        </>
      ) : null}
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
  const hasImage = Boolean(item.image_url);

  function handleClaimPress() {
    if (isClaimed || claiming) return;
    onClaim(item);
  }

  return (
    <AnimatedListItem index={index}>
      <View style={[itemStyles.card, isClaimed && itemStyles.cardClaimed]}>
        {hasImage ? (
          <Image
            source={resolveImageSource(item.image_url)}
            style={itemStyles.image}
            contentFit="cover"
          />
        ) : (
          <View style={[itemStyles.image, itemStyles.imagePlaceholder]}>
            <Gift size={22} color={C.textTertiary} strokeWidth={1.5} />
          </View>
        )}
        <View style={itemStyles.content}>
          <Text style={itemStyles.name} numberOfLines={3}>
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
              <Text style={itemStyles.claimedText}>Someone&apos;s getting this</Text>
            </View>
          ) : (
            <AnimatedPressable
              onPress={handleClaimPress}
              style={[itemStyles.claimButton, claiming && itemStyles.claimButtonDisabled]}
              disabled={claiming}
            >
              {claiming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={itemStyles.claimButtonText}>I&apos;ll Get This</Text>
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

  // List state
  const [wishlist, setWishlist] = useState<GuestWishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Claim modal state
  const [pendingItem, setPendingItem] = useState<GuestItem | null>(null);
  const [claimerName, setClaimerName] = useState('');
  const [claimerEmail, setClaimerEmail] = useState('');
  const [claimerNote, setClaimerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);

  // Profile sheet
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  // One-time hint (shows after wishlist loads, auto-dismisses)
  const [hintVisible, setHintVisible] = useState(false);
  const hintOpacity = useRef(new Animated.Value(0)).current;

  // Success banner
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const [bannerVisible, setBannerVisible] = useState(false);

  const fetchWishlist = useCallback(async () => {
    console.log('[Guest] Fetching wishlist for token:', token);
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch(`/api/guest/${token}`);
      // API returns { wishlist: {...}, items: [...] } — merge into a flat object
      const merged: GuestWishlist = { ...data.wishlist, items: data.items ?? [] };
      console.log('[Guest] Wishlist loaded:', merged.name, 'items:', merged.items?.length);
      setWishlist(merged);
      setError(null);
      // Persist for "Shared With Me" section on home screen
      saveSharedListEntry({
        token,
        name:      merged.name,
        person:    merged.person,
        occasion:  merged.occasion || '',
        avatarUrl: merged.avatar_url ?? null,
        savedAt:   Date.now(),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.log('[Guest] Error fetching wishlist:', detail);
      // Remove from saved lists if the token is no longer valid
      if (detail.startsWith('404') || detail.includes('404')) {
        removeSharedListEntry(token);
      }
      setError('List not found');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Show hint once after the wishlist loads, if there's profile data worth seeing
  useEffect(() => {
    if (!wishlist) return;
    const hasProfileData =
      wishlist.child_age != null ||
      wishlist.clothing_size ||
      wishlist.shoe_size ||
      wishlist.current_interests;
    if (!hasProfileData) return;

    const showTimer = setTimeout(() => {
      setHintVisible(true);
      Animated.timing(hintOpacity, { toValue: 1, duration: 360, useNativeDriver: true }).start();
    }, 900);
    const hideTimer = setTimeout(() => {
      Animated.timing(hintOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => setHintVisible(false));
    }, 5500);

    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist?.id]);

  function openProfileSheet() {
    Animated.timing(hintOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => setHintVisible(false));
    setProfileSheetOpen(true);
  }

  function openClaimModal(item: GuestItem) {
    setPendingItem(item);
    setClaimerName('');
    setClaimerEmail('');
    setClaimerNote('');
    setClaimError(null);
  }

  function closeClaimModal() {
    if (submitting) return;
    setPendingItem(null);
    setClaimError(null);
  }

  function triggerSuccessBanner() {
    setBannerVisible(true);
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.delay(3200),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setBannerVisible(false));
  }

  async function handleClaimSubmit() {
    if (!pendingItem || !claimerName.trim()) return;
    setSubmitting(true);
    setClaimError(null);
    setClaimingItemId(pendingItem.id);
    console.log('[Guest] Submitting claim for item:', pendingItem.id, 'claimer:', claimerName.trim());

    try {
      await apiFetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: pendingItem.id,
          claimer_name: claimerName.trim(),
          claimer_email: claimerEmail.trim() || null,
          claimer_note: claimerNote.trim() || null,
        }),
      });

      console.log('[Guest] Claim successful for item:', pendingItem.id);
      const claimedId = pendingItem.id;
      setWishlist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === claimedId ? { ...i, status: 'claimed' as const } : i
          ),
        };
      });
      setPendingItem(null);
      triggerSuccessBanner();
    } catch (err: any) {
      const msg = String(err?.message ?? '').toLowerCase();
      console.log('[Guest] Claim failed:', err?.message ?? err);
      if (msg.includes('already claimed')) {
        // Mark locally as claimed and close
        const claimedId = pendingItem.id;
        setWishlist((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((i) =>
              i.id === claimedId ? { ...i, status: 'claimed' as const } : i
            ),
          };
        });
        setPendingItem(null);
      } else {
        setClaimError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
      setClaimingItemId(null);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const itemCountText = String(wishlist?.items?.length ?? 0);
  const occasionLabel = wishlist?.occasion
    ? wishlist.occasion.charAt(0).toUpperCase() + wishlist.occasion.slice(1).toLowerCase()
    : '';
  const modalVisible = pendingItem !== null;
  const availableGifts = wishlist?.items.filter(i => i.status !== 'claimed') ?? [];
  const claimedGifts = wishlist?.items.filter(i => i.status === 'claimed') ?? [];

  // ── Render: loading / error ────────────────────────────────────────────────

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

  // ── Render: main ──────────────────────────────────────────────────────────

  return (
    <View style={[styles.rootContainer, { backgroundColor: C.bg }]}>

      {/* Success banner — fades in above content after a successful claim */}
      {bannerVisible ? (
        <Animated.View style={[styles.successBanner, { opacity: bannerOpacity, top: insets.top + 12 }]}>
          <CheckCircle size={15} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.successBannerText}>
            Gift claimed. The list owner has been notified.
          </Text>
        </Animated.View>
      ) : null}

      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Profile avatar hero — tap to see sizes and interests */}
        <View style={avatarHeroStyles.container}>
          <TouchableOpacity onPress={openProfileSheet} activeOpacity={0.8} style={avatarHeroStyles.avatarWrap}>
            <View style={avatarHeroStyles.avatarRing}>
              <AvatarCircle uri={wishlist.avatar_url} name={wishlist.person} size={72} />
            </View>
          </TouchableOpacity>
          <Text style={avatarHeroStyles.name}>{wishlist.person}</Text>
          {hintVisible ? (
            <Animated.View style={[avatarHeroStyles.hintBubble, { opacity: hintOpacity }]}>
              <Text style={avatarHeroStyles.hintText}>Tap the profile photo to see sizes, interests, and gift preferences.</Text>
            </Animated.View>
          ) : null}
        </View>

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

          {wishlist.items.length === 0 ? (
            <View style={styles.emptyState}>
              <Gift size={32} color={C.textTertiary} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No gifts added yet</Text>
              <Text style={styles.emptyBody}>
                Check back soon — the list owner is still building it.
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {availableGifts.map((item, index) => (
                <GuestItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  onClaim={openClaimModal}
                  claiming={claimingItemId === item.id}
                />
              ))}
              {claimedGifts.length > 0 ? (
                <>
                  <Text style={styles.claimedSectionLabel}>Already Claimed</Text>
                  {claimedGifts.map((item, index) => (
                    <GuestItemCard
                      key={item.id}
                      item={item}
                      index={availableGifts.length + index}
                      onClaim={openClaimModal}
                      claiming={claimingItemId === item.id}
                    />
                  ))}
                </>
              ) : null}
            </View>
          )}
        </View>

        {/* Affiliate disclosure — shown only when the list has items */}
        {wishlist.items.length > 0 ? (
          <View style={styles.affiliateDisclosure}>
            <Text style={styles.affiliateDisclosureText}>
              Some links may earn a commission for Why, Thank You! when purchases are made through them. This helps support the app at no additional cost to you.
            </Text>
          </View>
        ) : null}

        {/* Sign-up CTA — soft nudge for recipients who want their own lists */}
        <View style={ctaStyles.container}>
          <View style={ctaStyles.divider} />
          <Text style={ctaStyles.headline}>Want to make your own gift list?</Text>
          <Text style={ctaStyles.body}>
            Download Why, Thank You! — free to create and share your own wishlist.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://apps.apple.com/app/id6746818447')}
            style={ctaStyles.button}
            activeOpacity={0.8}
          >
            <Text style={ctaStyles.buttonText}>Download on the App Store</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile sheet modal */}
      <Modal
        visible={profileSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileSheetOpen(false)}
      >
        <Pressable style={modalStyles.overlay} onPress={() => setProfileSheetOpen(false)}>
          <Pressable style={[modalStyles.sheet, profileSheetStyles.sheet]} onPress={() => {}}>
            <View style={modalStyles.handle} />
            <GuestProfileCard wishlist={wishlist} />
            <TouchableOpacity
              onPress={() => setProfileSheetOpen(false)}
              style={profileSheetStyles.closeBtn}
              activeOpacity={0.7}
            >
              <Text style={profileSheetStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Claim modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeClaimModal}
      >
        <Pressable style={modalStyles.overlay} onPress={closeClaimModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={modalStyles.kavWrapper}
          >
            {/* Inner Pressable absorbs taps so they don't dismiss the sheet */}
            <Pressable style={modalStyles.sheet} onPress={() => {}}>
              <View style={modalStyles.handle} />

              <Text style={modalStyles.sheetTitle}>I&apos;ll Get This</Text>
              {pendingItem ? (
                <Text style={modalStyles.giftName} numberOfLines={2}>
                  {pendingItem.name}
                </Text>
              ) : null}

              <View style={modalStyles.fields}>
                <View style={modalStyles.field}>
                  <Text style={modalStyles.fieldLabel}>
                    Your name{' '}
                    <Text style={modalStyles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="So the family knows who's getting it"
                    placeholderTextColor={C.placeholder}
                    value={claimerName}
                    onChangeText={setClaimerName}
                    autoFocus
                    returnKeyType="next"
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.fieldLabel}>
                    Email{' '}
                    <Text style={modalStyles.optional}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="For shipping coordination if needed"
                    placeholderTextColor={C.placeholder}
                    value={claimerEmail}
                    onChangeText={setClaimerEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.fieldLabel}>
                    Note{' '}
                    <Text style={modalStyles.optional}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Leave a message for the family"
                    placeholderTextColor={C.placeholder}
                    value={claimerNote}
                    onChangeText={setClaimerNote}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {claimError ? (
                <Text style={modalStyles.claimError}>{claimError}</Text>
              ) : null}

              <TouchableOpacity
                onPress={handleClaimSubmit}
                style={[
                  modalStyles.confirmButton,
                  (!claimerName.trim() || submitting) && modalStyles.confirmButtonDisabled,
                ]}
                disabled={!claimerName.trim() || submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={modalStyles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeClaimModal}
                style={modalStyles.cancelButton}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Avatar Hero Styles ───────────────────────────────────────────────────────

const avatarHeroStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  avatarWrap: {
    padding: 4,
  },
  avatarRing: {
    borderRadius: 42,
    shadowColor: '#1B8A8A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: C.label,
    letterSpacing: -0.3,
  },
  hintBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(15,107,111,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  hintText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
  },
});

// ─── Profile Sheet Styles ─────────────────────────────────────────────────────

const profileSheetStyles = StyleSheet.create({
  sheet: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  closeBtnText: {
    fontSize: 15,
    color: C.textSecondary,
    fontWeight: '500',
  },
});

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
  imagePlaceholder: {
    backgroundColor: C.imagePlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    color: C.label,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: C.label,
    fontVariant: ['tabular-nums'],
  },
  store: {
    fontSize: 12,
    color: C.textSecondary,
  },
  notes: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
    marginTop: 2,
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
    fontSize: 11,
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

// ─── Modal Styles ─────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,20,16,0.45)',
    justifyContent: 'flex-end',
  },
  kavWrapper: {
    width: '100%',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: C.label,
    marginBottom: 4,
  },
  giftName: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  fields: {
    gap: 14,
    marginBottom: 4,
  },
  field: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
    letterSpacing: 0.2,
  },
  required: {
    color: C.coral,
  },
  optional: {
    color: C.textTertiary,
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#F8F5F0',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: C.label,
  },
  claimError: {
    fontSize: 13,
    color: '#B94040',
    marginTop: 10,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: C.teal,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 15,
    color: C.textSecondary,
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
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
  successBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
    backgroundColor: C.teal,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
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
  claimedSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.label,
  },
  emptyBody: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  affiliateDisclosure: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 14,
    paddingHorizontal: 8,
  },
  affiliateDisclosureText: {
    fontSize: 11,
    color: C.textTertiary,
    lineHeight: 16,
    textAlign: 'center',
  },
});

// ─── CTA Styles ───────────────────────────────────────────────────────────────

const ctaStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: C.border,
    marginBottom: 8,
  },
  headline: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: C.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  button: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.sageBg,
    borderWidth: 1,
    borderColor: 'rgba(74,124,95,0.25)',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.sage,
  },
});
