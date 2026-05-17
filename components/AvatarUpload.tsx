import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { AvatarCircle } from '@/components/AvatarCircle';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';

interface AvatarUploadProps {
  uri?: string | null;
  name: string;
  size?: number;
  onUpload: (url: string) => void;
}

export function AvatarUpload({ uri, name, size = 52, onUpload }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);

  async function handlePress() {
    console.log('[AvatarUpload] Camera button pressed');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      console.log('[AvatarUpload] Image picker cancelled');
      return;
    }

    const asset = result.assets[0];
    console.log('[AvatarUpload] Image selected, starting upload:', asset.uri);
    setUploading(true);

    try {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      const path = `${timestamp}-${random}.jpg`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      console.log('[AvatarUpload] Uploading to Supabase Storage, path:', path);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) {
        console.log('[AvatarUpload] Upload error:', uploadError.message);
        Alert.alert('Upload failed', uploadError.message);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      console.log('[AvatarUpload] Upload successful, public URL:', publicUrl);
      onUpload(publicUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.log('[AvatarUpload] Unexpected error:', message);
      Alert.alert('Upload failed', message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AnimatedPressable onPress={handlePress} style={styles.container}>
      <AvatarCircle uri={uri} name={name} size={size} />
      <View style={[styles.cameraOverlay, { width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19 }]}>
        {uploading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Camera size={size * 0.2} color="#FFFFFF" strokeWidth={2} />
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4A7C5F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
