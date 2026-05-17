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
import {
  useFonts,
  CormorantGaramond_700Bold,
  CormorantGaramond_600SemiBold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import { useRouter } from 'expo-router';

// ─── Screen geometry ──────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('screen');
const CELL_W = W / 3;
const CELL_H = H / 4;

// cubic-bezier(0.16, 1, 0.3, 1) — snappy ease-out, feels spring-like
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const ND = Platform.OS !== 'web'; // native driver flag

const PHOTOS = [
  require('../assets/images/splash1.png'),
  require('../assets/images/splash2.png'),
  require('../assets/images/splash3.png'),
  require('../assets/images/splash4.png'),
  require('../assets/images/splash5.png'),
  require('../assets/images/splash6.png'),
  require('../assets/images/splash7.png'),
  require('../assets/images/splash8.png'),
  require('../assets/images/splash9.png'),
  require('../assets/images/splash10.png'),
  require('../assets/images/splash11.png'),
  require('../assets/images/splash12.png'),
];

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = { onFinish?: () => void };

// ─── Web fallback — plain branding, instant button ───────────────────────────

function WebSplash({ onFinish }: Props) {
  const router = useRouter();
  function handlePress() {
    onFinish ? onFinish() : router.replace('/(tabs)' as any);
  }
  return (
    <View style={webStyles.root}>
      <Text style={webStyles.why}>Why,</Text>
      <Text style={webStyles.thankYou}>Thank You!</Text>
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
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 32,
  },
  why: { fontFamily: 'Georgia', fontSize: 42, color: '#1C2820', fontWeight: '700', textAlign: 'center' },
  thankYou: { fontFamily: 'Georgia', fontSize: 42, color: '#B5872E', fontStyle: 'italic', textAlign: 'center' },
  tagline: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 16, color: '#7A8B7A', marginTop: 16, textAlign: 'center' },
  button: { marginTop: 48, backgroundColor: '#1B8A8A', borderRadius: 28, paddingHorizontal: 52, height: 56, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
});

// ─── Native animated splash ───────────────────────────────────────────────────

function NativeSplash({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    CormorantGaramond_700Bold,
    CormorantGaramond_600SemiBold_Italic,
  });

  // ── Animated values ──────────────────────────────────────────────────────────

  const photoAnims = useRef(
    Array.from({ length: 12 }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.92),
    }))
  ).current;

  const gridScale     = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity  = useRef(new Animated.Value(0)).current;
  const titleY        = useRef(new Animated.Value(14)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity    = useRef(new Animated.Value(0)).current;
  const btnY          = useRef(new Animated.Value(22)).current;

  // ── Timeline (all in one Animated.parallel, explicit delays) ─────────────────
  //
  //    0ms       photos 1–12 stagger in, 120ms apart, 380ms each
  //    1550ms    grid slowly zooms 1.0→1.06 over 900ms
  //    1650ms    cream veil fades to 82% opacity over 700ms
  //    2200ms    "Why, / Thank You!" rises in over 650ms
  //    2700ms    tagline fades in over 550ms
  //    3750ms    Get Started button rises in over 450ms  (≈ 4.2s total)

  useEffect(() => {
    console.log('[Splash] Starting cinematic sequence');

    const photoAnimations = photoAnims.flatMap((anim, i) => [
      Animated.timing(anim.opacity, {
        toValue: 1, duration: 380, delay: i * 120, easing: EASE, useNativeDriver: ND,
      }),
      Animated.timing(anim.scale, {
        toValue: 1, duration: 380, delay: i * 120, easing: EASE, useNativeDriver: ND,
      }),
    ]);

    const master = Animated.parallel([
      ...photoAnimations,
      Animated.timing(gridScale, {
        toValue: 1.06, duration: 900, delay: 1550, easing: EASE, useNativeDriver: ND,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.82, duration: 700, delay: 1650, easing: EASE, useNativeDriver: ND,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1, duration: 650, delay: 2200, easing: EASE, useNativeDriver: ND,
      }),
      Animated.timing(titleY, {
        toValue: 0, duration: 650, delay: 2200, easing: EASE, useNativeDriver: ND,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1, duration: 550, delay: 2700, easing: EASE, useNativeDriver: ND,
      }),
      Animated.timing(btnOpacity, {
        toValue: 1, duration: 450, delay: 3750, easing: EASE, useNativeDriver: ND,
      }),
      Animated.timing(btnY, {
        toValue: 0, duration: 450, delay: 3750, easing: EASE, useNativeDriver: ND,
      }),
    ]);

    master.start(() => console.log('[Splash] Sequence complete'));
    return () => master.stop();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleGetStarted() {
    console.log('[Splash] Get Started pressed');
    onFinish ? onFinish() : router.replace('/(tabs)' as any);
  }

  // ── Font resolution ───────────────────────────────────────────────────────────
  // CormorantGaramond italic is a separate face — no fontStyle:'italic' needed.
  // Georgia fallback needs fontStyle:'italic' manually.

  const fontWhy = fontsLoaded ? 'CormorantGaramond_700Bold' : 'Georgia';
  const fontThankYou = fontsLoaded ? 'CormorantGaramond_600SemiBold_Italic' : 'Georgia';
  const thankYouItalicStyle = fontsLoaded ? undefined : 'italic' as const;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* ── Photo grid — zooms as one unit ── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ scale: gridScale }] }]}
      >
        <View style={styles.grid}>
          {PHOTOS.map((src, i) => (
            <Animated.View
              key={i}
              style={[
                styles.cell,
                {
                  opacity: photoAnims[i].opacity,
                  transform: [{ scale: photoAnims[i].scale }],
                },
              ]}
            >
              <Image
                source={src}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={0}
              />
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* ── Cream veil — warms and softens the grid ── */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.veil, { opacity: overlayOpacity }]}
      />

      {/* ── Centered wordmark + tagline ── */}
      <View style={styles.centerWrapper} pointerEvents="none">

        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
            alignItems: 'center',
          }}
        >
          <Text style={[styles.whyText, { fontFamily: fontWhy }]}>
            Why,
          </Text>
          <Text
            style={[
              styles.thankYouText,
              { fontFamily: fontThankYou, fontStyle: thankYouItalicStyle },
            ]}
          >
            Thank You!
          </Text>
        </Animated.View>

        <Animated.Text style={[styles.taglineText, { opacity: taglineOpacity }]}>
          Take the guesswork out of giving.
        </Animated.Text>

      </View>

      {/* ── Get Started pill button ── */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          { paddingBottom: insets.bottom + 48 },
          { opacity: btnOpacity, transform: [{ translateY: btnY }] },
        ]}
      >
        <TouchableOpacity
          onPress={handleGetStarted}
          style={styles.button}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
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
    backgroundColor: '#111A15',
    zIndex: 999,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: W,
    height: H,
  },
  cell: {
    width: CELL_W,
    height: CELL_H,
    overflow: 'hidden',
  },
  veil: {
    backgroundColor: '#FAF7F2',
  },
  centerWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  whyText: {
    fontSize: 42,
    color: '#1C2820',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 48,
  },
  thankYouText: {
    fontSize: 42,
    color: '#B5872E',
    letterSpacing: -0.3,
    textAlign: 'center',
    lineHeight: 50,
  },
  taglineText: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 16,
    color: '#7A8B7A',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.1,
    lineHeight: 24,
  },
  buttonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#1B8A8A',
    paddingHorizontal: 52,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B8A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
