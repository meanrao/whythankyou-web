import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_400Regular } from '@expo-google-fonts/poppins';
import { Fraunces_900Black } from '@expo-google-fonts/fraunces';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// ─── Screen geometry ──────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('screen');

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const ND = Platform.OS !== 'web';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = { onFinish?: () => void };

// ─── Web fallback ─────────────────────────────────────────────────────────────

function WebSplash({ onFinish }: Props) {
  const router = useRouter();
  function handlePress() {
    onFinish ? onFinish() : router.replace('/(tabs)' as any);
  }
  return (
    <View style={webStyles.root}>
      <View style={{ flexDirection: 'row' }}>
        <Text style={webStyles.titleLine}>why</Text>
        <Text style={[webStyles.titleLine, { color: '#F28C79' }]}>,</Text>
      </View>
      <Text style={webStyles.titleLine}>thank</Text>
      <View style={{ flexDirection: 'row' }}>
        <Text style={webStyles.titleLine}>you</Text>
        <Text style={[webStyles.titleLine, { color: '#F28C79' }]}>!</Text>
      </View>
      <Text style={webStyles.tagline}>Take the guesswork out of giving.</Text>
      <TouchableOpacity onPress={handlePress} style={webStyles.button} activeOpacity={0.85}>
        <Text style={webStyles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const webStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 32,
  },
  titleLine: {
    fontFamily: 'Georgia',
    fontSize: 44,
    color: '#0F6B6F',
    textAlign: 'center',
    lineHeight: 50,
  },
  tagline: {
    fontSize: 14,
    color: '#6E776A',
    marginTop: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#0F6B6F',
    borderRadius: 28,
    paddingHorizontal: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#F6F1E8',
    fontSize: 16,
    fontWeight: '600',
  },
});

// ─── Native animated splash ───────────────────────────────────────────────────

function NativeSplash({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_400Regular,
    Fraunces_900Black,
  });

  // ── Animated values ──────────────────────────────────────────────────────────

  const photoOpacity = useRef(new Animated.Value(0)).current;
  const waveOpacity  = useRef(new Animated.Value(0)).current;
  const waveY        = useRef(new Animated.Value(60)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(14)).current;
  const btnOpacity   = useRef(new Animated.Value(0)).current;
  const btnY         = useRef(new Animated.Value(14)).current;

  // ── Timeline ─────────────────────────────────────────────────────────────────
  //
  //    0ms    photo fades in over 600ms
  //    400ms  wave overlay rises up over 600ms
  //    1000ms text block fades in over 400ms
  //    1400ms button fades in over 400ms

  useEffect(() => {
    console.log('[Splash] Starting full-screen sequence');

    const master = Animated.parallel([
      Animated.timing(photoOpacity, { toValue: 1, duration: 600, delay: 0,    easing: EASE, useNativeDriver: ND }),
      Animated.timing(waveOpacity,  { toValue: 1, duration: 500, delay: 400,  easing: EASE, useNativeDriver: ND }),
      Animated.timing(waveY,        { toValue: 0, duration: 600, delay: 400,  easing: EASE, useNativeDriver: ND }),
      Animated.timing(titleOpacity, { toValue: 1, duration: 400, delay: 1000, easing: EASE, useNativeDriver: ND }),
      Animated.timing(titleY,       { toValue: 0, duration: 400, delay: 1000, easing: EASE, useNativeDriver: ND }),
      Animated.timing(btnOpacity,   { toValue: 1, duration: 400, delay: 1400, easing: EASE, useNativeDriver: ND }),
      Animated.timing(btnY,         { toValue: 0, duration: 400, delay: 1400, easing: EASE, useNativeDriver: ND }),
    ]);

    master.start(() => console.log('[Splash] Sequence complete'));
    return () => master.stop();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleGetStarted() {
    console.log('[Splash] Get Started pressed');
    onFinish ? onFinish() : router.replace('/(tabs)' as any);
  }

  function handleLogIn() {
    console.log('[Splash] Log in pressed');
    onFinish ? onFinish() : router.replace('/auth/login' as any);
  }

  const frauncesFamily  = fontsLoaded ? 'Fraunces_900Black'  : 'Georgia';
  const poppinsRegular  = fontsLoaded ? 'Poppins_400Regular' : 'Georgia';
  const poppinsSemiBold = fontsLoaded ? 'Poppins_600SemiBold': 'Georgia';

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Full-screen background photo */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: photoOpacity }]}>
        <Image
          source={require('../assets/images/splash10.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
        />
      </Animated.View>

      {/* Wave overlay — rises up from bottom */}
      <Animated.View
        style={[
          styles.wave,
          { opacity: waveOpacity, transform: [{ translateY: waveY }] },
        ]}
      >
        {/* Title block */}
        <Animated.View
          style={[styles.titleBlock, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}
        >
          <View style={styles.youRow}>
            <Text style={[styles.titleLine, { fontFamily: frauncesFamily }]}>why</Text>
            <Text style={[styles.titleLine, { fontFamily: frauncesFamily, color: '#F28C79' }]}>,</Text>
          </View>
          <Text style={[styles.titleLine, { fontFamily: frauncesFamily }]}>thank</Text>
          <View style={styles.youRow}>
            <Text style={[styles.titleLine, { fontFamily: frauncesFamily }]}>you</Text>
            <Text style={[styles.titleLine, { fontFamily: frauncesFamily, color: '#F28C79' }]}>!</Text>
          </View>
          <Text style={[styles.tagline, { fontFamily: poppinsRegular }]}>
            Take the guesswork out of giving.
          </Text>
        </Animated.View>

        {/* Button block */}
        <Animated.View
          style={[
            styles.btnBlock,
            { paddingBottom: insets.bottom + 32 },
            { opacity: btnOpacity, transform: [{ translateY: btnY }] },
          ]}
        >
          <TouchableOpacity onPress={handleGetStarted} style={styles.button} activeOpacity={0.85}>
            <Text style={[styles.buttonText, { fontFamily: poppinsSemiBold }]}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogIn} style={styles.loginRow} activeOpacity={0.7}>
            <Text style={[styles.loginText, { fontFamily: poppinsRegular }]}>
              Already have an account?{' '}
              <Text style={[styles.loginLink, { fontFamily: poppinsSemiBold }]}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

    </View>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function Splash(props: Props) {
  return Platform.OS === 'web'
    ? <WebSplash {...props} />
    : <NativeSplash {...props} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: H,
    backgroundColor: '#1F2A24',
    zIndex: 999,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: H * 0.42,
    backgroundColor: '#F6F1E8',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  titleBlock: {
    alignItems: 'center',
  },
  youRow: {
    flexDirection: 'row',
  },
  titleLine: {
    fontSize: 44,
    color: '#0F6B6F',
    lineHeight: 50,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: '#6E776A',
    marginTop: 8,
    textAlign: 'center',
  },
  btnBlock: {
    width: '100%',
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#0F6B6F',
    borderRadius: 28,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#F6F1E8',
    fontSize: 16,
    fontWeight: '600',
  },
  loginRow: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 13,
    color: '#6E776A',
  },
  loginLink: {
    color: '#0F6B6F',
    fontWeight: '600',
  },
});
