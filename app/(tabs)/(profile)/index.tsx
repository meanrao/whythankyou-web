import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronRight } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { supabase } from '@/utils/supabase';
import { useColors } from '@/hooks/useColors';

const PREF_EMAIL_NOTIFICATIONS = 'pref_email_notifications';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();

  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const appVersion = String(Constants.expoConfig?.version ?? '1.0.0');

  useEffect(() => {
    async function loadData() {
      const [{ data: { user } }, storedPref] = await Promise.all([
        supabase.auth.getUser(),
        SecureStore.getItemAsync(PREF_EMAIL_NOTIFICATIONS),
      ]);
      setEmail(user?.email ?? null);
      setDisplayName(user?.user_metadata?.display_name ?? '');
      if (storedPref !== null) {
        setEmailNotifications(storedPref === 'true');
      }
      setLoadingUser(false);
    }
    loadData();
  }, []);

  async function handleSaveDisplayName() {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    console.log('[Profile] Saving display name:', trimmed);
    setSavingName(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
      if (error) {
        console.error('[Profile] Display name save error:', error.message);
        Alert.alert('Could not save name', error.message);
      } else {
        console.log('[Profile] Display name saved, user metadata:', data.user?.user_metadata);
      }
    } catch (err: any) {
      console.error('[Profile] Display name save exception:', err);
      Alert.alert('Could not save name', err?.message ?? 'Please try again.');
    } finally {
      setSavingName(false);
    }
  }

  async function handleToggleEmailNotifications(value: boolean) {
    console.log('[Profile] Email notifications toggled:', value);
    setEmailNotifications(value);
    await SecureStore.setItemAsync(PREF_EMAIL_NOTIFICATIONS, String(value));
  }

  async function handleSignOut() {
    console.log('[Profile] Sign out button pressed');
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('[Profile] Sign out error:', error.message);
        Alert.alert('Sign out failed', error.message);
        return;
      }
      console.log('[Profile] Signed out successfully, navigating to login');
      router.replace('/auth/login');
    } catch (err: any) {
      console.log('[Profile] Sign out exception:', err);
      Alert.alert('Sign out failed', err?.message ?? 'Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  function handleClose() {
    console.log('[Profile] Close button pressed');
    router.back();
  }

  function handlePrivacyPolicy() {
    console.log('[Profile] Privacy policy pressed');
    router.push('/privacy');
  }

  function handleTerms() {
    console.log('[Profile] Terms of service pressed');
    router.push('/terms');
  }

  const emailDisplay = loadingUser ? '...' : (email ?? 'No email');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Teal header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleClose} style={styles.headerClose} hitSlop={8}>
          <X size={22} color="#F5F0E8" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Account</Text>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Email</Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>{emailDisplay}</Text>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Display name</Text>
            <View style={styles.nameInputRow}>
              <TextInput
                style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={displayName}
                onChangeText={setDisplayName}
                onBlur={handleSaveDisplayName}
                placeholder="Your name"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                onSubmitEditing={handleSaveDisplayName}
              />
              {savingName ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
              ) : null}
            </View>
          </View>
        </View>

        {/* Preferences card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Preferences</Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Email notifications</Text>
            <Switch
              value={emailNotifications}
              onValueChange={handleToggleEmailNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* About card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>About</Text>

          <View style={styles.aboutVersionRow}>
            <Text style={[styles.aboutLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>{appVersion}</Text>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity onPress={handlePrivacyPolicy} style={styles.linkRow} activeOpacity={0.7}>
            <Text style={[styles.linkLabel, { color: colors.text }]}>Privacy Policy</Text>
            <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity onPress={handleTerms} style={styles.linkRow} activeOpacity={0.7}>
            <Text style={[styles.linkLabel, { color: colors.text }]}>Terms of Service</Text>
            <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Sign out button */}
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
          activeOpacity={0.85}
        >
          {signingOut ? (
            <ActivityIndicator color="#F5F0E8" />
          ) : (
            <Text style={styles.signOutText}>Sign out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1B8A8A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
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
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Georgia',
    color: '#F5F0E8',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldRow: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowDivider: {
    height: 1,
    marginVertical: 2,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  aboutVersionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aboutLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  aboutValue: {
    fontSize: 15,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  linkLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#4A7C5F',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signOutButtonDisabled: {
    opacity: 0.5,
  },
  signOutText: {
    color: '#F5F0E8',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
