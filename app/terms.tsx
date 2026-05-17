import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';

const HEADER_COLOR = '#2A9D8F';
const HEADER_TEXT = '#FAF7F2';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  function handleBack() {
    console.log('[Terms] Back button pressed');
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBack} hitSlop={8}>
          <ChevronLeft size={24} color={HEADER_TEXT} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>Last updated: June 2025</Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>1. Free Service</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Why, Thank You! is provided free of charge. We reserve the right to change or discontinue the service at any time.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>2. Your Content</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You are responsible for all content you add to the app, including wishlist items, photos, and notes. Do not add content that is illegal, offensive, or violates others' rights.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>3. No Guarantees</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          The service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access or that the service will be error-free.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>4. Shared Links</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          When you share a wishlist link, anyone with that link can view the list and mark items as claimed. Share links responsibly.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>5. Privacy</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your use of the app is also governed by our Privacy Policy.
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
