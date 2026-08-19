import { Text, View, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { endpoints, type BookingDto } from '@learnova/shared';
import { useAuth } from '@/stores/auth';
import { theme } from '@/theme';

export default function Bookings() {
  const signOut = useAuth((s) => s.signOut);
  const { data, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api.get<BookingDto[]>(endpoints.bookings.list),
  });

  return (
    <View style={styles.wrap}>
      <FlatList
        data={data ?? []}
        keyExtractor={(b) => b._id}
        ListEmptyComponent={<Text style={styles.muted}>{isLoading ? 'Loading…' : 'No bookings yet.'}</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View>
                <Text style={styles.name}>{item.type.replace('_', ' ')}</Text>
                <Text style={styles.muted}>{new Date(item.startAt).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.price}>₵{item.priceGHS}</Text>
                <Text style={styles.muted}>{item.status.replace('_', ' ')}</Text>
              </View>
            </View>
          </Card>
        )}
        ListFooterComponent={<Button title="Sign out" onPress={signOut} style={{ marginTop: 24, backgroundColor: '#374151' }} />}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '600', color: theme.text, textTransform: 'capitalize' },
  muted: { color: theme.muted, marginTop: 2, textTransform: 'capitalize' },
  price: { color: theme.brand, fontWeight: '700' },
});
