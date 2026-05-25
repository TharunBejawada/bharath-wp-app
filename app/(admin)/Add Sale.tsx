import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView, StyleSheet,
  Switch,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AddSale() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditMode = params.isEditMode === 'true'; 
  
  const [loading, setLoading] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [productName, setProductName] = useState('');
  const [model, setModel] = useState('');
  const [actualPrice, setActualPrice] = useState('');
  const [salePrice, setSalePrice] = useState(''); 
  
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [originalPurchaseDate, setOriginalPurchaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [hasAMC, setHasAMC] = useState(false);
  const [amcServices, setAmcServices] = useState('3'); 
  const [amcDuration, setAmcDuration] = useState('12'); 

  // Edit Mode AMC State
  const [existingSchedules, setExistingSchedules] = useState<any[]>([]);
  const [recreateAmc, setRecreateAmc] = useState(false);

  // 1. Memoized Fetcher (Prevents infinite re-renders)
  const fetchExistingSchedules = useCallback(async (saleId: string) => {
    if (!saleId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('service_schedule')
        .select('*')
        .eq('sold_product_id', saleId)
        .order('due_date', { ascending: true });
      setExistingSchedules(data || []);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 📥 PRE-FILL OR RESET FORM
  useFocusEffect(
    useCallback(() => {
      // Logic to run when component mounts/gains focus
      if (isEditMode && params.saleId) {
        setName(params.name as string || '');
        setMobile(params.mobile as string || '');
        setAddress(params.address as string || '');
        setProductName(params.productName as string || '');
        setModel(params.model as string || '');
        setActualPrice(params.actualPrice ? String(params.actualPrice) : '');
        setSalePrice(params.salePrice ? String(params.salePrice) : '');
        
        const pDate = params.purchaseDate ? new Date(params.purchaseDate as string) : new Date();
        setPurchaseDate(pDate);
        setOriginalPurchaseDate(pDate);
        
        setRecreateAmc(false);
        fetchExistingSchedules(params.saleId as string);
      } else {
        // Reset Form
        setName(''); setMobile(''); setAddress('');
        setProductName(''); setModel('');
        setActualPrice(''); setSalePrice('');
        setPurchaseDate(new Date());
        setOriginalPurchaseDate(new Date());
        setHasAMC(false); setAmcServices('3');
        setExistingSchedules([]); setRecreateAmc(false);
      }
      setFormInitialized(true);
    }, [isEditMode, params.saleId, params.name, params.mobile, params.address, params.productName, params.model, params.actualPrice, params.salePrice, params.purchaseDate, fetchExistingSchedules])
  );

  const addMonths = (date: Date, months: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  const completeSchedule = async (id: string) => {
    await supabase.from('service_schedule').update({ status: 'Completed', completed_date: new Date().toISOString() }).eq('id', id);
    fetchExistingSchedules(params.saleId as string);
  };

  const deleteSchedule = async (id: string) => {
    Alert.alert("Delete", "Remove this specific service schedule?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await supabase.from('service_schedule').delete().eq('id', id);
          fetchExistingSchedules(params.saleId as string);
      }}
    ]);
  };

  const deleteAllSchedules = () => {
    Alert.alert("Delete All", "Wipe all AMC schedules to create new ones?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: async () => {
          await supabase.from('service_schedule').delete().eq('sold_product_id', params.saleId);
          setExistingSchedules([]);
          setRecreateAmc(true);
      }}
    ]);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      if (isEditMode && !recreateAmc && selectedDate.toDateString() !== originalPurchaseDate.toDateString()) {
        Alert.alert(
          "AMC Schedule Impact",
          "Changing the purchase date will invalidate current schedules. Proceed to create a new schedule?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Proceed", style: "destructive", onPress: () => {
                setPurchaseDate(selectedDate);
                setRecreateAmc(true);
                setExistingSchedules([]);
            }}
          ]
        );
      } else {
        setPurchaseDate(selectedDate);
      }
    }
  };

  const handleSave = async () => {
    if (!name || !mobile || !productName) {
      Alert.alert("Missing Fields", "Please fill Name, Mobile, and Product Name.");
      return;
    }
    setLoading(true);
    try {
      if (isEditMode) {
        await supabase.from('customers').update({ name, mobile, address }).eq('id', params.customerId);
        await supabase.from('sold_products').update({
            product_name: productName, model: model,
            purchase_date: purchaseDate.toISOString().split('T')[0],
            price_actual: actualPrice ? parseFloat(actualPrice) : 0,
            price_offer: salePrice ? parseFloat(salePrice) : 0,
        }).eq('id', params.saleId);

        if (recreateAmc) {
          await supabase.from('service_schedule').delete().eq('sold_product_id', params.saleId);
          if (hasAMC) {
            const servicesCount = parseInt(amcServices);
            const intervalMonths = Math.floor(parseInt(amcDuration) / servicesCount);
            const scheduleInserts = [];
            for (let i = 1; i <= servicesCount; i++) {
              const dueDate = addMonths(purchaseDate, i * intervalMonths);
              scheduleInserts.push({ sold_product_id: params.saleId, due_date: dueDate.toISOString().split('T')[0], service_type: `AMC Service ${i}/${servicesCount}`, status: 'Pending' });
            }
            await supabase.from('service_schedule').insert(scheduleInserts);
          }
        }
        Alert.alert("Success", "Updated successfully!");
        router.back();
      } else {
        let { data: customer } = await supabase.from('customers').select('id').eq('mobile', mobile).single();
        let customerId = customer?.id;
        if (!customerId) {
          const { data: newCust, error: createError } = await supabase.from('customers').insert([{ name, mobile, address }]).select().single();
          if (createError) throw createError;
          customerId = newCust.id;
        }

        const { data: productData, error: productError } = await supabase.from('sold_products').insert([{
            customer_id: customerId, product_name: productName, model: model,
            purchase_date: purchaseDate.toISOString().split('T')[0],
            price_actual: actualPrice ? parseFloat(actualPrice) : 0,
            price_offer: salePrice ? parseFloat(salePrice) : 0,
            amc_frequency_months: hasAMC ? Math.floor(parseInt(amcDuration) / parseInt(amcServices)) : 0
        }]).select().single();
        if (productError) throw productError;

        if (hasAMC) {
          const servicesCount = parseInt(amcServices);
          const intervalMonths = Math.floor(parseInt(amcDuration) / servicesCount);
          const scheduleInserts = [];
          for (let i = 1; i <= servicesCount; i++) {
            const dueDate = addMonths(purchaseDate, i * intervalMonths);
            scheduleInserts.push({ sold_product_id: productData.id, due_date: dueDate.toISOString().split('T')[0], service_type: `AMC Service ${i}/${servicesCount}`, status: 'Pending' });
          }
          await supabase.from('service_schedule').insert(scheduleInserts);
        }
        Alert.alert("Success", "Sale & Schedule Created!", [{ text: "Dashboard", onPress: () => router.push('/(admin)/dashboard') }]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#334155']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? "Edit Sale Details" : "New Offline Sale"}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <TextInput style={styles.input} placeholder="Customer Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Mobile Number" keyboardType="phone-pad" value={mobile} onChangeText={setMobile} />
        <TextInput style={[styles.input, {height: 80}]} placeholder="Address" multiline value={address} onChangeText={setAddress} textAlignVertical="top" />

        <Text style={styles.sectionTitle}>Product Info</Text>
        <TextInput style={styles.input} placeholder="Product Name" value={productName} onChangeText={setProductName} />
        <TextInput style={styles.input} placeholder="Model / Serial No." value={model} onChangeText={setModel} />
        
        <View style={styles.row}>
          <View style={styles.halfInputContainer}>
            <Text style={styles.labelSmall}>Actual Price</Text>
            <TextInput style={styles.halfInput} placeholder="0" keyboardType="numeric" value={actualPrice} onChangeText={setActualPrice} />
          </View>
          <View style={styles.halfInputContainer}>
            <Text style={styles.labelSmall}>Sale Price</Text>
            <TextInput style={styles.halfInput} placeholder="0" keyboardType="numeric" value={salePrice} onChangeText={setSalePrice} />
          </View>
        </View>

        <Text style={styles.label}>Purchase Date</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar" size={20} color="#334155" />
          <Text style={styles.dateText}>{purchaseDate.toDateString()}</Text>
          <Ionicons name="caret-down" size={16} color="#94a3b8" style={{marginLeft: 'auto'}} />
        </TouchableOpacity>

        {showDatePicker && (
          Platform.OS === 'ios' ? (
            <Modal transparent={true} animationType="slide">
               <View style={styles.iosModalOverlay}>
                  <View style={styles.iosModalContent}>
                     <View style={styles.iosModalHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={styles.iosDoneBtn}>Done</Text></TouchableOpacity>
                     </View>
                     <DateTimePicker value={purchaseDate} mode="date" display="spinner" onChange={onDateChange} maximumDate={new Date()} style={{width: '100%'}}/>
                  </View>
               </View>
            </Modal>
          ) : (
            <DateTimePicker value={purchaseDate} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
          )
        )}

        {isEditMode && !recreateAmc && existingSchedules.length > 0 && (
          <View style={styles.existingAmcCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.amcTitle}>Existing AMC Schedule</Text>
              <TouchableOpacity onPress={deleteAllSchedules}><Text style={styles.deleteAllText}>Delete All</Text></TouchableOpacity>
            </View>
            {existingSchedules.map((s) => (
              <View key={s.id} style={styles.scheduleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleType}>{s.service_type}</Text>
                  <Text style={styles.scheduleDate}>{new Date(s.due_date).toDateString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={[styles.statusText, { color: s.status === 'Completed' ? '#16a34a' : '#ea580c' }]}>{s.status}</Text>
                  {s.status === 'Pending' && (
                    <TouchableOpacity onPress={() => completeSchedule(s.id)} style={[styles.miniBtn, { backgroundColor: '#dcfce7' }]}><Ionicons name="checkmark" size={16} color="#16a34a" /></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => deleteSchedule(s.id)} style={[styles.miniBtn, { backgroundColor: '#fee2e2' }]}><Ionicons name="trash" size={16} color="#ef4444" /></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {(!isEditMode || recreateAmc) && (
          <View style={styles.amcCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.amcTitle}>Enable {isEditMode ? 'New' : ''} AMC?</Text>
              <Switch value={hasAMC} onValueChange={setHasAMC} trackColor={{true: '#2563eb', false: '#cbd5e1'}} />
            </View>
            {hasAMC && (
              <View style={{marginTop: 15}}>
                <Text style={styles.label}>Services per year:</Text>
                <View style={styles.pills}>
                  {['1', '2', '3', '4'].map(num => (
                    <TouchableOpacity key={num} style={[styles.pill, amcServices === num && styles.pillActive]} onPress={() => setAmcServices(num)}>
                      <Text style={[styles.pillText, amcServices === num && styles.textWhite]}>{num}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>{isEditMode ? "Update Details" : "Save Sale"}</Text>}
        </TouchableOpacity>
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  form: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#64748b', marginBottom: 10, marginTop: 10, textTransform: 'uppercase' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, color: '#1e293b' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  halfInputContainer: { flex: 1 },
  halfInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#1e293b' },
  labelSmall: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '600' },
  label: { fontSize: 14, color: '#64748b', marginBottom: 8, fontWeight: '600' },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', padding: 15, borderRadius: 12, marginBottom: 20 },
  dateText: { marginLeft: 10, fontSize: 16, color: '#1e293b', fontWeight: '500' },
  amcCard: { backgroundColor: '#dbeafe', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#bfdbfe' },
  existingAmcCard: { backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amcTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a' },
  deleteAllText: { color: '#ef4444', fontSize: 13, fontWeight: 'bold' },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  scheduleType: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  scheduleDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  miniBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  pills: { flexDirection: 'row', gap: 10 },
  pill: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#93c5fd' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  textWhite: { color: 'white' },
  saveButton: { backgroundColor: '#0f172a', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  iosModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  iosModalContent: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  iosModalHeader: { alignItems: 'flex-end', marginBottom: 10 },
  iosDoneBtn: { color: '#2563eb', fontSize: 18, fontWeight: 'bold' }
});