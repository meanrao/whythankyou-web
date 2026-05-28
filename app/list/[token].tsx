import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ListDeepLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <Redirect href={`/guest/${token}`} />;
}
