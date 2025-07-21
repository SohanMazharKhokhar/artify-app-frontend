// ProductContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { useUsers } from './UserContext'; // Import useUsers to interact with manufacturers

const ProductContext = createContext();

const initialProducts = [
  {
    id: 1,
    name: 'Vintage Poster "Coffee"',
    price: 999,
    type: 'Posters',
    image: 'https://images.pexels.com/photos/101533/pexels-photo-101533.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg1',
  },
  {
    id: 2,
    name: 'Retro T-Shirt "Sunset"',
    price: 799,
    type: 'T-Shirts',
    image: 'https://images.pexels.com/photos/1004128/pexels-photo-1004128.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg2',
  },
  {
    id: 3,
    name: 'Abstract Art Mug',
    price: 499,
    type: 'Mugs',
    image: 'https://images.pexels.com/photos/4037563/pexels-photo-4037563.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg1',
  },
  {
    id: 4,
    name: 'Cityscape Sticker Pack',
    price: 299,
    type: 'Stickers',
    image: 'https://images.pexels.com/photos/1070527/pexels-photo-1070527.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg2',
  },
  {
    id: 101,
    name: 'Premium Cotton T-Shirt',
    price: 899,
    type: 'T-Shirts',
    image: 'https://images.pexels.com/photos/220139/pexels-photo-220139.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg1',
  },
  {
    id: 102,
    name: 'Graphic Print T-Shirt',
    price: 799,
    type: 'T-Shirts',
    image: 'https://images.pexels.com/photos/2059104/pexels-photo-2059104.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg2',
  },
  {
    id: 103,
    name: 'Ceramic Coffee Mug',
    price: 349,
    type: 'Mugs',
    image: 'https://images.pexels.com/photos/1755215/pexels-photo-1755215.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg1',
  },
  {
    id: 104,
    name: 'Travel Tumbler Mug',
    price: 599,
    type: 'Mugs',
    image: 'https://images.pexels.com/photos/1207918/pexels-photo-1207918.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg2',
  },
  {
    id: 105,
    name: 'Elegant Art Print',
    price: 1200,
    type: 'Posters',
    image: 'https://images.pexels.com/photos/714093/pexels-photo-714093.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg1',
  },
  {
    id: 106,
    name: 'Minimalist Wall Art',
    price: 950,
    type: 'Posters',
    image: 'https://images.pexels.com/photos/3806690/pexels-photo-3806690.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg2',
  },
  {
    id: 107,
    name: 'Decorative Sticker Set',
    price: 250,
    type: 'Stickers',
    image: 'https://images.pexels.com/photos/2821220/pexels-photo-2821220.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg1',
  },
  {
    id: 108,
    name: 'Customizable Decals',
    price: 300,
    type: 'Stickers',
    image: 'https://images.pexels.com/photos/2850290/pexels-photo-2850290.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg2',
  },
  {
    id: 109,
    name: 'Classic White Mug',
    price: 299,
    type: 'Mugs',
    image: 'https://images.pexels.com/photos/1755215/pexels-photo-1755215.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg1',
  },
  {
    id: 110,
    name: 'Comfort Fit T-Shirt',
    price: 699,
    type: 'T-Shirts',
    image: 'https://images.pexels.com/photos/220139/pexels-photo-220139.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg2',
  },
  {
    id: 111,
    name: 'Wooden Photo Frame',
    price: 450,
    type: 'Frames',
    image: 'https://images.pexels.com/photos/7140239/pexels-photo-7140239.jpeg?auto=compress&cs=tinysrgb&w=600',
    manufacturerId: 'mfg1',
  },
];

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState(initialProducts);
  const { manufacturers } = useUsers(); // Get manufacturers from UserContext

  // Effect to remove products when a manufacturer is removed
  useEffect(() => {
    setProducts(currentProducts => {
      const activeManufacturerIds = new Set(manufacturers.map(m => m.id));
      return currentProducts.filter(product => activeManufacturerIds.has(product.manufacturerId));
    });
  }, [manufacturers]); // Re-run when manufacturers list changes

  // Function to add a new product
  const addProduct = (newProduct) => {
    // Basic validation: ensure manufacturerId exists and product ID is unique
    if (!manufacturers.some(m => m.id === newProduct.manufacturerId)) {
      Alert.alert('Error', 'Invalid Manufacturer ID provided for the product.');
      return false;
    }
    if (products.some(p => p.id === newProduct.id)) {
      Alert.alert('Error', 'Product with this ID already exists.');
      return false;
    }
    setProducts((prevProducts) => [...prevProducts, newProduct]);
    Alert.alert('Success', 'Product added successfully!');
    return true;
  };

  // Function to delete a product by its ID
  const removeProduct = (productId) => { // Renamed from deleteProduct for consistency
    Alert.alert(
      "Remove Product",
      "Are you sure you want to remove this product?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: () => {
            setProducts((prevProducts) => prevProducts.filter(product => product.id !== productId));
            Alert.alert('Success', 'Product removed successfully!');
          }
        }
      ]
    );
  };

  // Function to update an existing product
  const updateProduct = (updatedProduct) => {
    setProducts(prev =>
      prev.map(product =>
        product.id === updatedProduct.id ? { ...product, ...updatedProduct } : product
      )
    );
    Alert.alert('Success', 'Product updated successfully!');
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        addProduct,
        removeProduct, // Changed from deleteProduct
        updateProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  return useContext(ProductContext);
};

export default ProductContext; // Export default for easier import if preferred