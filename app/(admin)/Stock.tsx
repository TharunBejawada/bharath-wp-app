import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert,
    FlatList, Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function StockList() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 📥 Fetch Products
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔄 Refresh when screen comes into focus (e.g. after editing)
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  // 🗑️ Delete Product
  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (!error) fetchProducts(); // Refresh list
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {/* Image */}
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
        style={styles.image} 
      />
      
      <View style={styles.details}>
        <View style={styles.badgeRow}>
          <Text style={styles.categoryBadge}>{item.category}</Text>
          <Text style={[styles.stockBadge, !item.in_stock && styles.outOfStock]}>
            {item.in_stock ? 'In Stock' : 'Out of Stock'}
          </Text>
        </View>
        
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>₹{item.price.toLocaleString()}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={() => router.push({ pathname: '/(admin)/Edit Product', params: { id: item.id } })}
          style={[styles.actionBtn, styles.editBtn]}
        >
          <Ionicons name="pencil" size={18} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => handleDelete(item.id, item.name)}
          style={[styles.actionBtn, styles.deleteBtn]}
        >
          <Ionicons name="trash" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventory ({products.length})</Text>
        <TouchableOpacity onPress={() => router.push('/(admin)/Add Stock')}>
           <Ionicons name="add-circle" size={32} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProducts(); }} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products found. Add one!</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  backBtn: { padding: 5 },
  
  list: { padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },

  card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, padding: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  image: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f1f5f9' },
  details: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  categoryBadge: { fontSize: 10, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  stockBadge: { fontSize: 10, color: '#15803d', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  outOfStock: { color: '#b91c1c', backgroundColor: '#fee2e2' },

  name: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  price: { fontSize: 14, fontWeight: '600', color: '#2563eb', marginTop: 2 },

  actions: { justifyContent: 'space-between', marginLeft: 10 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  editBtn: { backgroundColor: '#3b82f6' },
  deleteBtn: { backgroundColor: '#ef4444' },
});