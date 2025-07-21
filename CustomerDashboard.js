import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    StatusBar,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Modal, // For custom alert/confirmation
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client'; // Import Socket.IO client
import { API_BASE_URL, SOCKET_SERVER_URL } from './config'; // Import URLs

// Ensure socket is declared outside or managed globally
let socket;

export default function CustomerDashboard() {
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigation = useNavigation();
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserName, setCurrentUserName] = useState(''); // To get customer name for chat

    // State for Bids
    const [activeTab, setActiveTab] = useState('products'); // 'products' or 'myBids'
    const [customerBids, setCustomerBids] = useState([]);
    const [bidsLoading, setBidsLoading] = useState(false);
    const [bidsError, setBidsError] = useState(null);

    // Custom Alert Modal state
    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertTitle, setAlertTitle] = useState('');

    // New state for Product Action Modal
    const [productActionModalVisible, setProductActionModalVisible] = useState(false);
    const [selectedProductForAction, setSelectedProductForAction] = useState(null);

    const showAlert = (title, message) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertModalVisible(true);
    };

    const getUserIdAndName = useCallback(async () => {
        try {
            const storedUserId = await AsyncStorage.getItem('userId');
            const storedUserName = await AsyncStorage.getItem('userName');
            if (storedUserId && storedUserName) {
                setCurrentUserId(storedUserId);
                setCurrentUserName(storedUserName);
            } else {
                showAlert('Authentication Error', 'User data not found. Please log in.');
                navigation.navigate('Auth');
            }
        } catch (e) {
            console.error('Failed to get user data from AsyncStorage:', e);
            showAlert('Error', 'Failed to retrieve user data.');
        }
    }, [navigation]);

    // Fetch products from backend
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/products`);
            setAllProducts(response.data);
            setFilteredProducts(response.data);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch customer bids
    const fetchCustomerBids = useCallback(async () => {
        if (!currentUserId) return;
        setBidsLoading(true);
        setBidsError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/bids/customer/${currentUserId}`);
            setCustomerBids(response.data);
        } catch (err) {
            console.error('Error fetching customer bids:', err);
            setBidsError('Failed to load your bids. Please try again.');
        } finally {
            setBidsLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        getUserIdAndName(); // Get user ID and name on component mount
    }, [getUserIdAndName]);

    // Initial data fetch and focus effect for re-fetching
    useFocusEffect(
        useCallback(() => {
            fetchProducts();
            if (currentUserId) {
                fetchCustomerBids();
            }

            // Socket.IO setup for real-time bid updates
            socket = io(SOCKET_SERVER_URL);

            socket.on('connect', () => {
                console.log('Socket connected to CustomerDashboard.');
            });

            // Listen for bid updates relevant to this customer
            socket.on('bidUpdated', (updatedBid) => {
                console.log('Received bidUpdated event:', updatedBid);
                if (updatedBid.customerId === currentUserId) {
                    setCustomerBids(prevBids =>
                        prevBids.map(bid =>
                            bid._id === updatedBid._id ? updatedBid : bid
                        )
                    );
                    // Optionally show a notification for the updated bid
                    if (updatedBid.status === 'Manufacturer Countered' || updatedBid.status === 'Manufacturer Accepted') {
                        showAlert('Bid Update', `Your bid for "${updatedBid.designType}" has been updated by a manufacturer.`);
                    }
                }
            });

            socket.on('disconnect', () => {
                console.log('Socket disconnected from CustomerDashboard.');
            });

            return () => {
                if (socket) {
                    socket.disconnect(); // Clean up socket connection on unmount
                }
            };
        }, [fetchProducts, fetchCustomerBids, currentUserId]) // Depend on currentUserId to re-fetch bids and set up socket
    );

    useEffect(() => {
        let currentProducts = [...allProducts];

        // Apply category filter
        if (selectedFilter !== 'All') {
            currentProducts = currentProducts.filter(p => p.type === selectedFilter);
        }

        // Apply search filter
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            currentProducts = currentProducts.filter(p =>
                p.name.toLowerCase().includes(lowerCaseQuery) ||
                p.type.toLowerCase().includes(lowerCaseQuery)
            );
        }
        setFilteredProducts(currentProducts);
    }, [selectedFilter, searchQuery, allProducts]);

    const handleAddToCart = async (product) => {
        setProductActionModalVisible(false); // Close the action modal
        if (!currentUserId) {
            showAlert('Login Required', 'Please log in to add items to your cart.');
            navigation.navigate('Auth');
            return;
        }
        try {
            const itemToAdd = {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1, // Always add one at a time
                manufacturerId: product.manufacturerId, // Ensure manufacturerId is passed
            };
            const response = await axios.post(`${API_BASE_URL}/cart`, itemToAdd);
            showAlert('Success', `${product.name} added to cart!`);
            console.log('Add to cart response:', response.data);
        } catch (error) {
            console.error('Error adding to cart:', error.response ? error.response.data : error.message);
            showAlert('Error', 'Failed to add item to cart. Please try again.');
        }
    };

    const handleEditProduct = (product) => {
        setProductActionModalVisible(false); // Close the action modal
        // Navigate to MugCustomizer, passing the product details
        navigation.navigate('MugCustomizer', { product: product }); // Changed to MugCustomizer
        console.log(`Navigating to MugCustomizer for product: ${product.name}`);
    };

    const openProductActionModal = (product) => {
        setSelectedProductForAction(product);
        setProductActionModalVisible(true);
    };

    const getChatRoomId = (customerId, manufacturerId) => {
        const participants = [customerId, manufacturerId].sort();
        return `${participants[0]}_${participants[1]}`;
    };

    const handleCustomerBidAction = async (bidId, manufacturerId, action) => {
        if (!currentUserId) {
            showAlert('Error', 'User not logged in.');
            return;
        }
        setBidsLoading(true); // Show loading while processing action
        try {
            const response = await axios.post(`${API_BASE_URL}/bids/${bidId}/customer-action`, {
                action: action, // 'AcceptProposal' or 'RejectProposal'
                manufacturerId: manufacturerId,
            });
            showAlert('Success', response.data.message);
            // Refresh bids to show updated status
            fetchCustomerBids();
            // If accepted, navigate to Order screen to confirm and allow chat
            if (action === 'AcceptProposal') {
                const acceptedBid = response.data.bid;
                // Navigate to Order screen, passing the accepted bid details
                navigation.navigate('Order', { bidDetails: acceptedBid, bidId: acceptedBid._id });
            }
        } catch (error) {
            console.error('Error taking customer action on bid:', error.response ? error.response.data : error.message);
            const errorMessage = error.response && error.response.data && error.response.data.message
                ? error.response.data.message
                : 'Failed to update bid. Please try again.';
            showAlert('Error', errorMessage);
        } finally {
            setBidsLoading(false);
        }
    };


    const renderProductItem = ({ item }) => (
        <View style={styles.productCard}>
            {/* Make the image itself clickable to open the action modal */}
            <TouchableOpacity onPress={() => openProductActionModal(item)}>
                <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.productImage} />
            </TouchableOpacity>
            <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>Rs.{item.price?.toFixed(2)}</Text>
                <Text style={styles.productType}>{item.type}</Text>
                <Text style={styles.manufacturerIdText}>Mfg ID: {item.manufacturerId}</Text>
                <View style={styles.productCardActions}>
                    {/* Make the cart icon clickable to open the action modal */}
                    <TouchableOpacity onPress={() => openProductActionModal(item)} style={styles.addToCartButton}>
                        <Ionicons name="cart-outline" size={28} color="#6C63FF" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderBidItem = ({ item }) => {
    console.log(`Customer Bid ID: ${item._id}, Status: ${item.status}, Accepted Mfg ID: ${item.acceptedManufacturerId}`);
    return (
      <View style={styles.bidCard}>
        <Text style={styles.bidTitle}>Bid for: {item.designType} (ID: {item._id})</Text>
        <Text style={styles.bidDetail}>Your Proposed Price: Rs.{item.customerProposedPrice?.toFixed(2)}</Text>
        <Text style={styles.bidDetail}>Status: <Text style={[styles.bidStatus, styles[`status${item.status.replace(/\s/g, '')}`]]}>{item.status}</Text></Text>
        <Text style={styles.bidDetail}>Items ({item.orderItems.length}):</Text>
        {item.orderItems.map((prod, idx) => (
          <Text key={idx} style={styles.bidItemText}>  - {prod.name} x {prod.quantity} (Mfg: {prod.manufacturerId})</Text>
        ))}

        {/* Display Manufacturer Responses */}
        {item.manufacturerResponses && item.manufacturerResponses.length > 0 && (
          <View style={styles.manufacturerResponsesContainer}>
            <Text style={styles.responsesTitle}>Manufacturer Responses:</Text>
            {item.manufacturerResponses.map((response, idx) => {
              console.log(`  - Mfg Response: ${response.manufacturerId}, Status: ${response.status}`);

              // Determine if chat button should be visible for this specific manufacturer's response
              const canChatWithThisManufacturer = (
                  // Scenario 1: Customer has accepted this specific manufacturer's proposal
                  (item.status === 'Customer Accepted' && item.acceptedManufacturerId === response.manufacturerId) ||
                  // Scenario 2: Manufacturer has responded (accepted, countered, or even rejected their proposal)
                  // AND the overall bid status is such that communication might still be relevant
                  // (i.e., not fully rejected or cancelled by the customer)
                  (response.status !== 'Pending' && item.status !== 'Customer Rejected' && item.status !== 'Cancelled')
              );

              return (
                <View key={idx} style={styles.manufacturerResponseCard}>
                  <Text style={styles.responseDetail}>Mfg: {response.manufacturerName}</Text>
                  {response.proposedPrice !== undefined && (
                    <Text style={styles.responseDetail}>Proposed Price: Rs.{response.proposedPrice?.toFixed(2)}</Text>
                  )}
                  <Text style={styles.responseStatus}>Status: <Text style={[styles.statusText, styles[`status${response.status}`]]}>{response.status}</Text></Text>

                  {/* Customer actions on manufacturer's proposal */}
                  {/* Show accept/reject buttons only if the overall bid is not yet finalized by customer */}
                  {item.status !== 'Customer Accepted' && item.status !== 'Customer Rejected' && response.status === 'Pending' && (
                    <View style={styles.responseActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => handleCustomerBidAction(item._id, response.manufacturerId, 'AcceptProposal')}
                      >
                        <Text style={styles.actionButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleCustomerBidAction(item._id, response.manufacturerId, 'RejectProposal')}
                      >
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Chat Button based on the logic */}
                  {canChatWithThisManufacturer && (
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => navigation.navigate('ChatScreen', {
                        chatRoomId: getChatRoomId(item.customerId, response.manufacturerId),
                        senderId: item.customerId, // Customer is sender
                        receiverId: response.manufacturerId, // Manufacturer is receiver
                        senderName: item.customerName,
                        receiverName: response.manufacturerName,
                      })}
                    >
                      <Ionicons name="chatbubbles-outline" size={20} color="white" />
                      <Text style={styles.chatButtonText}>Chat Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Products</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.cartIcon}>
                    <Ionicons name="cart-outline" size={24} color="#6C63FF" />
                </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'products' && styles.activeTab]}
                    onPress={() => setActiveTab('products')}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'products' && styles.activeTabText]}>Products</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'myBids' && styles.activeTab]}
                    onPress={() => setActiveTab('myBids')}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'myBids' && styles.activeTabText]}>My Price</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'products' ? (
                <View style={{ flex: 1 }}>
                    <View style={styles.searchFilterContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search products..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <View style={styles.pickerContainer}>
                            <TouchableOpacity
                                style={styles.filterButton}
                                onPress={() => setSelectedFilter('All')}
                            >
                                <Text style={selectedFilter === 'All' ? styles.filterButtonTextActive : styles.filterButtonText}>All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.filterButton}
                                onPress={() => setSelectedFilter('T-Shirts')}
                            >
                                <Text style={selectedFilter === 'T-Shirts' ? styles.filterButtonTextActive : styles.filterButtonText}>T-Shirts</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.filterButton}
                                onPress={() => setSelectedFilter('Mugs')}
                            >
                                <Text style={selectedFilter === 'Mugs' ? styles.filterButtonTextActive : styles.filterButtonText}>Mugs</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.filterButton}
                                onPress={() => setSelectedFilter('Posters')}
                            >
                                <Text style={selectedFilter === 'Posters' ? styles.filterButtonTextActive : styles.filterButtonText}>Posters</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.filterButton}
                                onPress={() => setSelectedFilter('Stickers')}
                            >
                                <Text style={selectedFilter === 'Stickers' ? styles.filterButtonTextActive : styles.filterButtonText}>Stickers</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color="rgba(215, 6, 100, 0.6)"/>
                            <Text style={styles.loadingText}>Loading products...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.centered}>
                            <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={fetchProducts} style={styles.retryButton}>
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            renderItem={renderProductItem}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={styles.productList}
                        />
                    )}
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {bidsLoading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color="rgba(215, 6, 100, 0.6)" />
                            <Text style={styles.loadingText}>Loading your bids...</Text>
                        </View>
                    ) : bidsError ? (
                        <View style={styles.centered}>
                            <Ionicons name="alert-circle-outline" size={50} color="rgba(215, 6, 100, 0.6)" />
                            <Text style={styles.errorText}>{bidsError}</Text>
                            <TouchableOpacity onPress={fetchCustomerBids} style={styles.retryButton}>
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : customerBids.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <Ionicons name="pricetags-outline" size={80} color="#ccc" />
                            <Text style={styles.emptyStateText}>You haven't placed any bids yet.</Text>
                            <TouchableOpacity onPress={() => setActiveTab('products')} style={styles.browseButton}>
                                <Text style={styles.browseButtonText}>Start Bidding</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={customerBids}
                            renderItem={renderBidItem}
                            keyExtractor={item => item._id.toString()}
                            contentContainerStyle={styles.bidList}
                        />
                    )}
                </View>
            )}

            {/* Custom Alert Modal (Existing) */}
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

            {/* Product Action Modal (Edit This or Add to Cart) - NEW/MODIFIED */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={productActionModalVisible}
                onRequestClose={() => setProductActionModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Choose Action:</Text>
                        {selectedProductForAction && (
                            <>
                                <Image source={{ uri: selectedProductForAction.image || 'https://via.placeholder.com/150' }} style={styles.modalProductImage} />
                                <Text style={styles.modalProductName}>{selectedProductForAction.name}</Text>
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.modalButton, styles.editDesignButton]}
                            onPress={() => handleEditProduct(selectedProductForAction)}
                        >
                            <Text style={styles.modalButtonText}>Edit This</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.addToCartModalButton]}
                            onPress={() => handleAddToCart(selectedProductForAction)}
                        >
                            <Text style={styles.modalButtonText}>Add to Cart</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => setProductActionModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
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
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    cartIcon: {
        padding: 5,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#fff',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 2,
    },
    tabButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    
  activeTab: {
    backgroundColor: 'rgba(215, 6, 100, 0.6)',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  activeTabText: {
    color: 'white',
  },
    searchFilterContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchInput: {
        height: 45,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 25,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 10,
        backgroundColor: '#f9f9f9',
    },
    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 5,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 4,
    },
    filterButtonText: {
        fontSize: 14,
        color: '#555',
    },
    filterButtonTextActive: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.8)', // Dark text for active filter
        fontWeight: 'bold',
    },
    productList: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 15,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
        flexDirection: 'row', // Horizontal layout
        alignItems: 'center',
    },
    productImage: {
        width: 120, // Fixed width for image
        height: 120, // Fixed height for image
        resizeMode: 'cover',
        borderRadius: 15, // Match card border radius
    },
    productInfo: {
        flex: 1, // Take remaining space
        padding: 15,
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    productPrice: {
        fontSize: 16,
        color: '#e91e63',
        fontWeight: 'bold',
        marginBottom: 5,
    },
    productType: {
        fontSize: 14,
        color: '#777',
        marginBottom: 5,
    },
    manufacturerIdText: {
        fontSize: 12,
        color: '#888',
        marginBottom: 10,
    },
    productCardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    addToCartButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
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
        color: '#777',
    },
    errorText: {
        marginTop: 10,
        fontSize: 16,
        color: '#dc3545',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#6C63FF',
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bidList: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    bidCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    bidTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    bidDetail: {
        fontSize: 16,
        color: '#555',
        marginBottom: 5,
    },
    bidStatus: {
        fontWeight: 'bold',
    },
    statusPending: {
        color: 'orange',
    },
    statusManufacturerCountered: {
        color: '#007bff',
    },
    statusCustomerAccepted: {
        color: 'green',
    },
    statusCustomerRejected: {
        color: 'red',
    },
    statusManufacturerAccepted: {
        color: 'green',
    },
    statusManufacturerRejected: {
        color: 'red',
    },
    bidItemText: {
        fontSize: 14,
        color: '#777',
        marginLeft: 10,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%', // Adjusted for modal appearance
        maxWidth: 400, // Max width for larger screens
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    modalProductName: { // New style for product name in modal
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
        textAlign: 'center',
        color: '#555',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 16,
        color: '#555',
    },
    modalButton: {
        borderRadius: 10,
        padding: 12, // Increased padding
        elevation: 2,
        marginBottom: 10,
        width: '100%', // Take full width of modal
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#rgba(215, 6, 100, 0.89)',
    },
    primaryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalProductImage: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
        marginBottom: 10,
        borderRadius: 8, // Added border radius
    },
    editDesignButton: {
        backgroundColor: '#007bff', // Blue for "Edit This"
    },
    addToCartModalButton: {
        backgroundColor: '#28a745', // Green for "Add to Cart"
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        backgroundColor: '#dc3545', // Red for "Cancel"
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    manufacturerResponsesContainer: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 5,
        borderColor: '#eee',
        borderWidth: 1,
    },
    responsesTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    manufacturerResponseCard: {
        padding: 10,
        marginBottom: 8,
        backgroundColor: '#fff',
        borderRadius: 5,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    responseDetail: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
    },
    responseStatus: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    statusText: {
        fontWeight: 'normal',
    },
    responseActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
        minWidth: 80,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#28a745',
    },
    rejectButton: {
        backgroundColor: '#dc3545',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    chatButton: {
        backgroundColor: '#rgba(215, 6, 100, 0.89)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatButtonText: {
        color: 'white',
        marginLeft: 5,
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyStateText: {
        fontSize: 18,
        color: '#777',
        marginTop: 20,
        textAlign: 'center',
    },
    browseButton: {
        backgroundColor: '#6C63FF',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        marginTop: 20,
    },
    browseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
