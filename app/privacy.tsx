import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';

const HEADER_COLOR = '#2A9D8F';
const HEADER_TEXT = '#FAF7F2';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  function handleBack() {
    console.log('[Privacy] Back button pressed');
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBack} hitSlop={8}>
          <ChevronLeft size={24} color={HEADER_TEXT} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>Last updated: June 2025</Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>1. Information We Collect</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We collect your email address when you create an account. We store wishlist data you create, including list names, gift items, prices, store names, and notes. If you upload photos, they are stored in Supabase Storage.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>2. How We Use Your Information</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your data is used solely to provide the Why, Thank You! service — creating and sharing wishlists with family and friends. We do not sell your data to third parties. We do not use your data for advertising.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>3. Data Storage</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          All data is stored securely using Supabase (supabase.com), a trusted cloud database provider. Photos are stored in Supabase Storage with public read access so gift givers can view them.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>4. Sharing</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Wishlists you share are accessible to anyone with the share link. Shared lists show gift items and child profile information you have entered. You control what information you add.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>5. Data Deletion</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You may delete your account and all associated data by contacting us at hello@whythankyou.com.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>6. Contact</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Questions? Email us at hello@whythankyou.com.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    backgroundColor: HEADER_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerBack: {
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
    color: HEADER_TEXT,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  lastUpdated: {
    fontSize: 13,
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Georgia',
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
  },
});
