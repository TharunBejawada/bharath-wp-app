import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { generateAndShareInvoice } from '../../lib/generateInvoice';
import { supabase } from '../../lib/supabase';

export default function SalesHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchSales = async () => {
    setLoading(true);
    // Fetch Sales + Customer Details + Service Schedule
    const { data, error } = await supabase
      .from('sold_products')
      .select(`
        *,
        customers ( name, mobile, address ),
        service_schedule ( id, due_date, status, service_type )
      `)
      .order('purchase_date', { ascending: false });

    if (!error) setSales(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchSales();
    }, [])
  );

  const handleInvoice = (item: any) => {
    // Prepare data for the generator
    const details = {
      id: item.id,
      date: item.purchase_date,
      priceDetails: {
        actual: item.price_actual,
        sale: item.price_offer || item.price_actual
      },
      product: {
        name: item.product_name,
        model: item.model
      },
      customer: {
        name: item.customers?.name,
        mobile: item.customers?.mobile,
        address: item.customers?.address
      },
      amcSchedule: item.service_schedule // Pass the AMC array
    };
    generateAndShareInvoice(details);
  };

  const renderItem = ({ item }: { item: any }) => {
    // Calculate Service Stats
    const totalServices = item.service_schedule?.length || 0;
    const completedServices = item.service_schedule?.filter((s: any) => s.status === 'Completed').length || 0;
    
    // Find next pending service
    const nextService = item.service_schedule
      ?.filter((s: any) => s.status === 'Pending')
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

    return (
      <View style={styles.card}>
        {/* HEADER: Product & Date */}
        <View style={styles.headerRow}>
           <View style={{flex: 1}}>
             <Text style={styles.productName}>{item.product_name} <Text style={styles.model}>({item.model})</Text></Text>
             <Text style={styles.date}>Purchased: {new Date(item.purchase_date).toDateString()}</Text>
           </View>
           <View style={{alignItems: 'flex-end'}}>
             {item.price_offer && item.price_offer < item.price_actual && (
               <Text style={styles.actualPrice}>₹{item.price_actual}</Text>
             )}
             <Text style={styles.salePrice}>₹{item.price_offer || item.price_actual}</Text>
           </View>
        </View>

        <View style={styles.divider} />

        {/* CUSTOMER DETAILS */}
        <View style={styles.detailsRow}>
          <View style={styles.iconRow}>
            <Ionicons name="person" size={14} color="#64748b" />
            <Text style={styles.detailText}>{item.customers?.name}</Text>
          </View>
          <View style={styles.iconRow}>
             <Ionicons name="call" size={14} color="#64748b" />
             <Text style={styles.detailText}>{item.customers?.mobile}</Text>
          </View>
        </View>
        
        {item.customers?.address && (
          <View style={[styles.iconRow, {marginTop: 6}]}>
            <Ionicons name="location" size={14} color="#64748b" />
            <Text style={styles.detailText} numberOfLines={2}>{item.customers?.address}</Text>
          </View>
        )}

        {/* SERVICE SUMMARY (If AMC exists) */}
        {totalServices > 0 && (
          <View style={styles.serviceBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.serviceLabel}>AMC Status:</Text>
              <Text style={styles.serviceCount}>{completedServices}/{totalServices} Done</Text>
            </View>
            {nextService && (
               <Text style={styles.nextDue}>
                 Next Due: {new Date(nextService.due_date).toDateString()}
               </Text>
            )}
          </View>
        )}

        <View style={styles.divider} />

        {/* ACTIONS */}
        <TouchableOpacity style={styles.invoiceBtn} onPress={() => handleInvoice(item)}>
          <Ionicons name="print-outline" size={18} color="white" />
          <Text style={styles.btnText}>Generate & Share Invoice</Text>
        </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Sales History</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#0f172a" style={{marginTop: 50}} />
      ) : (
        <FlatList 
          data={sales}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSales(); }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No Sales Recorded</Text>
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
  
  card: { backgroundColor: 'white', marginBottom: 15, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  model: { fontSize: 14, color: '#64748b', fontWeight: 'normal' },
  date: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  
  actualPrice: { fontSize: 12, color: '#ef4444', textDecorationLine: 'line-through', marginBottom: 2 },
  salePrice: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  iconRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  detailText: { marginLeft: 6, fontSize: 13, color: '#475569', flexShrink: 1 },

  serviceBox: { backgroundColor: '#f0f9ff', padding: 10, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#bae6fd' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  serviceLabel: { fontSize: 12, fontWeight: 'bold', color: '#0284c7' },
  serviceCount: { fontSize: 12, fontWeight: 'bold', color: '#0369a1' },
  nextDue: { fontSize: 12, color: '#0ea5e9' },

  invoiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#1e293b', borderRadius: 12, marginTop: 5 },
  btnText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: 'white' },
  
  center: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94a3b8', fontSize: 16 }
});