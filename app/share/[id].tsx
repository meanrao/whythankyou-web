import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { X, Link2, Share2 } from 'lucide-react-native';
import { apiFetch } from '@/utils/api';
import { useColors } from '@/hooks/useColors';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  header: '#2A9D8F',
  headerText: '#F5F0E8',
  teal: '#1B8A8A',
  sage: '#4A7C5F',
};

const SHARE_BASE_URL = 'https://whythankyou.com/list';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ShareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = token ? `${SHARE_BASE_URL}/${token}` : '';

  useEffect(() => {
    async function fetchToken() {
      console.log('[Share] Fetching share token for wishlist:', id);
      try {
        const data = await apiFetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wishlist_id: id }),
        });
        console.log('[Share] Share token received:', data.token);
        setToken(data.token);
      } catch (err) {
        console.log('[Share] Error fetching share token:', err);
        setError('Could not generate share link. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchToken();
  }, [id]);

  function handleClose() {
    console.log('[Share] Close button pressed');
    router.back();
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    console.log('[Share] Copy link pressed, URL:', shareUrl);
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShareVia() {
    if (!shareUrl) return;
    console.log('[Share] Share via pressed, URL:', shareUrl);
    try {
      await Share.share({
        message: `Check out this gift wishlist! ${shareUrl}`,
        url: shareUrl,
        title: 'Share Wishlist',
      });
    } catch (err) {
      console.log('[Share] Share via error:', err);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.headerClose} hitSlop={8}>
          <X size={22} color={C.headerText} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share List</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Generating your link...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn't create link</Text>
            <Text style={[styles.errorBody, { color: colors.textSecondary }]}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Preview card */}
            <View style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.linkCardAccent} />
              <View style={styles.linkCardBody}>
                <Text style={[styles.linkCardLabel, { color: colors.textTertiary }]}>Your shareable link</Text>
                <Text style={[styles.linkCardUrl, { color: colors.text }]} numberOfLines={2}>
                  {shareUrl}
                </Text>

              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                onPress={handleCopyLink}
                style={[styles.copyButton, copied && styles.copyButtonCopied]}
                activeOpacity={0.85}
              >
                <Link2 size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.copyButtonText}>
                  {copied ? 'Copied!' : 'Copy link'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareVia}
                style={[styles.shareButton, { backgroundColor: colors.background, borderColor: C.sage }]}
                activeOpacity={0.85}
              >
                <Share2 size={18} color={C.sage} strokeWidth={2} />
                <Text style={styles.shareButtonText}>Share via...</Text>
              </TouchableOpacity>
            </View>

            {/* Helper text */}
            <Text style={[styles.helperText, { color: colors.textTertiary }]}>
              Anyone with this link can view the list and claim gifts.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    backgroundColor: C.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Georgia',
    color: C.headerText,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  linkCard: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  linkCardAccent: {
    width: 5,
    backgroundColor: C.teal,
  },
  linkCardBody: {
    flex: 1,
    padding: 16,
    gap: 6,
  },
  linkCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  linkCardUrl: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 22,
  },
  actionsContainer: {
    gap: 12,
  },
  copyButton: {
    backgroundColor: C.teal,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyButtonCopied: {
    backgroundColor: '#4A7C5F',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  shareButtonText: {
    color: C.sage,
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
