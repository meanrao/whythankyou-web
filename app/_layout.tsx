// Last backed up to GitHub: pending — export via Newly dashboard before deploy
import "react-native-reanimated";
import React, { useState, useEffect } from "react";
import { Stack, useRouter } from "expo-router";
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

  useEffect(() => {
    if (!splashDone) return;
    if (loading) return;
    if (!user) {
      console.log('[AppNavigator] No user found, redirecting to login');
      router.replace('/auth/login');
    }
  }, [splashDone, loading, user]);

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
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: "#F5F0E8",
            headerTitleStyle: {
              fontFamily: "Georgia",
              fontSize: 18,
              fontWeight: "600",
              color: "#F5F0E8",
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
            headerStyle: { backgroundColor: '#2A9D8F' },
            headerTintColor: '#F5F0E8',
            headerTitleStyle: {
              fontFamily: 'Georgia',
              fontSize: 18,
              fontWeight: '600',
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
      </Stack>
      <SystemBars style="light" />
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
      <StatusBar style="light" animated />
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
