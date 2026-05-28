import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, useWindowDimensions, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, getHeaders } from '../../constants/API';

export default function ShopScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todos']);
  const [loading, setLoading] = useState(true);
  const [isCartVisible, setCartVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [description, setDescription] = useState('');
  const [destinationEmails, setDestinationEmails] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [isDestPickerVisible, setDestPickerVisible] = useState(false);

  useEffect(() => {
    loadUser();
    fetchData();
  }, []);

  const loadUser = async () => {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      setCurrentUser(user.username);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/shop/dashboard`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setCategories(['Todos', ...data.categories.map(c => c.name)]);
        setDestinationEmails(data.destination_emails || []);
      }
    } catch (e) {
      alert('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory === 'Todos' 
    ? products 
    : products.filter(p => p.category_name === selectedCategory);

  const addToCart = (product) => {
    setCart([...cart, { ...product, cartId: Date.now() + Math.random() }]);
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const handleCheckout = async () => {
    if (destinationEmails.length > 0 && !selectedDestination) {
      alert('Por favor selecciona un destinatario.');
      return;
    }

    try {
      await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          username: currentUser || 'Usuario', 
          items: cart,
          status: 'Pendiente',
          date: new Date().toLocaleString(),
          description: description,
          target_email: selectedDestination ? selectedDestination.email : null
        })
      });
      alert('¡Pedido realizado con éxito!');
      setCart([]);
      setDescription('');
      setSelectedDestination(null);
      setCartVisible(false);
      fetchData(); // Recargar productos para actualizar la última fecha de pedido al instante
    } catch (e) {
      alert('Error al realizar el pedido');
    }
  };

  const formatLastOrder = (lastOrder) => {
    if (!lastOrder || !lastOrder.date) return '';
    try {
      const { username, date } = lastOrder;
      const parts = date.split(', ');
      const day = parts[0];
      let time = parts[1] || '';
      if (time) {
        const timeParts = time.split(':');
        if (timeParts.length >= 2) {
          time = `${timeParts[0]}:${timeParts[1]}`;
        }
      } else {
        const spaceParts = date.split(' ');
        if (spaceParts.length >= 2) {
          const possibleDay = spaceParts[0];
          const possibleTime = spaceParts[1];
          const timeParts = possibleTime.split(':');
          if (timeParts.length >= 2) {
            return `Último pedido: por ${username} a las ${timeParts[0]}:${timeParts[1]} del día ${possibleDay}`;
          }
        }
      }
      return `Último pedido: por ${username} a las ${time || '00:00'} del día ${day}`;
    } catch (e) {
      return `Último pedido: por ${lastOrder.username} el ${lastOrder.date}`;
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      ) : (
        <View style={styles.productImage}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E7EB' }}>
            <MaterialCommunityIcons name="package-variant" size={40} color="#9CA3AF" />
          </View>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category_name}</Text>
        {item.last_order ? (
          <Text style={styles.lastOrderText}>
            {formatLastOrder(item.last_order)}
          </Text>
        ) : (
          <Text style={[styles.lastOrderText, { color: '#9CA3AF' }]}>
            Nunca pedido
          </Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.addButtonGradient}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
      }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1F2937' }}>CIMA</Text>
          {currentUser ? <Text style={{ color: '#10B981', fontSize: 14 }}>Hola, {currentUser}</Text> : null}
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.categoryPill, selectedCategory === item && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        contentContainerStyle={styles.productList}
        columnWrapperStyle={styles.row}
      />

      {cart.length > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => setCartVisible(true)}>
          <View style={styles.cartInfo}>
            <MaterialCommunityIcons name="cart" size={24} color="#FFF" />
            <Text style={styles.cartText}>{cart.length} artículos</Text>
          </View>
          <View style={styles.checkoutButton}>
            <Text style={styles.checkoutText}>Ver Carrito</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Modal del Carrito */}
      <Modal
        visible={isCartVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCartVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.cartModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tu Carrito</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={cart}
              keyExtractor={(item) => item.cartId.toString()}
              renderItem={({ item }) => (
                <View style={styles.cartItem}>
                  <Image source={{ uri: item.image || 'https://via.placeholder.com/50' }} style={styles.cartItemImage} />
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemCategory}>{item.category_name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(item.cartId)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>El carrito está vacío</Text>
              }
            />

            {destinationEmails.length > 0 && (
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>Seleccionar Destinatario:</Text>
                <TouchableOpacity 
                  style={styles.destPickerButton} 
                  onPress={() => setDestPickerVisible(true)}
                >
                  <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" />
                  <Text style={styles.destPickerText}>
                    {selectedDestination ? `${selectedDestination.name} (${selectedDestination.email})` : 'Elige a quién enviar'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionLabel}>Descripción / Notas (opcional):</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Escribe aquí cualquier aclaración sobre tu pedido..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.cartFooter}>
              <TouchableOpacity 
                style={[styles.mainButton, cart.length === 0 && { opacity: 0.5 }]} 
                onPress={handleCheckout}
                disabled={cart.length === 0}
              >
                <Text style={styles.mainButtonText}>Confirmar Pedido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para el selector de destinatarios */}
      <Modal
        visible={isDestPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDestPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.destPickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Destinatarios</Text>
              <TouchableOpacity onPress={() => setDestPickerVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={destinationEmails}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.destPickerItem} 
                  onPress={() => {
                    setSelectedDestination(item);
                    setDestPickerVisible(false);
                  }}
                >
                  <Text style={[
                    styles.destPickerItemText,
                    selectedDestination?.id === item.id && { color: '#10B981', fontWeight: 'bold' }
                  ]}>
                    {item.name || 'Sin nombre'} ({item.email})
                  </Text>
                  {selectedDestination?.id === item.id && (
                    <MaterialCommunityIcons name="check" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  categoryContainer: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 5,
  },
  categoryPillActive: {
    backgroundColor: '#10B981',
  },
  categoryText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  productList: {
    padding: 8,
    paddingBottom: 100, // Space for floating cart
  },
  row: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 15,
    marginHorizontal: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 260, // Aumentado para que quepa la información de última vez pedido
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#E5E7EB',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  lastOrderText: {
    fontSize: 10,
    color: '#3B82F6', // Azul profesional CIMA
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 14,
    marginBottom: 10,
  },
  addButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCart: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#111827',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  checkoutButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  checkoutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start', // Mover a la parte superior
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  cartModalContent: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cartItemCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  cartFooter: {
    marginTop: 20,
    paddingBottom: 20,
  },
  mainButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 16,
  },
  descriptionSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    textAlignVertical: 'top',
    height: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  destPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  destPickerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  destPickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  destPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  destPickerItemText: {
    fontSize: 16,
    color: '#374151',
  }
});
