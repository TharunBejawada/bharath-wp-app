import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
  const [loading, setLoading] = useState(false);

  // Customer Details
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');

  // Product Details
  const [productName, setProductName] = useState('');
  const [model, setModel] = useState('');
  const [actualPrice, setActualPrice] = useState('');
  const [salePrice, setSalePrice] = useState(''); 
  
  // Dates
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // AMC / Service Settings
  const [hasAMC, setHasAMC] = useState(false);
  const [amcServices, setAmcServices] = useState('3'); 
  const [amcDuration, setAmcDuration] = useState('12'); 

  const addMonths = (date: Date, months: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  const handleSave = async () => {
    if (!name || !mobile || !productName) {
      Alert.alert("Missing Fields", "Please fill Name, Mobile, and Product Name.");
      return;
    }

    setLoading(true);
    try {
      // 1. Upsert Customer
      let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('mobile', mobile)
        .single();

      let customerId = customer?.id;

      if (!customerId) {
        const { data: newCust, error: createError } = await supabase
          .from('customers')
          .insert([{ name, mobile, address }])
          .select()
          .single();
        
        if (createError) throw createError;
        customerId = newCust.id;
      }

      // 2. Insert Sold Product
      const { data: productData, error: productError } = await supabase
        .from('sold_products')
        .insert([{
          customer_id: customerId,
          product_name: productName,
          model: model,
          purchase_date: purchaseDate.toISOString().split('T')[0],
          price_actual: actualPrice ? parseFloat(actualPrice) : 0,
          price_offer: salePrice ? parseFloat(salePrice) : 0,
          amc_frequency_months: hasAMC ? Math.floor(parseInt(amcDuration) / parseInt(amcServices)) : 0
        }])
        .select()
        .single();

      if (productError) throw productError;

      // 3. Generate Schedule
      if (hasAMC) {
        const servicesCount = parseInt(amcServices);
        const intervalMonths = Math.floor(parseInt(amcDuration) / servicesCount);
        const scheduleInserts = [];

        for (let i = 1; i <= servicesCount; i++) {
          const dueDate = addMonths(purchaseDate, i * intervalMonths);
          scheduleInserts.push({
            sold_product_id: productData.id,
            due_date: dueDate.toISOString().split('T')[0],
            service_type: `AMC Service ${i}/${servicesCount}`,
            status: 'Pending' 
          });
        }

        const { error: scheduleError } = await supabase
          .from('service_schedule')
          .insert(scheduleInserts);

        if (scheduleError) throw scheduleError;
      }

      // ✅ SUCCESS POPUP
      const successMsg = "Sale & Schedule have been saved successfully!";
      
      if (Platform.OS === 'web') {
        alert(successMsg);
        router.push('/(admin)/dashboard');
      } else {
        Alert.alert(
          "Successfully Added! 🎉",
          successMsg,
          [
            { 
              text: "Go to Dashboard", 
              onPress: () => router.push('/(admin)/dashboard'),
              style: "default"
            }
          ],
          { cancelable: false }
        );
      }

    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    // On Android, we must hide the picker immediately
    if (Platform.OS === 'android') {
        setShowDatePicker(false);
    }
    if (selectedDate) {
      setPurchaseDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#334155']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Offline Sale</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        
        {/* Customer Section */}
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <TextInput style={styles.input} placeholder="Customer Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Mobile Number" keyboardType="phone-pad" value={mobile} onChangeText={setMobile} />
        <TextInput style={[styles.input, {height: 80}]} placeholder="Address" multiline value={address} onChangeText={setAddress} textAlignVertical="top" />

        {/* Product Section */}
        <Text style={styles.sectionTitle}>Product Info</Text>
        <TextInput style={styles.input} placeholder="Product Name (e.g. RO Classic)" value={productName} onChangeText={setProductName} />
        <TextInput style={styles.input} placeholder="Model / Serial No." value={model} onChangeText={setModel} />
        
        {/* FIXED LAYOUT: Price Row */}
        <View style={styles.row}>
          <View style={styles.halfInputContainer}>
            <Text style={styles.labelSmall}>Actual Price</Text>
            <TextInput 
              style={styles.halfInput} 
              placeholder="0" 
              keyboardType="numeric" 
              value={actualPrice} 
              onChangeText={setActualPrice} 
            />
          </View>
          <View style={styles.halfInputContainer}>
            <Text style={styles.labelSmall}>Sale Price</Text>
            <TextInput 
              style={styles.halfInput} 
              placeholder="0" 
              keyboardType="numeric" 
              value={salePrice} 
              onChangeText={setSalePrice} 
            />
          </View>
        </View>

        {/* Date Picker Button */}
        <Text style={styles.label}>Purchase Date</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar" size={20} color="#334155" />
          <Text style={styles.dateText}>
            {purchaseDate.toDateString()}
          </Text>
          <Ionicons name="caret-down" size={16} color="#94a3b8" style={{marginLeft: 'auto'}} />
        </TouchableOpacity>

        {/* DATE PICKER LOGIC */}
        {showDatePicker && (
          Platform.OS === 'ios' ? (
            // iOS Modal Wrapper to ensure visibility
            <Modal transparent={true} animationType="slide">
               <View style={styles.iosModalOverlay}>
                  <View style={styles.iosModalContent}>
                     <View style={styles.iosModalHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                           <Text style={styles.iosDoneBtn}>Done</Text>
                        </TouchableOpacity>
                     </View>
                     <DateTimePicker 
                        value={purchaseDate} 
                        mode="date" 
                        display="spinner"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                        style={{width: '100%'}}
                     />
                  </View>
               </View>
            </Modal>
          ) : (
            // Android Native Picker
            <DateTimePicker 
              value={purchaseDate} 
              mode="date" 
              display="default" 
              onChange={onDateChange}
              maximumDate={new Date()} 
            />
          )
        )}

        {/* AMC Scheduler */}
        <View style={styles.amcCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.amcTitle}>Enable AMC / Service Schedule?</Text>
            <Switch value={hasAMC} onValueChange={setHasAMC} trackColor={{true: '#2563eb', false: '#cbd5e1'}} />
          </View>
          
          {hasAMC && (
            <View style={{marginTop: 15}}>
              <Text style={styles.label}>How many services in a year?</Text>
              <View style={styles.pills}>
                {['1', '2', '3', '4'].map(num => (
                  <TouchableOpacity 
                    key={num} 
                    style={[styles.pill, amcServices === num && styles.pillActive]}
                    onPress={() => setAmcServices(num)}
                  >
                    <Text style={[styles.pillText, amcServices === num && styles.textWhite]}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hintText}>
                * System will auto-schedule {amcServices} services starting from the purchase date.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save & Generate Schedule</Text>}
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
  
  // Fixed Row Layout
  row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  halfInputContainer: { flex: 1 },
  halfInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#1e293b' },
  labelSmall: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '600' },

  label: { fontSize: 14, color: '#64748b', marginBottom: 8, fontWeight: '600' },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', padding: 15, borderRadius: 12, marginBottom: 20 },
  dateText: { marginLeft: 10, fontSize: 16, color: '#1e293b', fontWeight: '500' },

  amcCard: { backgroundColor: '#dbeafe', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#bfdbfe' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amcTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a' },
  
  pills: { flexDirection: 'row', gap: 10 },
  pill: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#93c5fd' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  textWhite: { color: 'white' },
  hintText: { marginTop: 10, fontSize: 12, color: '#60a5fa', fontStyle: 'italic' },

  saveButton: { backgroundColor: '#0f172a', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // iOS Specific Modal Styles
  iosModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  iosModalContent: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  iosModalHeader: { alignItems: 'flex-end', marginBottom: 10 },
  iosDoneBtn: { color: '#2563eb', fontSize: 18, fontWeight: 'bold' }
});