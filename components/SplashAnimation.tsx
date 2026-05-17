import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SplashAnimationProps {
  onFinish: () => void;
}

// Web fallback — plain teal screen, auto-transitions after 2s
function WebSplash({ onFinish }: SplashAnimationProps) {
  useEffect(() => {
    console.log('[SplashAnimation] Web fallback: transitioning after 2s');
    const t = setTimeout(onFinish, 2000);
    return () => clearTimeout(t);
  }, [onFinish]);
  return <View style={styles.container} />;
}

// Native animated splash
function NativeSplash({ onFinish }: SplashAnimationProps) {
  // Ribbon
  const ribbonScaleY = useRef(new Animated.Value(0)).current;
  const ribbonOpacity = useRef(new Animated.Value(0)).current;

  // Gift
  const giftTranslateY = useRef(new Animated.Value(20)).current;
  const giftOpacity = useRef(new Animated.Value(0)).current;

  // Wordmark
  const wordmarkTranslateY = useRef(new Animated.Value(12)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;

  // Tagline
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[SplashAnimation] Starting native animated splash');

    const ribbonAnim = Animated.parallel([
      Animated.timing(ribbonScaleY, {
        toValue: 1,
        duration: 1200,
        delay: 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ribbonOpacity, {
        toValue: 1,
        duration: 600,
        delay: 0,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const giftAnim = Animated.parallel([
      Animated.timing(giftTranslateY, {
        toValue: 0,
        duration: 1000,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(giftOpacity, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const wordmarkAnim = Animated.parallel([
      Animated.timing(wordmarkTranslateY, {
        toValue: 0,
        duration: 900,
        delay: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: 900,
        delay: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const taglineAnim = Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 1000,
      delay: 1300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    const allAnims = Animated.parallel([
      ribbonAnim,
      giftAnim,
      wordmarkAnim,
      taglineAnim,
    ]);

    let animsDone = false;
    let timerDone = false;

    function maybeFinish() {
      if (animsDone && timerDone) {
        console.log('[SplashAnimation] Both timer and animations done, transitioning');
        onFinish();
      }
    }

    const minTimer = setTimeout(() => {
      console.log('[SplashAnimation] 5000ms minimum elapsed');
      timerDone = true;
      maybeFinish();
    }, 5000);

    allAnims.start(() => {
      console.log('[SplashAnimation] All animations complete');
      animsDone = true;
      maybeFinish();
    });

    return () => {
      allAnims.stop();
      clearTimeout(minTimer);
    };
  }, [
    ribbonScaleY,
    ribbonOpacity,
    giftTranslateY,
    giftOpacity,
    wordmarkTranslateY,
    wordmarkOpacity,
    taglineOpacity,
    onFinish,
  ]);

  const whyText = 'WHY,';
  const thankYouText = 'Thank You!';
  const taglineText = 'Take the guesswork out of giving';

  return (
    <View style={styles.container}>
      {/* Top-left corner accent */}
      <View style={styles.cornerTopLeft} />

      {/* Bottom-right corner accent */}
      <View style={styles.cornerBottomRight} />

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Ribbon */}
        <Animated.View
          style={[
            styles.ribbonWrapper,
            {
              opacity: ribbonOpacity,
              transform: [{ scaleY: ribbonScaleY }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,220,150,0.6)']}
            style={styles.ribbon}
          />
        </Animated.View>

        {/* Gift SVG */}
        <Animated.View
          style={[
            styles.giftWrapper,
            {
              opacity: giftOpacity,
              transform: [{ translateY: giftTranslateY }],
            },
          ]}
        >
          <Svg width={110} height={120} viewBox="0 0 110 120">
            <Rect x="12" y="52" width="86" height="58" rx="3" fill="rgba(255,248,238,0.12)" stroke="rgba(255,248,238,0.7)" strokeWidth="1.5" />
            <Rect x="8" y="38" width="94" height="18" rx="3" fill="rgba(255,248,238,0.18)" stroke="rgba(255,248,238,0.7)" strokeWidth="1.5" />
            <Rect x="50" y="52" width="10" height="58" fill="rgba(255,210,100,0.35)" />
            <Rect x="50" y="38" width="10" height="18" fill="rgba(255,210,100,0.5)" />
            <Path d="M55 38 C55 38 30 30 28 16 C26 8 38 4 45 12 C50 18 55 38 55 38Z" fill="none" stroke="rgba(255,210,100,0.9)" strokeWidth="1.5" strokeLinecap="round" />
            <Path d="M55 38 C55 38 80 30 82 16 C84 8 72 4 65 12 C60 18 55 38 55 38Z" fill="none" stroke="rgba(255,210,100,0.9)" strokeWidth="1.5" strokeLinecap="round" />
            <Circle cx="55" cy="38" r="4" fill="rgba(255,210,100,0.9)" />
            <Rect x="12" y="73" width="86" height="9" fill="rgba(255,210,100,0.2)" />
            <Path d="M2 105 C2 105 15 88 30 85 C38 83 46 86 55 90" stroke="rgba(255,248,238,0.55)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <Path d="M2 112 C2 112 18 96 35 92 C43 90 50 92 55 95" stroke="rgba(255,248,238,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <Path d="M108 105 C108 105 95 88 80 85 C72 83 64 86 55 90" stroke="rgba(255,248,238,0.55)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <Path d="M108 112 C108 112 92 96 75 92 C67 90 60 92 55 95" stroke="rgba(255,248,238,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>

        {/* Wordmark block */}
        <Animated.View
          style={[
            styles.wordmarkBlock,
            {
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkTranslateY }],
            },
          ]}
        >
          <Text style={styles.whyText}>{whyText}</Text>
          <Text style={styles.thankYouText}>{thankYouText}</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.taglineText, { opacity: taglineOpacity }]}>
          {taglineText}
        </Animated.Text>


      </View>
    </View>
  );
}

export default function SplashAnimation({ onFinish }: SplashAnimationProps) {
  if (Platform.OS === 'web') {
    return <WebSplash onFinish={onFinish} />;
  }
  return <NativeSplash onFinish={onFinish} />;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#2D6E65',
    flex: 1,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 60,
    left: 30,
    width: 80,
    height: 80,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopLeftRadius: 4,
    borderColor: '#FFF8EE',
    opacity: 0.08,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 100,
    right: 30,
    width: 80,
    height: 80,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomRightRadius: 4,
    borderColor: '#FFF8EE',
    opacity: 0.08,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonWrapper: {
    width: 2,
    height: 60,
    marginBottom: 8,
  },
  ribbon: {
    width: 2,
    height: 60,
  },
  giftWrapper: {
    width: 110,
    height: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    marginBottom: 8,
  },
  wordmarkBlock: {
    alignItems: 'center',
    marginBottom: 0,
  },
  whyText: {
    fontFamily: 'Georgia',
    fontSize: 13,
    letterSpacing: 4.5,
    textTransform: 'uppercase',
    color: 'rgba(255,220,150,0.85)',
    marginBottom: 2,
  },
  thankYouText: {
    fontFamily: 'Georgia',
    fontSize: 52,
    color: '#FFF8EE',
    lineHeight: 52,
    letterSpacing: -0.5,
  },
  taglineText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
    fontWeight: '300',
    fontSize: 13,
    color: 'rgba(255,248,238,0.5)',
    letterSpacing: 1,
    marginTop: 14,
    textAlign: 'center',
  },

});
