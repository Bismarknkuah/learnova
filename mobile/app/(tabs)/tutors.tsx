import { useState } from 'react';
import { Text, View, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { api } from '@/lib/api';
import { endpoints, type TutorSummary } from '@learnova/shared';
import { theme } from '@/theme';

export default function Tutors() {
  const [subject, setSubject] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['tutors', subject],
    queryFn: () => {
      const qs = subject ? `subject=${encodeURIComponent(subject)}` : '';
      return api.get<TutorSummary[]>(endpoints.tutors.list(qs));
    },
  });

  return (
    <View style={styles.wrap}>
      <Input placeholder="Search subject (e.g. Physics)" value={subject} onChangeText={setSubject} />
      <FlatList
        style={{ marginTop: 12 }}
        data={data ?? []}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<Text style={styles.muted}>{isLoading ? 'Loading…' : 'No tutors found.'}</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.rating}>{item.rating}★</Text>
            </View>
            <Text style={styles.muted}>{item.subjects?.join(', ')}</Text>
            <Text style={styles.price}>₵{item.hourlyRateGHS}/hr</Text>
            {item.aiTwinEnabled ? <Text style={styles.badge}>AI Twin available</Text> : null}
          </Card>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '600', color: theme.text },
  rating: { color: '#D97706' },
  muted: { color: theme.muted, marginTop: 4 },
  price: { color: theme.brand, fontWeight: '600', marginTop: 6 },
  badge: { marginTop: 8, color: theme.brand, fontSize: 12 },
});
