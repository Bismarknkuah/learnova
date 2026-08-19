import { TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { theme } from '@/theme';

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={theme.muted} style={styles.input} {...props} />;
}
const styles = StyleSheet.create({
  input: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
    backgroundColor: '#fff', color: theme.text,
  },
});
