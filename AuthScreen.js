// // AuthScreen.js - FIXED AND UNCOMMENTED
// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   StatusBar,
//   ActivityIndicator,
//   KeyboardAvoidingView,
//   Platform,
//   Image,
//   Modal, // For custom alert/confirmation
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { useNavigation } from '@react-navigation/native';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage'; // Make sure this is installed: `npx expo install @react-native-async-storage/async-storage`
// import { API_BASE_URL } from './config'; // Make sure this points to your backend API base URL

// const AUTH_API_URL = `${API_BASE_URL}/auth`; // Correct path for auth routes

// export default function AuthScreen({ route }) {
//   const navigation = useNavigation();
//   const initialRole = route.params?.role || 'Customer'; // Default to 'Customer' if no role is passed

//   const [currentForm, setCurrentForm] = useState('login'); // 'login' or 'signup'
//   const [loading, setLoading] = useState(false);
//   const [showLoginPassword, setShowLoginPassword] = useState(false);
//   const [showSignupPassword, setShowSignupPassword] = useState(false);

//   // Login states
//   const [loginEmail, setLoginEmail] = useState('');
//   const [loginPassword, setLoginPassword] = useState('');
//   const [rememberMe, setRememberMe] = useState(false); // Not implemented for AsyncStorage persistence yet, but good to have

//   // Signup states
//   const [signupName, setSignupName] = useState('');
//   const [signupEmail, setSignupEmail] = useState('');
//   const [signupPassword, setSignupPassword] = useState('');
//   const [signupRetypePassword, setSignupRetypePassword] = useState('');

//   // Custom Alert Modal state
//   const [alertModalVisible, setAlertModalVisible] = useState(false);
//   const [alertMessage, setAlertMessage] = useState('');
//   const [alertTitle, setAlertTitle] = useState('');

//   const showAlert = (title, message) => {
//     setAlertTitle(title);
//     setAlertMessage(message);
//     setAlertModalVisible(true);
//   };


//   const handleLogin = async () => {
//     if (!loginEmail || !loginPassword) {
//       showAlert('Input Error', 'Please enter both email and password.');
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await axios.post(`${AUTH_API_URL}/login`, {
//         email: loginEmail,
//         password: loginPassword,
//         role: initialRole, // Pass the selected role during login
//       });

//       const { token, user } = response.data; // Backend should return token and user object

//       // Save user data to AsyncStorage
//       await AsyncStorage.setItem('token', token);
//       await AsyncStorage.setItem('userId', user.id); // Save user's MongoDB _id
//       await AsyncStorage.setItem('userName', user.name);
//       await AsyncStorage.setItem('userRole', user.role);

//       showAlert('Login Success', `Welcome, ${user.name}! You are logged in as ${user.role}.`);

//       // Navigate based on role
//       switch (user.role) {
//         case 'Admin':
//           navigation.replace('AdminDashboard');
//           break;
//         case 'Manufacturer':
//           navigation.replace('ManufacturerDashboard');
//           break;
//         case 'Customer':
//           navigation.replace('CustomerDashboard');
//           break;
//         default:
//           navigation.replace('RoleSelection'); // Fallback
//           break;
//       }
//     } catch (error) {
//       console.error('Login error:', error.response ? error.response.data : error.message);
//       const errorMessage = error.response && error.response.data && error.response.data.message
//                              ? error.response.data.message
//                              : 'Login failed. Please check your credentials.';
//       showAlert('Login Failed', errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSignup = async () => {
//     if (!signupName || !signupEmail || !signupPassword || !signupRetypePassword) {
//       showAlert('Input Error', 'Please fill in all fields.');
//       return;
//     }
//     if (signupPassword !== signupRetypePassword) {
//       showAlert('Input Error', 'Passwords do not match.');
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await axios.post(`${AUTH_API_URL}/signup`, {
//         name: signupName,
//         email: signupEmail,
//         password: signupPassword,
//         role: initialRole, // Pass the selected role during signup
//       });

//       const { message, user } = response.data;

//       // Upon successful signup, attempt to log the user in immediately
//       // or prompt them to log in. For simplicity, we can auto-login if backend returns token.
//       // If backend doesn't return a token on signup, you'd navigate to login form.
//       // Assuming backend returns user, but not token directly on signup for security.
//       showAlert('Signup Success', `${message} Please log in with your new account.`);
//       setCurrentForm('login'); // Redirect to login after successful signup
//       setLoginEmail(signupEmail); // Pre-fill login email
//       setLoginPassword(''); // Clear password field
//       setSignupName(''); // Clear signup form
//       setSignupEmail('');
//       setSignupPassword('');
//       setSignupRetypePassword('');

//     } catch (error) {
//       console.error('Signup error:', error.response ? error.response.data : error.message);
//       const errorMessage = error.response && error.response.data && error.response.data.message
//                              ? error.response.data.message
//                              : 'Signup failed. Please try again.';
//       showAlert('Signup Failed', errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getFormTitle = () => {
//     if (initialRole === 'Admin') {
//       return currentForm === 'login' ? 'Admin Login' : 'Admin Signup';
//     }
//     return currentForm === 'login' ? 'Login' : 'Sign Up';
//   };

//   return (
//     <KeyboardAvoidingView
//       style={styles.container}
//       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//     >
//       <StatusBar barStyle="dark-content" backgroundColor="#fff" />
//       <ScrollView contentContainerStyle={styles.scrollContainer}>
//         <View style={styles.authBox}>
//      <Image
//   source={require('./assets/Logo.png')} // adjust if needed
//   style={styles.logo}
// />

//           <Text style={styles.title}>{getFormTitle()}</Text>
//           <Text style={styles.roleText}>Role: {initialRole}</Text>

//           {currentForm === 'login' ? (
//             // Login Form
//             <>
//               <View style={styles.inputGroup}>
//                 <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Email"
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                   value={loginEmail}
//                   onChangeText={setLoginEmail}
//                 />
//               </View>
//               <View style={styles.inputGroup}>
//                 <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.passwordInput}
//                   placeholder="Password"
//                   secureTextEntry={!showLoginPassword}
//                   value={loginPassword}
//                   onChangeText={setLoginPassword}
//                 />
//                 <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)} style={styles.passwordToggle}>
//                   <Ionicons name={showLoginPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.checkboxRow}>
//                 <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
//                   <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
//                     {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
//                   </View>
//                   <Text style={styles.checkboxLabel}>Remember Me</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity>
//                   <Text style={styles.forgotPassword}>Forgot Password?</Text>
//                 </TouchableOpacity>
//               </View>

//               <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
//                 {loading ? (
//                   <ActivityIndicator color="#fff" />
//                 ) : (
//                   <Text style={styles.primaryButtonText}>Login</Text>
//                 )}
//               </TouchableOpacity>

//               <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentForm('signup')}>
//                 <Text style={styles.secondaryButtonText}>Don't have an account? Sign Up</Text>
//               </TouchableOpacity>
//             </>
//           ) : (
//             // Signup Form
//             <>
//               <View style={styles.inputGroup}>
//                 <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Name"
//                   autoCapitalize="words"
//                   value={signupName}
//                   onChangeText={setSignupName}
//                 />
//               </View>
//               <View style={styles.inputGroup}>
//                 <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Email"
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                   value={signupEmail}
//                   onChangeText={setSignupEmail}
//                 />
//               </View>
//               <View style={styles.inputGroup}>
//                 <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.passwordInput}
//                   placeholder="Password"
//                   secureTextEntry={!showSignupPassword}
//                   value={signupPassword}
//                   onChangeText={setSignupPassword}
//                 />
//                 <TouchableOpacity onPress={() => setShowSignupPassword(!showSignupPassword)} style={styles.passwordToggle}>
//                   <Ionicons name={showSignupPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
//                 </TouchableOpacity>
//               </View>
//               <View style={styles.inputGroup}>
//                 <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.passwordInput}
//                   placeholder="Retype Password"
//                   secureTextEntry={!showSignupPassword}
//                   value={signupRetypePassword}
//                   onChangeText={setSignupRetypePassword}
//                 />
//               </View>

//               <TouchableOpacity style={styles.primaryButton} onPress={handleSignup} disabled={loading}>
//                 {loading ? (
//                   <ActivityIndicator color="#fff" />
//                 ) : (
//                   <Text style={styles.primaryButtonText}>Sign Up</Text>
//                 )}
//               </TouchableOpacity>

//               <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentForm('login')}>
//                 <Text style={styles.secondaryButtonText}>Already have an account? Login</Text>
//               </TouchableOpacity>
//             </>
//           )}
//         </View>
//       </ScrollView>

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
//     backgroundColor: 'rgba(215, 6, 100, 0.6)', // Overall background color
//   },
//   scrollContainer: {
//     flexGrow: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingVertical: 50,
//     paddingHorizontal: 20,
//   },
//   authBox: {
//     width: '100%',
//     maxWidth: 400,
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 30,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 10,
//     },
//     shadowOpacity: 0.1,
//     shadowRadius: 20,
//     elevation: 10,
//   },
//   logo: {
//     width: 100,
//     height: 100,
//     marginBottom: 20,
//     resizeMode: 'cover',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 5,
//   },
//   roleText: {
//     fontSize: 16,
//     color: '#rgba(215, 6, 100, 0.6)',
//     fontWeight: '600',
//     marginBottom: 25,
//   },
//   inputGroup: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     width: '100%',
//     borderColor: '#ddd',
//     borderWidth: 1,
//     borderRadius: 10,
//     marginBottom: 15,
//     backgroundColor: '#f9f9f9',
//   },
//   inputIcon: {
//     paddingLeft: 15,
//     paddingRight: 10,
//     color: '#888',
//   },
//   input: {
//     flex: 1,
//     height: 50,
//     paddingHorizontal: 5,
//     fontSize: 16,
//     color: '#222',
//   },
//   passwordInput: {
//     flex: 1,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     fontSize: 16,
//     color: '#222',
//   },
//   passwordToggle: {
//     paddingHorizontal: 10,
//   },
//   checkboxRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     width: '100%',
//     marginBottom: 25,
//   },
//   checkboxContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   checkbox: {
//     width: 20,
//     height: 20,
//     borderRadius: 3,
//     borderWidth: 1.5,
//     borderColor: '#fff',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 8,
//   },
//   checkboxChecked: {
//     backgroundColor: 'rgba(215, 6, 100, 0.89)',
//   },
//   checkboxLabel: {
//     fontSize: 14,
//     color: '#333',
//   },
//   forgotPassword: {
//     fontSize: 14,
//     color: 'rgba(215, 6, 100, 0.89)',
//     fontWeight: '600',
//   },
//   primaryButton: {
//     backgroundColor: 'rgba(215, 6, 100, 0.89)', // Primary theme color
//     paddingVertical: 14,
//     borderRadius: 12,
//     alignItems: 'center',
//     width: '100%',
//     marginBottom: 15,
//     shadowColor: '#6C63FF',
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 0.4,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   primaryButtonText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '700',
//   },
//   secondaryButton: {
//     paddingVertical: 10,
//     alignItems: 'center',
//     width: '100%',
//   },
//   secondaryButtonText: {
//     color: 'rgba(215, 6, 100, 0.89)',
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   // Modal Styles (for Custom Alert)
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
// });
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal, // For custom alert/confirmation
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Make sure this is installed: `npx expo install @react-native-async-storage/async-storage`
import { API_BASE_URL } from './config'; // Make sure this points to your backend API base URL

const AUTH_API_URL = `${API_BASE_URL}/auth`; // Correct path for auth routes

export default function AuthScreen({ route }) {
  const navigation = useNavigation();
  const initialRole = route.params?.role || 'Customer'; // Default to 'Customer' if no role is passed

  const [currentForm, setCurrentForm] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // Not implemented for AsyncStorage persistence yet, but good to have

  // Signup states
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRetypePassword, setSignupRetypePassword] = useState('');

  // Custom Alert Modal state
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertPrimaryButtonText, setAlertPrimaryButtonText] = useState('OK');
  const [alertPrimaryButtonAction, setAlertPrimaryButtonAction] = useState(() => () => setAlertModalVisible(false));
  const [showAlertRetryButton, setShowAlertRetryButton] = useState(false);
  const [alertRetryButtonAction, setAlertRetryButtonAction] = useState(() => () => {}); // Default empty function

  /**
   * Displays a custom alert modal.
   * @param {string} title - The title of the alert.
   * @param {string} message - The message content of the alert.
   * @param {string} [primaryBtnText='OK'] - Text for the primary button.
   * @param {function} [primaryBtnAction=() => setAlertModalVisible(false)] - Action for the primary button.
   * @param {boolean} [showRetryBtn=false] - Whether to show a secondary "Retry" button.
   * @param {function} [retryBtnAction=() => {}] - Action for the retry button.
   */
  const showAlert = (title, message, primaryBtnText = 'OK', primaryBtnAction = () => setAlertModalVisible(false), showRetryBtn = false, retryBtnAction = () => {}) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertPrimaryButtonText(primaryBtnText);
    setAlertPrimaryButtonAction(() => primaryBtnAction); // Use a function wrapper to prevent direct execution
    setShowAlertRetryButton(showRetryBtn);
    setAlertRetryButtonAction(() => retryBtnAction); // Use a function wrapper
    setAlertModalVisible(true);
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      showAlert('Input Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API_URL}/login`, {
        email: loginEmail,
        password: loginPassword,
        role: initialRole, // Pass the selected role during login
      });

      const { token, user } = response.data; // Backend should return token and user object

      // Save user data to AsyncStorage
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userId', user.id); // Save user's MongoDB _id
      await AsyncStorage.setItem('userName', user.name);
      await AsyncStorage.setItem('userRole', user.role);

      showAlert('Login Success', `Welcome, ${user.name}! You are logged in as ${user.role}.`);

      // Navigate based on role
      switch (user.role) {
        case 'Admin':
          navigation.replace('AdminDashboard');
          break;
        case 'Manufacturer':
          navigation.replace('ManufacturerDashboard');
          break;
        case 'Customer':
          navigation.replace('CustomerDashboard');
          break;
        default:
          navigation.replace('RoleSelection'); // Fallback
          break;
      }
    } catch (error) {
      console.error('Login error:', error.response ? error.response.data : error.message);
      const errorMessage = error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : 'Login failed. Please check your credentials.';
      
      // Call showAlert with retry option for login failures
      showAlert(
        'Login Failed', 
        errorMessage, 
        'Dismiss', 
        () => setAlertModalVisible(false), // Dismiss button action
        true, // Show retry button
        () => { // Retry button action
          setAlertModalVisible(false); // Close current alert
          handleLogin(); // Attempt login again
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupName || !signupEmail || !signupPassword || !signupRetypePassword) {
      showAlert('Input Error', 'Please fill in all fields.');
      return;
    }
    if (signupPassword !== signupRetypePassword) {
      showAlert('Input Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API_URL}/signup`, {
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: initialRole, // Pass the selected role during signup
      });

      const { message, user } = response.data;

      showAlert('Signup Success', `${message} Please log in with your new account.`);
      setCurrentForm('login'); // Redirect to login after successful signup
      setLoginEmail(signupEmail); // Pre-fill login email
      setLoginPassword(''); // Clear password field
      setSignupName(''); // Clear signup form
      setSignupEmail('');
      setSignupPassword('');
      setSignupRetypePassword('');

    } catch (error) {
      console.error('Signup error:', error.response ? error.response.data : error.message);
      const errorMessage = error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : 'Signup failed. Please try again.';
      showAlert('Signup Failed', errorMessage); // No retry for signup
    } finally {
      setLoading(false);
    }
  };

  const getFormTitle = () => {
    if (initialRole === 'Admin') {
      return currentForm === 'login' ? 'Admin Login' : 'Admin Signup';
    }
    return currentForm === 'login' ? 'Login' : 'Sign Up';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.authBox}>
          <Image
            source={require('./assets/Logo.png')} // adjust if needed
            style={styles.logo}
          />

          <Text style={styles.title}>{getFormTitle()}</Text>
          <Text style={styles.roleText}>Role: {initialRole}</Text>

          {currentForm === 'login' ? (
            // Login Form
            <>
              <View style={styles.inputGroup}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                />
              </View>
              <View style={styles.inputGroup}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  secureTextEntry={!showLoginPassword}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                />
                <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)} style={styles.passwordToggle}>
                  <Ionicons name={showLoginPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.checkboxRow}>
                <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Remember Me</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Login</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentForm('signup')}>
                <Text style={styles.secondaryButtonText}>Don't have an account? Sign Up</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Signup Form
            <>
              <View style={styles.inputGroup}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  autoCapitalize="words"
                  value={signupName}
                  onChangeText={setSignupName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                />
              </View>
              <View style={styles.inputGroup}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  secureTextEntry={!showSignupPassword}
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                />
                <TouchableOpacity onPress={() => setShowSignupPassword(!showSignupPassword)} style={styles.passwordToggle}>
                  <Ionicons name={showSignupPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroup}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Retype Password"
                  secureTextEntry={!showSignupPassword}
                  value={signupRetypePassword}
                  onChangeText={setSignupRetypePassword}
                />
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleSignup} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentForm('login')}>
                <Text style={styles.secondaryButtonText}>Already have an account? Login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

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
            <View style={styles.modalButtonContainer}> {/* Container for buttons */}
              {showAlertRetryButton && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.primaryButton]} // Reusing primaryButton style for retry
                  onPress={alertRetryButtonAction}
                >
                  <Text style={styles.primaryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  showAlertRetryButton ? styles.secondaryButtonModal : styles.primaryButton // Adjust style if retry button is present
                ]}
                onPress={alertPrimaryButtonAction}
              >
                <Text style={showAlertRetryButton ? styles.secondaryButtonTextModal : styles.primaryButtonText}>
                  {alertPrimaryButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(215, 6, 100, 0.6)', // Overall background color
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  authBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  roleText: {
    fontSize: 16,
    color: '#rgba(215, 6, 100, 0.6)',
    fontWeight: '600',
    marginBottom: 25,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    paddingLeft: 15,
    paddingRight: 10,
    color: '#888',
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 5,
    fontSize: 16,
    color: '#222',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#222',
  },
  passwordToggle: {
    paddingHorizontal: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 25,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: 'rgba(215, 6, 100, 0.89)',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  forgotPassword: {
    fontSize: 14,
    color: 'rgba(215, 6, 100, 0.89)',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: 'rgba(215, 6, 100, 0.89)', // Primary theme color
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: 'rgba(215, 6, 100, 0.89)',
    fontSize: 16,
    fontWeight: '500',
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
  modalButtonContainer: {
    flexDirection: 'row', // Arrange buttons horizontally
    justifyContent: 'space-around', // Space them out
    width: '100%', // Take full width
  },
  modalButton: {
    // Shared styles for modal buttons
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    flex: 1, // Allow buttons to take equal space
  },
  // Specific style for the secondary button in the modal if needed
  secondaryButtonModal: {
    backgroundColor: '#eee', // A lighter background for the secondary action
    borderColor: 'rgba(215, 6, 100, 0.89)',
    borderWidth: 1,
  },
  secondaryButtonTextModal: {
    color: 'rgba(215, 6, 100, 0.89)',
    fontSize: 16,
    fontWeight: '500',
  },
});