import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 👈 IMPORT THIS
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView, StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { supabase } from '../../lib/supabase';

// ... (KEEP CONFIG CONSTANTS START_HOUR, SERVICE_TYPES, ETC. SAME AS BEFORE) ...
const START_HOUR = 9;
const END_HOUR = 19;

const SERVICE_TYPES = [
  { id: '1', name: 'Filter Change', icon: 'water', price: '₹450+' },
  { id: '2', name: 'Repair / Leak', icon: 'build', price: 'On Inspection' },
  { id: '3', name: 'Installation', icon: 'settings', price: '₹500' },
  { id: '4', name: 'AMC Plan', icon: 'shield-checkmark', price: '₹3500/yr' },
  { id: '5', name: 'Other Issue', icon: 'help-circle', price: 'Describe below' },
];

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();
const CURRENT_MONTH_INDEX = CURRENT_DATE.getMonth();
const TODAY_DATE = CURRENT_DATE.getDate();

const YEARS = Array.from({length: 5}, (_, i) => CURRENT_YEAR + i); 
const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

type DayItem = { dayNumber: number; dayName: string; };

export default function ServiceBooking() {
  
  // State
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [otherIssueText, setOtherIssueText] = useState('');

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(CURRENT_MONTH_INDEX);
  const [selectedDay, setSelectedDay] = useState<number | null>(TODAY_DATE);
  const [daysInMonth, setDaysInMonth] = useState<DayItem[]>([]);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState('');
  const [note, setNote] = useState('');

  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [userAddress, setUserAddress] = useState('');
  
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [isHoliday, setIsHoliday] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [fetchingAvailability, setFetchingAvailability] = useState(false);

  const isAMC = selectedService === '4';

  // 🆕 LOAD SAVED USER DATA ON MOUNT
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const name = await AsyncStorage.getItem('userName');
        const mobile = await AsyncStorage.getItem('userMobile');
        const address = await AsyncStorage.getItem('userAddress');
        
        if (name) setUserName(name);
        if (mobile) setUserMobile(mobile);
        if (address) setUserAddress(address);
      } catch (e) {
        console.log("Failed to load user data");
      }
    };
    loadUserData();
  }, []);

  // ... (KEEP useEffects for Days, Time Slots, Availability EXACTLY AS BEFORE) ...
  useEffect(() => {
    const slots = [];
    for (let i = START_HOUR; i < END_HOUR; i++) {
      const format = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      const formatHalf = (h: number) => `${h > 12 ? h - 12 : h}:30 ${h >= 12 ? 'PM' : 'AM'}`;
      slots.push(format(i));
      slots.push(formatHalf(i));
    }
    slots.push("Other");
    setTimeSlots(slots);
  }, []);

  useEffect(() => {
    let startDay = 1;
    if (selectedYear === CURRENT_YEAR && selectedMonthIndex === CURRENT_MONTH_INDEX) {
      startDay = TODAY_DATE;
    }
    const daysCount = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    const daysArray: DayItem[] = [];
    for (let i = startDay; i <= daysCount; i++) {
      const dateObj = new Date(selectedYear, selectedMonthIndex, i);
      const name = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      daysArray.push({ dayNumber: i, dayName: name });
    }
    setDaysInMonth(daysArray);

    if (selectedDay && selectedDay < startDay) setSelectedDay(startDay);
    else if (selectedDay && selectedDay > daysCount) setSelectedDay(startDay);
  }, [selectedYear, selectedMonthIndex]);

  useEffect(() => {
    if (!selectedDay || isAMC) return;

    const checkAvailability = async () => {
      setFetchingAvailability(true);
      const m = String(selectedMonthIndex + 1).padStart(2, '0');
      const d = String(selectedDay).padStart(2, '0');
      const dateKey = `${selectedYear}-${m}-${d}`;

      try {
        const { data: adminData } = await supabase.from('availability').select('*').eq('date', dateKey).single();
        const { data: bookingData } = await supabase.from('bookings').select('scheduled_time').eq('scheduled_date', dateKey).neq('status', 'Cancelled');

        let adminBlocks = adminData?.blocked_slots || [];
        const isDayOff = adminData?.is_holiday || false;
        const customerBlocks = bookingData?.map((b: any) => b.scheduled_time) || [];
        const allBlocked = Array.from(new Set([...adminBlocks, ...customerBlocks]));

        setIsHoliday(isDayOff);
        setBlockedSlots(allBlocked);
      } catch (error) {
        setIsHoliday(false);
        setBlockedSlots([]);
      } finally {
        setFetchingAvailability(false);
      }
    };
    checkAvailability();
  }, [selectedDay, selectedMonthIndex, selectedYear, isAMC]);


  // 🟢 SAVE & BOOK LOGIC
  const handleBookService = async () => {
    if (!selectedService) { Alert.alert("Incomplete", "Please select a Service type."); return; }
    if (!userName.trim() || !userMobile.trim() || !userAddress.trim()) { Alert.alert("Missing Details", "Please fill in your Name, Mobile, and Address."); return; }

    let serviceName = SERVICE_TYPES.find(s => s.id === selectedService)?.name || 'Unknown';
    if (selectedService === '5') {
      if (!otherIssueText.trim()) { Alert.alert("Missing Details", "Please describe your issue."); return; }
      serviceName = `Other: ${otherIssueText}`;
    }

    let finalDate = null;
    let finalTime = null;

    if (!isAMC) {
      if (!selectedDay || !selectedTime) { Alert.alert("Incomplete", "Please select Date and Time."); return; }
      finalDate = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      finalTime = selectedTime === 'Other' ? customTime : selectedTime;
      if (selectedTime === 'Other' && !customTime.trim()) { Alert.alert("Missing Time", "Please enter your preferred time."); return; }
    }

    setLoading(true);

    try {
      // 🆕 SAVE USER DATA LOCALLY
      await AsyncStorage.setItem('userName', userName);
      await AsyncStorage.setItem('userMobile', userMobile);
      await AsyncStorage.setItem('userAddress', userAddress);

      const { error } = await supabase.from('bookings').insert([{
        contact_name: userName,
        contact_mobile: userMobile,
        contact_address: userAddress,
        service_type: serviceName,
        scheduled_date: finalDate, 
        scheduled_time: finalTime, 
        notes: note,
        status: 'Pending'
      }]);

      if (error) throw error;

      const userDetailsBlock = `👤 Name: ${userName}\n📞 Mobile: ${userMobile}\n📍 Address: ${userAddress}`;
      let text = '';

      if (isAMC) {
        text = `*New AMC Purchase Request* 🛡️\n\nPlan: ${serviceName} (₹3500/yr)\n------------------\n${userDetailsBlock}\n------------------\n📝 Note: ${note ? note : 'None'}\n------------------\nPlease contact me for activation.`;
      } else {
        const dateString = `${selectedDay} ${MONTHS[selectedMonthIndex]} ${selectedYear}`;
        text = `*New Service Request* 🛠️\n\nType: ${serviceName}\nDate: ${dateString}\nTime: ${finalTime}\n------------------\n${userDetailsBlock}\n------------------\n📝 Note: ${note ? note : 'None'}\n------------------\nPlease confirm availability.`;
      }

      const url = `whatsapp://send?phone=918185081875&text=${encodeURIComponent(text)}`;
      Linking.openURL(url).catch(() => Alert.alert("Success", "Booking Saved! (WhatsApp not installed)"));

    } catch (error: any) {
      Alert.alert("Booking Failed", error.message || "Could not save booking.");
    } finally {
      setLoading(false);
    }
  };

  const isMonthDisabled = (index: number) => {
    if (selectedYear > CURRENT_YEAR) return false;
    return index < CURRENT_MONTH_INDEX;
  };

  // ... (RENDER AND STYLES REMAIN EXACTLY THE SAME AS BEFORE) ...
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Need Help?</Text>
          <Text style={styles.headerTitle}>Book Service</Text>
        </View>
        <Ionicons name="construct" size={80} color="rgba(255,255,255,0.15)" style={styles.headerIcon} />
      </LinearGradient>
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionTitle}>What's the issue?</Text>
          <View style={styles.gridContainer}>
            {SERVICE_TYPES.map((service) => (
              <TouchableOpacity 
                key={service.id} 
                style={[
                  styles.serviceCard, 
                  service.id === '5' ? { width: '100%' } : { width: '48%' }, 
                  selectedService === service.id && styles.serviceCardActive
                ]}
                onPress={() => setSelectedService(service.id)}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name={service.icon as any} size={24} color={selectedService === service.id ? 'white' : '#3b82f6'} style={{marginRight: 10}} />
                  <View>
                    <Text style={[styles.serviceName, selectedService === service.id && styles.textWhite]}>{service.name}</Text>
                    <Text style={[styles.servicePrice, selectedService === service.id && styles.textBlue200]}>{service.price}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {selectedService === '5' && (
            <Animatable.View animation="fadeInDown" style={styles.customInputBox}>
              <Text style={styles.label}>Describe the issue:</Text>
              <TextInput style={styles.input} placeholder="e.g. Water tastes salty..." value={otherIssueText} onChangeText={setOtherIssueText} />
            </Animatable.View>
          )}

          {isAMC ? (
            <Animatable.View animation="fadeIn" style={styles.amcCard}>
              <View style={styles.amcHeader}>
                <Ionicons name="shield-checkmark" size={32} color="#0f172a" />
                <View style={{marginLeft: 12}}>
                  <Text style={styles.amcTitle}>Comprehensive Protection</Text>
                  <Text style={styles.amcSubtitle}>1 Year Coverage • ₹3500</Text>
                </View>
              </View>
              <View style={styles.amcFeatures}>
                <Text style={styles.featureText}>✅ 3 Free Periodic Services</Text>
                <Text style={styles.featureText}>✅ Unlimited Breakdown Support</Text>
                <Text style={styles.featureText}>✅ No Visiting Charges</Text>
                <Text style={styles.featureText}>✅ Genuine Spare Parts Included</Text>
              </View>
            </Animatable.View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <View style={styles.dateSelectorsRow}>
                <TouchableOpacity style={styles.selectorPill} onPress={() => setShowYearModal(true)}>
                  <Ionicons name="calendar-outline" size={16} color="#1e3a8a" style={{marginRight: 6}} />
                  <Text style={styles.selectorText}>{selectedYear}</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748b" style={{marginLeft: 6}} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.selectorPill} onPress={() => setShowMonthModal(true)}>
                  <Text style={styles.selectorText}>{MONTHS[selectedMonthIndex]}</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748b" style={{marginLeft: 6}} />
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                {daysInMonth.map((item) => (
                  <TouchableOpacity 
                    key={item.dayNumber} 
                    onPress={() => setSelectedDay(item.dayNumber)}
                    style={[styles.dayCard, selectedDay === item.dayNumber && styles.dayCardActive]}
                  >
                    <Text style={[styles.dayNameText, selectedDay === item.dayNumber && styles.textBlue200]}>{item.dayName}</Text>
                    <Text style={[styles.dayNumberText, selectedDay === item.dayNumber && styles.textWhite]}>{item.dayNumber}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>Select Time</Text>
              
              {fetchingAvailability ? (
                <ActivityIndicator color="#2563eb" style={{marginTop: 20}} />
              ) : isHoliday ? (
                <View style={styles.blockedBox}>
                  <Ionicons name="warning" size={24} color="#dc2626" />
                  <Text style={styles.blockedText}>No slots available (Holiday)</Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {timeSlots.map((slot, index) => {
                    const isBlocked = blockedSlots.includes(slot);
                    return (
                      <TouchableOpacity 
                        key={index}
                        disabled={isBlocked}
                        onPress={() => setSelectedTime(slot)}
                        style={[
                          styles.timeSlot, 
                          selectedTime === slot && styles.timeSlotActive,
                          isBlocked && styles.timeSlotBlocked // Grey out
                        ]}
                      >
                        <Text style={[
                          styles.timeText, 
                          selectedTime === slot && styles.textWhite,
                          isBlocked && { color: '#cbd5e1', textDecorationLine: 'line-through' }
                        ]}>{slot}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {selectedTime === 'Other' && (
                <Animatable.View animation="fadeIn" style={styles.customInputBox}>
                  <Text style={styles.label}>Enter preferred time:</Text>
                  <TextInput style={styles.input} placeholder="e.g. 8:15 PM" value={customTime} onChangeText={setCustomTime} />
                </Animatable.View>
              )}
            </>
          )}

          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Contact Details</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput style={styles.textInput} placeholder="Your Name" value={userName} onChangeText={setUserName} />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput style={styles.textInput} placeholder="Mobile Number" value={userMobile} onChangeText={setUserMobile} keyboardType="phone-pad" />
              </View>
              <View style={[styles.inputWrapper, {alignItems: 'flex-start', paddingTop: 12, height: 80}]}>
                <Ionicons name="location-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput style={[styles.textInput, {height: '100%', textAlignVertical: 'top'}]} placeholder="Address" value={userAddress} onChangeText={setUserAddress} multiline numberOfLines={3} />
              </View>
            </View>
          </View>

          <View style={styles.noteSection}>
            <Text style={styles.sectionTitle}>Additional Notes <Text style={styles.optionalText}>(Optional)</Text></Text>
            <View style={styles.textAreaContainer}>
              <TextInput style={styles.textArea} placeholder="e.g. Call before arriving..." placeholderTextColor="#94a3b8" multiline numberOfLines={3} textAlignVertical="top" value={note} onChangeText={setNote} />
            </View>
          </View>

          <View style={{height: 100}} /> 
        </ScrollView>
      </KeyboardAvoidingView>

      <Animatable.View animation="slideInUp" style={styles.footer}>
        <TouchableOpacity 
          style={[styles.bookButton, (loading || isHoliday) && { opacity: 0.5 }]} 
          onPress={handleBookService}
          disabled={loading || isHoliday}
        >
          {loading ? (
             <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="logo-whatsapp" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.bookButtonText}>{isAMC ? 'Request AMC Plan' : 'Book Service'}</Text>
            </>
          )}
        </TouchableOpacity>
      </Animatable.View>

      <Modal visible={showYearModal} transparent animationType="fade" onRequestClose={() => setShowYearModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Year</Text>
            <ScrollView style={{maxHeight: 300, width: '100%'}}>
              {YEARS.map((year) => (
                <TouchableOpacity key={year} style={styles.modalItem} onPress={() => { setSelectedYear(year); setShowYearModal(false); }}>
                  <Text style={[styles.modalItemText, selectedYear === year && {color: '#2563eb', fontWeight: 'bold'}]}>{year}</Text>
                  {selectedYear === year && <Ionicons name="checkmark" size={18} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowYearModal(false)}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showMonthModal} transparent animationType="fade" onRequestClose={() => setShowMonthModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <ScrollView style={{maxHeight: 400, width: '100%'}}>
              {MONTHS.map((month, index) => {
                const disabled = isMonthDisabled(index);
                return (
                  <TouchableOpacity key={month} disabled={disabled} style={[styles.modalItem, disabled && { opacity: 0.3 }]} onPress={() => { setSelectedMonthIndex(index); setShowMonthModal(false); }}>
                    <Text style={[styles.modalItemText, selectedMonthIndex === index && {color: '#2563eb', fontWeight: 'bold'}, disabled && {color: '#cbd5e1'}]}>{month}</Text>
                    {selectedMonthIndex === index && <Ionicons name="checkmark" size={18} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowMonthModal(false)}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { height: 160, paddingTop: 50, paddingHorizontal: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { zIndex: 10 },
  welcomeText: { color: '#bfdbfe', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '800' },
  headerIcon: { position: 'absolute', right: -10, bottom: -10, opacity: 0.2 },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 20 },
  textWhite: { color: 'white' },
  textBlue200: { color: '#bfdbfe' },
  optionalText: { color: '#94a3b8', fontSize: 12, fontWeight: 'normal' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 5 },
  serviceCardActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  serviceName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  servicePrice: { fontSize: 11, color: '#64748b', marginTop: 2 },
  customInputBox: { marginTop: 10, backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  label: { fontSize: 12, color: '#64748b', marginBottom: 5 },
  input: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingVertical: 5 },
  amcCard: { backgroundColor: '#e2e8f0', borderRadius: 16, padding: 20, marginTop: 15, borderWidth: 1, borderColor: '#cbd5e1' },
  amcHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  amcTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  amcSubtitle: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  amcFeatures: { gap: 8 },
  featureText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  dateSelectorsRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  selectorPill: { flex: 1, flexDirection: 'row', backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0' },
  selectorText: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  dayScroll: { flexDirection: 'row', marginBottom: 10 },
  dayCard: { width: 50, height: 60, backgroundColor: 'white', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  dayCardActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  dayNameText: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  dayNumberText: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  timeSlotActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  timeSlotBlocked: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  timeText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  contactSection: { marginTop: 10 },
  inputGroup: { gap: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 50 },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#1e293b' },
  noteSection: { marginTop: 20 },
  textAreaContainer: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  textArea: { fontSize: 14, color: '#1e293b', height: 60 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  bookButton: { backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bookButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  modalItem: { width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#334155' },
  closeButton: { marginTop: 15, padding: 10 },
  closeText: { color: '#ef4444', fontWeight: '600', fontSize: 16 },
  
  // New Styles
  blockedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#fca5a5' },
  blockedText: { color: '#dc2626', fontWeight: 'bold', marginLeft: 10 }
});