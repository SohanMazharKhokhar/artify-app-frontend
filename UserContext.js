// UserContext.js
import React, { createContext, useState, useContext } from 'react';
import { Alert } from 'react-native';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [manufacturers, setManufacturers] = useState([
    { id: 'mfg1', name: 'Global Prints Inc.', email: 'global.prints@example.com', products: [] },
    { id: 'mfg2', name: 'Creative Crafts Co.', email: 'creative.crafts@example.com', products: [] },
  ]);

  const [customers, setCustomers] = useState([
    { id: 'cust1', name: 'Alice Smith', email: 'alice.smith@example.com' },
    { id: 'cust2', name: 'Bob Johnson', email: 'bob.j@example.com' },
  ]);

  const addManufacturer = (newManufacturer) => {
    // Basic validation for unique ID and email (in a real app, integrate with backend)
    if (manufacturers.some(m => m.id === newManufacturer.id || m.email === newManufacturer.email)) {
      Alert.alert('Error', 'Manufacturer with this ID or Email already exists.');
      return false;
    }
    setManufacturers(prev => [...prev, { ...newManufacturer, products: [] }]);
    Alert.alert('Success', 'Manufacturer added successfully!');
    return true;
  };

  const removeManufacturer = (id) => {
    Alert.alert(
      "Remove Manufacturer",
      "Are you sure you want to remove this manufacturer? This will also remove their associated products from the system.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: () => {
            setManufacturers(prev => prev.filter(m => m.id !== id));
            // Products associated with this manufacturer will be automatically removed via ProductContext's useEffect
            Alert.alert('Success', 'Manufacturer removed successfully!');
          }
        }
      ]
    );
  };

  const addCustomer = (newCustomer) => {
    if (customers.some(c => c.id === newCustomer.id || c.email === newCustomer.email)) {
      Alert.alert('Error', 'Customer with this ID or Email already exists.');
      return false;
    }
    setCustomers(prev => [...prev, newCustomer]);
    Alert.alert('Success', 'Customer added successfully!');
    return true;
  };

  const removeCustomer = (id) => {
    Alert.alert(
      "Remove Customer",
      "Are you sure you want to remove this customer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: () => {
            setCustomers(prev => prev.filter(c => c.id !== id));
            Alert.alert('Success', 'Customer removed successfully!');
          }
        }
      ]
    );
  };

  return (
    <UserContext.Provider
      value={{
        manufacturers,
        customers,
        addManufacturer,
        removeManufacturer,
        addCustomer,
        removeCustomer,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = () => {
  return useContext(UserContext);
};

export default UserContext; // Export default for easier import if preferred