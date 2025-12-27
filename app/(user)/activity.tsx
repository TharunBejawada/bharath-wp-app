import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { supabase } from '../../lib/supabase';

export default function MyActivity() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMobile, setUserMobile] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 📥 1. Get User Mobile & Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get stored mobile number
      const storedMobile = await AsyncStorage.getItem('userMobile');
      setUserMobile(storedMobile);

      if (storedMobile) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('contact_mobile', storedMobile)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      }
    } catch (error) {
      console.log('Error fetching activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // 🎨 Status Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return { bg: '#fee2e2', text: '#ef4444', icon: 'time' };
      case 'Confirmed': return { bg: '#fef3c7', text: '#d97706', icon: 'checkmark-circle' };
      case 'Completed': return { bg: '#dcfce7', text: '#16a34a', icon: 'star' };
      default: return { bg: '#f1f5f9', text: '#64748b', icon: 'help' };
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const statusStyle = getStatusColor(item.status);
    
    return (
      <Animatable.View animation="fadeInUp" delay={index * 100} style={styles.card}>
        {/* Header: Date & Status */}
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>
            {item.scheduled_date ? new Date(item.scheduled_date).toDateString() : 'Date Pending'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Ionicons name={statusStyle.icon as any} size={12} color={statusStyle.text} style={{marginRight: 4}} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
          <View style={styles.iconBox}>
            <Ionicons name="construct" size={24} color="#2563eb" />
          </View>
          <View style={{marginLeft: 15, flex: 1}}>
            <Text style={styles.serviceTitle}>{item.service_type}</Text>
            <Text style={styles.addressText} numberOfLines={1}>{item.contact_address}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.timeText}>
            ⏰ {item.scheduled_time || 'TBD'}
          </Text>
          <Text style={styles.idText}>ID: #{item.id.slice(0, 8)}</Text>
        </View>
      </Animatable.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.header}>
        <Text style={styles.headerTitle}>My Requests</Text>
        <Text style={styles.headerSubtitle}>Track your service history</Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {!userMobile ? (
          // Empty State: No User Found
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No History Found</Text>
            <Text style={styles.emptySub}>Book a service to see it here.</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}} />
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#2563eb"/>
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="folder-open-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Bookings Yet</Text>
                <Text style={styles.emptySub}>Your service requests will appear here.</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: 'white' },
  headerSubtitle: { color: '#bfdbfe', fontSize: 14, marginTop: 5 },
  
  content: { flex: 1, padding: 20 },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748b', marginTop: 15 },
  emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 5 },

  // Card
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  cardBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBox: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  addressText: { fontSize: 13, color: '#64748b', marginTop: 2 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  timeText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  idText: { fontSize: 12, color: '#cbd5e1' }
});