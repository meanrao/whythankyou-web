// Last backed up to GitHub: pending — export via Newly dashboard before deploy
import "react-native-reanimated";
import React, { useState, useEffect, useRef } from "react";
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme, Alert, ActivityIndicator, View } from "react-native";
import { useNetworkState } from "expo-network";
import Splash from "./splash";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { COLORS, DARK_COLORS } from "@/constants/Colors";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// ─── Inner navigator — can call useAuth safely ────────────────────────────────

function AppNavigator({ splashDone }: { splashDone: boolean }) {
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();

  const colors = colorScheme === "dark" ? DARK_COLORS : COLORS;

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: COLORS.primary,
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.text,
      border: COLORS.border,
      notification: COLORS.danger,
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    dark: true,
    colors: {
      primary: DARK_COLORS.primary,
      background: DARK_COLORS.background,
      card: DARK_COLORS.surface,
      text: DARK_COLORS.text,
      border: DARK_COLORS.border,
      notification: DARK_COLORS.danger,
    },
  };

  // Detect cold Universal Link launches — Expo Router may not yet have processed
  // the deep link URL when the auth guard first fires, so segments[0] would still
  // be '(tabs)'. We suppress the login redirect until navigation settles.
  const deepLinkInflight = useRef(false);

  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url && (url.includes('/list/') || url.includes('/guest/'))) {
        deepLinkInflight.current = true;
      }
    }).catch(() => {});
  }, []);

  // Clear flag once Expo Router has settled to the public route
  useEffect(() => {
    if (segments[0] === 'guest' || segments[0] === 'list') {
      deepLinkInflight.current = false;
    }
  }, [segments]);

  useEffect(() => {
    if (!splashDone) return;
    if (loading) return;
    // Guest and shared-list routes are publicly accessible — no login required
    const isPublicRoute = segments[0] === 'guest' || segments[0] === 'list' || deepLinkInflight.current;
    if (!user && !isPublicRoute) {
      console.log('[AppNavigator] No user found, redirecting to login');
      router.replace('/auth/login');
    }
  }, [splashDone, loading, user, segments]);

  if (!splashDone) {
    return null;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF7F2', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B8A8A" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/login"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth/signup"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="create-list"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="wishlist/[id]"
          options={{
            headerShown: true,
            headerBackButtonDisplayMode: "minimal",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#F6F1E8' },
            headerTintColor: "#1F2A24",
            headerTitleStyle: {
              fontFamily: "Georgia",
              fontSize: 18,
              fontWeight: "600",
              color: "#1F2A24",
            },
          }}
        />
        <Stack.Screen
          name="edit-list"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="add-item"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="share/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="privacy"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="terms"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="guest/[token]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#F6F1E8' },
            headerTintColor: '#1F2A24',
            headerTitleStyle: {
              fontFamily: 'Georgia',
              fontSize: 18,
              fontWeight: '600',
              color: '#1F2A24',
            },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            title: 'Gift List',
          }}
        />
        <Stack.Screen
          name="web-guest/[token]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="list/[token]"
          options={{ headerShown: false }}
        />
      </Stack>
      <SystemBars style="dark" />
    </ThemeProvider>
  );
}

// ─── Root layout — provides all context ──────────────────────────────────────

export default function RootLayout() {
  const networkState = useNetworkState();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!networkState.isConnected && networkState.isInternetReachable === false) {
      Alert.alert(
        "You are offline",
        "You can keep using the app. Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  return (
    <DevErrorBoundary>
      <StatusBar style="dark" animated />
      <SafeAreaProvider>
        <AuthProvider>
          <WidgetProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              {!splashDone ? (
                <Splash onFinish={() => setSplashDone(true)} />
              ) : (
                <AppNavigator splashDone={splashDone} />
              )}
            </GestureHandlerRootView>
          </WidgetProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </DevErrorBoundary>
  );
}
