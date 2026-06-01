import analytics from '@react-native-firebase/analytics';

export function trackSignUp() {
  return analytics().logSignUp({ method: 'email' });
}

export function trackCreateList(listId: string) {
  return analytics().logEvent('create_list', { list_id: listId });
}

export function trackAddGift(listId: string, hasUrl: boolean, hasImage: boolean) {
  return analytics().logEvent('add_gift', { list_id: listId, has_url: hasUrl, has_image: hasImage });
}

export function trackShareList(listId: string) {
  return analytics().logEvent('share_list', { list_id: listId });
}

export function trackClaimGift(listId: string) {
  return analytics().logEvent('claim_gift', { list_id: listId });
}

export function trackEditGift(listId: string) {
  return analytics().logEvent('edit_gift', { list_id: listId });
}

export function trackDeleteGift(listId: string) {
  return analytics().logEvent('delete_gift', { list_id: listId });
}
