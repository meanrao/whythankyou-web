import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFonts } from 'expo-font';
import { Poppins_700Bold, Poppins_600SemiBold, Poppins_400Regular } from '@expo-google-fonts/poppins';
import { Gift } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import type { Session } from '@supabase/supabase-js';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg: '#FAF7F2',
  cream2: '#F2EDE5',
  teal: '#2A9D8F',
  tealMuted: '#E8F5F3',
  gold: '#B5872E',
  text: '#1C2820',
  textSecondary: '#5A6654',
  textTertiary: '#8A9882',
  surface: '#FFFFFF',
  border: '#EAE2D6',
  success: '#2A9D8F',
  errorText: '#C0392B',
};

const APP_STORE_URL = 'https://apps.apple.com/app/w-ty/id6746818447';
const SIGNUP_URL = 'https://whythankyou.com/signup';
const LOGIN_URL = 'https://whythankyou.com/login';

// ─── Types ────────────────────────────────────────────────────────────────────

type GiftItem = {
  id: string;
  name: string;
  price: string | number | null;
  store: string | null;
  store_url: string | null;
  photo_url: string | null;
  claimed: boolean;
};

type WishlistData = {
  id: string;
  name: string;
  person: string;
  birthday: string | null;
};

// ─── Gift card ────────────────────────────────────────────────────────────────

function GiftCard({
  item,
  onClaim,
  isLoggedIn,
}: {
  item: GiftItem;
  onClaim: (id: string) => void;
  isLoggedIn: boolean;
}) {
  const priceDisplay = item.price != null ? `$${Number(item.price).toFixed(2)}` : null;
  const hasStoreUrl = !!item.store_url;

  function handleShopPress() {
    if (!hasStoreUrl) return;
    console.log('[WebGuest] Shop link tapped:', item.store_url);
    Linking.openURL(item.store_url!);
  }

  function handleClaimPress() {
    console.log('[WebGuest] Claim pressed:', item.id, item.name, '| loggedIn:', isLoggedIn);
    onClaim(item.id);
  }

  return (
    <View style={styles.giftCard}>
      {/* Photo + details row */}
      <View style={styles.giftCardBody}>
        {/* Square photo */}
        <View style={styles.giftImageWrap}>
          {item.photo_url ? (
            <Image
              source={{ uri: item.photo_url }}
              style={styles.giftImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.giftImagePlaceholder}>
              <Gift size={36} color="#B89A8A" />
            </View>
          )}
          {item.claimed ? (
            <View style={styles.claimedOverlay}>
              <Text style={styles.claimedOverlayCheck}>✓</Text>
            </View>
          ) : null}
        </View>

        {/* Text details */}
        <View style={styles.giftDetails}>
          <Text style={styles.giftName} numberOfLines={3}>{item.name}</Text>
          {item.store ? (
            <Text style={styles.giftStore}>{item.store}</Text>
          ) : null}
          {priceDisplay ? (
            <Text style={styles.giftPrice}>{priceDisplay}</Text>
          ) : null}
          {hasStoreUrl ? (
            <TouchableOpacity onPress={handleShopPress} activeOpacity={0.7} style={styles.shopLinkBtn}>
              <Text style={styles.shopLinkText}>Shop now →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Full-width claim button */}
      <View style={styles.giftCardFooter}>
        <TouchableOpacity
          onPress={handleClaimPress}
          disabled={item.claimed}
          style={[styles.claimButton, item.claimed && styles.claimButtonClaimed]}
          activeOpacity={0.85}
        >
          <Text style={[styles.claimButtonText, item.claimed && styles.claimButtonTextClaimed]}>
            {item.claimed ? '✓  Claimed' : 'Claim this gift'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WebGuestScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  useFonts({ Poppins_700Bold, Poppins_600SemiBold, Poppins_400Regular });
  const [wishlist, setWishlist] = useState<WishlistData | null>(null);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [items, setItems] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [pendingClaimItemId, setPendingClaimItemId] = useState<string | null>(null);

  const isLoggedIn = !!session;

  useEffect(() => {
    console.log('[WebGuest] Checking auth session on mount');
    supabase.auth.getSession().then(({ data }) => {
      console.log('[WebGuest] Session result:', data.session ? 'logged in' : 'not logged in');
      setSession(data.session);
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    console.log('[WebGuest] Loading gift list for token:', token);
    loadGiftList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadGiftList() {
    setLoading(true);
    setError(null);
    try {
      console.log('[WebGuest] Querying share_tokens for token:', token);
      const { data: tokenRow, error: tokenError } = await supabase
        .from('share_tokens')
        .select('wishlist_id')
        .eq('token', token)
        .single();

      if (tokenError || !tokenRow) {
        console.log('[WebGuest] Token lookup failed:', tokenError?.message);
        setError('This gift list link is invalid or has expired.');
        setLoading(false);
        return;
      }

      const wid = tokenRow.wishlist_id;
      console.log('[WebGuest] Found wishlist_id:', wid);
      setWishlistId(wid);

      const [wishlistResult, itemsResult] = await Promise.all([
        supabase
          .from('wishlists')
          .select('id, name, person, birthday')
          .eq('id', wid)
          .single(),
        supabase
          .from('wishlist_items')
          .select('id, name, price, store, store_url, photo_url, claimed')
          .eq('wishlist_id', wid)
          .order('created_at', { ascending: true }),
      ]);

      if (wishlistResult.error || !wishlistResult.data) {
        console.log('[WebGuest] Wishlist fetch failed:', wishlistResult.error?.message);
        setError('Could not load the gift list.');
        setLoading(false);
        return;
      }

      console.log('[WebGuest] Loaded wishlist:', wishlistResult.data.name, 'with', itemsResult.data?.length ?? 0, 'items');
      setWishlist(wishlistResult.data as WishlistData);
      setItems((itemsResult.data ?? []) as GiftItem[]);
    } catch (err: any) {
      console.log('[WebGuest] Unexpected error:', err?.message);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(itemId: string) {
    console.log('[WebGuest] handleClaim called for item:', itemId, '| isLoggedIn:', isLoggedIn);
    if (!isLoggedIn) {
      console.log('[WebGuest] Not logged in — showing claim modal');
      setPendingClaimItemId(itemId);
      setClaimModalVisible(true);
      return;
    }

    console.log('[WebGuest] Inserting claim for item:', itemId);
    const { error: claimError } = await supabase
      .from('item_claims')
      .insert({ item_id: itemId, claimed_by: session!.user.id });

    if (claimError) {
      console.log('[WebGuest] Claim insert error:', claimError.message);
    } else {
      console.log('[WebGuest] Item claimed successfully:', itemId);
    }

    setItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, claimed: true } : item))
    );
  }

  function handleModalCreateAccount() {
    console.log('[WebGuest] Modal — Create account tapped');
    Linking.openURL(SIGNUP_URL);
  }

  function handleModalLogin() {
    console.log('[WebGuest] Modal — Log in tapped');
    Linking.openURL(LOGIN_URL);
  }

  function handleModalClose() {
    console.log('[WebGuest] Modal dismissed');
    setClaimModalVisible(false);
    setPendingClaimItemId(null);
  }

  function handleDownloadBanner() {
    console.log('[WebGuest] Download banner tapped — opening App Store');
    Linking.openURL(APP_STORE_URL);
  }

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={styles.loadingText}>Loading gift list…</Text>
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={styles.centered}>
        <Gift size={48} color="#B89A8A" />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (!wishlist) return null;

  // ── Derived values ───────────────────────────────────────────────────────────

  const totalCount = items.length;

  const formattedBirthday = wishlist.birthday
    ? new Date(wishlist.birthday + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>

          {/* ── Brand bar ── */}
          <View style={styles.brandBar}>
            <View style={styles.brandRule} />
            <Text style={styles.brandName}>Why, Thank You!</Text>
            <View style={styles.brandRule} />
          </View>

          {/* ── Hero header ── */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{wishlist.name}</Text>
            <Text style={styles.heroSubtitle}>
              A gift list for {wishlist.person}
            </Text>
            {formattedBirthday ? (
              <Text style={styles.heroBirthday}>{formattedBirthday}</Text>
            ) : null}
          </View>

          {/* ── Divider ── */}
          <View style={styles.sectionDivider} />

          {/* ── Gift list ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {totalCount === 0 ? 'Gift List' : `${totalCount} Gift${totalCount !== 1 ? 's' : ''}`}
            </Text>

            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <Gift size={40} color="#B89A8A" />
                <Text style={styles.emptyText}>No gifts have been added yet.</Text>
              </View>
            ) : (
              <View style={styles.giftList}>
                {items.map(item => (
                  <GiftCard
                    key={item.id}
                    item={item}
                    onClaim={handleClaim}
                    isLoggedIn={isLoggedIn}
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── Download banner ── */}
          <View style={styles.sectionDivider} />
          <View style={styles.downloadBanner}>
            <Text style={styles.downloadTitle}>
              Create wishlists for your family
            </Text>
            <Text style={styles.downloadSubtext}>
              Free on iPhone & iPad — takes two minutes to set up
            </Text>
            <TouchableOpacity
              onPress={handleDownloadBanner}
              style={styles.downloadButton}
              activeOpacity={0.85}
            >
              <Text style={styles.downloadButtonText}>Download Why, Thank You!</Text>
            </TouchableOpacity>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerWordmark}>Why, Thank You!</Text>
            <Text style={styles.footerTagline}>
              Take the guesswork out of giving.
            </Text>
          </View>

        </View>
      </ScrollView>

      {/* ── Claim modal (not logged in) ── */}
      <Modal
        visible={claimModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            onPress={handleModalClose}
            style={styles.modalCloseBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          <Gift size={44} color="#B89A8A" style={{ marginBottom: 16 }} />
          <Text style={styles.modalTitle}>Claim this gift</Text>
          <Text style={styles.modalBody}>
            Sign in to mark this as yours so no one else buys a duplicate.
          </Text>

          <TouchableOpacity
            onPress={handleModalCreateAccount}
            style={styles.modalPrimaryBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.modalPrimaryBtnText}>Create a free account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleModalLogin}
            style={styles.modalSecondaryBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.modalSecondaryBtnText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  // Centered page wrapper (caps width on desktop)
  page: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },

  // ── Loading / error ────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: C.textSecondary,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    color: C.text,
  },
  errorMessage: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Brand bar ─────────────────────────────────────────────────────────────
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    gap: 14,
  },
  brandRule: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  brandName: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 18,
    color: C.teal,
    letterSpacing: 0.2,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 34,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 17,
    color: C.textSecondary,
    textAlign: 'center',
  },
  heroBirthday: {
    fontSize: 14,
    color: C.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  // ── Section divider ───────────────────────────────────────────────────────
  sectionDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 24,
    marginBottom: 28,
  },

  // ── Section wrapper ───────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.textTertiary,
  },

  // ── Gift list ─────────────────────────────────────────────────────────────
  giftList: {
    gap: 14,
  },

  // ── Gift card ─────────────────────────────────────────────────────────────
  giftCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    // Web shadow via boxShadow is set inline since RN StyleSheet doesn't support it
    shadowColor: '#1C2820',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  giftCardBody: {
    flexDirection: 'row',
    padding: 14,
    gap: 14,
  },
  giftImageWrap: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.cream2,
    flexShrink: 0,
  },
  giftImage: {
    width: 100,
    height: 100,
  },
  giftImagePlaceholder: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE7DC',
  },
  // Claimed overlay on image
  claimedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42,157,143,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedOverlayCheck: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  giftDetails: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  giftName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  giftStore: {
    fontSize: 13,
    color: C.textSecondary,
  },
  giftPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: C.teal,
    marginTop: 2,
  },
  shopLinkBtn: {
    marginTop: 6,
  },
  shopLinkText: {
    fontSize: 13,
    color: C.teal,
    fontWeight: '600',
  },
  // Full-width claim button at card bottom
  giftCardFooter: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 12,
  },
  claimButton: {
    backgroundColor: C.teal,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonClaimed: {
    backgroundColor: C.tealMuted,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  claimButtonTextClaimed: {
    color: C.teal,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
  },

  // ── Download banner ───────────────────────────────────────────────────────
  downloadBanner: {
    backgroundColor: C.cream2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    marginHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  downloadTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  downloadSubtext: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  downloadButton: {
    backgroundColor: C.teal,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 4,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 36,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 8,
  },
  footerWordmark: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: C.teal,
    fontWeight: '600',
  },
  footerTagline: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: C.textTertiary,
  },

  // ── Claim modal ───────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 28,
    paddingTop: 64,
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: C.text,
    fontWeight: '600',
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 16,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
    maxWidth: 300,
  },
  modalPrimaryBtn: {
    backgroundColor: C.teal,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalSecondaryBtn: {
    borderWidth: 1.5,
    borderColor: C.teal,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
    width: '100%',
  },
  modalSecondaryBtnText: {
    color: C.teal,
    fontSize: 16,
    fontWeight: '600',
  },
});
