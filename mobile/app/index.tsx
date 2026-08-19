import { Redirect } from 'expo-router';
// Entry simply hands off to the auth gate in _layout.
export default function Index() {
  return <Redirect href="/(tabs)/tutors" />;
}
