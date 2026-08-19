import { Pressable, Text, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '@/theme';

export function Button({ title, onPress, loading, disabled, style }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, (disabled || loading) && { opacity: 0.6 }, style]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.txt}>{title}</Text>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  btn: { backgroundColor: theme.brand, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  txt: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
