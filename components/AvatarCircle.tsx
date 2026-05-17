import { Image } from 'expo-image';
import { View, Text, StyleSheet } from 'react-native';

interface AvatarCircleProps {
  uri?: string | null;
  name: string;
  size?: number;
}

export function AvatarCircle({ uri, name, size = 52 }: AvatarCircleProps) {
  const initial = name.trim().charAt(0).toUpperCase();
  const borderRadius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius, borderWidth: 2, borderColor: '#FFFFFF' }}
        contentFit="cover"
        cachePolicy="reload"
      />
    );
  }

  const fontSize = size * 0.42;

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius }]}>
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#1B8A8A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  initial: {
    color: '#F5F0E8',
    fontWeight: '600',
  },
});
