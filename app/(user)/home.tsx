import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { supabase } from '../../lib/supabase'; // 👈 Import Supabase

const { width } = Dimensions.get('window');

export default function UserHome() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 📥 Fetch Products from Supabase
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('in_stock', true) // Only show items currently in stock
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      Alert.alert("Error", "Could not fetch catalog.");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);

  // 🟢 WhatsApp Logic
  const handleInquiry = (product: any) => {
    const text = `Hi, I am interested in *${product.name}* (Price: ₹${product.price}).`;
    const url = `whatsapp://send?phone=918185081875&text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Make sure WhatsApp is installed!'));
  };

  // 🃏 Card Component
  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <Animatable.View 
      animation="fadeInUp" 
      duration={800} 
      delay={index * 150} 
      style={styles.card}
    >
      {/* 1. Image Section */}
      <View style={styles.cardImageContainer}>
        {item.image_url ? (
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="image-outline" size={64} color="#cbd5e1" />
        )}
        
        {/* Floating Price Badge */}
        <View style={styles.priceBadge}>
           <Text style={styles.priceText}>₹{item.price.toLocaleString()}</Text>
        </View>
      </View>

      {/* 2. Details Section */}
      <View style={styles.cardContent}>
        <View style={styles.textRow}>
          <View style={{flex: 1}}>
            <Text style={styles.categoryText}>{item.category}</Text>
            <Text style={styles.productTitle}>{item.name}</Text>
          </View>
        </View>
        
        <Text style={styles.descriptionText} numberOfLines={2}>
          {item.description}
        </Text>

        {/* 3. Action Button */}
        <TouchableOpacity 
          onPress={() => handleInquiry(item)}
          style={styles.actionButton}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Inquire Now</Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 🌊 Premium Header */}
      <LinearGradient
        colors={['#1e3a8a', '#3b82f6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.headerTitle}>Our Products</Text>
          </View>
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={20} color="white" />
          </View>
        </View>
      </LinearGradient>

      {/* 📜 Product List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList 
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>No products available right now.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  header: {
    paddingTop: RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 20 : 60,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 10, zIndex: 10
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { color: '#bfdbfe', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '800', marginTop: 4 },
  profileIcon: { width: 45, height: 45, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginTop: 5 },

  listContent: { padding: 20, paddingTop: 30 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 16 },

  // Cards
  card: {
    backgroundColor: 'white', borderRadius: 24, marginBottom: 24,
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
    overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9'
  },
  cardImageContainer: {
    height: 180, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', position: 'relative'
  },
  productImage: { width: '100%', height: '100%' },
  
  priceBadge: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  priceText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  cardContent: { padding: 20 },
  textRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  categoryText: { color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  productTitle: { color: '#1e293b', fontSize: 20, fontWeight: '800' },
  descriptionText: { color: '#64748b', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  
  actionButton: {
    backgroundColor: '#22c55e', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 14, borderRadius: 14,
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  actionButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});