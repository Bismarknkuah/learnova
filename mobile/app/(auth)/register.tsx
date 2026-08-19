import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { endpoints, type RegisterDto, type SessionDto } from '@learnova/shared';
import { useAuth } from '@/stores/auth';
import { theme } from '@/theme';

export default function Register() {
  const signIn = useAuth((s) => s.signIn);
  const router = useRouter();
  const [form, setForm] = useState<RegisterDto>({ name: '', email: '', password: '', role: 'student', tenantSlug: 'marketplace' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setErr('');
    try {
      const session = await api.post<SessionDto>(endpoints.auth.register, form);
      await signIn(session);
      router.replace('/(tabs)/tutors');
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Screen contentStyle={{ justifyContent: 'center', flexGrow: 1 }}>
      <Text style={styles.title}>Create your account</Text>
      <Input placeholder="Full name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
      <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />
      <Input placeholder="Password" secureTextEntry value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Button title="Sign up" onPress={submit} loading={loading} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8, color: theme.text },
  err: { color: '#DC2626' },
});
