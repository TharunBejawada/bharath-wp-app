import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function UpcomingServices() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    
    try {
      // 1. Fetch AMC Jobs (Auto-generated)
      const { data: amcData, error: amcError } = await supabase
        .from('service_schedule')
        .select(`
          id, due_date, service_type, status,
          sold_products (
            product_name,
            model,
            customers ( name, mobile, address )
          )
        `)
        .eq('status', 'Pending');

      if (amcError) throw amcError;

      // 2. Fetch User Bookings (Manual Requests)
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .neq('status', 'Completed') // Show Pending & Confirmed
        .neq('status', 'Cancelled');

      if (bookingError) throw bookingError;

      // 3. Normalize & Merge Data
      const formattedAmc = (amcData || []).map(item => ({
        id: item.id,
        type: 'AMC', // Tag source
        title: item.service_type,
        customer: item.sold_products?.customers?.name || 'Unknown',
        mobile: item.sold_products?.customers?.mobile,
        address: item.sold_products?.customers?.address,
        product: `${item.sold_products?.product_name} (${item.sold_products?.model})`,
        date: item.due_date,
        status: item.status,
        raw: item 
      }));

      const formattedBookings = (bookingData || []).map(item => ({
        id: item.id,
        type: 'Request', // Tag source
        title: item.service_type,
        customer: item.contact_name,
        mobile: item.contact_mobile,
        address: item.contact_address,
        product: 'Service Request', // Generic label for bookings
        date: item.scheduled_date,
        status: item.status,
        raw: item
      }));

      // Combine and Sort by Date (Earliest first)
      const combined = [...formattedAmc, ...formattedBookings].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      setServices(combined);

    } catch (error) {
      console.log("Error fetching jobs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchServices();
    }, [])
  );

  // 🟢 Actions
  const handleWhatsApp = (item: any) => {
    if (!item.mobile) return;
    const text = `Hello ${item.customer}, regarding your ${item.title} scheduled for ${item.date}. Please confirm availability.`;
    const url = `whatsapp://send?phone=91${item.mobile}&text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "WhatsApp not installed"));
  };

  const markComplete = async (item: any) => {
    Alert.alert("Confirm", "Mark this job as Done?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Yes, Complete", 
        onPress: async () => {
          let table = item.type === 'AMC' ? 'service_schedule' : 'bookings';
          
          // For Booking table, we update status. For Schedule, we also add completed_date
          const updateData = item.type === 'AMC' 
            ? { status: 'Completed', completed_date: new Date().toISOString() }
            : { status: 'Completed' };

          const { error } = await supabase
            .from(table)
            .update(updateData)
            .eq('id', item.id);
          
          if (!error) fetchServices();
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    // Color Logic
    const dueDate = new Date(item.date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let statusColor = '#3b82f6'; // Blue (Future)
    let statusText = `${diffDays} days left`;
    
    if (diffDays < 0) {
      statusColor = '#ef4444'; // Red (Overdue)
      statusText = `${Math.abs(diffDays)} days OVERDUE`;
    } else if (diffDays <= 7) {
      statusColor = '#f59e0b'; // Orange (This Week)
      statusText = `Due in ${diffDays} days`;
    }

    const isAmc = item.type === 'AMC';

    return (
      <View style={styles.card}>
        {/* Color Strip based on Urgency */}
        <View style={[styles.borderStrip, { backgroundColor: statusColor }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.rowBetween}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               {/* Icon distinguishes source */}
               <View style={[styles.iconBox, { backgroundColor: isAmc ? '#e0f2fe' : '#f3e8ff' }]}>
                 <Ionicons name={isAmc ? "shield-checkmark" : "person"} size={14} color={isAmc ? "#0284c7" : "#9333ea"} />
               </View>
               <Text style={styles.serviceType}>{item.title}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.pillText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>

          <Text style={styles.customerName}>{item.customer}</Text>
          <Text style={styles.productInfo}>{item.product}</Text>
          <Text style={styles.dateText}>📅 {new Date(item.date).toDateString()}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.btnOutline} onPress={() => handleWhatsApp(item)}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={[styles.btnText, { color: '#25D366' }]}>Remind</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnFill, { backgroundColor: '#0f172a' }]} onPress={() => markComplete(item)}>
              <Ionicons name="checkmark-circle" size={18} color="white" />
              <Text style={styles.btnTextWhite}>Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#334155']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Active Jobs</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#0f172a" style={{marginTop: 50}} />
      ) : (
        <FlatList 
          data={services}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchServices(); }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No Active Jobs</Text>
              <Text style={styles.emptySub}>You have cleared all pending tasks.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },

  card: { flexDirection: 'row', backgroundColor: 'white', marginBottom: 15, borderRadius: 12, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  borderStrip: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 15 },
  
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  iconBox: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  serviceType: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  
  customerName: { fontSize: 15, fontWeight: '600', color: '#334155' },
  productInfo: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  dateText: { fontSize: 13, color: '#475569', fontWeight: '500', marginBottom: 12 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  btnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  btnFill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8 },
  btnText: { marginLeft: 6, fontWeight: '600', fontSize: 13 },
  btnTextWhite: { marginLeft: 6, fontWeight: '600', fontSize: 13, color: 'white' },

  center: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#64748b', marginTop: 15 },
  emptySub: { fontSize: 14, color: '#94a3b8' }
});