import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AuthScreen from './AuthScreen';
import AdminDashboard from './AdminDashboard';
import ManufacturerDashboard from './ManufacturerDashboard';
import CustomerDashboard from './CustomerDashboard';
import RoleSelectionScreen from './RoleSelectionScreen';
import Cart from './Cart';
import Order from './Order';
import ChatScreen from './ChatScreen';
// Corrected import path for MugCustomizer.
// Assuming MugCustomizer.js is directly in your project root or in a 'components' folder.
// If it's in the same directory as App.js, use './MugCustomizer'.
// If it's in a 'components' subfolder, use './components/MugCustomizer'.
// I'll use './MugCustomizer' for simplicity based on previous examples,
// but adjust if your file structure is different.
import MugCustomizer from './components/MugCustomizer';

import { ProductProvider } from './ProductContext';
import { CartProvider } from './CartContext';
import { UserProvider } from './UserContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <ProductProvider>
          <CartProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="RoleSelection">
                <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
                <Stack.Screen name="ManufacturerDashboard" component={ManufacturerDashboard} />
                <Stack.Screen name="CustomerDashboard" component={CustomerDashboard} />
                <Stack.Screen name="Cart" component={Cart} />
                <Stack.Screen name="Order" component={Order} />
                <Stack.Screen name="ChatScreen" component={ChatScreen} />

                {/* Modified Screen for MugCustomizer */}
                <Stack.Screen
                  name="MugCustomizer" // IMPORTANT: This name MUST match the one used in CustomerDashboard.js (navigation.navigate('MugCustomizer'))
                  component={MugCustomizer}
                  options={{
                    title: 'Mug Design Lab', // Title displayed in the header
                    headerStyle: {
                      backgroundColor: '#e60159', // Example background color
                    },
                    headerTintColor: '#fff', // Color of the back button and title
                    headerTitleStyle: {
                      fontWeight: 'bold', // Style for the title text
                    },
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </CartProvider>
        </ProductProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}