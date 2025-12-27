import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

export default function Landing() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = () => {
    if (password === '6263') { 
      setModalVisible(false);
      setPassword('');
      setError('');
      router.push('/(admin)/dashboard');
    } else {
      setError('Incorrect PIN');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 1. BACKGROUND IMAGE - Forced to fill screen */}
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=1588&auto=format&fit=crop' }} 
        style={styles.background}
        resizeMode="cover"
      >
        {/* 2. GRADIENT OVERLAY */}
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.6)', 'rgba(30, 58, 138, 0.9)']}
          style={styles.gradient}
        />

        <View style={styles.contentContainer}>
          
          {/* 3. LOGO SECTION */}
          <Animatable.View animation="fadeInDown" duration={1500} style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="water" size={56} color="#60a5fa" />
            </View>
            <Text style={styles.titleText}>BHARATH</Text>
            <Text style={styles.subtitleText}>WATER SOLUTIONS</Text>
          </Animatable.View>

          {/* 4. BUTTONS SECTION */}
          <Animatable.View animation="fadeInUp" delay={500} style={styles.buttonSection}>
            <TouchableOpacity 
              onPress={() => router.push('/(user)/home')}
              activeOpacity={0.9}
              style={styles.mainButton}
            >
              <Text style={styles.mainButtonText}>Browse Catalog</Text>
              <Ionicons name="arrow-forward" size={20} color="#0f172a" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.adminLink}>
              <Text style={styles.adminLinkText}>Admin / Partner Login</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </ImageBackground>

      {/* 5. MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalKeyboardAvoid}
        >
          <View style={styles.modalBackdrop} onTouchEnd={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Admin Access</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="0000"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            {error ? <Text style={{color: 'red', marginBottom: 10}}>{error}</Text> : null}
            <TouchableOpacity onPress={handleAdminLogin} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// 🛡️ FAIL-SAFE STYLES (Guarantees layout works)
const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, width: width, height: height, justifyContent: 'center', alignItems: 'center' },
  gradient: { ...StyleSheet.absoluteFillObject },
  contentContainer: { width: '100%', paddingHorizontal: 30, alignItems: 'center', zIndex: 10 },
  
  logoSection: { alignItems: 'center', marginBottom: 60 },
  logoCircle: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20 
  },
  titleText: { fontSize: 42, fontWeight: '800', color: 'white', letterSpacing: 2 },
  subtitleText: { color: '#bfdbfe', fontSize: 14, letterSpacing: 4, marginTop: 5, fontWeight: '600' },

  buttonSection: { width: '100%', gap: 20 },
  mainButton: { 
    backgroundColor: 'white', flexDirection: 'row', 
    justifyContent: 'center', alignItems: 'center', 
    paddingVertical: 18, borderRadius: 16,
    shadowColor: '#1e3a8a', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 4
  },
  mainButtonText: { color: '#0f172a', fontWeight: 'bold', fontSize: 18, marginRight: 10 },
  
  adminLink: { marginTop: 15, alignItems: 'center' },
  adminLinkText: { color: 'rgba(191, 219, 254, 0.6)', fontSize: 14, fontWeight: '500' },

  modalKeyboardAvoid: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', marginBottom: 20 },
  pinInput: { 
    backgroundColor: '#f1f5f9', borderRadius: 12, padding: 15, 
    fontSize: 24, textAlign: 'center', letterSpacing: 10, marginBottom: 20 
  },
  modalButton: { backgroundColor: '#0f172a', padding: 16, borderRadius: 12, alignItems: 'center' },
  modalButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});