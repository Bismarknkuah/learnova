import { Tabs } from 'expo-router';
import { theme } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: theme.brand, headerStyle: { backgroundColor: theme.brand }, headerTintColor: '#fff' }}>
      <Tabs.Screen name="tutors" options={{ title: 'Tutors' }} />
      <Tabs.Screen name="twin" options={{ title: 'AI Twin' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
    </Tabs>
  );
}
