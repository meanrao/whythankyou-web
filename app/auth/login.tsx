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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Poppins_700Bold, Poppins_400Regular } from '@expo-google-fonts/poppins';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  bg: '#FAF7F2',
  brand: '#1B8A8A',
  tagline: '#8A9882',
  heading: '#1C2820',
  inputBg: '#FFFFFF',
  border: '#EAE2D6',
  label: '#5A6654',
  placeholder: '#ADA494',
  linkText: '#1B8A8A',
  errorText: '#C0392B',
  teal: '#1B8A8A',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [fontsLoaded] = useFonts({ Poppins_700Bold, Poppins_400Regular });
  const poppins700 = fontsLoaded ? 'Poppins_700Bold' : 'Georgia';
  const poppins400 = fontsLoaded ? 'Poppins_400Regular' : 'Georgia';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    console.log('[Login] Log in button pressed, email:', email.trim());
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(trimmedEmail, password);
      console.log('[Login] Login successful, navigating to tabs');
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      console.log('[Login] Login failed:', err?.message);
      setError(err?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    console.log('[Login] Forgot password pressed, email:', email.trim());
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Enter your email', 'Please enter your email address above first.');
      return;
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (resetError) {
        console.log('[Login] Password reset error:', resetError.message);
        Alert.alert('Error', resetError.message);
      } else {
        console.log('[Login] Password reset email sent to:', trimmedEmail);
        Alert.alert('Check your inbox', `A password reset link has been sent to ${trimmedEmail}.`);
      }
    } catch (err: any) {
      console.log('[Login] Password reset exception:', err?.message);
      Alert.alert('Error', err?.message ?? 'Something went wrong.');
    }
  }

  function handleGoToSignup() {
    console.log('[Login] Navigate to signup pressed');
    router.push('/auth/signup');
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
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

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
                placeholder="••••••••"
                placeholderTextColor={C.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Log in</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow} activeOpacity={0.7}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>

            <View style={styles.signupRow}>
              <Text style={styles.mutedText}>Don't have an account?</Text>
              <TouchableOpacity onPress={handleGoToSignup} activeOpacity={0.7}>
                <Text style={styles.linkText}> Sign up</Text>
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
  forgotRow: {
    alignItems: 'center',
    paddingVertical: 2,
    marginTop: -4,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  mutedText: {
    fontSize: 15,
    color: C.label,
  },
  linkText: {
    fontSize: 15,
    color: '#0F6B6F',
    fontWeight: '600',
  },
});
