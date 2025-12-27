import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

const CATEGORIES = ["Domestic", "Commercial", "Industrial", "Spares"];

export default function EditProduct() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Get the ID passed from the list

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [inStock, setInStock] = useState(true);

  // 📥 Fetch Existing Details
  useEffect(() => {
    const fetchDetails = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        Alert.alert("Error", "Could not fetch product details");
        router.back();
        return;
      }

      setName(data.name);
      setPrice(data.price.toString());
      setCategory(data.category);
      setDescription(data.description);
      setImage(data.image_url);
      setInStock(data.in_stock);
      setLoading(false);
    };

    fetchDetails();
  }, [id]);

  // 📸 Pick New Image
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // ☁️ Helper: Upload Image
  const uploadImage = async (uri: string) => {
    try {
      const fileName = `${Date.now()}.png`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, blob, { contentType: 'image/png' });

      if (error) throw error;

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      return null;
    }
  };

  // 💾 Update Database
  const handleUpdate = async () => {
    setSaving(true);
    try {
      let finalImageUrl = image;

      // Only upload if the image is a local URI (newly picked)
      if (image && image.startsWith('file://')) {
        const uploadedUrl = await uploadImage(image);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const { error } = await supabase
        .from('products')
        .update({
          name,
          price: parseFloat(price),
          category,
          description,
          image_url: finalImageUrl,
          in_stock: inStock
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert("Success", "Product updated!", [{ text: "OK", onPress: () => router.back() }]);

    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#334155']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Product</Text>
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
              <Text style={styles.imageText}>Tap to change image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Stock Toggle */}
        <View style={styles.switchRow}>
          <Text style={styles.label}>Available in Stock?</Text>
          <Switch 
            value={inStock} 
            onValueChange={setInStock}
            trackColor={{false: '#cbd5e1', true: '#2563eb'}}
          />
        </View>

        {/* Inputs */}
        <View style={styles.section}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Price (₹)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat} onPress={() => setCategory(cat)}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={description} onChangeText={setDescription} 
            multiline numberOfLines={4} textAlignVertical="top" 
          />
        </View>

        <TouchableOpacity onPress={handleUpdate} style={[styles.saveButton, saving && { opacity: 0.7 }]} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Update Product</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },

  formContainer: { padding: 20 },
  imagePicker: { height: 200, backgroundColor: 'white', borderRadius: 16, marginBottom: 25, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: { alignItems: 'center' },
  imageText: { color: '#94a3b8', marginTop: 10 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, color: '#1e293b' },
  textArea: { height: 100 },

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  categoryChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  categoryText: { color: '#64748b', fontWeight: '600' },
  categoryTextActive: { color: 'white' },

  saveButton: { backgroundColor: '#2563eb', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});