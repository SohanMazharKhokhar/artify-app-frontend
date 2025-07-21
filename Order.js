import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Modal, // For custom alert messages
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios'; // For potentially fetching accepted bid details
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, SOCKET_SERVER_URL } from './config'; // Import URLs

// Base URL for orders API
const ORDERS_API_URL = `${API_BASE_URL}/orders`;
const BIDS_API_URL = `${API_BASE_URL}/bids`; // New Bids API URL

export default function Order() {
  const navigation = useNavigation();
  const route = useRoute();
  const { bidDetails, bidId } = route.params || {}; // Expecting bidDetails or bidId now
  const [orderDetails, setOrderDetails] = useState(bidDetails); // Use bidDetails as orderDetails for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        showAlert('Authentication Error', 'User not logged in. Please log in again.');
        navigation.navigate('Auth');
      }
    } catch (e) {
      console.error('Failed to get userId from AsyncStorage:', e);
      showAlert('Error', 'Failed to retrieve user data. Please try again.');
    }
  }, [navigation]);

  // Function to fetch order details (if only bidId is passed)
  const fetchOrderDetails = useCallback(async () => {
    if (!bidId) {
      setError('No bid ID provided to display order details.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch the accepted bid details
      const response = await axios.get(`${BIDS_API_URL}/customer/${currentUserId}`); // Fetch all customer bids
      const foundBid = response.data.find(bid => bid._id === bidId && bid.status === 'Customer Accepted');
      if (foundBid) {
        setOrderDetails(foundBid);
      } else {
        setError('Accepted bid details not found or bid not yet finalized.');
      }
    } catch (err) {
      console.error('Error fetching accepted bid details:', err);
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [bidId, currentUserId]);

  useEffect(() => {
    getUserId();
  }, [getUserId]);

  useEffect(() => {
    if (currentUserId && bidId && !bidDetails) {
      fetchOrderDetails();
    } else if (bidDetails) {
        setLoading(false); // If bidDetails were directly passed, no need to load
    }
  }, [currentUserId, bidId, bidDetails, fetchOrderDetails]);


  // Determine the chat room ID for accepted bids
  const getChatRoomId = (customerId, manufacturerId) => {
    // Ensure consistent chat room ID by sorting participants' IDs
    const participants = [customerId, manufacturerId].sort();
    return `${participants[0]}_${participants[1]}`;
  };

  const handleChatPress = () => {
    if (orderDetails && orderDetails.status === 'Customer Accepted' && orderDetails.acceptedManufacturerId) {
      const chatRoomId = getChatRoomId(orderDetails.customerId, orderDetails.acceptedManufacturerId);
      navigation.navigate('ChatScreen', {
        chatRoomId: chatRoomId,
        senderId: orderDetails.customerId, // Customer is the sender
        receiverId: orderDetails.acceptedManufacturerId, // Accepted Manufacturer is the receiver
        // Optionally pass names for display in chat header
        senderName: orderDetails.customerName,
        receiverName: orderDetails.manufacturerResponses.find(
            res => res.manufacturerId === orderDetails.acceptedManufacturerId
        )?.manufacturerName || 'Manufacturer',
      });
    } else {
      showAlert('Chat Unavailable', 'Chat can only be initiated for accepted bids with a selected manufacturer.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !orderDetails) {
    return (
      <View style={styles.emptyOrderContainer}>
        <Ionicons name="close-circle-outline" size={80} color="#dc3545" />
        <Text style={styles.emptyOrderText}>{error || "No order details found or bid not yet finalized."}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.browseButton}>
            <Text style={styles.browseButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6C63FF" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Summary</Text>
        <View style={{ width: 24 }} /> {/* Spacer for alignment */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {orderDetails.status === 'Customer Accepted' && orderDetails.finalPrice !== null ? (
          <>
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={styles.statusText}>Bid Accepted!</Text>
              <Text style={styles.statusSubtext}>Your custom order is being processed.</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Details</Text>
              <Text style={styles.detailText}>Bid ID: {orderDetails._id}</Text>
              <Text style={styles.detailText}>Proposed Design: {orderDetails.designType}</Text>
              <Text style={styles.detailText}>Accepted Price: Rs.{orderDetails.finalPrice?.toFixed(2)}</Text>
              <Text style={styles.detailText}>Accepted By: {orderDetails.manufacturerResponses.find(res => res.manufacturerId === orderDetails.acceptedManufacturerId)?.manufacturerName || 'N/A'}</Text>
              <Text style={styles.detailText}>Date: {new Date(orderDetails.createdAt).toLocaleDateString()}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items in Bid</Text>
              {orderDetails.orderItems.map((item, index) => (
                <View key={index} style={styles.orderItemCard}>
                  <Image source={{ uri: item.image || 'https://via.placeholder.com/80' }} style={styles.itemImage} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQuantityPrice}>{item.quantity} x Rs.{item.price?.toFixed(2)}</Text>
                    <Text style={styles.itemManufacturer}>Mfg: {item.manufacturerId}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyOrderContainer}>
            <Ionicons name="information-circle-outline" size={80} color="#FFC107" />
            <Text style={styles.emptyOrderText}>Bid Status: {orderDetails?.status || 'Unknown'}</Text>
            <Text style={styles.emptyOrderSubText}>This screen displays accepted bid details. Please check your "My Price" in Customer Dashboard for current bid statuses.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CustomerDashboard')} style={styles.browseButton}>
                <Text style={styles.browseButtonText}>Go to My Price</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {orderDetails?.status === 'Customer Accepted' && orderDetails.acceptedManufacturerId && (
        <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
          <Ionicons name="chatbubbles-outline" size={24} color="white" />
          <Text style={styles.chatButtonText}>Chat with Manufacturer</Text>
        </TouchableOpacity>
      )}

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
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 80, // Space for the chat button
  },
  statusContainer: {
    backgroundColor: '#e6ffe6', // Light green for success
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 5,
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    resizeMode: 'cover',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  itemQuantityPrice: {
    fontSize: 14,
    color: '#6C63FF',
    marginTop: 2,
  },
  itemManufacturer: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  chatButton: {
    backgroundColor: '#6C63FF', // Primary theme color for chat
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 16, // Match padding of scroll container
    marginBottom: 15, // Space from bottom
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    position: 'absolute', // Make it float at the bottom
    bottom: 0,
    left: 0,
    right: 0,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6C63FF',
  },
  emptyOrderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyOrderText: {
    fontSize: 20,
    color: '#888',
    marginTop: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyOrderSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  browseButton: { // Reused for "Go to My Price"
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
  // Modal Styles (for Custom Alert)
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
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#6C63FF', // Primary theme color
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
