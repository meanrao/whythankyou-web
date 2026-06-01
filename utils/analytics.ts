import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase App ID from GoogleService-Info.plist
const FIREBASE_APP_ID = '1:212540721507:ios:b621f4a0c7f3a83f85eb56';

// Create this in Firebase Console → Analytics → Data Streams → your iOS stream
// → Measurement Protocol API secrets. Add as EXPO_PUBLIC_FIREBASE_MP_SECRET
// in EAS environment variables.
const API_SECRET = process.env.EXPO_PUBLIC_FIREBASE_MP_SECRET ?? '';

const CLIENT_ID_KEY = '@analytics_client_id';

async function getClientId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      await AsyncStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

async function logEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (!API_SECRET) return;
  try {
    const clientId = await getClientId();
    const url = `https://www.google-analytics.com/mp/collect?firebase_app_id=${FIREBASE_APP_ID}&api_secret=${API_SECRET}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name, params: params ?? {} }],
      }),
    });
  } catch {
    // analytics failures are always non-fatal
  }
}

export function trackSignUp() {
  return logEvent('sign_up', { method: 'email' });
}

export function trackCreateList(listId: string) {
  return logEvent('create_list', { list_id: listId });
}

export function trackAddGift(listId: string, hasUrl: boolean, hasImage: boolean) {
  return logEvent('add_gift', { list_id: listId, has_url: hasUrl, has_image: hasImage });
}

export function trackShareList(listId: string) {
  return logEvent('share_list', { list_id: listId });
}

export function trackClaimGift(listId: string) {
  return logEvent('claim_gift', { list_id: listId });
}

export function trackEditGift(listId: string) {
  return logEvent('edit_gift', { list_id: listId });
}

export function trackDeleteGift(listId: string) {
  return logEvent('delete_gift', { list_id: listId });
}
