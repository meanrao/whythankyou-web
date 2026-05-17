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
import { supabase } from '@/utils/supabase';
import type { Session } from '@supabase/supabase-js';

const C = {
  bg: '#F5F0E8',
  teal: '#1B8A8A',
  text: '#2C3B32',
  textSecondary: '#5C6B5E',
  surface: '#FFFFFF',
  border: '#D4C9B8',
  success: '#4A7C5F',
  errorText: '#C0392B',
};

const APP_STORE_URL = 'https://apps.apple.com/app/w-ty/id6746818447';
const SIGNUP_URL = 'https://whythankyou.com/signup';
const LOGIN_URL = 'https://whythankyou.com/login';

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

type ChildAddress = {
  city: string | null;
  state: string | null;
  country: string | null;
};

function resolveImageSource(source: string | null | undefined) {
  if (!source) return { uri: '' };
  return { uri: source };
}

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
  const claimedLabel = item.claimed ? 'Claimed ✓' : 'Claim this gift';
  const hasStoreUrl = !!item.store_url;
  const storeLinkLabel = item.store ? `View on ${item.store}` : 'View item';

  function handleCardPress() {
    if (!hasStoreUrl) return;
    console.log('[WebGuest] Card tapped — opening store URL:', item.store_url);
    Linking.openURL(item.store_url!);
  }

  function handleClaimPress() {
    console.log('[WebGuest] Claim button pressed for item:', item.id, item.name, '| isLoggedIn:', isLoggedIn);
    onClaim(item.id);
  }

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      activeOpacity={hasStoreUrl ? 0.85 : 1}
      style={styles.giftCard}
    >
      {item.photo_url ? (
        <Image
          source={resolveImageSource(item.photo_url)}
          style={styles.giftImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.giftImagePlaceholder}>
          <Text style={styles.giftImagePlaceholderText}>🎁</Text>
        </View>
      )}
      <View style={styles.giftInfo}>
        <Text style={styles.giftName}>{item.name}</Text>
        {item.store ? (
          <Text style={styles.giftStore}>{item.store}</Text>
        ) : null}
        {priceDisplay ? (
          <Text style={styles.giftPrice}>{priceDisplay}</Text>
        ) : null}
        {hasStoreUrl ? (
          <Text style={styles.storeLink}>{storeLinkLabel}</Text>
        ) : null}
        <TouchableOpacity
          onPress={handleClaimPress}
          disabled={item.claimed}
          style={[styles.claimButton, item.claimed && styles.claimButtonClaimed]}
          activeOpacity={0.8}
        >
          <Text style={[styles.claimButtonText, item.claimed && styles.claimButtonTextClaimed]}>
            {claimedLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function WebGuestScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [wishlist, setWishlist] = useState<WishlistData | null>(null);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [items, setItems] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [address, setAddress] = useState<ChildAddress | null>(null);
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

  useEffect(() => {
    if (isLoggedIn && wishlistId) {
      console.log('[WebGuest] User is logged in — fetching address for wishlist:', wishlistId);
      loadAddress(wishlistId);
    }
  }, [isLoggedIn, wishlistId]);

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

  async function loadAddress(wid: string) {
    console.log('[WebGuest] Fetching child_addresses for wishlist_id:', wid);
    const { data, error: addrError } = await supabase
      .from('child_addresses')
      .select('city, state, country')
      .eq('child_id', wid)
      .maybeSingle();

    if (addrError) {
      console.log('[WebGuest] Address fetch error:', addrError.message);
      return;
    }
    if (data) {
      console.log('[WebGuest] Address loaded:', data.city, data.state, data.country);
      setAddress(data as ChildAddress);
    } else {
      console.log('[WebGuest] No address found for wishlist:', wid);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={styles.loadingText}>Loading gift list...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>🎁</Text>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (!wishlist) return null;

  const listName = wishlist.name;
  const personName = wishlist.person;
  const claimedCount = items.filter(i => i.claimed).length;
  const totalCount = items.length;
  const progressLabel = totalCount > 0 ? `${claimedCount} of ${totalCount} gifts claimed` : 'No gifts yet';

  const hasAddress = isLoggedIn && address && (address.city || address.state || address.country);
  const addressParts = [address?.city, address?.state, address?.country].filter(Boolean);
  const addressDisplay = addressParts.join(', ');

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Why, Thank You!</Text>
          <Text style={styles.headerTitle}>{listName}</Text>
          <Text style={styles.headerSubtitle}>
            {'Gift list for '}
            {personName}
          </Text>
          {wishlist.birthday ? (
            <Text style={guestStyles.birthdayText}>
              {'🎂 '}
              {new Date(wishlist.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          ) : null}
          <Text style={styles.progressLabel}>{progressLabel}</Text>
        </View>

        {/* Gift items */}
        <View style={styles.itemsContainer}>
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎁</Text>
              <Text style={styles.emptyText}>No gifts have been added yet.</Text>
            </View>
          ) : (
            items.map(item => (
              <GiftCard
                key={item.id}
                item={item}
                onClaim={handleClaim}
                isLoggedIn={isLoggedIn}
              />
            ))
          )}
        </View>

        {/* Mailing address — logged-in guests only */}
        {hasAddress ? (
          <View style={styles.addressSection}>
            <Text style={styles.addressSectionTitle}>Mailing Address</Text>
            <View style={styles.addressCard}>
              <Text style={styles.addressLabel}>Ship to</Text>
              <Text style={styles.addressValue}>{addressDisplay}</Text>
            </View>
          </View>
        ) : null}

        {/* Download banner */}
        <View style={styles.downloadBanner}>
          <Text style={styles.downloadTitle}>Want to create wishlists for your kids?</Text>
          <Text style={styles.downloadSubtext}>Download Why, Thank You! on the App Store</Text>
          <TouchableOpacity
            onPress={handleDownloadBanner}
            style={styles.downloadButton}
            activeOpacity={0.85}
          >
            <Text style={styles.downloadButtonText}>Download on the App Store</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Why, Thank You!</Text>
          <Text style={styles.footerTagline}>Take the guesswork out of giving.</Text>
        </View>
      </ScrollView>

      {/* Claim modal — shown when not logged in */}
      <Modal
        visible={claimModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            onPress={handleModalClose}
            style={styles.modalCloseButton}
            activeOpacity={0.7}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Claim this gift</Text>
          <Text style={styles.modalBody}>
            Create a free Why, Thank You! account to claim gifts and track what you're buying.
          </Text>

          <TouchableOpacity
            onPress={handleModalCreateAccount}
            style={styles.modalPrimaryButton}
            activeOpacity={0.85}
          >
            <Text style={styles.modalPrimaryButtonText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleModalLogin}
            style={styles.modalSecondaryButton}
            activeOpacity={0.85}
          >
            <Text style={styles.modalSecondaryButtonText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 60,
  },
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
    color: C.textSecondary,
    marginTop: 8,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: C.text,
  },
  errorMessage: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    backgroundColor: C.teal,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  progressLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  itemsContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  giftCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  giftImage: {
    width: 100,
    height: 120,
  },
  giftImagePlaceholder: {
    width: 100,
    height: 120,
    backgroundColor: '#F0EBE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftImagePlaceholderText: {
    fontSize: 32,
  },
  giftInfo: {
    flex: 1,
    padding: 14,
    gap: 4,
    justifyContent: 'center',
  },
  giftName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: C.text,
    lineHeight: 22,
  },
  giftStore: {
    fontSize: 13,
    color: C.textSecondary,
  },
  giftPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: C.teal,
    marginTop: 2,
  },
  storeLink: {
    fontSize: 13,
    color: C.teal,
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  claimButton: {
    marginTop: 10,
    backgroundColor: C.teal,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  claimButtonClaimed: {
    backgroundColor: C.success,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  claimButtonTextClaimed: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
  },
  // Address section
  addressSection: {
    marginHorizontal: 20,
    marginTop: 32,
    gap: 10,
  },
  addressSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: C.text,
  },
  addressCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 4,
  },
  addressLabel: {
    fontSize: 12,
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  addressValue: {
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  // Download banner
  downloadBanner: {
    backgroundColor: C.teal,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 32,
    alignItems: 'center',
    gap: 8,
  },
  downloadTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  downloadSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  downloadButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 4,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Footer
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 4,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },
  footerTagline: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: 'Georgia',
    color: C.textSecondary,
  },
  // Claim modal
  modalContainer: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 28,
    paddingTop: 56,
  },
  modalCloseButton: {
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
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: C.text,
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 16,
    color: C.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
  },
  modalPrimaryButton: {
    backgroundColor: C.teal,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSecondaryButton: {
    borderWidth: 2,
    borderColor: C.teal,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: C.teal,
    fontSize: 16,
    fontWeight: '600',
  },
});

const guestStyles = StyleSheet.create({
  birthdayText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
