import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert, // Keep Alert for basic confirmation/errors if custom modal is not desired everywhere
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal, // Import Modal for custom alert/confirmation
  TextInput, // For proposed price and design type
  FlatList, // Explicitly import FlatList
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // For fetching user ID
import { API_BASE_URL } from './config'; // Make sure this points to your backend URL

// Base URL for cart API (updated to be flexible)
const CART_API_URL = `${API_BASE_URL}/cart`;

export default function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  // State for bidding modal
  const [isBiddingModalVisible, setBiddingModalVisible] = useState(false);
  const [customerProposedPrice, setCustomerProposedPrice] = useState('');
  const [designType, setDesignType] = useState('Custom'); // Default design type
  const [currentUserId, setCurrentUserId] = useState(null);

  // Custom Alert Modal state
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');


  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertModalVisible(true);
  };

  const getUserId = useCallback(async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        setCurrentUserId(storedUserId);
      } else {
        // Handle case where userId is not found, maybe navigate to AuthScreen
        showAlert('Authentication Error', 'User not logged in. Please log in again.');
        navigation.navigate('Auth'); // Navigate to AuthScreen
      }
    } catch (e) {
      console.error('Failed to get userId from AsyncStorage:', e);
      showAlert('Error', 'Failed to retrieve user data. Please try again.');
    }
  }, [navigation]);

  // Fetch cart items from the backend
  const fetchCartItems = useCallback(async () => {
    console.log('Fetching cart items...');
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(CART_API_URL);
      console.log('Backend cart response data:', response.data);
      // Ensure each item has a quantity property for local state management
      const items = response.data.map(item => ({ ...item, quantity: item.quantity || 1 }));
      setCartItems(items);
      console.log('Cart items state updated:', items);
    } catch (err) {
      console.error('Error fetching cart items:', err.response ? err.response.data : err.message);
      setError('Failed to load cart. Please try again later.');
      showAlert('Cart Load Error', 'Failed to load cart items. Please check your network and backend server.');
    } finally {
      setLoading(false);
      setRefreshing(false); // Stop refreshing indicator
      console.log('Cart loading finished.');
    }
  }, []);

  useEffect(() => {
    getUserId(); // Get user ID on component mount
  }, [getUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchCartItems();
      return () => {
        // Optional: cleanup or reset state if needed when screen loses focus
      };
    }, [fetchCartItems])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCartItems();
  }, [fetchCartItems]);

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 1) return; // Prevent quantity from going below 1

    const updatedCart = cartItems.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedCart);

    try {
      await axios.put(`${CART_API_URL}/${productId}`, { quantity: newQuantity });
      console.log(`Updated quantity for product ${productId} to ${newQuantity}`);
    } catch (error) {
      console.error('Error updating quantity on backend:', error.response ? error.response.data : error.message);
      showAlert('Error', 'Failed to update item quantity.');
      // Revert local state if backend update fails
      fetchCartItems(); // Re-fetch to ensure consistency
    }
  };

  const handleRemoveItem = async (productId) => {
    // Using a custom modal instead of Alert.alert for consistency
    showAlert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      () => { // Callback for 'OK' or 'Remove'
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
        axios.delete(`${CART_API_URL}/${productId}`)
          .then(() => showAlert('Success', 'Item removed from cart!'))
          .catch(error => {
            console.error('Error removing item from backend:', error.response ? error.response.data : error.message);
            showAlert('Error', 'Failed to remove item from cart.');
            fetchCartItems(); // Re-fetch to sync state
          });
      },
      true // Indicates it's a confirmation type alert
    );
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleApplyBid = async () => {
    if (!currentUserId) {
        showAlert('Error', 'User not logged in. Cannot apply bid.');
        return;
    }
    if (cartItems.length === 0) {
        showAlert('Error', 'Your cart is empty. Add items before applying a bid.');
        return;
    }
    if (!customerProposedPrice || parseFloat(customerProposedPrice) <= 0) {
        showAlert('Error', 'Please enter a valid proposed price for your bid.');
        return;
    }

    setLoading(true);
    try {
        const bidData = {
            userId: currentUserId, // Your authenticated user ID
            orderItems: cartItems.map(item => ({
                productId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
                manufacturerId: item.manufacturerId, // Ensure manufacturerId is available in cart items
            })),
            customerProposedPrice: parseFloat(customerProposedPrice),
            designType: designType,
        };

        // Call the /api/orders endpoint, which now triggers bid creation
        const response = await axios.post(`${API_BASE_URL}/orders`, bidData); // Check your config.js for API_BASE_URL
        console.log('Bid application response:', response.data);
        showAlert('Bid Submitted', response.data.message);
        setBiddingModalVisible(false); // Close the modal
        setCartItems([]); // Clear cart after successful bid submission
        setCustomerProposedPrice(''); // Reset price field
        setDesignType('Custom'); // Reset design type

        // Navigate to CustomerDashboard to see pending bids
        navigation.navigate('CustomerDashboard');

    } catch (error) {
        console.error('Error applying bid:', error.response ? error.response.data : error.message);
        const errorMessage = error.response && error.response.data && error.response.data.message
                             ? error.response.data.message
                             : 'Failed to submit your bid. Please try again.';
        showAlert('Bid Error', errorMessage);
    } finally {
        setLoading(false);
    }
  };


  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Image source={{ uri: item.image || 'https://via.placeholder.com/100' }} style={styles.productImage} />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>Rs.{item.price.toFixed(2)}</Text>
        <Text style={styles.itemManufacturer}>Mfg ID: {item.manufacturerId}</Text>
      </View>
      <View style={styles.quantityContainer}>
        <TouchableOpacity onPress={() => handleQuantityChange(item.id, item.quantity - 1)} style={styles.quantityButton}>
          <Ionicons name="remove-circle-outline" size={24} color="#e91e63" />
        </TouchableOpacity>
        <Text style={styles.itemQuantity}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => handleQuantityChange(item.id, item.quantity + 1)} style={styles.quantityButton}>
          <Ionicons name="add-circle-outline" size={24} color="#e91e63" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleRemoveItem(item.id)} style={styles.removeButton}>
          <Ionicons name="trash-outline" size={24} color="#dc3545" />
        </TouchableOpacity>
      </View>
    </View>
  );

  console.log('Rendering Cart: loading=', loading, 'error=', error, 'cartItems.length=', cartItems.length);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#e91e63" />
        </TouchableOpacity>
        <Text style={styles.title}>Your Cart</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !refreshing && cartItems.length === 0 ? ( // Only show loading if genuinely loading and no items
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e91e63" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchCartItems} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.emptyCartContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyCartText}>Your cart is empty!</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CustomerDashboard')} style={styles.browseButton}>
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e91e63']} />
          }
        >
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false} // Disable FlatList's own scrolling, let ScrollView handle it
          />

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>Rs.{calculateSubtotal().toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>Rs.{calculateSubtotal().toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {cartItems.length > 0 && !loading && (
        <TouchableOpacity
          style={styles.orderButton}
          onPress={() => setBiddingModalVisible(true)} // Open bidding modal
        >
          <Text style={styles.orderText}>Apply Bid for Order</Text>
        </TouchableOpacity>
      )}

      {/* Bidding Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isBiddingModalVisible}
        onRequestClose={() => setBiddingModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Apply Order to Manufacturers</Text>
            <Text style={styles.modalText}>Your cart total is: Rs.{calculateSubtotal().toFixed(2)}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Your Proposed Price (e.g., 500)"
              keyboardType="numeric"
              value={customerProposedPrice}
              onChangeText={setCustomerProposedPrice}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Design Type (e.g., Custom, Predefined)"
              value={designType}
              onChangeText={setDesignType}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={() => setBiddingModalVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={handleApplyBid}
              >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.primaryButtonText}>Submit Bid</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertModalVisible}
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{alertTitle}</Text>
            <Text style={styles.modalText}>{alertMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.primaryButton]}
              onPress={() => setAlertModalVisible(false)}
            >
              <Text style={styles.primaryButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 3,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
    resizeMode: 'cover',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 15,
    color: '#e91e63',
    fontWeight: 'bold',
  },
  itemManufacturer: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    padding: 5,
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 8,
    color: '#333',
  },
  removeButton: {
    marginLeft: 10,
    padding: 5,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
    marginTop: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#555',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e91e63',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e91e63',
  },
  orderButton: {
    backgroundColor: '#e91e63',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 15,
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  orderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#e91e63',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#e91e63',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    padding: 20,
  },
  emptyCartText: {
    fontSize: 22,
    color: '#888',
    marginTop: 20,
    fontWeight: 'bold',
  },
  browseButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 30,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles (for Bidding and Custom Alert)
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Dim background
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    width: '90%', // Responsive width
    maxWidth: 400, // Max width for larger screens
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#rgba(215, 6, 100, 0.6)', // Primary theme color
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(215, 6, 100, 0.6)',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
