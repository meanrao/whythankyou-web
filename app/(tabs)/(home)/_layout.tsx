import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { COLORS, DARK_COLORS } from '@/constants/Colors';

export default function HomeLayout() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#F5F0E8',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    />
  );
}
