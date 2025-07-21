import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';

export default function RoleSelectionScreen({ navigation }) {
  // const roles = ['Manufacturer', 'Admin', 'Customer'];
  const roles = ['Manufacturer', 'Customer'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Text style={styles.brand}>Artify Prints</Text>
      <Text style={styles.title}>Choose Your Role</Text>

      <View style={styles.buttonContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role}
            style={styles.button}
            onPress={() => navigation.navigate('Auth', { role })}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{role}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: 'rgba(215, 6, 100, 0.89)',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(215, 6, 100, 0.89)',
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: 'rgba(215, 6, 100, 0.89)',
    paddingVertical: 16,
    borderRadius: 10,
    marginBottom: 18,
    alignItems: 'center',
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
