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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { X, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { apiFetch } from '@/utils/api';
import { AvatarCircle } from '@/components/AvatarCircle';
import { useColors } from '@/hooks/useColors';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  header: '#4A7C5F',
  headerText: '#F5F0E8',
  teal: '#1B8A8A',
  tealText: '#FFFFFF',
  placeholder: '#A89F94',
  divider: '#E8E4DC',
  successBg: '#EFF5F1',
  successText: '#4A7C5F',
  highlightBg: '#FFFBEA',
  highlightBorder: '#F5C842',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanProductName(raw: string): string {
  const cleaned = raw.replace(/^[^:–\-]{1,40}[:\-–]\s*/i, '').trim();
  return cleaned.length > 0 ? cleaned : raw;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function SectionLabel({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{text}</Text>;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddItemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { wishlistId } = useLocalSearchParams<{ wishlistId: string }>();

  // URL auto-fill
  const [productUrl, setProductUrl] = useState('');
  const [filling, setFilling] = useState(false);
  const [fillSuccess, setFillSuccess] = useState(false);
  const [filledFields, setFilledFields] = useState<Set<string>>(new Set());
  const [fillAttempted, setFillAttempted] = useState(false);

  // Manual fields
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleClose() {
    console.log('[AddItem] Close button pressed');
    router.back();
  }

  function resetFillState() {
    setFilledFields(new Set());
    setFillAttempted(false);
  }

  async function handleFillIn() {
    const trimmed = productUrl.trim();
    if (!trimmed) {
      Alert.alert('No URL', 'Please paste a product URL first.');
      return;
    }
    console.log('[AddItem] Fill-in button pressed, fetching URL preview:', trimmed);
    setFilling(true);
    setFillSuccess(false);
    try {
      const data = await apiFetch('/api/url-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      console.log('[AddItem] URL preview response:', data);
      if (data.error) {
        Alert.alert('Could not fetch URL', data.error);
        setFillAttempted(true);
        setFilledFields(new Set());
        return;
      }
      const populated = new Set<string>();
      if (data.name) { setItemName(cleanProductName(data.name)); populated.add('name'); }
      if (data.price != null) { setPrice(String(data.price)); populated.add('price'); }
      if (data.store) { setStore(data.store); populated.add('store'); }
      if (data.image_url) { setImageUrl(data.image_url); populated.add('image'); }
      setFilledFields(populated);
      setFillAttempted(true);
      const anyFilled = populated.size > 0;
      if (anyFilled) {
        setFillSuccess(true);
      } else {
        Alert.alert('Nothing found', "Couldn't extract product details — please fill in manually.");
      }
    } catch (err) {
      console.log('[AddItem] URL preview error:', err);
      setFillAttempted(true);
      setFilledFields(new Set());
      Alert.alert('Could not fetch URL', 'Check the URL and try again.');
    } finally {
      setFilling(false);
    }
  }

  async function handlePickPhoto() {
    console.log('[AddItem] Photo picker pressed');
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
      console.log('[AddItem] Photo picker cancelled');
      return;
    }
    const asset = result.assets[0];
    console.log('[AddItem] Photo picked, uploading to Supabase storage');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert('Not signed in', 'Please sign in to upload photos.');
        return;
      }
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const uploadPath = `items/${currentUser.id}/${Date.now()}.${ext}`;
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
      console.log('[AddItem] Photo uploaded, public URL:', publicUrl);
      setImageUrl(publicUrl);
    } catch (err: any) {
      console.error('[Upload] Exception:', err);
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      const status = err?.statusCode ?? err?.status ?? '';
      Alert.alert('Upload failed', status ? `${msg} (${status})` : msg);
    }
  }

  async function handleAddToList() {
    if (!itemName.trim()) {
      Alert.alert('Missing info', 'Please enter an item name.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('[AddItem] Current user at save time:', currentUser?.id ?? 'null — not authenticated');

      if (!currentUser) {
        Alert.alert('Not signed in', 'Please sign in to add items.');
        return;
      }

      const payload = {
        wishlist_id: wishlistId,
        name: itemName.trim(),
        price: price ? Number(price) : null,
        store: store.trim() || null,
        notes: notes.trim() || null,
        image_url: imageUrl || null,
        store_url: productUrl.trim() || null,
      };
      console.log('[AddItem] Inserting item directly via Supabase client:', payload);

      const { data, error } = await supabase
        .from('wishlist_items')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.log('[AddItem] Insert error:', error.message, 'code:', error.code, 'details:', error.details);
        Alert.alert('Could not add item', `${error.message} (${error.code})`);
        return;
      }
      console.log('[AddItem] Item saved successfully, id:', data?.id);
      router.back();
    } catch (err: any) {
      console.log('[AddItem] Save exception:', err?.message, err);
      Alert.alert('Could not add item', err?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Derived highlight logic ───────────────────────────────────────────────

  const nameHighlight = fillAttempted && !itemName && !filledFields.has('name');
  const priceHighlight = fillAttempted && !price && !filledFields.has('price');
  const storeHighlight = fillAttempted && !store && !filledFields.has('store');

  const nameInputStyle = nameHighlight
    ? [styles.input, { backgroundColor: C.highlightBg, borderColor: C.highlightBorder, color: colors.text }]
    : [styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }];
  const priceInputStyle = priceHighlight
    ? [styles.input, styles.priceInput, { backgroundColor: C.highlightBg, borderColor: C.highlightBorder, color: colors.text }]
    : [styles.input, styles.priceInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }];
  const storeInputStyle = storeHighlight
    ? [styles.input, { backgroundColor: C.highlightBg, borderColor: C.highlightBorder, color: colors.text }]
    : [styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }];

  // ── Render ────────────────────────────────────────────────────────────────

  const hasPhoto = !!imageUrl;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerClose} hitSlop={8}>
            <X size={22} color={C.headerText} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Item</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* URL auto-fill section */}
          <View style={styles.section}>
            <SectionLabel text="Paste a product URL" color={colors.text} />
            <View style={styles.urlRow}>
              <TextInput
                style={[styles.input, styles.urlInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="https://..."
                placeholderTextColor={C.placeholder}
                value={productUrl}
                onChangeText={setProductUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleFillIn}
                disabled={filling}
                style={[styles.fillButton, filling && styles.fillButtonDisabled]}
                activeOpacity={0.8}
              >
                {filling ? (
                  <ActivityIndicator color={C.tealText} size="small" />
                ) : (
                  <Text style={styles.fillButtonText}>Fill in</Text>
                )}
              </TouchableOpacity>
            </View>
            {fillSuccess && (
              <View style={styles.successBanner}>
                <CheckCircle size={14} color={C.successText} strokeWidth={2} />
                <Text style={styles.successText}>
                  Fields filled in — check and edit as needed
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Item name */}
          <View style={styles.section}>
            <SectionLabel text="Item name *" color={colors.text} />
            <TextInput
              style={nameInputStyle}
              placeholder="e.g. LEGO Botanical Set"
              placeholderTextColor={C.placeholder}
              value={itemName}
              onChangeText={(v) => { setItemName(v); resetFillState(); }}
              returnKeyType="next"
            />
          </View>

          {/* Price */}
          <View style={styles.section}>
            <SectionLabel text="Price" color={colors.text} />
            <View style={styles.priceRow}>
              <View style={[styles.pricePrefixBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.pricePrefix, { color: colors.text }]}>$</Text>
              </View>
              <TextInput
                style={priceInputStyle}
                placeholder="0.00"
                placeholderTextColor={C.placeholder}
                value={price}
                onChangeText={(v) => { setPrice(v); resetFillState(); }}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Store */}
          <View style={styles.section}>
            <SectionLabel text="Store / Retailer" color={colors.text} />
            <TextInput
              style={storeInputStyle}
              placeholder="e.g. Amazon, Target"
              placeholderTextColor={C.placeholder}
              value={store}
              onChangeText={(v) => { setStore(v); resetFillState(); }}
              returnKeyType="next"
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <SectionLabel text="Notes (optional)" color={colors.text} />
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Size 8, blue color preferred..."
              placeholderTextColor={C.placeholder}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Photo */}
          <View style={styles.section}>
            <SectionLabel text="Photo (optional)" color={colors.text} />
            <View style={styles.photoRow}>
              <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
                {hasPhoto ? (
                  <Image
                    source={resolveImageSource(imageUrl)}
                    style={styles.photoPreview}
                  />
                ) : (
                  <AvatarCircle uri={undefined} name="?" size={72} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickPhoto}
                activeOpacity={0.75}
                style={[styles.photoPickerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={styles.photoPickerText}>
                  {hasPhoto ? 'Change photo' : 'Choose photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Add to list button */}
          <TouchableOpacity
            onPress={handleAddToList}
            disabled={saving}
            style={[styles.addButton, saving && styles.addButtonDisabled]}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.addButtonText}>Add to list</Text>
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
  urlRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
  },
  fillButton: {
    backgroundColor: C.teal,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  fillButtonDisabled: {
    opacity: 0.6,
  },
  fillButtonText: {
    color: C.tealText,
    fontSize: 15,
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.successBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  successText: {
    fontSize: 13,
    color: C.successText,
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  pricePrefixBox: {
    borderWidth: 1,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  pricePrefix: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  photoPickerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  photoPickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.header,
  },
  addButton: {
    backgroundColor: C.teal,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
