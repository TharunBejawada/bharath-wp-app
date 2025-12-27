import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Modal,
  ScrollView, StyleSheet,
  Switch,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// 🛠️ CONFIG DATA
const START_HOUR = 9;
const END_HOUR = 19;

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();
const CURRENT_MONTH_INDEX = CURRENT_DATE.getMonth();
const TODAY_DATE = CURRENT_DATE.getDate();

const YEARS = Array.from({length: 5}, (_, i) => CURRENT_YEAR + i); 
const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

type DayItem = { dayNumber: number; dayName: string; fullDate: string };

export default function AvailabilityManager() {
  const router = useRouter();

  // Date State
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(CURRENT_MONTH_INDEX);
  const [selectedDay, setSelectedDay] = useState(TODAY_DATE);
  const [daysInMonth, setDaysInMonth] = useState<DayItem[]>([]);

  // Database State
  const [scheduleData, setScheduleData] = useState<any>({}); 
  const [bookedSlots, setBookedSlots] = useState<string[]>([]); // New: Customer bookings for selected day
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);

  const getDateKey = (year: number, monthIndex: number, day: number) => {
    const m = String(monthIndex + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // 1️⃣ Fetch Admin Blocks for Month
  const fetchMonthAvailability = useCallback(async () => {
    setLoading(true);
    const monthStr = String(selectedMonthIndex + 1).padStart(2, '0');
    const searchPattern = `${selectedYear}-${monthStr}%`;

    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .like('date', searchPattern);

    if (!error && data) {
      const map: any = {};
      data.forEach(row => { map[row.date] = row; });
      setScheduleData(map);
    }
    setLoading(false);
  }, [selectedYear, selectedMonthIndex]);

  // 2️⃣ Fetch Customer Bookings for SELECTED DAY
  const fetchCustomerBookings = async () => {
    const dateKey = getDateKey(selectedYear, selectedMonthIndex, selectedDay);
    
    const { data } = await supabase
      .from('bookings')
      .select('scheduled_time')
      .eq('scheduled_date', dateKey)
      .neq('status', 'Cancelled');

    if (data) {
      const slots = data.map((b: any) => b.scheduled_time);
      setBookedSlots(slots);
    } else {
      setBookedSlots([]);
    }
  };

  // 3️⃣ Effects
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
      daysArray.push({ 
        dayNumber: i, 
        dayName: name,
        fullDate: getDateKey(selectedYear, selectedMonthIndex, i)
      });
    }
    setDaysInMonth(daysArray);

    if (selectedDay < startDay) setSelectedDay(startDay);
    else if (selectedDay > daysCount) setSelectedDay(startDay);

    fetchMonthAvailability();
  }, [selectedYear, selectedMonthIndex]);

  // Re-fetch bookings when day changes
  useEffect(() => {
    fetchCustomerBookings();
  }, [selectedDay, selectedMonthIndex, selectedYear]);

  // Key & Data
  const currentKey = getDateKey(selectedYear, selectedMonthIndex, selectedDay);
  const currentData = scheduleData[currentKey] || { is_holiday: false, blocked_slots: [] };

  const saveToSupabase = async (updatedRow: any) => {
    setSaving(true);
    setScheduleData((prev: any) => ({ ...prev, [currentKey]: updatedRow }));

    const { error } = await supabase
      .from('availability')
      .upsert({
        date: currentKey,
        is_holiday: updatedRow.is_holiday,
        blocked_slots: updatedRow.blocked_slots
      }, { onConflict: 'date' });

    if (error) {
      Alert.alert("Error", "Failed to save availability.");
      fetchMonthAvailability();
    }
    setSaving(false);
  };

  const toggleHoliday = () => {
    const newVal = !currentData.is_holiday;
    const updatedRow = { ...currentData, is_holiday: newVal, blocked_slots: currentData.blocked_slots || [] };
    saveToSupabase(updatedRow);
  };

  const toggleSlot = (time: string) => {
    if (currentData.is_holiday) return;
    const currentSlots = currentData.blocked_slots || [];
    let newSlots;

    if (currentSlots.includes(time)) {
      newSlots = currentSlots.filter((t: string) => t !== time);
    } else {
      newSlots = [...currentSlots, time];
    }
    const updatedRow = { ...currentData, blocked_slots: newSlots };
    saveToSupabase(updatedRow);
  };

  const timeSlots = [];
  for (let i = START_HOUR; i < END_HOUR; i++) {
    const format = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    const formatHalf = (h: number) => `${h > 12 ? h - 12 : h}:30 ${h >= 12 ? 'PM' : 'AM'}`;
    timeSlots.push(format(i));
    timeSlots.push(formatHalf(i));
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#334155']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Availability</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Date Selectors */}
        <View style={styles.dateSelectorsRow}>
          <TouchableOpacity style={styles.selectorPill} onPress={() => setShowYearModal(true)}>
            <Ionicons name="calendar" size={16} color="#0f172a" style={{marginRight: 6}} />
            <Text style={styles.selectorText}>{selectedYear}</Text>
            <Ionicons name="chevron-down" size={12} color="#64748b" style={{marginLeft: 6}} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectorPill} onPress={() => setShowMonthModal(true)}>
            <Text style={styles.selectorText}>{MONTHS[selectedMonthIndex]}</Text>
            <Ionicons name="chevron-down" size={12} color="#64748b" style={{marginLeft: 6}} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
          {daysInMonth.map((item) => {
            const isHoliday = scheduleData[item.fullDate]?.is_holiday;
            return (
              <TouchableOpacity 
                key={item.dayNumber} 
                onPress={() => setSelectedDay(item.dayNumber)}
                style={[
                  styles.dayCard, 
                  selectedDay === item.dayNumber && styles.dayCardActive
                ]}
              >
                <Text style={[styles.dayNameText, selectedDay === item.dayNumber && styles.textWhite]}>{item.dayName}</Text>
                <Text style={[styles.dayNumberText, selectedDay === item.dayNumber && styles.textWhite]}>{item.dayNumber}</Text>
                {isHoliday && <View style={styles.holidayDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.divider} />

        {loading ? (
          <ActivityIndicator size="large" color="#0f172a" />
        ) : (
          <>
            <View style={styles.holidayCard}>
              <View>
                <Text style={styles.cardTitle}>Mark as Holiday</Text>
                <Text style={styles.cardSubtitle}>Block all bookings for {selectedDay} {MONTHS[selectedMonthIndex]}</Text>
              </View>
              <Switch 
                value={currentData.is_holiday || false} 
                onValueChange={toggleHoliday}
                trackColor={{ false: "#cbd5e1", true: "#ef4444" }}
              />
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
               <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#fef2f2', borderColor: '#ef4444'}]} /><Text style={styles.legendText}>Blocked by You</Text></View>
               <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#e0f2fe', borderColor: '#0ea5e9'}]} /><Text style={styles.legendText}>Customer Booking</Text></View>
            </View>
            
            <View style={[styles.grid, currentData.is_holiday && { opacity: 0.3 }]}>
              {timeSlots.map((slot, index) => {
                const isAdminBlocked = (currentData.blocked_slots || []).includes(slot);
                const isCustomerBooked = bookedSlots.includes(slot);

                // Admin Block takes visual precedence if both exist, but usually they shouldn't overlap
                
                return (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => toggleSlot(slot)}
                    disabled={currentData.is_holiday}
                    style={[
                      styles.slot,
                      isAdminBlocked ? styles.slotBlocked : 
                      isCustomerBooked ? styles.slotBooked : 
                      styles.slotAvailable
                    ]}
                  >
                    <Text style={[
                      styles.slotText, 
                      isAdminBlocked ? styles.textBlocked : 
                      isCustomerBooked ? styles.textBooked : 
                      styles.textAvailable
                    ]}>
                      {slot}
                    </Text>
                    
                    {isAdminBlocked && <Ionicons name="close-circle" size={16} color="#ef4444" style={styles.blockedIcon} />}
                    {isCustomerBooked && !isAdminBlocked && <Ionicons name="person" size={14} color="#0284c7" style={styles.blockedIcon} />}
                    
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
        
        <View style={{height: 100}} />
      </ScrollView>

      {/* MODALS (Kept same as before) */}
      <Modal visible={showYearModal} transparent animationType="fade" onRequestClose={() => setShowYearModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Year</Text>
            <ScrollView style={{maxHeight: 300, width: '100%'}}>
              {YEARS.map((year) => (
                <TouchableOpacity key={year} style={styles.modalItem} onPress={() => { setSelectedYear(year); setShowYearModal(false); }}>
                  <Text style={[styles.modalItemText, selectedYear === year && {color: '#0f172a', fontWeight: 'bold'}]}>{year}</Text>
                  {selectedYear === year && <Ionicons name="checkmark" size={18} color="#0f172a" />}
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
              {MONTHS.map((month, index) => (
                <TouchableOpacity key={month} style={styles.modalItem} onPress={() => { setSelectedMonthIndex(index); setShowMonthModal(false); }}>
                  <Text style={[styles.modalItemText, selectedMonthIndex === index && {color: '#0f172a', fontWeight: 'bold'}]}>{month}</Text>
                  {selectedMonthIndex === index && <Ionicons name="checkmark" size={18} color="#0f172a" />}
                </TouchableOpacity>
              ))}
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
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  dateSelectorsRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  selectorPill: { flex: 1, flexDirection: 'row', backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0' },
  selectorText: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  dayScroll: { flexDirection: 'row', marginBottom: 5 },
  dayCard: { width: 50, height: 60, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  dayCardActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  dayNameText: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  dayNumberText: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  textWhite: { color: 'white' },
  holidayDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#ef4444' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },
  holidayCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  legendRow: { flexDirection: 'row', marginBottom: 15, gap: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, marginRight: 6 },
  legendText: { fontSize: 12, color: '#64748b' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '30%', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, justifyContent: 'center' },
  
  // Slot Variants
  slotAvailable: { backgroundColor: 'white', borderColor: '#cbd5e1' },
  slotBlocked: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  slotBooked: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' }, // 🔵 Blue for customers

  slotText: { fontSize: 12, fontWeight: '600' },
  textAvailable: { color: '#334155' },
  textBlocked: { color: '#ef4444', textDecorationLine: 'line-through' },
  textBooked: { color: '#0284c7' }, // 🔵 Blue Text

  blockedIcon: { position: 'absolute', top: 2, right: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  modalItem: { width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#334155' },
  closeButton: { marginTop: 15, padding: 10 },
  closeText: { color: '#ef4444', fontWeight: '600', fontSize: 16 }
});