import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ListDeepLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  if (!token) return null;
  return <Redirect href={`/guest/${token}`} />;
}
