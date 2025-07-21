// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   View,
//   TextInput,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   FlatList,
//   ActivityIndicator,
//   Image,
//   ScrollView,
//   Modal,
//   StatusBar,
// } from 'react-native';
// import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import { Ionicons } from '@expo/vector-icons';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import io from 'socket.io-client'; // Import Socket.IO client
// import { API_BASE_URL, SOCKET_SERVER_URL } from './config'; // Import URLs

// let socket; // Declare socket outside to maintain single instance

// export default function ManufacturerDashboard() {
//   const navigation = useNavigation();

//   // Product management states
//   const [productName, setProductName] = useState('');
//   const [productPrice, setProductPrice] = useState('');
//   const [productType, setProductType] = useState('T-Shirt'); // Default type
//   const [productImage, setProductImage] = useState('');
//   const [productId, setProductId] = useState(''); // For adding/editing
//   const [isProductModalVisible, setIsProductModalVisible] = useState(false);
//   const [editingProduct, setEditingProduct] = useState(null);
//   const [products, setProducts] = useState([]);
//   const [productsLoading, setProductsLoading] = useState(true);
//   const [productsError, setProductsError] = useState(null);

//   // Bidding management states
//   const [activeTab, setActiveTab] = useState('products'); // 'products', 'bids', 'chat'
//   const [customerBids, setCustomerBids] = useState([]); // Bids manufacturers can respond to
//   const [bidsLoading, setBidsLoading] = useState(false);
//   const [bidsError, setBidsError] = useState(null);
//   const [currentManufacturerId, setCurrentManufacturerId] = useState(null);
//   const [currentManufacturerName, setCurrentManufacturerName] = useState('');

//   // Bid response modal states
//   const [isBidResponseModalVisible, setIsBidResponseModalVisible] = useState(false);
//   const [selectedBidForResponse, setSelectedBidForResponse] = useState(null);
//   const [manufacturerProposedPrice, setManufacturerProposedPrice] = useState('');

//   // Custom Alert Modal state
//   const [alertModalVisible, setAlertModalVisible] = useState(false);
//   const [alertMessage, setAlertMessage] = useState('');
//   const [alertTitle, setAlertTitle] = useState('');

//   const showAlert = (title, message) => {
//     setAlertTitle(title);
//     setAlertMessage(message);
//     setAlertModalVisible(true);
//   };

//   const getManufacturerIdAndName = useCallback(async () => {
//     try {
//       const storedUserId = await AsyncStorage.getItem('userId'); // Assuming manufacturerId is stored as userId
//       const storedUserName = await AsyncStorage.getItem('userName');
//       if (storedUserId && storedUserName) {
//         setCurrentManufacturerId(storedUserId);
//         setCurrentManufacturerName(storedUserName);
//       } else {
//         showAlert('Authentication Error', 'Manufacturer data not found. Please log in.');
//         navigation.navigate('Auth');
//       }
//     } catch (e) {
//       console.error('Failed to get manufacturer data from AsyncStorage:', e);
//       showAlert('Error', 'Failed to retrieve manufacturer data.');
//     }
//   }, [navigation]);

//   // Fetch products for this manufacturer
//   const fetchManufacturerProducts = useCallback(async () => {
//     if (!currentManufacturerId) return;
//     setProductsLoading(true);
//     setProductsError(null);
//     try {
//       const response = await axios.get(`${API_BASE_URL}/products?manufacturerId=${currentManufacturerId}`);
//       setProducts(response.data);
//     } catch (err) {
//       console.error('Error fetching manufacturer products:', err);
//       setProductsError('Failed to load your products. Please try again.');
//     } finally {
//       setProductsLoading(false);
//     }
//   }, [currentManufacturerId]);

//   // Fetch customer bids relevant to this manufacturer
//   const fetchCustomerBids = useCallback(async () => {
//     if (!currentManufacturerId) return;
//     setBidsLoading(true);
//     setBidsError(null);
//     try {
//       const response = await axios.get(`${API_BASE_URL}/bids/manufacturer/${currentManufacturerId}`);
//       setCustomerBids(response.data);
//     } catch (err) {
//       console.error('Error fetching customer bids for manufacturer:', err);
//       setBidsError('Failed to load customer bids. Please try again.');
//     } finally {
//       setBidsLoading(false);
//     }
//   }, [currentManufacturerId]);

//   useEffect(() => {
//     getManufacturerIdAndName(); // Get ID and name on component mount
//   }, [getManufacturerIdAndName]);

//   useFocusEffect(
//     useCallback(() => {
//       if (currentManufacturerId) {
//         fetchManufacturerProducts();
//         fetchCustomerBids();
//       }

//       // Socket.IO setup for real-time bid updates
//       socket = io(SOCKET_SERVER_URL);

//       socket.on('connect', () => {
//         console.log('Socket connected to ManufacturerDashboard.');
//       });

//       // Listen for new bid creation
//       socket.on('newBidCreated', (newBid) => {
//         console.log('Received newBidCreated event:', newBid);
//         // Add the new bid if it's relevant (e.g., if any item's manufacturerId matches currentMfgId, or for all if no specific targeting)
//         const relevantToMe = newBid.orderItems.some(item => item.manufacturerId === currentManufacturerId);
//         if (relevantToMe || newBid.status === 'Pending') { // All pending bids are visible to all manufacturers
//             setCustomerBids(prevBids => [newBid, ...prevBids]);
//             showAlert('New Bid!', `A new bid for "${newBid.designType}" has been placed by ${newBid.customerName}.`);
//         }
//       });

//       // Listen for bid updates (e.g., customer accepting a proposal)
//       socket.on('bidUpdated', (updatedBid) => {
//         console.log('Received bidUpdated event:', updatedBid);
//         // Check if this update is relevant to the current manufacturer
//         const hasMyResponse = updatedBid.manufacturerResponses.some(res => res.manufacturerId === currentManufacturerId);
//         const acceptedMe = updatedBid.acceptedManufacturerId === currentManufacturerId;

//         if (updatedBid.status === 'Customer Accepted' && acceptedMe) {
//             showAlert('Bid Accepted!', `Your proposal for bid ID ${updatedBid._id} has been accepted by ${updatedBid.customerName}!`);
//         } else if (hasMyResponse) {
//              showAlert('Bid Updated', `Your response to bid ID ${updatedBid._id} has been seen by ${updatedBid.customerName}.`);
//         }
//         fetchCustomerBids(); // Re-fetch all bids to ensure up-to-date status
//       });

//       socket.on('disconnect', () => {
//         console.log('Socket disconnected from ManufacturerDashboard.');
//       });

//       return () => {
//         if (socket) {
//           socket.disconnect(); // Clean up socket connection on unmount
//         }
//       };
//     }, [currentManufacturerId, fetchManufacturerProducts, fetchCustomerBids])
//   );

//   const handleAddUpdateProduct = async () => {
//     if (!productName || !productPrice || !productType || !productId) {
//       showAlert('Error', 'Please fill in all product fields (ID, Name, Price, Type).');
//       return;
//     }
//     if (!currentManufacturerId) {
//         showAlert('Error', 'Manufacturer not logged in.');
//         return;
//     }

//     const productData = {
//       id: parseInt(productId), // Ensure ID is a number
//       name: productName,
//       price: parseFloat(productPrice),
//       type: productType,
//       image: productImage || `https://placehold.co/150x150/e0e0e0/333333?text=${productName.substring(0,3)}`,
//       manufacturerId: currentManufacturerId, // Assign current manufacturer's ID
//     };

//     setProductsLoading(true);
//     try {
//       if (editingProduct) {
//         // Update product
//         await axios.put(`${API_BASE_URL}/products/${editingProduct.id}`, productData);
//         showAlert('Success', 'Product updated successfully!');
//       } else {
//         // Add new product
//         await axios.post(`${API_BASE_URL}/products`, productData);
//         showAlert('Success', 'Product added successfully!');
//       }
//       resetForm();
//       fetchManufacturerProducts(); // Re-fetch products to update list
//     } catch (error) {
//       console.error('Error adding/updating product:', error.response ? error.response.data : error.message);
//       showAlert('Error', error.response?.data?.message || 'Failed to save product. Please try again.');
//     } finally {
//       setProductsLoading(false);
//       setIsProductModalVisible(false);
//     }
//   };

//   const handleDeleteProduct = async (id) => {
//     showAlert(
//       'Delete Product',
//       'Are you sure you want to delete this product?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Delete',
//           onPress: async () => {
//             setProductsLoading(true);
//             try {
//               await axios.delete(`${API_BASE_URL}/products/${id}`);
//               showAlert('Success', 'Product deleted successfully!');
//               fetchManufacturerProducts();
//             } catch (error) {
//               console.error('Error deleting product:', error.response ? error.response.data : error.message);
//               showAlert('Error', 'Failed to delete product. Please try again.');
//             } finally {
//               setProductsLoading(false);
//             }
//           },
//         },
//       ]
//     );
//   };

//   const startEditProduct = (product) => {
//     setEditingProduct(product);
//     setProductId(product.id.toString()); // Convert to string for TextInput
//     setProductName(product.name);
//     setProductPrice(product.price.toString());
//     setProductType(product.type);
//     setProductImage(product.image);
//     setIsProductModalVisible(true);
//   };

//   const resetForm = () => {
//     setEditingProduct(null);
//     setProductId('');
//     setProductName('');
//     setProductPrice('');
//     setProductType('T-Shirt');
//     setProductImage('');
//     setIsProductModalVisible(false);
//   };

//   const handleLogout = async () => {
//     showAlert(
//         'Logout',
//         'Are you sure you want to log out?',
//         [
//             { text: 'Cancel', style: 'cancel' },
//             {
//                 text: 'Logout',
//                 onPress: async () => {
//                     try {
//                         await AsyncStorage.removeItem('token');
//                         await AsyncStorage.removeItem('userId');
//                         await AsyncStorage.removeItem('userName');
//                         await AsyncStorage.removeItem('userRole');
//                         showAlert('Logged Out', 'You have been successfully logged out.');
//                         navigation.navigate('RoleSelection'); // Go back to role selection
//                     } catch (e) {
//                         console.error('Logout error:', e);
//                         showAlert('Error', 'Failed to log out.');
//                     }
//                 },
//             },
//         ]
//     );
//   };

//   // Bidding Functions
//   const openBidResponseModal = (bid) => {
//     setSelectedBidForResponse(bid);
//     setManufacturerProposedPrice(bid.customerProposedPrice.toString()); // Pre-fill with customer's price
//     setIsBidResponseModalVisible(true);
//   };

//   const handleManufacturerResponse = async (action) => {
//     if (!selectedBidForResponse || !currentManufacturerId) {
//       showAlert('Error', 'No bid selected or manufacturer ID missing.');
//       return;
//     }

//     let priceToPropose = null;
//     if (action === 'Counter') {
//       if (!manufacturerProposedPrice || parseFloat(manufacturerProposedPrice) <= 0) {
//         showAlert('Error', 'Please enter a valid proposed price for your counter offer.');
//         return;
//       }
//       priceToPropose = parseFloat(manufacturerProposedPrice);
//     } else if (action === 'Accept') {
//       // If accepting, the proposed price is the customer's original price
//       priceToPropose = selectedBidForResponse.customerProposedPrice;
//     }

//     setBidsLoading(true);
//     try {
//       const response = await axios.post(`${API_BASE_URL}/bids/${selectedBidForResponse._id}/respond`, {
//         manufacturerId: currentManufacturerId,
//         manufacturerName: currentManufacturerName,
//         action: action, // 'Accept', 'Reject', 'Counter'
//         proposedPrice: priceToPropose,
//       });
//       showAlert('Success', response.data.message);
//       fetchCustomerBids(); // Refresh bids list
//       setIsBidResponseModalVisible(false);
//       setManufacturerProposedPrice(''); // Reset price
//     } catch (error) {
//       console.error('Error responding to bid:', error.response ? error.response.data : error.message);
//       showAlert('Error', error.response?.data?.message || 'Failed to send response. Please try again.');
//     } finally {
//       setBidsLoading(false);
//     }
//   };

//   const getChatRoomId = (customerId, manufacturerId) => {
//     const participants = [customerId, manufacturerId].sort();
//     return `${participants[0]}_${participants[1]}`;
//   };

//   const renderProductItem = ({ item }) => (
//     <View style={styles.productCard}>
//       <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.productImage} />
//       <View style={styles.productInfo}>
//         <Text style={styles.productName}>{item.name}</Text>
//         <Text style={styles.productPrice}>Rs.{item.price?.toFixed(2)}</Text>
//         <Text style={styles.productType}>{item.type}</Text>
//         <Text style={styles.manufacturerIdText}>ID: {item.id}</Text>
//         <View style={styles.productActions}>
//           <TouchableOpacity onPress={() => startEditProduct(item)} style={[styles.actionButton, styles.editButton]}>
//             <Ionicons name="create-outline" size={20} color="#fff" />
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => handleDeleteProduct(item.id)} style={[styles.actionButton, styles.deleteButton]}>
//             <Ionicons name="trash-outline" size={20} color="#fff" />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );

//   const renderBidItem = ({ item }) => {
//     console.log(`Manufacturer Bid ID: ${item._id}, Status: ${item.status}, Accepted Mfg ID: ${item.acceptedManufacturerId}, My ID: ${currentManufacturerId}`);
//     const myResponse = item.manufacturerResponses.find(res => res.manufacturerId === currentManufacturerId);
//     const hasResponded = !!myResponse;
//     const isAcceptedByCustomer = item.status === 'Customer Accepted' && item.acceptedManufacturerId === currentManufacturerId;

//     return (
//       <View style={styles.bidCard}>
//         <Text style={styles.bidTitle}>Bid from: {item.customerName} (ID: {item._id})</Text>
//         <Text style={styles.bidDetail}>Proposed Price: Rs.{item.customerProposedPrice?.toFixed(2)}</Text>
//         <Text style={styles.bidDetail}>Design Type: {item.designType}</Text>
//         <Text style={styles.bidDetail}>Status: <Text style={[styles.bidStatus, styles[`status${item.status.replace(/\s/g, '')}`]]}>{item.status}</Text></Text>

//         {/* Display Manufacturer Responses (if any) */}
//         {item.manufacturerResponses && item.manufacturerResponses.length > 0 && (
//           <View style={styles.manufacturerResponsesContainer}>
//             <Text style={styles.responsesTitle}>Your Response History:</Text>
//             {item.manufacturerResponses
//               .filter(res => res.manufacturerId === currentManufacturerId) // Only show *this* manufacturer's response
//               .map((response, idx) => (
//                 <View key={idx} style={styles.myResponseCard}>
//                   <Text style={styles.responseDetail}>Your Price: {response.proposedPrice ? `Rs.${response.proposedPrice?.toFixed(2)}` : 'N/A'}</Text>
//                   <Text style={styles.responseStatus}>Status: <Text style={[styles.statusText, styles[`status${response.status}`]]}>{response.status}</Text></Text>
//                   <Text style={styles.responseDetail}>Responded: {new Date(response.responseDate).toLocaleDateString()}</Text>
//                 </View>
//               ))}
//           </View>
//         )}

//         {/* Manufacturer Actions */}
//         {!isAcceptedByCustomer && item.status !== 'Customer Accepted' && item.status !== 'Customer Rejected' && (
//           <View style={styles.bidActions}>
//             {!hasResponded && ( // Only show if not yet responded
//               <>
//                 <TouchableOpacity
//                   style={[styles.bidActionButton, styles.acceptBidButton]}
//                   onPress={() => openBidResponseModal(item)} // Open modal to choose action
//                 >
//                   <Text style={styles.bidActionButtonText}>Respond to Bid</Text>
//                 </TouchableOpacity>
//               </>
//             )}
//             {hasResponded && myResponse.status !== 'Accepted' && ( // Allow re-responding if not accepted by customer
//               <TouchableOpacity
//                   style={[styles.bidActionButton, styles.counterBidButton]}
//                   onPress={() => openBidResponseModal(item)} // Allow changing offer
//               >
//                   <Text style={styles.bidActionButtonText}>Change Response</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}


//         {/* Chat Button */}
//         {isAcceptedByCustomer && ( // Only show chat if *this* manufacturer's bid was accepted
//           <TouchableOpacity
//             style={styles.chatButton}
//             onPress={() => navigation.navigate('ChatScreen', {
//               chatRoomId: getChatRoomId(item.customerId, item.acceptedManufacturerId),
//               senderId: item.acceptedManufacturerId, // Manufacturer is sender
//               receiverId: item.customerId, // Customer is receiver
//               senderName: currentManufacturerName,
//               receiverName: item.customerName,
//             })}
//           >
//             <Ionicons name="chatbubbles-outline" size={20} color="white" />
//             <Text style={styles.chatButtonText}>Chat with Customer</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     );
//   };


//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>Manufacturer Dashboard</Text>
//         <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
//           <Ionicons name="log-out-outline" size={24} color="#dc3545" />
//         </TouchableOpacity>
//       </View>

//       <View style={styles.tabContainer}>
//         <TouchableOpacity
//           style={[styles.tabButton, activeTab === 'products' && styles.activeTab]}
//           onPress={() => setActiveTab('products')}
//         >
//           <Text style={[styles.tabButtonText, activeTab === 'products' && styles.activeTabText]}>My Products</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tabButton, activeTab === 'bids' && styles.activeTab]}
//           onPress={() => setActiveTab('bids')}
//         >
//           <Text style={[styles.tabButtonText, activeTab === 'bids' && styles.activeTabText]}>Customer Bids</Text>
//         </TouchableOpacity>
//       </View>

//       {activeTab === 'products' ? (
//         <View style={{ flex: 1 }}>
//           <TouchableOpacity style={styles.addProductButton} onPress={() => setIsProductModalVisible(true)}>
//             <Ionicons name="add-circle-outline" size={20} color="white" />
//             <Text style={styles.addProductButtonText}>Add New Product</Text>
//           </TouchableOpacity>

//           {productsLoading ? (
//             <View style={styles.centered}>
//               <ActivityIndicator size="large" color="#6C63FF" />
//               <Text style={styles.loadingText}>Loading products...</Text>
//             </View>
//           ) : productsError ? (
//             <View style={styles.centered}>
//               <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
//               <Text style={styles.errorText}>{productsError}</Text>
//               <TouchableOpacity onPress={fetchManufacturerProducts} style={styles.retryButton}>
//                 <Text style={styles.retryButtonText}>Retry</Text>
//               </TouchableOpacity>
//             </View>
//           ) : products.length === 0 ? (
//             <View style={styles.emptyStateContainer}>
//               <Ionicons name="pricetag-outline" size={80} color="#ccc" />
//               <Text style={styles.emptyStateText}>You haven't added any products yet.</Text>
//               <TouchableOpacity onPress={() => setIsProductModalVisible(true)} style={styles.browseButton}>
//                 <Text style={styles.browseButtonText}>Add Your First Product</Text>
//               </TouchableOpacity>
//             </View>
//           ) : (
//             <FlatList
//               data={products}
//               renderItem={renderProductItem}
//               keyExtractor={item => item.id.toString()}
//               contentContainerStyle={styles.productList}
//             />
//           )}
//         </View>
//       ) : (
//         <View style={{ flex: 1 }}>
//           {bidsLoading ? (
//             <View style={styles.centered}>
//               <ActivityIndicator size="large" color="#6C63FF" />
//               <Text style={styles.loadingText}>Loading customer bids...</Text>
//             </View>
//           ) : bidsError ? (
//             <View style={styles.centered}>
//               <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
//               <Text style={styles.errorText}>{bidsError}</Text>
//               <TouchableOpacity onPress={fetchCustomerBids} style={styles.retryButton}>
//                 <Text style={styles.retryButtonText}>Retry</Text>
//               </TouchableOpacity>
//             </View>
//           ) : customerBids.length === 0 ? (
//             <View style={styles.emptyStateContainer}>
//               <Ionicons name="mail-outline" size={80} color="#ccc" />
//               <Text style={styles.emptyStateText}>No new bids from customers yet.</Text>
//             </View>
//           ) : (
//             <FlatList
//               data={customerBids}
//               renderItem={renderBidItem}
//               keyExtractor={item => item._id.toString()}
//               contentContainerStyle={styles.bidList}
//             />
//           )}
//         </View>
//       )}

//       {/* Product Add/Edit Modal */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={isProductModalVisible}
//         onRequestClose={() => setIsProductModalVisible(false)}
//       >
//         <View style={styles.centeredView}>
//           <View style={styles.modalView}>
//             <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Product ID (e.g., 101)"
//               keyboardType="numeric"
//               value={productId}
//               onChangeText={setProductId}
//               editable={!editingProduct} // ID should not be editable when editing
//             />
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Product Name"
//               value={productName}
//               onChangeText={setProductName}
//             />
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Price (e.g., 500.00)"
//               keyboardType="numeric"
//               value={productPrice}
//               onChangeText={setProductPrice}
//             />
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Product Type (e.g., T-Shirt, Mug, Poster, Sticker)"
//               value={productType}
//               onChangeText={setProductType}
//             />
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Image URL (optional)"
//               value={productImage}
//               onChangeText={setProductImage}
//             />
//             <View style={styles.modalButtons}>
//               <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={resetForm}>
//                 <Text style={styles.secondaryButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity style={[styles.modalButton, styles.primaryButton]} onPress={handleAddUpdateProduct}>
//                 {productsLoading ? (
//                     <ActivityIndicator color="#fff" />
//                 ) : (
//                     <Text style={styles.primaryButtonText}>{editingProduct ? 'Update Product' : 'Add Product'}</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* Bid Response Modal */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={isBidResponseModalVisible}
//         onRequestClose={() => setIsBidResponseModalVisible(false)}
//       >
//         <View style={styles.centeredView}>
//           <View style={styles.modalView}>
//             <Text style={styles.modalTitle}>Respond to Bid</Text>
//             {selectedBidForResponse && (
//                 <>
//                     <Text style={styles.modalText}>Customer Proposed: Rs.{selectedBidForResponse.customerProposedPrice?.toFixed(2)}</Text>
//                     <Text style={styles.modalText}>For: {selectedBidForResponse.designType}</Text>
//                 </>
//             )}

//             <TextInput
//               style={styles.modalInput}
//               placeholder="Your Proposed Price (Optional, for Counter)"
//               keyboardType="numeric"
//               value={manufacturerProposedPrice}
//               onChangeText={setManufacturerProposedPrice}
//             />

//             <View style={styles.modalButtons}>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.secondaryButton]}
//                 onPress={() => setIsBidResponseModalVisible(false)}
//               >
//                 <Text style={styles.secondaryButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.acceptBidButton]}
//                 onPress={() => handleManufacturerResponse('Accept')}
//               >
//                 {bidsLoading ? (
//                     <ActivityIndicator color="#fff" />
//                 ) : (
//                     <Text style={styles.bidActionButtonText}>Accept Bid</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//             <TouchableOpacity
//               style={[styles.modalButton, styles.counterBidButton, { marginTop: 10 }]} // Separate row for Counter/Reject
//               onPress={() => handleManufacturerResponse('Counter')}
//               disabled={!manufacturerProposedPrice || parseFloat(manufacturerProposedPrice) <= 0}
//             >
//               {bidsLoading ? (
//                   <ActivityIndicator color="#fff" />
//               ) : (
//                   <Text style={styles.bidActionButtonText}>Counter Bid</Text>
//               )}
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.modalButton, styles.rejectBidButton, { marginTop: 10 }]}
//               onPress={() => handleManufacturerResponse('Reject')}
//             >
//               {bidsLoading ? (
//                   <ActivityIndicator color="#fff" />
//               ) : (
//                   <Text style={styles.bidActionButtonText}>Reject Bid</Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* Custom Alert Modal */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={alertModalVisible}
//         onRequestClose={() => setAlertModalVisible(false)}
//       >
//         <View style={styles.centeredView}>
//           <View style={styles.modalView}>
//             <Text style={styles.modalTitle}>{alertTitle}</Text>
//             <Text style={styles.modalText}>{alertMessage}</Text>
//             <TouchableOpacity
//               style={[styles.modalButton, styles.primaryButton]}
//               onPress={() => setAlertModalVisible(false)}
//             >
//               <Text style={styles.primaryButtonText}>OK</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f8f8',
//     paddingTop: StatusBar.currentHeight || 0,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//     backgroundColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 1.5,
//     elevation: 3,
//   },
//   headerTitle: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   logoutButton: {
//     padding: 5,
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     backgroundColor: '#fff',
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 1,
//     elevation: 2,
//   },
//   tabButton: {
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 20,
//   },
//   activeTab: {
//     backgroundColor: '#6C63FF',
//   },
//   tabButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#555',
//   },
//   activeTabText: {
//     color: 'white',
//   },
//   addProductButton: {
//     backgroundColor: '#6C63FF',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     borderRadius: 10,
//     margin: 16,
//     shadowColor: '#6C63FF',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//     elevation: 5,
//   },
//   addProductButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginLeft: 8,
//   },
//   productList: {
//     paddingHorizontal: 16,
//     paddingBottom: 20,
//   },
//   productCard: {
//     backgroundColor: '#fff',
//     borderRadius: 15,
//     marginBottom: 15,
//     padding: 15,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     elevation: 5,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   productImage: {
//     width: 90,
//     height: 90,
//     borderRadius: 10,
//     marginRight: 15,
//     resizeMode: 'cover',
//   },
//   productInfo: {
//     flex: 1,
//   },
//   productName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 5,
//   },
//   productPrice: {
//     fontSize: 16,
//     color: '#e91e63',
//     fontWeight: 'bold',
//     marginBottom: 5,
//   },
//   productType: {
//     fontSize: 14,
//     color: '#777',
//   },
//   manufacturerIdText: {
//     fontSize: 12,
//     color: '#888',
//     marginTop: 5,
//   },
//   productActions: {
//     flexDirection: 'row',
//     marginTop: 10,
//     gap: 10,
//   },
//   actionButton: {
//     padding: 8,
//     borderRadius: 8,
//   },
//   editButton: {
//     backgroundColor: '#007BFF', // Blue
//   },
//   deleteButton: {
//     backgroundColor: '#DC3545', // Red
//   },
//   // Modal Styles (for Product Add/Edit)
//   centeredView: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.6)',
//   },
//   modalView: {
//     margin: 20,
//     backgroundColor: 'white',
//     borderRadius: 20,
//     padding: 35,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//     elevation: 10,
//     width: '90%',
//     maxWidth: 400,
//   },
//   modalTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     color: '#333',
//     textAlign: 'center',
//   },
//   modalInput: {
//     width: '100%',
//     height: 50,
//     borderColor: '#ddd',
//     borderWidth: 1,
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     fontSize: 16,
//     marginBottom: 15,
//     backgroundColor: '#f9f9f9',
//     color: '#333',
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     width: '100%',
//     marginTop: 10,
//   },
//   modalButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 10,
//     alignItems: 'center',
//     marginHorizontal: 5,
//   },
//   primaryButton: {
//     backgroundColor: '#6C63FF',
//   },
//   primaryButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   secondaryButton: {
//     backgroundColor: '#e0e0e0',
//   },
//   secondaryButtonText: {
//     color: '#333',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   centered: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: '#6C63FF',
//   },
//   errorText: {
//     color: '#dc3545',
//     fontSize: 16,
//     textAlign: 'center',
//     marginHorizontal: 20,
//     marginBottom: 15,
//   },
//   retryButton: {
//     backgroundColor: '#6C63FF',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//   },
//   retryButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   emptyStateContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   emptyStateText: {
//     fontSize: 20,
//     color: '#888',
//     marginTop: 20,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   browseButton: {
//     backgroundColor: '#6C63FF',
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     borderRadius: 10,
//     marginTop: 30,
//     shadowColor: '#6C63FF',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//     elevation: 5,
//   },
//   browseButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   // Bid Specific Styles
//   bidList: {
//     paddingHorizontal: 16,
//     paddingBottom: 20,
//   },
//   bidCard: {
//     backgroundColor: '#fff',
//     borderRadius: 15,
//     marginBottom: 15,
//     padding: 15,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     elevation: 5,
//     borderLeftWidth: 5,
//     borderLeftColor: '#FFC107', // Accent color for bids
//   },
//   bidTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 8,
//   },
//   bidDetail: {
//     fontSize: 15,
//     color: '#555',
//     marginBottom: 5,
//   },
//   bidStatus: {
//     fontWeight: 'bold',
//   },
//   statusPending: {
//     color: '#FFC107', // Amber
//   },
//   statusManufacturerCountered: {
//     color: '#007BFF', // Blue
//   },
//   statusManufacturerAccepted: {
//     color: '#28A745', // Green
//   },
//   statusCustomerAccepted: {
//     color: '#28A745', // Green
//   },
//   statusCustomerRejected: {
//     color: '#DC3545', // Red
//   },
//   statusCancelled: {
//     color: '#6C757D', // Gray
//   },
//   bidActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginTop: 15,
//   },
//   bidActionButton: {
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//     flex: 1,
//     marginHorizontal: 5,
//   },
//   bidActionButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 14,
//   },
//   acceptBidButton: {
//     backgroundColor: '#28A745', // Green
//   },
//   counterBidButton: {
//     backgroundColor: '#007BFF', // Blue
//   },
//   rejectBidButton: {
//     backgroundColor: '#DC3545', // Red
//   },
//   chatButton: { // THIS IS THE CHAT BUTTON STYLE
//     backgroundColor: '#6C63FF',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 10,
//     borderRadius: 8,
//     marginTop: 10,
//   },
//   chatButtonText: {
//     color: 'white',
//     fontSize: 14,
//     fontWeight: 'bold',
//     marginLeft: 5,
//   },
//   manufacturerResponsesContainer: {
//     marginTop: 15,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//     paddingTop: 10,
//   },
//   responsesTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 10,
//   },
//   myResponseCard: {
//     backgroundColor: '#e6e6fa', // Light purple for my response
//     borderRadius: 10,
//     padding: 12,
//     marginBottom: 10,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 1,
//   },
// // });
// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   View,
//   TextInput,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   FlatList,
//   ActivityIndicator,
//   Image,
//   ScrollView,
//   Modal,
//   StatusBar,
// } from 'react-native';
// import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import { Ionicons } from '@expo/vector-icons';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import io from 'socket.io-client'; // Import Socket.IO client
// import { API_BASE_URL, SOCKET_SERVER_URL } from './config'; // Import URLs

// let socket; // Declare socket outside to maintain single instance

// export default function ManufacturerDashboard() {
//   const navigation = useNavigation();

//   // Product management states
//   const [productName, setProductName] = useState('');
//   const [productPrice, setProductPrice] = useState('');
//   const [productType, setProductType] = useState('T-Shirt'); // Default type
//   const [productImage, setProductImage] = useState('');
//   const [productId, setProductId] = useState(''); // For adding/editing
//   const [isProductModalVisible, setIsProductModalVisible] = useState(false);
//   const [editingProduct, setEditingProduct] = useState(null);
//   const [products, setProducts] = useState([]);
//   const [productsLoading, setProductsLoading] = useState(true);
//   const [productsError, setProductsError] = useState(null);

//   // Bidding management states
//   const [activeTab, setActiveTab] = useState('products'); // 'products', 'bids', 'chat'
//   const [customerBids, setCustomerBids] = useState([]); // Bids manufacturers can respond to
//   const [bidsLoading, setBidsLoading] = useState(false);
//   const [bidsError, setBidsError] = useState(null);
//   const [currentManufacturerId, setCurrentManufacturerId] = useState(null);
//   const [currentManufacturerName, setCurrentManufacturerName] = useState('');

//   // Bid response modal states
//   const [isBidResponseModalVisible, setIsBidResponseModalVisible] = useState(false);
//   const [selectedBidForResponse, setSelectedBidForResponse] = useState(null);
//   const [manufacturerProposedPrice, setManufacturerProposedPrice] = useState('');

//   // Custom Alert Modal state
//   const [alertModalVisible, setAlertModalVisible] = useState(false);
//   const [alertMessage, setAlertMessage] = useState('');
//   const [alertTitle, setAlertTitle] = useState('');

//   const showAlert = (title, message) => {
//     setAlertTitle(title);
//     setAlertMessage(message);
//     setAlertModalVisible(true);
//   };

//   const getManufacturerIdAndName = useCallback(async () => {
//     try {
//       const storedUserId = await AsyncStorage.getItem('userId'); // Assuming manufacturerId is stored as userId
//       const storedUserName = await AsyncStorage.getItem('userName');
//       if (storedUserId && storedUserName) {
//         setCurrentManufacturerId(storedUserId);
//         setCurrentManufacturerName(storedUserName);
//       } else {
//         showAlert('Authentication Error', 'Manufacturer data not found. Please log in.');
//         navigation.navigate('Auth');
//       }
//     } catch (e) {
//       console.error('Failed to get manufacturer data from AsyncStorage:', e);
//       showAlert('Error', 'Failed to retrieve manufacturer data.');
//     }
//   }, [navigation]);

//   // Fetch products for this manufacturer
//   const fetchManufacturerProducts = useCallback(async () => {
//     if (!currentManufacturerId) return;
//     setProductsLoading(true);
//     setProductsError(null);
//     try {
//       const response = await axios.get(`${API_BASE_URL}/products?manufacturerId=${currentManufacturerId}`);
//       setProducts(response.data);
//     } catch (err) {
//       console.error('Error fetching manufacturer products:', err);
//       setProductsError('Failed to load your products. Please try again.');
//     } finally {
//       setProductsLoading(false);
//     }
//   }, [currentManufacturerId]);

//   // Fetch customer bids relevant to this manufacturer
//   const fetchCustomerBids = useCallback(async () => {
//     if (!currentManufacturerId) return;
//     setBidsLoading(true);
//     setBidsError(null);
//     try {
//       const response = await axios.get(`${API_BASE_URL}/bids/manufacturer/${currentManufacturerId}`);
//       setCustomerBids(response.data);
//     } catch (err) {
//       console.error('Error fetching customer bids for manufacturer:', err);
//       setBidsError('Failed to load customer bids. Please try again.');
//     } finally {
//       setBidsLoading(false);
//     }
//   }, [currentManufacturerId]);

//   useEffect(() => {
//     getManufacturerIdAndName(); // Get ID and name on component mount
//   }, [getManufacturerIdAndName]);

//   useFocusEffect(
//     useCallback(() => {
//       if (currentManufacturerId) {
//         fetchManufacturerProducts();
//         fetchCustomerBids();
//       }

//       // Socket.IO setup for real-time bid updates
//       socket = io(SOCKET_SERVER_URL);

//       socket.on('connect', () => {
//         console.log('Socket connected to ManufacturerDashboard.');
//       });

//       // Listen for new bid creation
//       socket.on('newBidCreated', (newBid) => {
//         console.log('Received newBidCreated event:', newBid);
//         // Add the new bid if it's relevant (e.g., if any item's manufacturerId matches currentMfgId, or for all if no specific targeting)
//         const relevantToMe = newBid.orderItems.some(item => item.manufacturerId === currentManufacturerId);
//         if (relevantToMe || newBid.status === 'Pending') { // All pending bids are visible to all manufacturers
//             setCustomerBids(prevBids => [newBid, ...prevBids]);
//             showAlert('New Bid!', `A new bid for "${newBid.designType}" has been placed by ${newBid.customerName}.`);
//         }
//       });

//       // Listen for bid updates (e.g., customer accepting a proposal)
//       socket.on('bidUpdated', (updatedBid) => {
//         console.log('Received bidUpdated event:', updatedBid);
//         // Check if this update is relevant to the current manufacturer
//         const hasMyResponse = updatedBid.manufacturerResponses.some(res => res.manufacturerId === currentManufacturerId);
//         const acceptedMe = updatedBid.acceptedManufacturerId === currentManufacturerId;

//         if (updatedBid.status === 'Customer Accepted' && acceptedMe) {
//             showAlert('Bid Accepted!', `Your proposal for bid ID ${updatedBid._id} has been accepted by ${updatedBid.customerName}!`);
//         } else if (hasMyResponse) {
//              showAlert('Bid Updated', `Your response to bid ID ${updatedBid._id} has been seen by ${updatedBid.customerName}.`);
//         }
//         fetchCustomerBids(); // Re-fetch all bids to ensure up-to-date status
//       });

//       socket.on('disconnect', () => {
//         console.log('Socket disconnected from ManufacturerDashboard.');
//       });

//       return () => {
//         if (socket) {
//           socket.disconnect(); // Clean up socket connection on unmount
//         }
//       };
//     }, [currentManufacturerId, fetchManufacturerProducts, fetchCustomerBids])
//   );

//   const handleAddUpdateProduct = async () => {
//     if (!productName || !productPrice || !productType || !productId) {
//       showAlert('Error', 'Please fill in all product fields (ID, Name, Price, Type).');
//       return;
//     }
//     if (!currentManufacturerId) {
//         showAlert('Error', 'Manufacturer not logged in.');
//         return;
//     }

//     const productData = {
//       id: parseInt(productId), // Ensure ID is a number
//       name: productName,
//       price: parseFloat(productPrice),
//       type: productType,
//       image: productImage || `https://placehold.co/150x150/e0e0e0/333333?text=${productName.substring(0,3)}`,
//       manufacturerId: currentManufacturerId, // Assign current manufacturer's ID
//     };

//     setProductsLoading(true);
//     try {
//       if (editingProduct) {
//         // Update product
//         await axios.put(`${API_BASE_URL}/products/${editingProduct.id}`, productData);
//         showAlert('Success', 'Product updated successfully!');
//       } else {
//         // Add new product
//         await axios.post(`${API_BASE_URL}/products`, productData);
//         showAlert('Success', 'Product added successfully!');
//       }
//       resetForm();
//       fetchManufacturerProducts(); // Re-fetch products to update list
//     } catch (error) {
//       console.error('Error adding/updating product:', error.response ? error.response.data : error.message);
//       showAlert('Error', error.response?.data?.message || 'Failed to save product. Please try again.');
//     } finally {
//       setProductsLoading(false);
//       setIsProductModalVisible(false);
//     }
//   };

//   const handleDeleteProduct = async (id) => {
//     showAlert(
//       'Delete Product',
//       'Are you sure you want to delete this product?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Delete',
//           onPress: async () => {
//             setProductsLoading(true);
//             try {
//               await axios.delete(`${API_BASE_URL}/products/${id}`);
//               showAlert('Success', 'Product deleted successfully!');
//               fetchManufacturerProducts();
//             } catch (error) {
//               console.error('Error deleting product:', error.response ? error.response.data : error.message);
//               showAlert('Error', 'Failed to delete product. Please try again.');
//             } finally {
//               setProductsLoading(false);
//             }
//           },
//         },
//       ]
//     );
//   };

//   const startEditProduct = (product) => {
//     setEditingProduct(product);
//     setProductId(product.id.toString()); // Convert to string for TextInput
//     setProductName(product.name);
//     setProductPrice(product.price.toString());
//     setProductType(product.type);
//     setProductImage(product.image);
//     setIsProductModalVisible(true);
//   };

//   const resetForm = () => {
//     setEditingProduct(null);
//     setProductId('');
//     setProductName('');
//     setProductPrice('');
//     setProductType('T-Shirt');
//     setProductImage('');
//     setIsProductModalVisible(false);
//   };

//   const handleLogout = async () => {
//     showAlert(
//         'Logout',
//         'Are you sure you want to log out?',
//         [
//             { text: 'Cancel', style: 'cancel' },
//             {
//                 text: 'Logout',
//                 onPress: async () => {
//                     try {
//                         await AsyncStorage.removeItem('token');
//                         await AsyncStorage.removeItem('userId');
//                         await AsyncStorage.removeItem('userName');
//                         await AsyncStorage.removeItem('userRole');
//                         showAlert('Logged Out', 'You have been successfully logged out.');
//                         navigation.navigate('RoleSelection'); // Go back to role selection
//                     } catch (e) {
//                         console.error('Logout error:', e);
//                         showAlert('Error', 'Failed to log out.');
//                     }
//                 },
//             },
//         ]
//     );
//   };

//   // Bidding Functions
//   const openBidResponseModal = (bid) => {
//     setSelectedBidForResponse(bid);
//     setManufacturerProposedPrice(bid.customerProposedPrice.toString()); // Pre-fill with customer's price
//     setIsBidResponseModalVisible(true);
//   };

//   const handleManufacturerResponse = async (action) => {
//     if (!selectedBidForResponse || !currentManufacturerId) {
//       showAlert('Error', 'No bid selected or manufacturer ID missing.');
//       return;
//     }

//     let priceToPropose = null;
//     if (action === 'Counter') {
//       if (!manufacturerProposedPrice || parseFloat(manufacturerProposedPrice) <= 0) {
//         showAlert('Error', 'Please enter a valid proposed price for your counter offer.');
//         return;
//       }
//       priceToPropose = parseFloat(manufacturerProposedPrice);
//     } else if (action === 'Accept') {
//       // If accepting, the proposed price is the customer's original price
//       priceToPropose = selectedBidForResponse.customerProposedPrice;
//     }

//     setBidsLoading(true);
//     try {
//       const response = await axios.post(`${API_BASE_URL}/bids/${selectedBidForResponse._id}/respond`, {
//         manufacturerId: currentManufacturerId,
//         manufacturerName: currentManufacturerName,
//         action: action, // 'Accept', 'Reject', 'Counter'
//         proposedPrice: priceToPropose,
//       });
//       showAlert('Success', response.data.message);
//       fetchCustomerBids(); // Refresh bids list
//       setIsBidResponseModalVisible(false);
//       setManufacturerProposedPrice(''); // Reset price
//     } catch (error) {
//       console.error('Error responding to bid:', error.response ? error.response.data : error.message);
//       showAlert('Error', error.response?.data?.message || 'Failed to send response. Please try again.');
//     } finally {
//       setBidsLoading(false);
//     }
//   };

//   const getChatRoomId = (customerId, manufacturerId) => {
//     const participants = [customerId, manufacturerId].sort();
//     return `${participants[0]}_${participants[1]}`;
//   };

//   const renderProductItem = ({ item }) => (
//     <View style={styles.productCard}>
//       <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.productImage} />
//       <View style={styles.productInfo}>
//         <Text style={styles.productName}>{item.name}</Text>
//         <Text style={styles.productPrice}>Rs.{item.price?.toFixed(2)}</Text>
//         <Text style={styles.productType}>{item.type}</Text>
//         <Text style={styles.manufacturerIdText}>ID: {item.id}</Text>
//         <View style={styles.productActions}>
//           <TouchableOpacity onPress={() => startEditProduct(item)} style={[styles.actionButton, styles.editButton]}>
//             <Ionicons name="create-outline" size={20} color="#fff" />
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => handleDeleteProduct(item.id)} style={[styles.actionButton, styles.deleteButton]}>
//             <Ionicons name="trash-outline" size={20} color="#fff" />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );

//   const renderBidItem = ({ item }) => {
//     console.log(`Manufacturer Bid ID: ${item._id}, Status: ${item.status}, Accepted Mfg ID: ${item.acceptedManufacturerId}, My ID: ${currentManufacturerId}`);
//     const myResponse = item.manufacturerResponses.find(res => res.manufacturerId === currentManufacturerId);
//     const isAcceptedByCustomer = item.status === 'Customer Accepted' && item.acceptedManufacturerId === currentManufacturerId;

//     // Determine if chat button should be visible based on the new logic
//     const canChat = (
//         isAcceptedByCustomer || // Scenario 1: Customer accepted this manufacturer's bid
//         (myResponse && item.status !== 'Customer Rejected' && item.status !== 'Cancelled') // Scenario 2: This manufacturer has responded and the bid is not fully closed by customer rejection/cancellation
//     );

//     return (
//       <View style={styles.bidCard}>
//         <Text style={styles.bidTitle}>Bid from: {item.customerName} (ID: {item._id})</Text>
//         <Text style={styles.bidDetail}>Proposed Price: Rs.{item.customerProposedPrice?.toFixed(2)}</Text>
//         <Text style={styles.bidDetail}>Design Type: {item.designType}</Text>
//         <Text style={styles.bidDetail}>Status: <Text style={[styles.bidStatus, styles[`status${item.status.replace(/\s/g, '')}`]]}>{item.status}</Text></Text>

//         {/* Display Manufacturer Responses (if any) */}
//         {item.manufacturerResponses && item.manufacturerResponses.length > 0 && (
//           <View style={styles.manufacturerResponsesContainer}>
//             <Text style={styles.responsesTitle}>Your Response History:</Text>
//             {item.manufacturerResponses
//               .filter(res => res.manufacturerId === currentManufacturerId) // Only show *this* manufacturer's response
//               .map((response, idx) => (
//                 <View key={idx} style={styles.myResponseCard}>
//                   <Text style={styles.responseDetail}>Your Price: {response.proposedPrice ? `Rs.${response.proposedPrice?.toFixed(2)}` : 'N/A'}</Text>
//                   <Text style={styles.responseStatus}>Status: <Text style={[styles.statusText, styles[`status${response.status}`]]}>{response.status}</Text></Text>
//                   <Text style={styles.responseDetail}>Responded: {new Date(response.responseDate).toLocaleDateString()}</Text>
//                 </View>
//               ))}
//           </View>
//         )}

//         {/* Manufacturer Actions */}
//         {!isAcceptedByCustomer && item.status !== 'Customer Accepted' && item.status !== 'Customer Rejected' && (
//           <View style={styles.bidActions}>
//             {!myResponse || (myResponse && myResponse.status !== 'Accepted') ? ( // Show if not yet responded or if their response wasn't accepted
//               <>
//                 <TouchableOpacity
//                   style={[styles.bidActionButton, styles.acceptBidButton]}
//                   onPress={() => openBidResponseModal(item)} // Open modal to choose action
//                 >
//                   <Text style={styles.bidActionButtonText}>{myResponse ? 'Change Response' : 'Respond to Bid'}</Text>
//                 </TouchableOpacity>
//               </>
//             ) : null}
//           </View>
//         )}


//         {/* Chat Button */}
//         {canChat && ( // Apply new chat button logic
//           <TouchableOpacity
//             style={styles.chatButton}
//             onPress={() => navigation.navigate('ChatScreen', {
//               chatRoomId: getChatRoomId(item.customerId, currentManufacturerId),
//               senderId: currentManufacturerId, // Manufacturer is sender
//               receiverId: item.customerId, // Customer is receiver
//               senderName: currentManufacturerName,
//               receiverName: item.customerName,
//             })}
//           >
//             <Ionicons name="chatbubbles-outline" size={20} color="white" />
//             <Text style={styles.chatButtonText}>Chat with Customer</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     );
//   };


//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>Manufacturer Dashboard</Text>
//         <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
//           <Ionicons name="log-out-outline" size={24} color="#dc3545" />
//         </TouchableOpacity>
//       </View>

//       <View style={styles.tabContainer}>
//         <TouchableOpacity
//           style={[styles.tabButton, activeTab === 'products' && styles.activeTab]}
//           onPress={() => setActiveTab('products')}
//         >
//           <Text style={[styles.tabButtonText, activeTab === 'products' && styles.activeTabText]}>My Products</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tabButton, activeTab === 'bids' && styles.activeTab]}
//           onPress={() => setActiveTab('bids')}
//         >
//           <Text style={[styles.tabButtonText, activeTab === 'bids' && styles.activeTabText]}>Customer Bids</Text>
//         </TouchableOpacity>
//       </View>

//       {activeTab === 'products' ? (
//         <View style={{ flex: 1 }}>
//           <TouchableOpacity style={styles.addProductButton} onPress={() => setIsProductModalVisible(true)}>
//             <Ionicons name="add-circle-outline" size={20} color="white" />
//             <Text style={styles.addProductButtonText}>Add New Product</Text>
//           </TouchableOpacity>

//           {productsLoading ? (
//             <View style={styles.centered}>
//               <ActivityIndicator size="large" color="#6C63FF" />
//               <Text style={styles.loadingText}>Loading products...</Text>
//             </View>
//           ) : productsError ? (
//             <View style={styles.centered}>
//               <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
//               <Text style={styles.errorText}>{productsError}</Text>
//               <TouchableOpacity onPress={fetchManufacturerProducts} style={styles.retryButton}>
//                 <Text style={styles.retryButtonText}>Retry</Text>
//               </TouchableOpacity>
//             </View>
//           ) : products.length === 0 ? (
//             <View style={styles.emptyStateContainer}>
//               <Ionicons name="pricetag-outline" size={80} color="#ccc" />
//               <Text style={styles.emptyStateText}>You haven't added any products yet.</Text>
//               <TouchableOpacity onPress={() => setIsProductModalVisible(true)} style={styles.browseButton}>
//                 <Text style={styles.browseButtonText}>Add Your First Product</Text>
//               </TouchableOpacity>
//             </View>
//           ) : (
//             <FlatList
//               data={products}
//               renderItem={renderProductItem}
//               keyExtractor={item => item.id.toString()}
//               contentContainerStyle={styles.productList}
//             />
//           )}
//         </View>
//       ) : (
//         <View style={{ flex: 1 }}>
//           {bidsLoading ? (
//             <View style={styles.centered}>
//               <ActivityIndicator size="large" color="#6C63FF" />
//               <Text style={styles.loadingText}>Loading customer bids...</Text>
//             </View>
//           ) : bidsError ? (
//             <View style={styles.centered}>
//               <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
//               <Text style={styles.errorText}>{bidsError}</Text>
//               <TouchableOpacity onPress={fetchCustomerBids} style={styles.retryButton}>
//                 <Text style={styles.retryButtonText}>Retry</Text>
//               </TouchableOpacity>
//             </View>
//           ) : customerBids.length === 0 ? (
//             <View style={styles.emptyStateContainer}>
//               <Ionicons name="mail-outline" size={80} color="#ccc" />
//               <Text style={styles.emptyStateText}>No new bids from customers yet.</Text>
//             </View>
//           ) : (
//             <FlatList
//               data={customerBids}
//               renderItem={renderBidItem}
//               keyExtractor={item => item._id.toString()}
//               contentContainerStyle={styles.bidList}
//             />
//           )}
//         </View>
//       )}

//       {/* Product Add/Edit Modal */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={isProductModalVisible}
//         onRequestClose={() => setIsProductModalVisible(false)}
//       >
//         <View style={styles.centeredView}>
//           <View style={styles.modalView}>
//             <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Product ID (e.g., 101)"
//               keyboardType="numeric"
//               value={productId}
//               onChangeText={setProductId}
//               editable={!editingProduct} // ID should not be editable when editing
//             />
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Product Name"
//               value={productName}
//               onChangeText={setProductName}
//             />
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Price (e.g., 500.00)"
//               keyboardType="numeric"
//               value={productPrice}
//               onChangeText={setProductPrice}
//             />
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Product Type (e.g., T-Shirt, Mug, Poster, Sticker)"
//               value={productType}
//               onChangeText={setProductType}
//             />
//             <TextInput
//               style={styles.modalInput}
//               placeholder="Image URL (optional)"
//               value={productImage}
//               onChangeText={setProductImage}
//             />
//             <View style={styles.modalButtons}>
//               <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={resetForm}>
//                 <Text style={styles.secondaryButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity style={[styles.modalButton, styles.primaryButton]} onPress={handleAddUpdateProduct}>
//                 {productsLoading ? (
//                     <ActivityIndicator color="#fff" />
//                 ) : (
//                     <Text style={styles.primaryButtonText}>{editingProduct ? 'Update Product' : 'Add Product'}</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* Bid Response Modal */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={isBidResponseModalVisible}
//         onRequestClose={() => setIsBidResponseModalVisible(false)}
//       >
//         <View style={styles.centeredView}>
//           <View style={styles.modalView}>
//             <Text style={styles.modalTitle}>Respond to Bid</Text>
//             {selectedBidForResponse && (
//                 <>
//                     <Text style={styles.modalText}>Customer Proposed: Rs.{selectedBidForResponse.customerProposedPrice?.toFixed(2)}</Text>
//                     <Text style={styles.modalText}>For: {selectedBidForResponse.designType}</Text>
//                 </>
//             )}

//             <TextInput
//               style={styles.modalInput}
//               placeholder="Your Proposed Price (Optional, for Counter)"
//               keyboardType="numeric"
//               value={manufacturerProposedPrice}
//               onChangeText={setManufacturerProposedPrice}
//             />

//             <View style={styles.modalButtons}>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.secondaryButton]}
//                 onPress={() => setIsBidResponseModalVisible(false)}
//               >
//                 <Text style={styles.secondaryButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.acceptBidButton]}
//                 onPress={() => handleManufacturerResponse('Accept')}
//               >
//                 {bidsLoading ? (
//                     <ActivityIndicator color="#fff" />
//                 ) : (
//                     <Text style={styles.bidActionButtonText}>Accept Bid</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//             <TouchableOpacity
            
//               style={[styles.modalButton, styles.counterBidButton, { marginTop: 10 }]} // Separate row for Counter/Reject
//               onPress={() => handleManufacturerResponse('Counter')}
//               disabled={!manufacturerProposedPrice || parseFloat(manufacturerProposedPrice) <= 0}
//             >
//               {bidsLoading ? (
//                   <ActivityIndicator color="#fff" />
//               ) : (
//                   <Text style={styles.bidActionButtonText}>Counter Bid</Text>
//               )}
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.modalButton, styles.rejectBidButton, { marginTop: 10 }]}
//               onPress={() => handleManufacturerResponse('Reject')}
//             >
//               {bidsLoading ? (
//                   <ActivityIndicator color="#fff" />
//               ) : (
//                   <Text style={styles.bidActionButtonText}>Reject Bid</Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* Custom Alert Modal */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={alertModalVisible}
//         onRequestClose={() => setAlertModalVisible(false)}
//       >
//         <View style={styles.centeredView}>
//           <View style={styles.modalView}>
//             <Text style={styles.modalTitle}>{alertTitle}</Text>
//             <Text style={styles.modalText}>{alertMessage}</Text>
//             <TouchableOpacity
//               style={[styles.modalButton, styles.primaryButton]}
//               onPress={() => setAlertModalVisible(false)}
//             >
//               <Text style={styles.primaryButtonText}>OK</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f8f8',
//     paddingTop: StatusBar.currentHeight || 0,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//     backgroundColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 1.5,
//     elevation: 3,
//   },
//   headerTitle: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   logoutButton: {
//     padding: 5,
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     backgroundColor: '#fff',
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//     shadowColor: '#fff',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 1,
//     elevation: 2,
//   },
//   tabButton: {
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 20,
//   },
//   activeTab: {
//     backgroundColor: 'rgba(215, 6, 100, 0.6)',
//   },
//   tabButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#555',
//   },
//   activeTabText: {
//     color: 'white',
//   },
//   addProductButton: {
//     backgroundColor: 'rgba(215, 6, 100, 0.6)',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     borderRadius: 10,
//     margin: 16,
//     shadowColor: '#fff',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//     elevation: 5,
//   },
//   addProductButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginLeft: 8,
//   },
//   productList: {
//     paddingHorizontal: 16,
//     paddingBottom: 20,
//   },
//   productCard: {
//     backgroundColor: '#fff',
//     borderRadius: 15,
//     marginBottom: 15,
//     padding: 15,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     elevation: 5,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   productImage: {
//     width: 90,
//     height: 90,
//     borderRadius: 10,
//     marginRight: 15,
//     resizeMode: 'cover',
//   },
//   productInfo: {
//     flex: 1,
//   },
//   productName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 5,
//   },
//   productPrice: {
//     fontSize: 16,
//     color: '#e91e63',
//     fontWeight: 'bold',
//     marginBottom: 5,
//   },
//   productType: {
//     fontSize: 14,
//     color: '#777',
//   },
//   manufacturerIdText: {
//     fontSize: 12,
//     color: '#888',
//     marginTop: 5,
//   },
//   productActions: {
//     flexDirection: 'row',
//     marginTop: 10,
//     gap: 10,
//   },
//   actionButton: {
//     padding: 8,
//     borderRadius: 8,
//   },
//   editButton: {
//     backgroundColor: '#007BFF', // Blue
//   },
//   deleteButton: {
//     backgroundColor: '#DC3545', // Red
//   },
//   // Modal Styles (for Product Add/Edit)
//   centeredView: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.6)',
//   },
//   modalView: {
//     margin: 20,
//     backgroundColor: 'white',
//     borderRadius: 20,
//     padding: 35,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//     elevation: 10,
//     width: '90%',
//     maxWidth: 400,
//   },
//   modalTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     color: '#333',
//     textAlign: 'center',
//   },
//   modalInput: {
//     width: '100%',
//     height: 50,
//     borderColor: '#ddd',
//     borderWidth: 1,
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     fontSize: 16,
//     marginBottom: 15,
//     backgroundColor: '#f9f9f9',
//     color: '#333',
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     width: '100%',
//     marginTop: 10,
//   },
//   modalButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 10,
//     alignItems: 'center',
//     marginHorizontal: 5,
//   },
//   primaryButton: {
//     backgroundColor: '#6C63FF',
//   },
//   primaryButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   secondaryButton: {
//     backgroundColor: '#e0e0e0',
//   },
//   secondaryButtonText: {
//     color: '#333',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   centered: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: '#6C63FF',
//   },
//   errorText: {
//     color: '#dc3545',
//     fontSize: 16,
//     textAlign: 'center',
//     marginHorizontal: 20,
//     marginBottom: 15,
//   },
//   retryButton: {
//     backgroundColor: '#6C63FF',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//   },
//   retryButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   emptyStateContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   emptyStateText: {
//     fontSize: 20,
//     color: '#888',
//     marginTop: 20,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   browseButton: {
//     backgroundColor: '#6C63FF',
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     borderRadius: 10,
//     marginTop: 30,
//     shadowColor: '#6C63FF',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//     elevation: 5,
//   },
//   browseButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   // Bid Specific Styles
//   bidList: {
//     paddingHorizontal: 16,
//     paddingBottom: 20,
//   },
//   bidCard: {
//     backgroundColor: '#fff',
//     borderRadius: 15,
//     marginBottom: 15,
//     padding: 15,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     elevation: 5,
//     borderLeftWidth: 5,
//     borderLeftColor: '#FFC107', // Accent color for bids
//   },
//   bidTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 8,
//   },
//   bidDetail: {
//     fontSize: 15,
//     color: '#555',
//     marginBottom: 5,
//   },
//   bidStatus: {
//     fontWeight: 'bold',
//   },
//   statusPending: {
//     color: '#FFC107', // Amber
//   },
//   statusManufacturerCountered: {
//     color: '#007BFF', // Blue
//   },
//   statusManufacturerAccepted: {
//     color: '#28A745', // Green
//   },
//   statusCustomerAccepted: {
//     color: '#28A745', // Green
//   },
//   statusCustomerRejected: {
//     color: '#DC3545', // Red
//   },
//   statusCancelled: {
//     color: '#6C757D', // Gray
//   },
//   bidActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginTop: 15,
//   },
//   bidActionButton: {
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//     flex: 1,
//     marginHorizontal: 5,
//   },
//   bidActionButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 14,
//   },
//   acceptBidButton: {
//     backgroundColor: 'rgba(215, 6, 100, 0.6)', // Green
//   },
//   counterBidButton: {
//     backgroundColor: '#007BFF', // Blue
//   },
//   rejectBidButton: {
//     backgroundColor: '#DC3545', // Red
//   },
//   chatButton: { // THIS IS THE CHAT BUTTON STYLE
//     backgroundColor: 'rgba(215, 6, 100, 0.89)',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 10,
//     borderRadius: 8,
//     marginTop: 10,
//   },
//   chatButtonText: {
//     color: 'white',
//     fontSize: 14,
//     fontWeight: 'bold',
//     marginLeft: 5,
//   },
//   manufacturerResponsesContainer: {
//     marginTop: 15,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//     paddingTop: 10,
//   },
//   responsesTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 10,
//   },
//   myResponseCard: {
//     backgroundColor: '#e6e6fa', // Light purple for my response
//     borderRadius: 10,
//     padding: 12,
//     marginBottom: 10,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 1,
//   },
// });
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { API_BASE_URL, SOCKET_SERVER_URL } from './config';

let socket;

export default function ManufacturerDashboard() {
  const navigation = useNavigation();

  // Product management states
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productType, setProductType] = useState('T-Shirt');
  const [productImage, setProductImage] = useState('');
  const [productId, setProductId] = useState('');
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Bidding management states
  const [activeTab, setActiveTab] = useState('products');
  const [customerBids, setCustomerBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidsError, setBidsError] = useState(null);
  const [currentManufacturerId, setCurrentManufacturerId] = useState(null);
  const [currentManufacturerName, setCurrentManufacturerName] = useState('');

  // Bid response modal states
  const [isBidResponseModalVisible, setIsBidResponseModalVisible] = useState(false);
  const [selectedBidForResponse, setSelectedBidForResponse] = useState(null);
  const [manufacturerProposedPrice, setManufacturerProposedPrice] = useState('');

  // Custom Alert Modal state
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');

  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertModalVisible(true);
  };

  const getManufacturerIdAndName = useCallback(async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedUserName = await AsyncStorage.getItem('userName');
      if (storedUserId && storedUserName) {
        setCurrentManufacturerId(storedUserId);
        setCurrentManufacturerName(storedUserName);
      } else {
        showAlert('Authentication Error', 'Manufacturer data not found. Please log in.');
        navigation.navigate('Auth');
      }
    } catch (e) {
      console.error('Failed to get manufacturer data from AsyncStorage:', e);
      showAlert('Error', 'Failed to retrieve manufacturer data.');
    }
  }, [navigation]);

  const fetchManufacturerProducts = useCallback(async () => {
    if (!currentManufacturerId) return;
    setProductsLoading(true);
    setProductsError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/products?manufacturerId=${currentManufacturerId}`);
      setProducts(response.data);
    } catch (err) {
      console.error('Error fetching manufacturer products:', err);
      setProductsError('Failed to load your products. Please try again.');
    } finally {
      setProductsLoading(false);
    }
  }, [currentManufacturerId]);

  const fetchCustomerBids = useCallback(async () => {
    if (!currentManufacturerId) return;
    setBidsLoading(true);
    setBidsError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/bids/manufacturer/${currentManufacturerId}`);
      setCustomerBids(response.data);
    } catch (err) {
      console.error('Error fetching customer bids for manufacturer:', err);
      setBidsError('Failed to load customer bids. Please try again.');
    } finally {
      setBidsLoading(false);
    }
  }, [currentManufacturerId]);

  useEffect(() => {
    getManufacturerIdAndName();
  }, [getManufacturerIdAndName]);

  useFocusEffect(
    useCallback(() => {
      if (currentManufacturerId) {
        fetchManufacturerProducts();
        fetchCustomerBids();
      }

      socket = io(SOCKET_SERVER_URL);

      socket.on('connect', () => {
        console.log('Socket connected to ManufacturerDashboard.');
      });

      socket.on('newBidCreated', (newBid) => {
        console.log('Received newBidCreated event:', newBid);
        const relevantToMe = newBid.orderItems.some(item => item.manufacturerId === currentManufacturerId);
        if (relevantToMe || newBid.status === 'Pending') {
            setCustomerBids(prevBids => [newBid, ...prevBids]);
            showAlert('New Bid!', `A new bid for "${newBid.designType}" has been placed by ${newBid.customerName}.`);
        }
      });

      socket.on('bidUpdated', (updatedBid) => {
        console.log('Received bidUpdated event:', updatedBid);
        const hasMyResponse = updatedBid.manufacturerResponses.some(res => res.manufacturerId === currentManufacturerId);
        const acceptedMe = updatedBid.acceptedManufacturerId === currentManufacturerId;

        if (updatedBid.status === 'Customer Accepted' && acceptedMe) {
            showAlert('Bid Accepted!', `Your proposal for bid ID ${updatedBid._id} has been accepted by ${updatedBid.customerName}!`);
        } else if (hasMyResponse) {
             showAlert('Bid Updated', `Your response to bid ID ${updatedBid._id} has been seen by ${updatedBid.customerName}.`);
        }
        fetchCustomerBids();
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected from ManufacturerDashboard.');
      });

      return () => {
        if (socket) {
          socket.disconnect();
        }
      };
    }, [currentManufacturerId, fetchManufacturerProducts, fetchCustomerBids])
  );

  const handleAddUpdateProduct = async () => {
    if (!productName || !productPrice || !productType || !productId) {
      showAlert('Error', 'Please fill in all product fields (ID, Name, Price, Type).');
      return;
    }
    if (!currentManufacturerId) {
        showAlert('Error', 'Manufacturer not logged in.');
        return;
    }

    const productData = {
      id: parseInt(productId),
      name: productName,
      price: parseFloat(productPrice),
      type: productType,
      image: productImage || `https://placehold.co/150x150/e0e0e0/333333?text=${productName.substring(0,3)}`,
      manufacturerId: currentManufacturerId,
    };

    setProductsLoading(true);
    try {
      if (editingProduct) {
        await axios.put(`${API_BASE_URL}/products/${editingProduct.id}`, productData);
        showAlert('Success', 'Product updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/products`, productData);
        showAlert('Success', 'Product added successfully!');
      }
      resetForm();
      fetchManufacturerProducts();
    } catch (error) {
      console.error('Error adding/updating product:', error.response ? error.response.data : error.message);
      showAlert('Error', error.response?.data?.message || 'Failed to save product. Please try again.');
    } finally {
      setProductsLoading(false);
      setIsProductModalVisible(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    showAlert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            setProductsLoading(true);
            try {
              await axios.delete(`${API_BASE_URL}/products/${id}`);
              showAlert('Success', 'Product deleted successfully!');
              fetchManufacturerProducts();
            } catch (error) {
              console.error('Error deleting product:', error.response ? error.response.data : error.message);
              showAlert('Error', 'Failed to delete product. Please try again.');
            } finally {
              setProductsLoading(false);
            }
          },
        },
      ]
    );
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setProductId(product.id.toString());
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setProductType(product.type);
    setProductImage(product.image);
    setIsProductModalVisible(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setProductId('');
    setProductName('');
    setProductPrice('');
    setProductType('T-Shirt');
    setProductImage('');
    setIsProductModalVisible(false);
  };

  const handleLogout = async () => {
    showAlert(
        'Logout',
        'Are you sure you want to log out?',
        [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                onPress: async () => {
                    try {
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('userId');
                        await AsyncStorage.removeItem('userName');
                        await AsyncStorage.removeItem('userRole');
                        showAlert('Logged Out', 'You have been successfully logged out.');
                        navigation.navigate('RoleSelection');
                    } catch (e) {
                        console.error('Logout error:', e);
                        showAlert('Error', 'Failed to log out.');
                    }
                },
            },
        ]
    );
  };

  const openBidResponseModal = (bid) => {
    setSelectedBidForResponse(bid);
    setManufacturerProposedPrice(bid.customerProposedPrice.toString());
    setIsBidResponseModalVisible(true);
  };

  const handleManufacturerResponse = async (action) => {
    if (!selectedBidForResponse || !currentManufacturerId) {
      showAlert('Error', 'No bid selected or manufacturer ID missing.');
      return;
    }

    let priceToPropose = null;
    if (action === 'Counter') {
      if (!manufacturerProposedPrice || parseFloat(manufacturerProposedPrice) <= 0) {
        showAlert('Error', 'Please enter a valid proposed price for your counter offer.');
        return;
      }
      priceToPropose = parseFloat(manufacturerProposedPrice);
    } else if (action === 'Accept') {
      priceToPropose = selectedBidForResponse.customerProposedPrice;
    }

    setBidsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/bids/${selectedBidForResponse._id}/respond`, {
        manufacturerId: currentManufacturerId,
        manufacturerName: currentManufacturerName,
        action: action,
        proposedPrice: priceToPropose,
      });
      showAlert('Success', response.data.message);
      fetchCustomerBids();
      setIsBidResponseModalVisible(false);
      setManufacturerProposedPrice('');
    } catch (error) {
      console.error('Error responding to bid:', error.response ? error.response.data : error.message);
      showAlert('Error', error.response?.data?.message || 'Failed to send response. Please try again.');
    } finally {
      setBidsLoading(false);
    }
  };

  const getChatRoomId = (customerId, manufacturerId) => {
    const participants = [customerId, manufacturerId].sort();
    return `${participants[0]}_${participants[1]}`;
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>Rs.{item.price?.toFixed(2)}</Text>
        <Text style={styles.productType}>{item.type}</Text>
        <Text style={styles.manufacturerIdText}>ID: {item.id}</Text>
        <View style={styles.productActions}>
          <TouchableOpacity onPress={() => startEditProduct(item)} style={[styles.actionButton, styles.editButton]}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteProduct(item.id)} style={[styles.actionButton, styles.deleteButton]}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderBidItem = ({ item }) => {
    const myResponse = item.manufacturerResponses.find(res => res.manufacturerId === currentManufacturerId);
    const isAcceptedByCustomer = item.status === 'Customer Accepted' && item.acceptedManufacturerId === currentManufacturerId;
    const canChat = (
        isAcceptedByCustomer ||
        (myResponse && item.status !== 'Customer Rejected' && item.status !== 'Cancelled')
    );

    return (
      <View style={styles.bidCard}>
        <Text style={styles.bidTitle}>Bid from: {item.customerName} (ID: {item._id})</Text>
        <Text style={styles.bidDetail}>Proposed Price: Rs.{item.customerProposedPrice?.toFixed(2)}</Text>
        <Text style={styles.bidDetail}>Design Type: {item.designType}</Text>
        <Text style={styles.bidDetail}>Status: <Text style={[styles.bidStatus, styles[`status${item.status.replace(/\s/g, '')}`]]}>{item.status}</Text></Text>

        {item.manufacturerResponses && item.manufacturerResponses.length > 0 && (
          <View style={styles.manufacturerResponsesContainer}>
            <Text style={styles.responsesTitle}>Your Response History:</Text>
            {item.manufacturerResponses
              .filter(res => res.manufacturerId === currentManufacturerId)
              .map((response, idx) => (
                <View key={idx} style={styles.myResponseCard}>
                  <Text style={styles.responseDetail}>Your Price: {response.proposedPrice ? `Rs.${response.proposedPrice?.toFixed(2)}` : 'N/A'}</Text>
                  <Text style={styles.responseStatus}>Status: <Text style={[styles.statusText, styles[`status${response.status}`]]}>{response.status}</Text></Text>
                  <Text style={styles.responseDetail}>Responded: {new Date(response.responseDate).toLocaleDateString()}</Text>
                </View>
              ))}
          </View>
        )}

        {!isAcceptedByCustomer && item.status !== 'Customer Accepted' && item.status !== 'Customer Rejected' && (
          <View style={styles.bidActions}>
            {!myResponse || (myResponse && myResponse.status !== 'Accepted') ? (
              <>
                <TouchableOpacity
                  style={[styles.bidActionButton, styles.acceptBidButton]}
                  onPress={() => openBidResponseModal(item)}
                >
                  <Text style={styles.bidActionButtonText}>{myResponse ? 'Change Response' : 'Respond to Bid'}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}

        {canChat && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('ChatScreen', {
              chatRoomId: getChatRoomId(item.customerId, currentManufacturerId),
              senderId: currentManufacturerId,
              receiverId: item.customerId,
              senderName: currentManufacturerName,
              receiverName: item.customerName,
            })}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="white" />
            <Text style={styles.chatButtonText}>Chat with Customer</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manufacturer Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#dc3545" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'products' && styles.activeTabText]}>My Products</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'bids' && styles.activeTab]}
          onPress={() => setActiveTab('bids')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'bids' && styles.activeTabText]}>Customer Bids</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'products' ? (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.addProductButton} onPress={() => setIsProductModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={styles.addProductButtonText}>Add New Product</Text>
          </TouchableOpacity>

          {productsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="rgba(215, 6, 100, 0.89)" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : productsError ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={50} color="rgba(215, 6, 100, 0.89)" />
              <Text style={styles.errorText}>{productsError}</Text>
              <TouchableOpacity onPress={fetchManufacturerProducts} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="pricetag-outline" size={80} color="#ccc" />
              <Text style={styles.emptyStateText}>You haven't added any products yet.</Text>
              <TouchableOpacity onPress={() => setIsProductModalVisible(true)} style={styles.browseButton}>
                <Text style={styles.browseButtonText}>Add Your First Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={products}
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
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.loadingText}>Loading customer bids...</Text>
            </View>
          ) : bidsError ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
              <Text style={styles.errorText}>{bidsError}</Text>
              <TouchableOpacity onPress={fetchCustomerBids} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : customerBids.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="mail-outline" size={80} color="#ccc" />
              <Text style={styles.emptyStateText}>No new bids from customers yet.</Text>
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

      {/* Product Add/Edit Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isProductModalVisible}
        onRequestClose={() => setIsProductModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Product ID (e.g., 101)"
              keyboardType="numeric"
              value={productId}
              onChangeText={setProductId}
              editable={!editingProduct}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Product Name"
              value={productName}
              onChangeText={setProductName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Price (e.g., 500.00)"
              keyboardType="numeric"
              value={productPrice}
              onChangeText={setProductPrice}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Product Type (e.g., T-Shirt, Mug, Poster, Sticker)"
              value={productType}
              onChangeText={setProductType}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Image URL (optional)"
              value={productImage}
              onChangeText={setProductImage}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={resetForm}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.primaryButton]} onPress={handleAddUpdateProduct}>
                {productsLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.primaryButtonText}>{editingProduct ? 'Update Product' : 'Add Product'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bid Response Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isBidResponseModalVisible}
        onRequestClose={() => setIsBidResponseModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Respond to Bid</Text>
            {selectedBidForResponse && (
                <>
                    <Text style={styles.modalText}>Customer Proposed: Rs.{selectedBidForResponse.customerProposedPrice?.toFixed(2)}</Text>
                    <Text style={styles.modalText}>For: {selectedBidForResponse.designType}</Text>
                </>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Your Proposed Price (Required for Counter)"
              keyboardType="numeric"
              value={manufacturerProposedPrice}
              onChangeText={setManufacturerProposedPrice}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={() => setIsBidResponseModalVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.acceptBidButton]}
                onPress={() => handleManufacturerResponse('Accept')}
              >
                {bidsLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.bidActionButtonText}>Accept</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.counterBidButton]}
                onPress={() => handleManufacturerResponse('Counter')}
                disabled={!manufacturerProposedPrice || parseFloat(manufacturerProposedPrice) <= 0}
              >
                {bidsLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.bidActionButtonText}>Counter</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectBidButton]}
                onPress={() => handleManufacturerResponse('Reject')}
              >
                {bidsLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.bidActionButtonText}>Reject</Text>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#fff',
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
  addProductButton: {
    backgroundColor: 'rgba(215, 6, 100, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    margin: 16,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  addProductButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  productList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 15,
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
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
  },
  manufacturerIdText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  productActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: '#007BFF',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
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
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: 'rgba(215, 6, 100, 0.89)',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(215, 6, 100, 0.89)',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'rgba(215, 6, 100, 0.89)',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 20,
    color: '#888',
    marginTop: 20,
    fontWeight: 'bold',
    textAlign: 'center',
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
  bidList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  bidCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: '#FFC107',
  },
  bidTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bidDetail: {
    fontSize: 15,
    color: '#555',
    marginBottom: 5,
  },
  bidStatus: {
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#FFC107',
  },
  statusManufacturerCountered: {
    color: '#007BFF',
  },
  statusManufacturerAccepted: {
    color: '#28A745',
  },
  statusCustomerAccepted: {
    color: '#28A745',
  },
  statusCustomerRejected: {
    color: '#DC3545',
  },
  statusCancelled: {
    color: '#6C757D',
  },
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  bidActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  bidActionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  acceptBidButton: {
    backgroundColor: '#28A745',
  },
  counterBidButton: {
    backgroundColor: '#007BFF',
  },
  rejectBidButton: {
    backgroundColor: '#DC3545',
  },
  chatButton: {
    backgroundColor: 'rgba(215, 6, 100, 0.89)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  manufacturerResponsesContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  responsesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  myResponseCard: {
    backgroundColor: '#e6e6fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});