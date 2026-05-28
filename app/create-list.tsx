import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  ImageSourcePropType,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { X } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { AvatarCircle } from '@/components/AvatarCircle';
import { useColors } from '@/hooks/useColors';
import { StatusBar } from 'expo-status-bar';

// ─── Constants ───────────────────────────────────────────────────────────────

const OCCASIONS = ['Birthday', 'Christmas', 'Graduation', 'Baby Shower', 'Holiday', 'Other'] as const;
type Occasion = typeof OCCASIONS[number];

const C = {
  header: '#FAF7F2',
  headerText: '#1C2820',
  pillSelected: '#4A7C5F',
  pillSelectedText: '#F5F0E8',
  button: '#4A7C5F',
  buttonText: '#F5F0E8',
  placeholder: '#A89F94',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  // Form state
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [occasionDate, setOccasionDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [age, setAge] = useState('');
  const [clothingSize, setClothingSize] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [interests, setInterests] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const displayDate = formatDisplayDate(occasionDate);
  const listName = name.trim()
    ? `${name.trim()}'s ${occasion ?? 'Wishlist'}`
    : '';

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleClose() {
    console.log('[CreateList] Close/cancel pressed');
    router.back();
  }

  function handleOccasionSelect(o: Occasion) {
    console.log('[CreateList] Occasion selected:', o);
    setOccasion(o);
  }

  function handleDateFieldPress() {
    console.log('[CreateList] Date field pressed, toggling picker');
    setShowDatePicker((prev) => !prev);
  }

  function handleDateChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      console.log('[CreateList] Date changed:', selected.toISOString());
      setOccasionDate(selected);
    }
  }

  async function handlePickAvatar() {
    console.log('[CreateList] Avatar picker pressed');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) {
      console.log('[CreateList] Avatar picker cancelled');
      return;
    }
    const asset = result.assets[0];
    console.log('[CreateList] Avatar image picked, uploading to Supabase storage');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Not signed in', 'Please sign in to upload photos.');
        return;
      }
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const uploadPath = `avatars/${currentUser.id}/${Date.now()}.${ext}`;

      const fetchResp = await fetch(asset.uri);
      const blob = await fetchResp.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(uploadPath, arrayBuffer, { contentType: mimeType, upsert: true });

      if (uploadError) {
        console.error('[Upload] Supabase error:', JSON.stringify(uploadError));
        Alert.alert('Upload failed', `${uploadError.message}${(uploadError as any).statusCode ? ` (${(uploadError as any).statusCode})` : ''}`);
        return;
      }
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(uploadPath);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
      console.log('[Upload] Avatar uploaded, public URL:', publicUrl);
      setAvatarUrl(publicUrl);
    } catch (err: any) {
      console.error('[Upload] Exception:', err);
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      const status = err?.statusCode ?? err?.status ?? '';
      Alert.alert('Upload failed', status ? `${msg} (${status})` : msg);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Missing info', "Please enter the child's name.");
      return;
    }
    if (!occasion) {
      Alert.alert('Missing info', 'Please select an occasion.');
      return;
    }
    setSaving(true);
    try {
      // Get the current authenticated user directly at insert time
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('[CreateList] Current user at insert time:', currentUser?.id ?? 'null — not authenticated');

      if (!currentUser) {
        Alert.alert('Not signed in', 'Please sign in to create a list.');
        setSaving(false);
        return;
      }

      const insertPayload = {
        name: listName || `${name.trim()}'s List`,
        person: name.trim(),
        occasion,
        occasion_date: occasionDate.toISOString().split('T')[0],
        child_age: age ? Number(age) : null,
        clothing_size: clothingSize.trim() || null,
        shoe_size: shoeSize.trim() || null,
        favorite_colors: null,
        current_interests: interests.trim() || null,
        avatar_url: avatarUrl,
        item_count: 0,
        claimed_count: 0,
        user_id: currentUser.id,
      };
      console.log('[CreateList] Inserting wishlist with user_id:', currentUser.id);
      const { data, error } = await supabase
        .from('wishlists')
        .insert(insertPayload)
        .select()
        .single();
      if (error) {
        console.log('[CreateList] Insert error:', error.message, 'code:', error.code);
        Alert.alert('Error saving list', `${error.message} (${error.code})`);
        return;
      }
      console.log('[CreateList] Wishlist created successfully, id:', data?.id);
      Alert.alert('List created! 🎉', `${insertPayload.name} has been saved.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.log('[CreateList] Create exception:', err);
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isAndroidPickerVisible = Platform.OS === 'android' && showDatePicker;
  const isIOSPickerVisible = Platform.OS === 'ios' && showDatePicker;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <StatusBar style="dark" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerClose} hitSlop={8}>
            <X size={22} color={C.headerText} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New List</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Row 1 — Child's name */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Child's name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Emma"
              placeholderTextColor={C.placeholder}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </View>

          {/* Row 2 — Occasion */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Occasion</Text>
            <View style={styles.pillRow}>
              {OCCASIONS.map((o) => {
                const isSelected = occasion === o;
                const pillBg = isSelected ? C.pillSelected : colors.surface;
                const pillBorder = isSelected ? C.pillSelected : colors.border;
                const pillTextColor = isSelected ? C.pillSelectedText : colors.text;
                return (
                  <TouchableOpacity
                    key={o}
                    onPress={() => handleOccasionSelect(o)}
                    style={[
                      styles.pill,
                      { backgroundColor: pillBg, borderColor: pillBorder },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.pillText, { color: pillTextColor }]}>
                      {o}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Row 3 — Occasion date */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Occasion date</Text>
            <TouchableOpacity
              onPress={handleDateFieldPress}
              style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.dateFieldText, { color: colors.text }]}>{displayDate}</Text>
            </TouchableOpacity>
            {isIOSPickerVisible && (
              <View style={[styles.iosDatePickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <DateTimePicker
                  value={occasionDate}
                  mode="date"
                  display="inline"
                  onChange={handleDateChange}
                  themeVariant="light"
                  accentColor={C.header}
                />
              </View>
            )}
            {isAndroidPickerVisible && (
              <DateTimePicker
                value={occasionDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Row 4 — Age + Clothing size */}
          <View style={styles.section}>
            <View style={styles.twoCol}>
              <View style={styles.colHalf}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Age</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Age"
                  placeholderTextColor={C.placeholder}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>
              <View style={styles.colHalf}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Clothing size</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 7/8"
                  placeholderTextColor={C.placeholder}
                  value={clothingSize}
                  onChangeText={setClothingSize}
                  returnKeyType="next"
                />
              </View>
            </View>
          </View>

          {/* Row 5 — Shoe size */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Shoe size</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Kids 3"
              placeholderTextColor={C.placeholder}
              value={shoeSize}
              onChangeText={setShoeSize}
              returnKeyType="next"
            />
          </View>

          {/* Row 6 — Interests */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>What they're into right now</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. dinosaurs, Minecraft, painting..."
              placeholderTextColor={C.placeholder}
              value={interests}
              onChangeText={setInterests}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Row 7 — Child photo */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Child photo</Text>
            <View style={styles.avatarRow}>
              <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8}>
                {avatarUrl ? (
                  <Image
                    source={resolveImageSource(avatarUrl)}
                    style={styles.avatarImage}
                  />
                ) : (
                  <AvatarCircle uri={undefined} name={name || '?'} size={72} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.75} style={[styles.avatarPickerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={styles.avatarPickerText}>
                  {avatarUrl ? 'Change photo' : 'Choose photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Create button */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={saving}
            style={[styles.createButton, saving && styles.createButtonDisabled]}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={C.buttonText} />
            ) : (
              <Text style={styles.createButtonText}>Create list</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    backgroundColor: C.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Georgia',
    color: C.headerText,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: 14,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateFieldText: {
    fontSize: 16,
  },
  iosDatePickerWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  colHalf: {
    flex: 1,
    gap: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  avatarPickerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatarPickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F28C79',
  },
  createButton: {
    backgroundColor: '#0F6B6F',
    borderRadius: 16,
    height: 56,
    marginHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: C.buttonText,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
