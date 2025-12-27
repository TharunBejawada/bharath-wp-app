import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();

  // 📊 1. Real State
  const [stats, setStats] = useState({
    totalStock: 0,
    pendingInquiries: 0,
    serviceRequests: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // 🚨 NEW: Alert State
  const [dueAlerts, setDueAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 📥 2. Fetch Real Data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // A. Get Stock Count
      const { count: stockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // B. Get User Booking Stats (Pending)
      const { count: pendingBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');
      
      // C1. Get All Active Bookings (Pending + Confirmed)
      const { count: activeBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'Completed')
        .neq('status', 'Cancelled');

      // C2. Get Pending AMC Jobs
      const { count: pendingAMC } = await supabase
        .from('service_schedule')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');
      
      // D. Get Recent Activity List
      const { data: activityList } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalStock: stockCount || 0,
        pendingInquiries: pendingBookings || 0,
        serviceRequests: (activeBookings || 0) + (pendingAMC || 0),
      });

      setRecentActivity(activityList || []);

      // 🚨 E. SMART ALERT CHECK (+/- 7 Days)
      const today = new Date();
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(today.getDate() - 7);
      const sevenDaysLater = new Date(); sevenDaysLater.setDate(today.getDate() + 7);

      const { data: alerts, error: alertError } = await supabase
        .from('service_schedule')
        .select(`
          id, due_date, service_type,
          sold_products (
            product_name,
            customers ( name, mobile )
          )
        `)
        .eq('status', 'Pending')
        .gte('due_date', sevenDaysAgo.toISOString().split('T')[0]) // >= -7 days
        .lte('due_date', sevenDaysLater.toISOString().split('T')[0]); // <= +7 days

      if (!alertError) {
        setDueAlerts(alerts || []);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  // 🟢 Helper: WhatsApp Sender for Alerts
  const sendReminder = (item: any) => {
    const customer = item.sold_products?.customers;
    const product = item.sold_products?.product_name;
    const dueDate = new Date(item.due_date).toDateString();
    
    if (!customer?.mobile) {
      Alert.alert("Error", "No mobile number found for this customer.");
      return;
    }

    const message = `Hello ${customer.name}, this is Lakshman from Bharath Water Purifiers. \n\nReminder: Your *${item.service_type}* for *${product}* is due around *${dueDate}*. \n\nPlease let us know when we can visit for the service. Thank you!`;
    const url = `whatsapp://send?phone=91${customer.mobile}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => Alert.alert("Error", "WhatsApp is not installed"));
  };

  // 🕒 Helper: Time Formatter
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
              onPress={() => router.push('/(admin)/Add Sale')}
              style={[styles.iconButton, { backgroundColor: 'rgba(59, 130, 246, 0.3)', borderColor: '#60a5fa' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/(admin)/Sales History')}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="receipt" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.adminAvatar}
              onLongPress={() => Alert.alert("Admin Profile", "Logged in as Lead Manager")}
            >
              <Text style={styles.adminInitials}>LM</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🚨 SMART ALERT BANNER (Only shows if alerts exist) */}
        {dueAlerts.length > 0 && (
          <Animatable.View animation="pulse" iterationCount="infinite" duration={2000} style={styles.alertBanner}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={20} color="#b91c1c" />
              <Text style={styles.alertTitle}>Action Required: {dueAlerts.length} Services Due</Text>
            </View>
            
            {/* Show first alert as preview */}
            <View style={styles.alertItem}>
              <Text style={styles.alertText}>
                {dueAlerts[0].sold_products?.customers?.name} • {dueAlerts[0].service_type}
              </Text>
              <TouchableOpacity 
                style={styles.whatsappBtn} 
                onPress={() => sendReminder(dueAlerts[0])}
              >
                <Ionicons name="logo-whatsapp" size={16} color="white" />
                <Text style={styles.whatsappText}>Alert Customer</Text>
              </TouchableOpacity>
            </View>

            {/* If more than 1, show link to full list */}
            {dueAlerts.length > 1 && (
              <TouchableOpacity onPress={() => router.push('/(admin)/Upcoming Services')}>
                 <Text style={styles.viewAllAlerts}>+ {dueAlerts.length - 1} more (View All)</Text>
              </TouchableOpacity>
            )}
          </Animatable.View>
        )}

        {/* 2. STATS GRID (Only show if NO alerts, or push down if alerts exist - handled by layout flow) */}
        {!dueAlerts.length && (
          <Animatable.View animation="fadeInDown" delay={300} style={styles.statsContainer}>
            
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

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#ffedd5' }]}>
                <Ionicons name="chatbubbles" size={24} color="#ea580c" />
              </View>
              <Text style={styles.statNumber}>
                {loading ? '-' : stats.pendingInquiries}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => router.push('/(admin)/Upcoming Services')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="build" size={24} color="#9333ea" />
              </View>
              <Text style={styles.statNumber}>
                {loading ? '-' : stats.serviceRequests}
              </Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </TouchableOpacity>

          </Animatable.View>
        )}

        {/* If alerts exist, we still want to show stats below, just shift them down if needed by removing the !dueAlerts.length check above if you prefer both always visible. 
            For now, I hid stats when alerts appear to focus attention, as per "Alert" nature. 
            Let's keep stats visible BELOW alert if you prefer: */}
        
        {dueAlerts.length > 0 && (
           <Animatable.View animation="fadeInDown" delay={300} style={[styles.statsContainer, { marginTop: 20 }]}>
             <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/Stock')}>
               <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                 <Ionicons name="cube" size={24} color="#2563eb" />
               </View>
               <Text style={styles.statNumber}>{loading ? '-' : stats.totalStock}</Text> 
               <Text style={styles.statLabel}>Stock</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/Upcoming Services')}>
               <View style={[styles.statIcon, { backgroundColor: '#f3e8ff' }]}>
                 <Ionicons name="build" size={24} color="#9333ea" />
               </View>
               <Text style={styles.statNumber}>{loading ? '-' : stats.serviceRequests}</Text>
               <Text style={styles.statLabel}>Jobs</Text>
             </TouchableOpacity>
           </Animatable.View>
        )}

      </LinearGradient>

      {/* 3. RECENT ACTIVITY LIST */}
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
    paddingBottom: 40, // Increased bottom padding for layout
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

  // 🚨 ALERT STYLES
  alertBanner: {
    backgroundColor: '#fef2f2', 
    borderRadius: 16, 
    padding: 16, 
    marginTop: 10,
    borderWidth: 1, 
    borderColor: '#fca5a5', 
    shadowColor: '#b91c1c', 
    shadowOpacity: 0.1, 
    shadowRadius: 10
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#b91c1c', marginLeft: 8 },
  alertItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 10, borderRadius: 10 },
  alertText: { fontSize: 13, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 5 },
  whatsappBtn: { flexDirection: 'row', backgroundColor: '#25D366', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center' },
  whatsappText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  viewAllAlerts: { textAlign: 'center', color: '#b91c1c', fontSize: 12, fontWeight: '600', marginTop: 10, textDecorationLine: 'underline' },
  
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