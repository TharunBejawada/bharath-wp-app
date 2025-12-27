import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router'; // 👈 Added useFocusEffect
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { supabase } from '../../lib/supabase'; // 👈 Import Supabase

export default function AdminDashboard() {
  const router = useRouter();

  // 📊 1. Real State (Instead of Mock)
  const [stats, setStats] = useState({
    totalStock: 0,
    pendingInquiries: 0,
    serviceRequests: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 📥 2. Fetch Real Data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // A. Get Stock Count
      const { count: stockCount, error: stockError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true }); // 'head: true' means don't download data, just count

      // B. Get Booking Stats (Pending)
      const { count: pendingCount, error: bookingError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');
      
      // C. Get Total Service Requests (All bookings)
      const { count: totalServiceCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // D. Get Recent Activity List (Last 5 bookings)
      const { data: activityList, error: listError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (stockError || bookingError || listError) throw new Error("Data fetch failed");

      setStats({
        totalStock: stockCount || 0,
        pendingInquiries: pendingCount || 0,
        serviceRequests: totalServiceCount || 0,
      });

      setRecentActivity(activityList || []);

    } catch (error) {
      console.error(error);
      // Optional: Alert.alert("Error", "Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Refresh data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  // 🕒 Helper: Simple Time Formatter
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHrs = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHrs / 24);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    return `${diffDays} days ago`;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return { bg: '#fee2e2', text: '#ef4444' }; // Red
      case 'Confirmed': return { bg: '#fef3c7', text: '#d97706' }; // Yellow
      case 'Completed': return { bg: '#dcfce7', text: '#22c55e' }; // Green
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const renderInquiry = ({ item, index }: { item: any, index: number }) => {
    const colors = getStatusColor(item.status);
    const isService = item.service_type !== 'Purchase';
    
    return (
      <Animatable.View 
        animation="fadeInUp" 
        delay={index * 100 + 300} 
      >
        {/* 👇 WRAP CONTENT IN TOUCHABLE OPACITY */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => router.push({ pathname: '/(admin)/Booking Details', params: { id: item.id } })}
        >
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: isService ? '#f3e8ff' : '#e0f2fe' }]}>
              <Ionicons 
                name={isService ? "construct" : "cart"} 
                size={20} 
                color={isService ? "#9333ea" : "#0284c7"} 
              />
            </View>
            
            <View style={styles.cardDetails}>
              <Text style={styles.cardTitle}>{item.contact_name || 'Guest User'}</Text>
              <Text style={styles.cardSubtitle}>{item.service_type}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <View style={[styles.statusPill, { backgroundColor: colors.bg }]}>
                <Text style={[styles.statusText, { color: colors.text }]}>{item.status}</Text>
              </View>
              <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 1. HEADER */}
      <LinearGradient colors={['#0f172a', '#334155']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Control Center</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => router.push('/(admin)/Availability')}
              onLongPress={() => Alert.alert("Availability Manager", "Block holidays or specific time slots.")}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar" size={22} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.adminAvatar}
              onLongPress={() => Alert.alert("Admin Profile", "Logged in as Lead Manager")}
            >
              <Text style={styles.adminInitials}>LM</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. STATS GRID */}
        <Animatable.View animation="fadeInDown" delay={300} style={styles.statsContainer}>
          
          {/* Stat 1: Stock (REAL) */}
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={() => router.push('/(admin)/Stock')} 
          >
            <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="cube" size={24} color="#2563eb" />
            </View>
            <Text style={styles.statNumber}>
              {loading ? '-' : stats.totalStock}
            </Text> 
            <Text style={styles.statLabel}>Manage Stock</Text>
          </TouchableOpacity>

          {/* Stat 2: Pending Inquiries (REAL) */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#ffedd5' }]}>
              <Ionicons name="chatbubbles" size={24} color="#ea580c" />
            </View>
            <Text style={styles.statNumber}>
              {loading ? '-' : stats.pendingInquiries}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          {/* Stat 3: Total Requests (REAL) */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="build" size={24} color="#9333ea" />
            </View>
            <Text style={styles.statNumber}>
              {loading ? '-' : stats.serviceRequests}
            </Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>

        </Animatable.View>
      </LinearGradient>

      {/* 3. RECENT ACTIVITY LIST (REAL) */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#0f172a" style={{marginTop: 20}} />
        ) : (
          <FlatList
            data={recentActivity}
            keyExtractor={(item) => item.id}
            renderItem={renderInquiry}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recent activity.</Text>
                <Text style={styles.emptySubText}>New bookings will appear here.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* 4. FAB - Add Stock */}
      <Animatable.View animation="bounceIn" delay={1000} style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab} 
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)/Add Stock')}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      </Animatable.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 20 : 60,
    paddingHorizontal: 24,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  adminAvatar: { 
    width: 45, 
    height: 45, 
    borderRadius: 25, 
    backgroundColor: '#3b82f6',
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: 'white',
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  welcomeText: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: '800' },
  adminInitials: { color: 'white', fontWeight: 'bold' },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
  
  listContainer: { flex: 1, marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardDetails: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  timeText: { fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  
  fabContainer: { position: 'absolute', bottom: 30, right: 30 },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#0f172a',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10,
    elevation: 8
  },

  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#94a3b8' },
  emptySubText: { fontSize: 12, color: '#cbd5e1', marginTop: 4 }
});