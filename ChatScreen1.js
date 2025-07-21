// // ChatScreen.js
// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   FlatList,
//   KeyboardAvoidingView,
//   Platform,
//   ActivityIndicator,
//   Modal, // For custom alert messages
//   StatusBar,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import io from 'socket.io-client';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { SOCKET_SERVER_URL, API_BASE_URL } from './config'; // Import URLs

// let socket; // Declare socket outside to maintain single instance across re-renders

// export default function ChatScreen() {
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [currentUserId, setCurrentUserId] = useState(null);
//   const [currentUserName, setCurrentUserName] = useState('');

//   const navigation = useNavigation();
//   const route = useRoute();
//   const flatListRef = useRef(null);

//   // Extract parameters passed from Order.js or ManufacturerDashboard.js or CustomerDashboard.js
//   const { chatRoomId, senderId, receiverId, senderName, receiverName } = route.params || {};

//   // Custom Alert Modal state
//   const [alertModalVisible, setAlertModalVisible] = useState(false);
//   const [alertMessage, setAlertMessage] = useState('');
//   const [alertTitle, setAlertTitle] = useState('');

//   const showAlert = (title, message) => {
//     setAlertTitle(title);
//     setAlertMessage(message);
//     setAlertModalVisible(true);
//   };

//   const getUserIdAndName = useCallback(async () => {
//     try {
//       const storedUserId = await AsyncStorage.getItem('userId');
//       const storedUserName = await AsyncStorage.getItem('userName');
//       if (storedUserId) {
//         setCurrentUserId(storedUserId);
//         setCurrentUserName(storedUserName || 'You'); // Fallback name
//       } else {
//         showAlert('Authentication Error', 'User not logged in. Cannot access chat.');
//         navigation.navigate('Auth');
//       }
//     } catch (e) {
//       console.error('Failed to get userId from AsyncStorage:', e);
//       showAlert('Error', 'Failed to retrieve user data. Please try again.');
//     }
//   }, [navigation]);

//   // Function to fetch historical messages
//   const fetchMessages = useCallback(async () => {
//     if (!chatRoomId) {
//       setError('Chat room ID is missing.');
//       setLoading(false);
//       return;
//     }
//     setLoading(true);
//     setError(null);
//     try {
//       const response = await axios.get(`${API_BASE_URL}/chat/messages/${chatRoomId}`);
//       setMessages(response.data);
//     } catch (err) {
//       console.error('Error fetching historical messages:', err);
//       setError('Failed to load messages. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   }, [chatRoomId]);

//   useEffect(() => {
//     getUserIdAndName();
//   }, [getUserIdAndName]);

//   useEffect(() => {
//     if (!chatRoomId || !senderId || !receiverId || !currentUserId) {
//       console.warn('ChatScreen: Missing required parameters. Cannot establish chat.');
//       setError('Chat cannot be established. Missing chat room or user information.');
//       setLoading(false);
//       return;
//     }

//     // Connect to Socket.IO server
//     socket = io(SOCKET_SERVER_URL);

//     socket.on('connect', () => {
//       console.log('Connected to Socket.IO server.');
//       setIsConnected(true);
//       // Join the specific chat room
//       socket.emit('joinRoom', { chatRoomId });
//       fetchMessages(); // Fetch messages after joining room
//     });

//     socket.on('disconnect', () => {
//       console.log('Disconnected from Socket.IO server.');
//       setIsConnected(false);
//     });

//     // Listen for incoming messages
//     socket.on('receiveMessage', (message) => {
//       console.log('Received message:', message);
//       setMessages((prevMessages) => [...prevMessages, message]);
//       // Scroll to bottom after new message (needs a slight delay for FlatList to render)
//       setTimeout(() => {
//         if (flatListRef.current) {
//           flatListRef.current.scrollToEnd({ animated: true });
//         }
//       }, 100);
//     });

//     // Error handling for socket
//     socket.on('connect_error', (err) => {
//       console.error('Socket.IO connection error:', err.message);
//       setError('Failed to connect to chat server.');
//       setIsConnected(false);
//     });

//     return () => {
//       // Clean up socket connection when component unmounts
//       if (socket) {
//         socket.disconnect();
//       }
//     };
//   }, [chatRoomId, senderId, receiverId, currentUserId, fetchMessages]);


//   const handleSendMessage = async () => {
//     if (newMessage.trim() === '' || !isConnected || !chatRoomId || !senderId || !receiverId) {
//       return;
//     }

//     try {
//       const messageData = {
//         chatRoomId,
//         senderId: currentUserId, // Use the actual current logged-in user as sender
//         receiverId: receiverId, // The recipient from route params
//         text: newMessage.trim(),
//       };
//       socket.emit('sendMessage', messageData);
//       setNewMessage(''); // Clear input field
//       // Messages will be added to state via 'receiveMessage' listener
//     } catch (error) {
//       console.error('Error sending message via socket:', error);
//       showAlert('Error', 'Failed to send message. Please try again.');
//     }
//   };

//   const renderMessage = ({ item }) => {
//     const isCurrentUser = item.senderId === currentUserId;
//     return (
//       <View style={[styles.messageBubble, isCurrentUser ? styles.messageSender : styles.messageReceiver]}>
//         <Text style={isCurrentUser ? styles.messageTextSender : styles.messageTextReceiver}>
//           {item.text}
//         </Text>
//         <Text style={isCurrentUser ? styles.messageTimestampSender : styles.messageTimestampReceiver}>
//           {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//         </Text>
//       </View>
//     );
//   };

//   const headerTitle = receiverName ? `Chat with ${receiverName}` : 'Chat';

//   return (
//     <KeyboardAvoidingView
//       style={styles.container}
//       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//       keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} // Adjust as needed
//     >
//       <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color="#6C63FF" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>{headerTitle}</Text>
//         <View style={{ width: 24 }} /> {/* Spacer for alignment */}
//       </View>

//       {loading ? (
//         <View style={styles.centered}>
//           <ActivityIndicator size="large" color="#6C63FF" />
//           <Text style={styles.loadingText}>Loading messages...</Text>
//         </View>
//       ) : error ? (
//         <View style={styles.centered}>
//           <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
//           <Text style={styles.errorText}>{error}</Text>
//           <TouchableOpacity onPress={fetchMessages} style={styles.retryButton}>
//             <Text style={styles.retryButtonText}>Retry</Text>
//           </TouchableOpacity>
//         </View>
//       ) : (
//         <FlatList
//           ref={flatListRef}
//           data={messages}
//           renderItem={renderMessage}
//           keyExtractor={(item) => item._id}
//           contentContainerStyle={styles.messageList}
//           onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
//           onLayout={() => flatListRef.current.scrollToEnd({ animated: true })}
//         />
//       )}

//       <View style={styles.inputContainer}>
//         <TextInput
//           style={styles.messageInput}
//           placeholder="Type a message..."
//           value={newMessage}
//           onChangeText={setNewMessage}
//           multiline={true}
//           editable={isConnected} // Disable input if not connected
//         />
//         <TouchableOpacity
//           style={styles.sendButton}
//           onPress={handleSendMessage}
//           disabled={newMessage.trim() === '' || !isConnected}
//         >
//           <Ionicons name="send" size={24} color={newMessage.trim() === '' || !isConnected ? '#ccc' : '#fff'} />
//         </TouchableOpacity>
//       </View>

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

//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f0f2f5', // Light gray background for chat
//     paddingTop: StatusBar.currentHeight || 0,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e0e0e0',
//     backgroundColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 1.5,
//     elevation: 3,
//   },
//   backButton: {
//     padding: 5,
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   messageList: {
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//   },
//   messageBubble: {
//     maxWidth: '80%',
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//     borderRadius: 18,
//     marginBottom: 10,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 1,
//   },
//   messageSender: {
//     alignSelf: 'flex-end',
//     backgroundColor: 'rgba(215, 6, 100, 0.8)', // Primary theme color
//     borderBottomRightRadius: 4,
//   },
//   messageReceiver: {
//     alignSelf: 'flex-start',
//     backgroundColor: 'rgba(250, 250, 250, 0.49)',
//     borderBottomLeftRadius: 4,
//   },
//   messageTextSender: {
//     fontSize: 16,
//     color: 'white',
//   },
//   messageTextReceiver: {
//     fontSize: 16,
//     color: '#333',
//   },
//   messageTimestampSender: {
//     fontSize: 10,
//     color: 'rgba(255,255,255,0.7)',
//     alignSelf: 'flex-end',
//     marginTop: 4,
//   },
//   messageTimestampReceiver: {
//     fontSize: 10,
//     color: '#666',
//     alignSelf: 'flex-start',
//     marginTop: 4,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderTopColor: '#e0e0e0',
//   },
//   messageInput: {
//     flex: 1,
//     minHeight: 40,
//     maxHeight: 120, // Prevent it from growing too large
//     borderColor: '#ddd',
//     borderWidth: 1,
//     borderRadius: 20,
//     paddingHorizontal: 15,
//     paddingTop: 10, // Adjust for multiline
//     paddingBottom: 10, // Adjust for multiline
//     fontSize: 16,
//     marginRight: 10,
//     backgroundColor: '#f9f9f9',
//   },
//   sendButton: {
//     backgroundColor: 'rgba(196, 8, 93, 0.84)',
//     width: 45,
//     height: 45,
//     borderRadius: 22.5,
//     justifyContent: 'center',
//     alignItems: 'center',
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
//   // Custom Alert Modal Styles
//   centeredView: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.6)', // Dim background
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
//     width: '90%', // Responsive width
//     maxWidth: 400, // Max width for larger screens
//   },
//   modalTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     color: '#333',
//     textAlign: 'center',
//   },
//   modalText: {
//     fontSize: 16,
//     color: '#555',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   modalButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 10,
//     alignItems: 'center',
//     marginHorizontal: 5,
//   },
//   primaryButton: {
//     backgroundColor: '#rgba(215, 6, 100, 0.8)', // Primary theme color
//   },
//   primaryButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });
// ChatScreen.js