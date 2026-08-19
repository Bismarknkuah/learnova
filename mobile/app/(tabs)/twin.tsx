import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { api } from '@/lib/api';
import { endpoints, type AskDto, type AskResultDto } from '@learnova/shared';
import { theme } from '@/theme';

export default function Twin() {
  const [twinId, setTwinId] = useState('');
  const [question, setQuestion] = useState('');
  const [resp, setResp] = useState<AskResultDto | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    setLoading(true);
    try {
      const dto: AskDto = { question, twinId: twinId || undefined };
      setResp(await api.post<AskResultDto>(endpoints.ai.ask, dto));
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Text style={styles.title}>Ask an AI Twin</Text>
      <Text style={styles.muted}>Study 24/7 with a teacher&apos;s AI Twin, grounded in their lessons.</Text>
      <Input placeholder="Teacher / Twin ID (optional)" autoCapitalize="none" value={twinId} onChangeText={setTwinId} />
      <Input placeholder="Your question…" value={question} onChangeText={setQuestion} />
      <Button title="Ask" onPress={ask} loading={loading} disabled={!question} />
      {resp ? (
        <Card>
          <Text style={{ color: theme.text }}>{resp.answer}</Text>
          {resp.citations?.length ? (
            <Text style={styles.cite}>Sources: {resp.citations.map((c) => `[${c.ref}] ${c.source}`).join('  ')}</Text>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: theme.text },
  muted: { color: theme.muted },
  cite: { marginTop: 10, fontSize: 12, color: theme.muted },
});
