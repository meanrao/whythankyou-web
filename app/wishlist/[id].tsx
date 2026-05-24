import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
  ImageSourcePropType,
  Platform,
  Modal,
  TextInput,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Share2, CheckCircle, Plus, Pencil, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WishlistItem } from '@/data/placeholder';
import Svg, { Circle, Ellipse, Path, Rect, Line } from 'react-native-svg';
import { COLORS } from '@/constants/Colors';
import { AvatarCircle } from '@/components/AvatarCircle';
import { supabase } from '@/utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';

function TappableAvatar({
  uri,
  name,
  size,
  onPress,
  hasBeenTapped,
  onFirstTap,
}: {
  uri?: string;
  name: string;
  size: number;
  onPress: () => void;
  hasBeenTapped: boolean;
  onFirstTap: () => void;
}) {
  function handlePress() {
    console.log('[WishlistDetail] TappableAvatar pressed, hasBeenTapped:', hasBeenTapped);
    onFirstTap();
    onPress();
  }

  if (hasBeenTapped) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <AvatarCircle uri={uri} name={name} size={size} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <View
        style={{
          borderWidth: 2.5,
          borderColor: '#F28C79',
          borderRadius: (size + 8) / 2,
          padding: 4,
        }}
      >
        <AvatarCircle uri={uri} name={name} size={size} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbWishlist {
  id: string;
  name: string;
  person: string;
  occasion: string;
  occasion_date: string;
  child_age: number | null;
  clothing_size: string | null;
  shoe_size: string | null;
  current_interests: string | null;
  avatar_url: string | null;
  item_count: number;
  claimed_count: number;
  birthday: string | null;
}

interface ClaimRecord {
  claimer_name: string | null;
  claimer_email: string | null;
  claimer_note: string | null;
  created_at: string;
}

interface ApiItem {
  id: string;
  wishlist_id: string;
  name: string;
  price: number | null;
  store: string | null;
  store_url: string | null;
  notes: string | null;
  image_url: string | null;
  claimed: boolean;
  created_at: string;
  item_claims?: ClaimRecord[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined | null
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function formatDateLong(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const OCCASION_COLORS: Record<string, string> = {
  birthday: COLORS.occasionBirthday,
  christmas: COLORS.occasionChristmas,
  graduation: COLORS.occasionGraduation,
};

function getOccasionColor(occasion: string): string {
  return OCCASION_COLORS[occasion.toLowerCase()] ?? COLORS.occasionOther;
}

// ─── Occasion Icon ────────────────────────────────────────────────────────────

function WishlistIcon({ occasion, color, size }: { occasion: string; color: string; size: number }) {
  const key = occasion.toLowerCase();
  const s = size;
  if (key === 'birthday') {
    return (
      <Svg width={s} height={s} viewBox="0 0 36 36">
        <Rect x="6" y="18" width="24" height="14" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        <Rect x="4" y="13" width="28" height="6" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        <Path d="M18 13 C14 8 8 8 10 11 C12 14 18 13 18 13Z" stroke={color} strokeWidth="1.8" fill="none" />
        <Path d="M18 13 C22 8 28 8 26 11 C24 14 18 13 18 13Z" stroke={color} strokeWidth="1.8" fill="none" />
        <Circle cx="18" cy="13" r="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        <Line x1="18" y1="19" x2="18" y2="32" stroke={color} strokeWidth="1.8" />
        <Line x1="6" y1="25" x2="30" y2="25" stroke={color} strokeWidth="1.8" />
      </Svg>
    );
  }
  if (key === 'christmas') {
    return (
      <Svg width={s} height={s} viewBox="0 0 36 36">
        <Path
          d="M18 4 L20.9 13.1 L30.4 13.1 L22.8 18.9 L25.6 28 L18 22.2 L10.4 28 L13.2 18.9 L5.6 13.1 L15.1 13.1 Z"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
        />
        <Circle cx="18" cy="3" r="1.5" stroke={color} strokeWidth="1.8" fill="none" />
      </Svg>
    );
  }
  if (key === 'graduation') {
    return (
      <Svg width={s} height={s} viewBox="0 0 36 36">
        <Rect x="8" y="10" width="20" height="16" rx="3" stroke={color} strokeWidth="1.8" fill="none" />
        <Ellipse cx="8" cy="18" rx="2.5" ry="8" stroke={color} strokeWidth="1.8" fill="none" />
        <Ellipse cx="28" cy="18" rx="2.5" ry="8" stroke={color} strokeWidth="1.8" fill="none" />
        <Line x1="12" y1="18" x2="24" y2="18" stroke={color} strokeWidth="1.8" />
        <Circle cx="18" cy="22" r="2" stroke={color} strokeWidth="1.8" fill="none" />
      </Svg>
    );
  }
  return (
    <Svg width={s} height={s} viewBox="0 0 36 36">
      <Ellipse cx="18" cy="14" rx="9" ry="11" stroke={color} strokeWidth="1.8" fill="none" />
      <Path d="M15 25 L18 29 L21 25" stroke={color} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      <Line x1="18" y1="29" x2="18" y2="34" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

// ─── Recipient Profile Bottom Sheet ───────────────────────────────────────────

interface ChildProfileBottomSheetProps {
  wishlist: DbWishlist;
  visible: boolean;
  onClose: () => void;
  isOwner: boolean;
  onBirthdayChange: (birthday: string) => void;
}

function ChildProfileBottomSheet({ wishlist, visible, onClose, isOwner, onBirthdayChange }: ChildProfileBottomSheetProps) {
  // Birthday state
  const [editBirthday, setEditBirthday] = useState<Date | null>(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  const agePillText = wishlist.child_age != null ? `Age ${wishlist.child_age}` : null;
  const clothingPillText = wishlist.clothing_size ? `Clothing: ${wishlist.clothing_size}` : null;
  const shoePillText = wishlist.shoe_size ? `Shoe: ${wishlist.shoe_size}` : null;

  function handleClose() {
    console.log('[ChildProfileSheet] Bottom sheet closed');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={sheetStyles.root}>
        {/* Header */}
        <View style={sheetStyles.header}>
          <View style={sheetStyles.headerSpacer} />
          <Text style={sheetStyles.headerTitle}>Recipient Profile</Text>
          <TouchableOpacity onPress={handleClose} style={sheetStyles.closeButton} hitSlop={8}>
            <X size={22} color="#1C2820" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={sheetStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Section 1 — Child info */}
          <View style={sheetStyles.section}>
            <View style={sheetStyles.childInfoRow}>
              <AvatarCircle uri={wishlist.avatar_url ?? undefined} name={wishlist.person} size={56} />
              <View style={sheetStyles.childInfoText}>
                <Text style={sheetStyles.childName}>{wishlist.person}</Text>
                <View style={sheetStyles.pillsRow}>
                  {agePillText ? (
                    <View style={sheetStyles.agePill}>
                      <Text style={sheetStyles.agePillText}>{agePillText}</Text>
                    </View>
                  ) : null}
                  {clothingPillText ? (
                    <View style={sheetStyles.sizePill}>
                      <Text style={sheetStyles.sizePillText}>{clothingPillText}</Text>
                    </View>
                  ) : null}
                  {shoePillText ? (
                    <View style={sheetStyles.sizePill}>
                      <Text style={sheetStyles.sizePillText}>{shoePillText}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {wishlist.birthday ? (
              <View style={sheetStyles.birthdayRow}>
                <View style={sheetStyles.birthdayLabelRow}>
                  <Text style={sheetStyles.birthdayLabel}>Birthday</Text>
                  {isOwner ? (
                    <TouchableOpacity
                      onPress={() => {
                        console.log('[ChildProfileSheet] Edit birthday pressed for child:', wishlist.id);
                        const existing = wishlist.birthday ? new Date(wishlist.birthday + 'T00:00:00') : new Date();
                        setEditBirthday(existing);
                        setShowBirthdayPicker(true);
                      }}
                      hitSlop={8}
                    >
                      <Text style={sheetStyles.birthdayEditBtn}>Edit</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={sheetStyles.birthdayValue}>
                  {new Date(wishlist.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            ) : isOwner ? (
              <View style={sheetStyles.birthdayRow}>
                <View style={sheetStyles.birthdayLabelRow}>
                  <Text style={sheetStyles.birthdayLabel}>Birthday</Text>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('[ChildProfileSheet] Add birthday pressed for child:', wishlist.id);
                      setEditBirthday(new Date());
                      setShowBirthdayPicker(true);
                    }}
                    hitSlop={8}
                  >
                    <Text style={sheetStyles.birthdayEditBtn}>Add</Text>
                  </TouchableOpacity>
                </View>
                <Text style={sheetStyles.birthdayValueEmpty}>Not set</Text>
              </View>
            ) : null}

            {showBirthdayPicker && isOwner ? (
              <View>
                <DateTimePicker
                  value={editBirthday ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={async (_event: DateTimePickerEvent, selected?: Date) => {
                    if (Platform.OS === 'android') {
                      setShowBirthdayPicker(false);
                    }
                    if (!selected) return;
                    const newDateString = selected.toISOString().split('T')[0];
                    console.log('[ChildProfileSheet] Birthday selected:', newDateString, 'for child:', wishlist.id);
                    setEditBirthday(selected);
                    const { error } = await supabase
                      .from('wishlists')
                      .update({ birthday: newDateString })
                      .eq('id', wishlist.id);
                    if (error) {
                      console.log('[ChildProfileSheet] Birthday save error:', error.message);
                      Alert.alert('Could not save', error.message);
                      return;
                    }
                    console.log('[ChildProfileSheet] Birthday saved successfully:', newDateString);
                    onBirthdayChange(newDateString);
                    if (Platform.OS === 'ios') {
                      setShowBirthdayPicker(false);
                    }
                  }}
                  maximumDate={new Date()}
                  themeVariant="light"
                />
              </View>
            ) : null}

            {wishlist.current_interests ? (
              <View style={sheetStyles.interestsBox}>
                <Text style={sheetStyles.interestsLabel}>What they're into</Text>
                <Text style={sheetStyles.interestsText}>{wishlist.current_interests}</Text>
              </View>
            ) : null}
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({ item, index, onPress }: { item: ApiItem; index: number; onPress: () => void }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isClaimed = item.claimed === true;
  const priceDisplay = item.price != null ? `$${Number(item.price).toFixed(2)}` : null;
  const hasStoreUrl = !!item.store_url;

  function handleViewItem() {
    if (!item.store_url) return;
    console.log('[WishlistDetail] View item link pressed for item:', item.id, item.store_url);
    Linking.openURL(item.store_url);
  }

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, isClaimed && { opacity: 0.55 }]}>
      <AnimatedPressable
        onPress={() => {
          console.log('[WishlistDetail] Item card tapped, opening edit sheet for item:', item.id, item.name);
          onPress();
        }}
        style={[
          styles.itemCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Image
          source={resolveImageSource(item.image_url)}
          style={styles.itemImage}
          contentFit="contain"
          cachePolicy="reload"
        />
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          {priceDisplay ? (
            <Text style={[styles.itemPrice, { color: colors.text }]}>
              {priceDisplay}
            </Text>
          ) : null}
          {item.store ? (
            <Text style={[styles.itemStore, { color: colors.textSecondary }]}>
              {item.store}
            </Text>
          ) : null}
          {hasStoreUrl ? (
            <TouchableOpacity onPress={handleViewItem} activeOpacity={0.7} hitSlop={4}>
              <Text style={styles.viewItemLink}>View item</Text>
            </TouchableOpacity>
          ) : null}
          {item.notes ? (
            <Text style={[styles.itemNotes, { color: colors.textTertiary }]} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}
          {isClaimed ? (
            <View style={styles.claimedSection}>
              <View style={[styles.claimedBadge, { backgroundColor: colors.accentMuted }]}>
                <CheckCircle size={12} color={colors.accent} strokeWidth={2} />
                <Text style={[styles.claimedText, { color: colors.accent }]}>Claimed</Text>
              </View>
              {item.item_claims?.[0]?.claimer_name ? (
                <Text style={[styles.claimerName, { color: colors.textTertiary }]}>
                  by {item.item_claims[0].claimer_name}
                </Text>
              ) : null}
              {item.item_claims?.[0]?.claimer_email ? (
                <Text style={[styles.claimerDetail, { color: colors.textTertiary }]}>
                  {item.item_claims[0].claimer_email}
                </Text>
              ) : null}
              {item.item_claims?.[0]?.claimer_note ? (
                <Text style={[styles.claimerNote, { color: colors.textTertiary }]}>
                  &ldquo;{item.item_claims[0].claimer_note}&rdquo;
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Edit Item Modal ──────────────────────────────────────────────────────────

interface EditItemModalProps {
  item: ApiItem;
  onClose: () => void;
  onSaved: () => void;
}

function EditItemModal({ item, onClose, onSaved }: EditItemModalProps) {
  const [editName, setEditName] = useState(item.name);
  const [editPrice, setEditPrice] = useState(item.price != null ? String(item.price) : '');
  const [editStore, setEditStore] = useState(item.store ?? '');
  const [editNotes, setEditNotes] = useState(item.notes ?? '');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(item.image_url);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleChangePhoto() {
    console.log('[EditItem] Change photo pressed for item:', item.id);
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
      console.log('[EditItem] Photo picker cancelled');
      return;
    }
    const asset = result.assets[0];
    console.log('[EditItem] Photo picked, uploading to Supabase storage');
    setUploadingPhoto(true);
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
      console.log('[EditItem] Photo uploaded, public URL:', publicUrl);
      setEditImageUrl(publicUrl);

      // Immediately persist to DB so the card updates
      const { error: dbError } = await supabase
        .from('wishlist_items')
        .update({ image_url: publicUrl })
        .eq('id', item.id);
      if (dbError) {
        console.error('[EditItem] Failed to save image_url to DB:', dbError.message);
      }
    } catch (err: any) {
      console.error('[Upload] Exception:', err);
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      const status = err?.statusCode ?? err?.status ?? '';
      Alert.alert('Upload failed', status ? `${msg} (${status})` : msg);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    console.log('[EditItem] Save pressed for item:', item.id);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .update({
          name: editName.trim(),
          price: editPrice ? Number(editPrice) : null,
          store: editStore.trim() || null,
          notes: editNotes.trim() || null,
          image_url: editImageUrl,
        })
        .eq('id', item.id);
      if (error) {
        console.log('[EditItem] Save error:', error.message);
        Alert.alert('Could not save', error.message);
        return;
      }
      console.log('[EditItem] Item saved successfully');
      onClose();
      onSaved();
    } catch (err) {
      console.log('[EditItem] Save exception:', err);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    console.log('[EditItem] Delete pressed for item:', item.id);
    Alert.alert('Delete item?', 'This cannot be undone.', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          console.log('[EditItem] Confirming delete for item:', item.id);
          const { error } = await supabase
            .from('wishlist_items')
            .delete()
            .eq('id', item.id);
          if (error) {
            console.log('[EditItem] Delete error:', error.message);
            Alert.alert('Could not delete', error.message);
            return;
          }
          console.log('[EditItem] Item deleted successfully');
          onClose();
          onSaved();
        },
      },
    ]);
  }

  const imageSource = resolveImageSource(editImageUrl);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={editStyles.root}>
        {/* Header */}
        <View style={editStyles.header}>
          <View style={editStyles.headerSpacer} />
          <Text style={editStyles.headerTitle}>Edit Item</Text>
          <TouchableOpacity onPress={onClose} style={editStyles.closeButton} hitSlop={8}>
            <X size={22} color="#1C2820" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={editStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo row */}
          <View style={editStyles.photoRow}>
            <Image
              source={imageSource}
              style={editStyles.photoThumb}
              contentFit="cover"
            />
            <TouchableOpacity
              onPress={handleChangePhoto}
              disabled={uploadingPhoto}
              style={editStyles.changePhotoBtn}
              activeOpacity={0.75}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#0F6B6F" />
              ) : (
                <Text style={editStyles.changePhotoText}>Change photo</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Item name */}
          <View style={editStyles.field}>
            <Text style={editStyles.fieldLabel}>Item name</Text>
            <TextInput
              style={editStyles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Item name"
              placeholderTextColor="#A89F94"
              returnKeyType="next"
            />
          </View>

          {/* Price */}
          <View style={editStyles.field}>
            <Text style={editStyles.fieldLabel}>Price</Text>
            <View style={editStyles.priceRow}>
              <View style={editStyles.pricePrefixBox}>
                <Text style={editStyles.pricePrefix}>$</Text>
              </View>
              <TextInput
                style={[editStyles.input, editStyles.priceInput]}
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="0.00"
                placeholderTextColor="#A89F94"
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Store */}
          <View style={editStyles.field}>
            <Text style={editStyles.fieldLabel}>Store</Text>
            <TextInput
              style={editStyles.input}
              value={editStore}
              onChangeText={setEditStore}
              placeholder="e.g. Amazon, Target"
              placeholderTextColor="#A89F94"
              returnKeyType="next"
            />
          </View>

          {/* Notes */}
          <View style={editStyles.field}>
            <Text style={editStyles.fieldLabel}>Notes</Text>
            <TextInput
              style={[editStyles.input, editStyles.inputMultiline]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="e.g. Size 8, blue color preferred..."
              placeholderTextColor="#A89F94"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[editStyles.saveButton, saving && editStyles.saveButtonDisabled]}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={editStyles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>

          {/* Delete button */}
          <TouchableOpacity
            onPress={handleDelete}
            style={editStyles.deleteButton}
            activeOpacity={0.75}
          >
            <Text style={editStyles.deleteButtonText}>Delete item</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WishlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();

  const [wishlist, setWishlist] = useState<DbWishlist | null>(null);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ApiItem | null>(null);
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);
  const [avatarTapped, setAvatarTapped] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const fetchData = useCallback(async () => {
    if (!id) return;
    console.log('[WishlistDetail] Fetching wishlist and items for id:', id);
    try {
      const [wishlistResult, itemsResult] = await Promise.all([
        supabase.from('wishlists').select('*').eq('id', id).single(),
        supabase
          .from('wishlist_items')
          .select('*, item_claims(claimer_name, claimer_email, claimer_note, created_at)')
          .eq('wishlist_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (wishlistResult.error) {
        console.log('[WishlistDetail] Wishlist fetch error:', wishlistResult.error.message);
        setError('Wishlist not found');
      } else {
        console.log('[WishlistDetail] Wishlist loaded:', wishlistResult.data?.name);
        setWishlist(wishlistResult.data as DbWishlist);
        setError(null);
      }

      if (itemsResult.error) {
        console.log('[WishlistDetail] Items fetch error:', JSON.stringify(itemsResult.error));
      } else {
        console.log('[WishlistDetail] Items loaded:', itemsResult.data?.length ?? 0);
        setItems((itemsResult.data ?? []) as ApiItem[]);
      }
    } catch (err) {
      console.log('[WishlistDetail] Fetch exception:', err);
      setError('Could not load wishlist');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch when screen regains focus (e.g. returning from add-item)
  useFocusEffect(
    useCallback(() => {
      console.log('[WishlistDetail] Screen focused, refreshing data');
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    if (!id) return;
    console.log('[WishlistDetail] Setting up realtime subscription for wishlist:', id);
    const channel = supabase
      .channel(`wishlist-items-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wishlist_items', filter: `wishlist_id=eq.${id}` },
        (payload) => {
          console.log('[WishlistDetail] Realtime UPDATE received for item:', payload.new.id, 'claimed:', payload.new.claimed);
          if (payload.new.claimed === true) {
            // Refetch so item_claims join data (claimer details) is populated
            fetchData();
          } else {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? { ...item, ...(payload.new as Partial<ApiItem>) } : item
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wishlist_items', filter: `wishlist_id=eq.${id}` },
        (payload) => {
          console.log('[WishlistDetail] Realtime INSERT received for item:', payload.new.id);
          setItems((prev) => [payload.new as ApiItem, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'wishlist_items', filter: `wishlist_id=eq.${id}` },
        (payload) => {
          console.log('[WishlistDetail] Realtime DELETE received for item:', payload.old.id);
          setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      console.log('[WishlistDetail] Removing realtime channel for wishlist:', id);
      supabase.removeChannel(channel);
    };
  }, [id]);

  function handleShare() {
    console.log('[WishlistDetail] Share button pressed for wishlist:', id);
    router.push(`/share/${id}`);
  }

  function handleEdit() {
    console.log('[WishlistDetail] Edit button pressed for wishlist:', id);
    router.push({ pathname: '/edit-list', params: { id } });
  }

  function handleAddItem() {
    console.log('[WishlistDetail] Add item FAB pressed for wishlist:', id);
    router.push({ pathname: '/add-item', params: { wishlistId: id } });
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !wishlist) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
          {error ?? 'Wishlist not found'}
        </Text>
      </View>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const claimedCount = items.filter((i) => i.claimed === true).length;
  const itemCount = items.length;
  const summaryText = `${claimedCount} of ${itemCount} gifts claimed`;
  const occasionLabel =
    wishlist.occasion.charAt(0).toUpperCase() + wishlist.occasion.slice(1).toLowerCase();
  const longDate = formatDateLong(wishlist.occasion_date ?? '');
  const accentColor = getOccasionColor(wishlist.occasion);

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: '#FAF7F2' },
          headerTintColor: '#1C2820',
          headerTitleStyle: {
            fontFamily: 'Georgia',
            fontSize: 18,
            fontWeight: '600',
            color: '#1C2820',
          },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AnimatedPressable
                onPress={handleEdit}
                style={styles.headerButton}
                accessibilityLabel="Edit wishlist"
                accessibilityRole="button"
              >
                <Pencil size={20} color="#1C2820" strokeWidth={2} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleShare}
                style={styles.headerButton}
                accessibilityLabel="Share wishlist"
                accessibilityRole="button"
              >
                <Share2 size={22} color="#1C2820" strokeWidth={2} />
              </AnimatedPressable>
            </View>
          ),
        }}
      />
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F6B6F" />}
        >
          {/* Summary card */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <TappableAvatar
              uri={wishlist.avatar_url ?? undefined}
              name={wishlist.person}
              size={64}
              onPress={() => setProfileSheetVisible(true)}
              hasBeenTapped={avatarTapped}
              onFirstTap={() => setAvatarTapped(true)}
            />
            <Text style={[styles.summaryName, { color: colors.text }]}>{wishlist.name}</Text>
            <Text style={[styles.summaryOccasionDate, { color: colors.textSecondary }]}>
              {occasionLabel}
              {' · '}
              {longDate}
            </Text>

            <Text style={[styles.summaryProgressLabel, { color: colors.textSecondary }]}>
              {summaryText}
            </Text>
          </View>

          {/* Items section */}
          <View style={styles.itemsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Gift ideas</Text>
              <View style={[styles.countBadge, { backgroundColor: colors.primaryMuted }]}>
                <Text style={[styles.countText, { color: colors.textSecondary }]}>
                  {itemCount}
                </Text>
              </View>
            </View>

            {items.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No items yet</Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                  Start building your list — add gifts your child will love.
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {items.map((item, index) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    onPress={() => setEditingItem(item)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Bottom padding for FAB */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB */}
        <AnimatedPressable
          onPress={handleAddItem}
          style={[styles.fab, { backgroundColor: '#0F6B6F' }]}
          accessibilityLabel="Add item to wishlist"
          accessibilityRole="button"
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </AnimatedPressable>
      </View>

      {/* Edit item modal */}
      {editingItem !== null ? (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            fetchData();
          }}
        />
      ) : null}

      {/* Child profile bottom sheet */}
      <ChildProfileBottomSheet
        wishlist={wishlist}
        visible={profileSheetVisible}
        onClose={() => setProfileSheetVisible(false)}
        isOwner={true}
        onBirthdayChange={(birthday) => {
          console.log('[WishlistDetail] Birthday updated to:', birthday);
          setWishlist((prev) => prev ? { ...prev, birthday } : prev);
        }}
      />
    </>
  );
}

// ─── Recipient Profile Bottom Sheet Styles ───────────────────────────────────

const sheetStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    backgroundColor: '#FAF7F2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Georgia',
    color: '#1C2820',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4C9B8',
    padding: 20,
    gap: 16,
  },
  childInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  childInfoText: {
    flex: 1,
    gap: 8,
  },
  childName: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: '#2C3B32',
    letterSpacing: -0.3,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  agePill: {
    backgroundColor: '#EFF5F1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  agePillText: {
    color: '#4A7C5F',
    fontSize: 13,
    fontWeight: '600',
  },
  sizePill: {
    backgroundColor: '#F0EFEC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sizePillText: {
    fontSize: 13,
    color: '#5A6354',
  },
  birthdayRow: {
    gap: 4,
  },
  birthdayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  birthdayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E9A87',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  birthdayEditBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F6B6F',
  },
  birthdayValue: {
    fontSize: 15,
    color: '#2C3B32',
  },
  birthdayValueEmpty: {
    fontSize: 15,
    color: '#A89F94',
    fontStyle: 'italic',
  },
  interestsBox: {
    backgroundColor: '#FBF9F5',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  interestsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E9A87',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  interestsText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    color: '#5A6354',
  },
});

// ─── Edit Item Modal Styles ───────────────────────────────────────────────────

const editStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    backgroundColor: '#FAF7F2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Georgia',
    color: '#1C2820',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 64,
    gap: 20,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E8E4DC',
  },
  changePhotoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4C9B8',
    backgroundColor: '#FFFFFF',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F6B6F',
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3B32',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C9B8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2C3B32',
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricePrefixBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C9B8',
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  pricePrefix: {
    fontSize: 16,
    color: '#2C3B32',
    fontWeight: '600',
  },
  priceInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  saveButton: {
    backgroundColor: '#0F6B6F',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: '#C0392B',
    fontSize: 16,
    fontWeight: '500',
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 15,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryName: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Georgia',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: 8,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryFor: {
    fontSize: 15,
  },
  summaryDot: {
    fontSize: 15,
  },
  summaryOccasion: {
    fontSize: 15,
  },
  summaryDate: {
    fontSize: 13,
    marginBottom: 8,
  },
  summaryOccasionDate: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 4,
  },
  summaryProgressSection: {
    width: '100%',
    gap: 8,
  },
  summaryProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  summaryProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  summaryProgressLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  itemsSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  countBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  itemImage: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: '#F0EAE0',
    margin: 10,
  },
  itemContent: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  itemStore: {
    fontSize: 13,
  },
  viewItemLink: {
    fontSize: 13,
    color: '#0F6B6F',
    fontWeight: '500',
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  itemNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  claimedSection: {
    marginTop: 6,
    gap: 3,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  claimedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  claimerName: {
    fontSize: 11,
    fontStyle: 'italic',
    paddingLeft: 2,
  },
  claimerDetail: {
    fontSize: 11,
    paddingLeft: 2,
    opacity: 0.75,
  },
  claimerNote: {
    fontSize: 11,
    fontStyle: 'italic',
    paddingLeft: 2,
    opacity: 0.75,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(15,107,111,0.35)',
  },
});
