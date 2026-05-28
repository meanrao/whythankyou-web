import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Poppins_700Bold, Poppins_400Regular } from '@expo-google-fonts/poppins';
import { useAuth } from '@/contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  bg: '#FAF7F2',
  tagline: '#8A9882',
  heading: '#1C2820',
  inputBg: '#FFFFFF',
  placeholder: '#ADA494',
  errorText: '#C0392B',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [fontsLoaded] = useFonts({ Poppins_700Bold, Poppins_400Regular });
  const poppins700 = fontsLoaded ? 'Poppins_700Bold' : 'Georgia';
  const poppins400 = fontsLoaded ? 'Poppins_400Regular' : 'Georgia';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    console.log('[Signup] Create account button pressed, email:', email.trim());
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await signUp(trimmedEmail, password, trimmedName);
      console.log('[Signup] Signup successful, navigating to tabs');
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      console.log('[Signup] Signup failed:', err?.message);
      setError(err?.message ?? 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoToLogin() {
    console.log('[Signup] Navigate to login pressed');
    router.push('/auth/login');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brandSection}>
            <Text style={[styles.appWordmark, { fontFamily: poppins700 }]}>Why, Thank You!</Text>
            <Text style={[styles.tagline, { fontFamily: poppins400 }]}>Take the guesswork out of giving.</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <Text style={styles.formHeading}>Create account</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={C.placeholder}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={C.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor={C.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor={C.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
            </View>

            <TouchableOpacity
              onPress={handleSignup}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Create account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.mutedText}>Already have an account?</Text>
              <TouchableOpacity onPress={handleGoToLogin} activeOpacity={0.7}>
                <Text style={styles.linkText}> Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  appWordmark: {
    fontSize: 30,
    fontFamily: 'Georgia',
    fontWeight: '700',
    color: '#0F6B6F',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Georgia',
    color: C.tagline,
    marginTop: 6,
    textAlign: 'center',
  },
  formSection: {
    paddingHorizontal: 24,
    gap: 18,
    paddingBottom: 8,
  },
  formHeading: {
    fontSize: 24,
    fontFamily: 'Georgia',
    fontWeight: '700',
    color: C.heading,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  errorBox: {
    backgroundColor: '#FDECEA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    color: C.errorText,
    fontSize: 14,
    fontWeight: '500',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6E776A',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 0.5,
    borderColor: '#E3DED5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: C.heading,
  },
  primaryButton: {
    backgroundColor: '#0F6B6F',
    borderRadius: 28,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  mutedText: {
    fontSize: 15,
    color: '#6E776A',
  },
  linkText: {
    fontSize: 15,
    color: '#0F6B6F',
    fontWeight: '600',
  },
});
