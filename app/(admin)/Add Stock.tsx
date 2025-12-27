import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase'; // 👈 Import your connection

const CATEGORIES = ["Domestic", "Commercial", "Industrial", "Spares"];

export default function AddStock() {
  const router = useRouter();

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  
  // ⏳ Loading State
  const [loading, setLoading] = useState(false);

  // 📸 Pick Image
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Keep quality lower for faster uploads
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // ☁️ Helper: Upload Image to Supabase
  const uploadImage = async (uri: string) => {
    try {
      // 1. Create a unique file name (e.g., 17098234.png)
      const fileName = `${Date.now()}.png`;

      // 2. Convert URI to Blob (Standard Expo method)
      const response = await fetch(uri);
      const blob = await response.blob();

      // 3. Upload to 'product-images' bucket
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
        });

      if (error) throw error;

      // 4. Get the Public URL so users can see it
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;

    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("Upload Failed", "Could not upload image.");
      return null;
    }
  };

  // 💾 Save to Database
  const handleSave = async () => {
    if (!name || !price || !description) {
      Alert.alert("Missing Details", "Please fill in Name, Price, and Description.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // 1. If an image is selected, upload it first
      if (image) {
        imageUrl = await uploadImage(image);
        if (!imageUrl) {
          setLoading(false);
          return; // Stop if upload failed
        }
      }

      // 2. Insert into Products Table
      const { error } = await supabase
        .from('products')
        .insert([{
          name,
          price: parseFloat(price),
          category,
          description,
          image_url: imageUrl, // Save the Supabase URL
          in_stock: true
        }]);

      if (error) throw error;

      Alert.alert("Success", "Product added to inventory!", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
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
          <Text style={styles.headerTitle}>Add New Product</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.formContainer}>
        
        {/* Image Picker */}
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#94a3b8" />
              <Text style={styles.imageText}>Tap to upload product image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Inputs */}
        <View style={styles.section}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Bharath RO Premier" 
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Price (₹)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="12500" 
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat} 
                onPress={() => setCategory(cat)}
                style={[
                  styles.categoryChip, 
                  category === cat && styles.categoryChipActive
                ]}
              >
                <Text style={[
                  styles.categoryText, 
                  category === cat && styles.categoryTextActive
                ]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Enter product details..." 
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Save Button (With Spinner) */}
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveButton, loading && { opacity: 0.7 }]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save to Inventory</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },

  formContainer: { padding: 20 },
  imagePicker: { 
    height: 200, backgroundColor: 'white', borderRadius: 16, 
    marginBottom: 25, overflow: 'hidden', 
    borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center'
  },
  imagePlaceholder: { alignItems: 'center' },
  imageText: { color: '#94a3b8', marginTop: 10 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { 
    backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', 
    borderRadius: 12, padding: 16, fontSize: 16, color: '#1e293b' 
  },
  textArea: { height: 100 },

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: { 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, 
    backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' 
  },
  categoryChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  categoryText: { color: '#64748b', fontWeight: '600' },
  categoryTextActive: { color: 'white' },

  saveButton: { 
    backgroundColor: '#2563eb', padding: 18, borderRadius: 16, 
    alignItems: 'center', marginTop: 10,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});