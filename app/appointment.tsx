import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Stethoscope, Clock, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../constants/theme';
import { appointmentService } from '../services/api';
import { AnimatedCard } from '../components/AnimatedCard';

const TIME_SLOTS = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00"
];

export default function AppointmentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Data state
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  
  // Selection state
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  
  // Date and Time (default to tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState<Date>(tomorrow);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await appointmentService.getAvailableDoctors();
      const doctors = res.doctors || [];
      setAllDoctors(doctors);
      
      const specs = [...new Set(doctors.map((d: any) => d.specialization))] as string[];
      setSpecializations(specs);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
      Alert.alert("Error", "Could not load available doctors.");
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = selectedSpec 
    ? allDoctors.filter(d => d.specialization === selectedSpec)
    : [];

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleBook = async () => {
    if (!selectedDoctor || !selectedTimeSlot) {
      Alert.alert("Missing Details", "Please select a doctor and time slot.");
      return;
    }

    try {
      setSubmitting(true);
      // Format date to YYYY-MM-DD
      const dateStr = date.toISOString().split('T')[0];
      
      await appointmentService.requestAppointment({
        doctor_id: selectedDoctor.doctor_id,
        hospital_id: selectedDoctor.hospital_id,
        appointment_date: dateStr,
        time_slot: selectedTimeSlot
      });
      
      Alert.alert("Success", "Appointment requested successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.response?.data?.error || "Failed to book appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={COLORS.text.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading availability...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Step 1: Specialization */}
          <Text style={styles.sectionTitle}>1. Select Specialization</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
            {specializations.map((spec, idx) => {
              const isSelected = selectedSpec === spec;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.pill, isSelected && styles.pillActive]}
                  onPress={() => {
                    setSelectedSpec(spec);
                    setSelectedDoctor(null); // reset doctor
                  }}
                >
                  <Stethoscope size={16} color={isSelected ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{spec}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Step 2: Doctor */}
          {selectedSpec && (
            <>
              <Text style={styles.sectionTitle}>2. Choose Doctor</Text>
              {filteredDoctors.length === 0 ? (
                <Text style={styles.emptyText}>No doctors available for this specialization.</Text>
              ) : (
                filteredDoctors.map((doc, idx) => {
                  const isSelected = selectedDoctor?.doctor_id === doc.doctor_id;
                  return (
                    <AnimatedCard 
                      key={idx} 
                      style={[styles.doctorCard, isSelected && styles.doctorCardActive]}
                      onPress={() => setSelectedDoctor(doc)}
                    >
                      <View style={styles.docAvatar}>
                        <User size={24} color={isSelected ? COLORS.white : COLORS.primary} />
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={[styles.docName, isSelected && { color: COLORS.primary }]}>
                          Dr. {doc.doctor_name}
                        </Text>
                        <Text style={styles.docHospital}>{doc.hospital_name}</Text>
                      </View>
                      {isSelected && <CheckCircle2 size={24} color={COLORS.primary} />}
                    </AnimatedCard>
                  );
                })
              )}
            </>
          )}

          {/* Step 3: Date & Time */}
          {selectedDoctor && (
            <>
              <Text style={styles.sectionTitle}>3. Select Date & Time</Text>
              
              <View style={styles.datePickerContainer}>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <CalendarIcon size={20} color={COLORS.primary} />
                  <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={new Date()} // don't allow past dates
                    onChange={handleDateChange}
                  />
                )}
              </View>

              <View style={styles.slotsGrid}>
                {TIME_SLOTS.map((slot, idx) => {
                  const isSelected = selectedTimeSlot === slot;
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.slotCard, isSelected && styles.slotCardActive]}
                      onPress={() => setSelectedTimeSlot(slot)}
                    >
                      <Clock size={16} color={isSelected ? COLORS.white : COLORS.text.secondary} />
                      <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

        </ScrollView>
      )}

      {/* Bottom Action Bar */}
      {!loading && selectedDoctor && selectedTimeSlot && (
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.bookBtn} 
            onPress={handleBook}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.bookBtnText}>Confirm Appointment</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.soft,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 100, // space for bottom bar
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  hScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: ROUNDING.full,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  pillTextActive: {
    color: COLORS.white,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: ROUNDING.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOWS.soft,
  },
  doctorCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  docAvatar: {
    width: 48,
    height: 48,
    borderRadius: ROUNDING.full,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  docHospital: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  datePickerContainer: {
    marginBottom: SPACING.md,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: ROUNDING.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  slotCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: ROUNDING.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
    justifyContent: 'center',
  },
  slotCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  slotTextActive: {
    color: COLORS.white,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...SHADOWS.medium,
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: ROUNDING.lg,
    alignItems: 'center',
  },
  bookBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
