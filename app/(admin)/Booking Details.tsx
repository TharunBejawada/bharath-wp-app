import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Linking, Platform,
    ScrollView, StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function BookingDetails() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      // 1. Safety Check: If no ID, go back
      if (!id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        Alert.alert("Error", "Could not fetch booking details.");
        router.back();
      } else {
        setBooking(data);
      }
      setLoading(false);
    };

    fetchBooking();
  }, [id]);

  // ... (Keep updateStatus, handleCall, handleWhatsApp, handleMaps functions exactly as before) ...
  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      Alert.alert("Error", "Could not update status.");
    } else {
      setBooking({ ...booking, status: newStatus }); 
      Alert.alert("Success", `Order marked as ${newStatus}`);
    }
    setUpdating(false);
  };

  const handleCall = () => Linking.openURL(`tel:${booking?.contact_mobile}`);
  const handleWhatsApp = () => {
    const text = `Hello ${booking?.contact_name}, regarding your service request...`;
    Linking.openURL(`whatsapp://send?phone=91${booking?.contact_mobile}&text=${encodeURIComponent(text)}`);
  };
  const handleMaps = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${booking?.contact_address}`;
    const label = 'Customer Location';
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    Linking.openURL(url || '');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return '#ef4444';
      case 'Confirmed': return '#f59e0b';
      case 'Completed': return '#10b981';
      default: return '#64748b';
    }
  };

  // 1️⃣ LOADING STATE
  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#0f172a" /></View>
  );

  // 2️⃣ 🛡️ CRITICAL GUARD CLAUSE (This fixes your error)
  // If data is missing (or deleted), show an error instead of crashing
  if (!booking) return (
    <View style={styles.center}>
      <Text style={{color: '#64748b'}}>Booking not found.</Text>
      <TouchableOpacity onPress={() => router.back()} style={{marginTop: 20}}>
        <Text style={{color: '#2563eb', fontWeight: 'bold'}}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#334155']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Info Card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.serviceType}>{booking.service_type}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>{booking.status}</Text>
            </View>
          </View>
          
          <Text style={styles.dateText}>
            📅 {booking.scheduled_date || 'No Date'}  •  ⏰ {booking.scheduled_time || 'No Time'}
          </Text>

          {/* Customer Info */}
          <View style={styles.customerSection}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color="#64748b" style={{marginRight: 8}} />
              {/* Optional Chaining (?.) protects against crashes */}
              <Text style={styles.infoText}>{booking?.contact_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={18} color="#64748b" style={{marginRight: 8}} />
              <Text style={styles.infoText}>{booking?.contact_mobile}</Text>
            </View>
            <View style={[styles.infoRow, {alignItems: 'flex-start'}]}>
              <Ionicons name="location" size={18} color="#64748b" style={{marginRight: 8, marginTop: 2}} />
              <Text style={[styles.infoText, {flex: 1}]}>{booking?.contact_address}</Text>
            </View>
          </View>

          {booking.notes ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Notes:</Text>
              <Text style={styles.noteText}>{booking.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
            <View style={[styles.iconBox, {backgroundColor: '#e0f2fe'}]}>
              <Ionicons name="call" size={24} color="#0284c7" />
            </View>
            <Text style={styles.actionLabel}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleWhatsApp}>
            <View style={[styles.iconBox, {backgroundColor: '#dcfce7'}]}>
              <Ionicons name="logo-whatsapp" size={24} color="#16a34a" />
            </View>
            <Text style={styles.actionLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleMaps}>
            <View style={[styles.iconBox, {backgroundColor: '#f3e8ff'}]}>
              <Ionicons name="map" size={24} color="#9333ea" />
            </View>
            <Text style={styles.actionLabel}>Locate</Text>
          </TouchableOpacity>
        </View>

        {/* Status Management */}
        <Text style={styles.sectionTitle}>Update Status</Text>
        <View style={styles.statusButtons}>
          <TouchableOpacity 
            style={[styles.statusOption, booking.status === 'Pending' && styles.activeStatus, {borderColor: '#ef4444'}]}
            onPress={() => updateStatus('Pending')}
            disabled={updating}
          >
            <Text style={[styles.statusBtnText, {color: '#ef4444'}, booking.status === 'Pending' && {color: 'white'}]}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statusOption, booking.status === 'Confirmed' && styles.activeStatus, {borderColor: '#f59e0b', backgroundColor: booking.status === 'Confirmed' ? '#f59e0b' : 'white'}]}
            onPress={() => updateStatus('Confirmed')}
            disabled={updating}
          >
            <Text style={[styles.statusBtnText, {color: '#f59e0b'}, booking.status === 'Confirmed' && {color: 'white'}]}>Confirmed</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statusOption, booking.status === 'Completed' && styles.activeStatus, {borderColor: '#10b981', backgroundColor: booking.status === 'Completed' ? '#10b981' : 'white'}]}
            onPress={() => updateStatus('Completed')}
            disabled={updating}
          >
            <Text style={[styles.statusBtnText, {color: '#10b981'}, booking.status === 'Completed' && {color: 'white'}]}>Completed</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },

  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  serviceType: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  dateText: { fontSize: 14, color: '#64748b', marginBottom: 20, fontWeight: '500' },

  customerSection: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 16, color: '#334155' },

  noteBox: { marginTop: 15, backgroundColor: '#fff7ed', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ffedd5' },
  noteLabel: { fontSize: 12, fontWeight: 'bold', color: '#9a3412', marginBottom: 4 },
  noteText: { fontSize: 14, color: '#9a3412' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionBtn: { alignItems: 'center', flex: 1 },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },

  statusButtons: { flexDirection: 'row', gap: 10 },
  statusOption: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  activeStatus: { borderWidth: 0 },
  statusBtnText: { fontWeight: 'bold', fontSize: 14 }
});