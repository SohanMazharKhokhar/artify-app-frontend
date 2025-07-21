import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from './ProductContext';
import { useUsers } from './UserContext';

export default function AdminDashboard({ navigation }) {
  const { products, addProduct, removeProduct, updateProduct } = useProducts();
  const { manufacturers, customers, addManufacturer, removeManufacturer, addCustomer, removeCustomer } = useUsers();

  const [activeTab, setActiveTab] = useState('products'); // 'products', 'manufacturers', 'customers'

  // State for Add Product Modal
  const [isAddProductModalVisible, setAddProductModalVisible] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductType, setNewProductType] = useState('');
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductManufacturerId, setNewProductManufacturerId] = useState('');
  const [newProductId, setNewProductId] = useState(''); // For new product ID

  // State for Edit Product Modal
  const [isEditProductModalVisible, setEditProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // Product being edited

  // State for Add Manufacturer Modal
  const [isAddManufacturerModalVisible, setAddManufacturerModalVisible] = useState(false);
  const [newManufacturerId, setNewManufacturerId] = useState('');
  const [newManufacturerName, setNewManufacturerName] = useState('');
  const [newManufacturerEmail, setNewManufacturerEmail] = useState('');

  // State for Add Customer Modal
  const [isAddCustomerModalVisible, setAddCustomerModalVisible] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');


  // --- Product Management ---
  const handleAddProduct = () => {
    if (!newProductId || !newProductName || !newProductPrice || !newProductType || !newProductImage || !newProductManufacturerId) {
      Alert.alert('Error', 'Please fill all product fields.');
      return;
    }
    const success = addProduct({
      id: parseInt(newProductId), // Ensure ID is a number
      name: newProductName,
      price: parseFloat(newProductPrice), // Ensure price is a number
      type: newProductType,
      image: newProductImage,
      manufacturerId: newProductManufacturerId,
    });
    if (success) {
      setAddProductModalVisible(false);
      setNewProductId('');
      setNewProductName('');
      setNewProductPrice('');
      setNewProductType('');
      setNewProductImage('');
      setNewProductManufacturerId('');
    }
  };

  const openEditProductModal = (product) => {
    setEditingProduct(product);
    setEditProductModalVisible(true);
  };

  const handleUpdateProduct = () => {
    if (!editingProduct.id || !editingProduct.name || !editingProduct.price || !editingProduct.type || !editingProduct.image || !editingProduct.manufacturerId) {
      Alert.alert('Error', 'Please fill all product fields.');
      return;
    }
    updateProduct({
      ...editingProduct,
      price: parseFloat(editingProduct.price), // Ensure price is number
    });
    setEditProductModalVisible(false);
    setEditingProduct(null);
  };


  // --- Manufacturer Management ---
  const handleAddManufacturer = () => {
    if (!newManufacturerId || !newManufacturerName || !newManufacturerEmail) {
      Alert.alert('Error', 'Please fill all manufacturer fields.');
      return;
    }
    const success = addManufacturer({
      id: newManufacturerId,
      name: newManufacturerName,
      email: newManufacturerEmail,
    });
    if (success) {
      setAddManufacturerModalVisible(false);
      setNewManufacturerId('');
      setNewManufacturerName('');
      setNewManufacturerEmail('');
    }
  };

  // --- Customer Management ---
  const handleAddCustomer = () => {
    if (!newCustomerId || !newCustomerName || !newCustomerEmail) {
      Alert.alert('Error', 'Please fill all customer fields.');
      return;
    }
    const success = addCustomer({
      id: newCustomerId,
      name: newCustomerName,
      email: newCustomerEmail,
    });
    if (success) {
      setAddCustomerModalVisible(false);
      setNewCustomerId('');
      setNewCustomerName('');
      setNewCustomerEmail('');
    }
  };

  const renderProductsTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.addButton} onPress={() => setAddProductModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add New Product</Text>
      </TouchableOpacity>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Image source={{ uri: item.image }} style={styles.productImage} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSubText}>Rs.{item.price} | Type: {item.type}</Text>
              <Text style={styles.itemSubText}>Mfg ID: {item.manufacturerId}</Text>
            </View>
            <TouchableOpacity onPress={() => openEditProductModal(item)} style={styles.actionButton}>
              <Ionicons name="create-outline" size={24} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeProduct(item.id)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={24} color="#f44336" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );

  const renderManufacturersTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.addButton} onPress={() => setAddManufacturerModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add New Manufacturer</Text>
      </TouchableOpacity>
      <FlatList
        data={manufacturers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSubText}>ID: {item.id}</Text>
              <Text style={styles.itemSubText}>Email: {item.email}</Text>
            </View>
            <TouchableOpacity onPress={() => removeManufacturer(item.id)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={24} color="#f44336" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );

  const renderCustomersTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.addButton} onPress={() => setAddCustomerModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add New Customer</Text>
      </TouchableOpacity>
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSubText}>ID: {item.id}</Text>
              <Text style={styles.itemSubText}>Email: {item.email}</Text>
            </View>
            <TouchableOpacity onPress={() => removeCustomer(item.id)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={24} color="#f44336" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.replace('Auth', { role: 'Admin' })} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#e91e63" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>Products</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'manufacturers' && styles.activeTab]}
          onPress={() => setActiveTab('manufacturers')}
        >
          <Text style={[styles.tabText, activeTab === 'manufacturers' && styles.activeTabText]}>Manufacturers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'customers' && styles.activeTab]}
          onPress={() => setActiveTab('customers')}
        >
          <Text style={[styles.tabText, activeTab === 'customers' && styles.activeTabText]}>Customers</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'products' && renderProductsTab()}
        {activeTab === 'manufacturers' && renderManufacturersTab()}
        {activeTab === 'customers' && renderCustomersTab()}
      </ScrollView>

      {/* Add Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddProductModalVisible}
        onRequestClose={() => setAddProductModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Add New Product</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Product ID (e.g., 201)"
              keyboardType="numeric"
              value={newProductId}
              onChangeText={setNewProductId}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Product Name"
              value={newProductName}
              onChangeText={setNewProductName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Price (e.g., 599.99)"
              keyboardType="numeric"
              value={newProductPrice}
              onChangeText={setNewProductPrice}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Type (e.g., T-Shirts, Mugs)"
              value={newProductType}
              onChangeText={setNewProductType}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Image URL"
              value={newProductImage}
              onChangeText={setNewProductImage}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Manufacturer ID (e.g., mfg1)"
              value={newProductManufacturerId}
              onChangeText={setNewProductManufacturerId}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonClose]}
                onPress={() => setAddProductModalVisible(false)}
              >
                <Text style={styles.textStyle}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonAdd]}
                onPress={handleAddProduct}
              >
                <Text style={styles.textStyle}>Add Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditProductModalVisible}
        onRequestClose={() => setEditProductModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Edit Product</Text>
            {editingProduct && (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Product Name"
                  value={editingProduct.name}
                  onChangeText={(text) => setEditingProduct({ ...editingProduct, name: text })}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Price"
                  keyboardType="numeric"
                  value={editingProduct.price.toString()}
                  onChangeText={(text) => setEditingProduct({ ...editingProduct, price: text })}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Type"
                  value={editingProduct.type}
                  onChangeText={(text) => setEditingProduct({ ...editingProduct, type: text })}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Image URL"
                  value={editingProduct.image}
                  onChangeText={(text) => setEditingProduct({ ...editingProduct, image: text })}
                />
                 <TextInput
                  style={styles.modalInput}
                  placeholder="Manufacturer ID"
                  value={editingProduct.manufacturerId}
                  onChangeText={(text) => setEditingProduct({ ...editingProduct, manufacturerId: text })}
                />
              </>
            )}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonClose]}
                onPress={() => setEditProductModalVisible(false)}
              >
                <Text style={styles.textStyle}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonUpdate]}
                onPress={handleUpdateProduct}
              >
                <Text style={styles.textStyle}>Update Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Manufacturer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddManufacturerModalVisible}
        onRequestClose={() => setAddManufacturerModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Add New Manufacturer</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Manufacturer ID (e.g., mfg3)"
              value={newManufacturerId}
              onChangeText={setNewManufacturerId}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Manufacturer Name"
              value={newManufacturerName}
              onChangeText={setNewManufacturerName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newManufacturerEmail}
              onChangeText={setNewManufacturerEmail}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonClose]}
                onPress={() => setAddManufacturerModalVisible(false)}
              >
                <Text style={styles.textStyle}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonAdd]}
                onPress={handleAddManufacturer}
              >
                <Text style={styles.textStyle}>Add Manufacturer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddCustomerModalVisible}
        onRequestClose={() => setAddCustomerModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Add New Customer</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Customer ID (e.g., cust3)"
              value={newCustomerId}
              onChangeText={setNewCustomerId}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Customer Name"
              value={newCustomerName}
              onChangeText={setNewCustomerName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newCustomerEmail}
              onChangeText={setNewCustomerEmail}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonClose]}
                onPress={() => setAddCustomerModalVisible(false)}
              >
                <Text style={styles.textStyle}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonAdd]}
                onPress={handleAddCustomer}
              >
                <Text style={styles.textStyle}>Add Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#e91e63',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    resizeMode: 'cover',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemSubText: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  actionButton: {
    padding: 8,
    marginLeft: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonClose: {
    backgroundColor: '#9E9E9E',
  },
  buttonAdd: {
    backgroundColor: '#4CAF50',
  },
  buttonUpdate: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});