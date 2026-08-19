import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { endpoints, type LoginDto, type SessionDto } from '@learnova/shared';
import { theme } from '@/theme';

export default function Login() {
  const signIn = useAuth((s) => s.signIn);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setErr('');
    try {
      const dto: LoginDto = { identifier, password, tenantSlug: 'marketplace' };
      const session = await api.post<SessionDto>(endpoints.auth.login, dto);
      await signIn(session);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Screen contentStyle={{ justifyContent: 'center', flexGrow: 1 }}>
      <Text style={styles.title}>Welcome to <Text style={{ color: theme.brand }}>Learnova</Text></Text>
      <Input placeholder="Email or phone" autoCapitalize="none" value={identifier} onChangeText={setIdentifier} />
      <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Button title="Sign in" onPress={submit} loading={loading} />
      <Link href="/(auth)/register" style={styles.link}>Create an account</Link>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, color: theme.text },
  err: { color: '#DC2626' },
  link: { color: theme.brand, textAlign: 'center', marginTop: 8 },
});
