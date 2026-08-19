import { SafeAreaView, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '@/theme';
import type { ReactNode } from 'react';

export function Screen({ children, contentStyle }: { children: ReactNode; contentStyle?: ViewStyle }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, contentStyle]}>{children}</ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 12 },
});
