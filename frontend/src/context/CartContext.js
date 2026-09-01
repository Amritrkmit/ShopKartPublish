// CartContext.js
import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { toastSuccess, toastError } from "../utils/toast";
import { useAuth } from "./AuthContext";

export const CartContext = createContext();

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const { user } = useAuth();

  // Load cart from Backend or LocalStorage
  const fetchCart = React.useCallback(() => {
    if (user) {
      // Logged in: Fetch from API
      axios
        .get(`${API_BASE_URL}/cart`, { withCredentials: true })
        .then((res) => {
          setCart(res.data.cart || []);
        })
        .catch((err) => console.error("Error fetching cart:", err));
    } else {
      // Guest: Load from LocalStorage
      const localCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
      setCart(localCart);
    }
  }, [user]);


  // Sync Guest Cart to Server on Login
  useEffect(() => {
    const syncGuestCart = async () => {
      const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
      if (user && guestCart.length > 0) {
        try {
          // Add each item to server
          // Note: Ideally backend should have a bulk add endpoint. 
          // Doing parallel requests for now.
          await Promise.all(guestCart.map(item =>
            axios.post(
              `${API_BASE_URL}/cart/add`,
              {
                product_id: item.product_id || item.id,
                quantity: item.quantity,
                size: item.size,
                selected_options: item.selected_options,
                customization_details: item.customization_details
              },
              { withCredentials: true }
            )
          ));
          // Clear guest cart after successful sync
          localStorage.removeItem("guestCart");
          toastSuccess("Cart synced from previous session");
        } catch (err) {
          console.error("Failed to sync guest cart", err);
        }
      }
      // Always fetch latest server cart after potential sync
      fetchCart();
    };

    if (user) {
      syncGuestCart();
    } else {
      fetchCart();
    }
  }, [user, fetchCart]);



  const addMultipleToCart = async (items) => {
    // items is an array of { product, size, selectedAttributes, quantity }
    if (user) {
      try {
        await Promise.all(items.map(item =>
          axios.post(
            `${API_BASE_URL}/cart/add`,
            {
              product_id: item.product.id,
              quantity: item.quantity || 1,
              size: item.size || null,
              selected_options: item.selectedAttributes || null,
              customization_details: item.customization_details || null
            },
            { withCredentials: true }
          )
        ));
        toastSuccess(`${items.length} items added to cart`);
        fetchCart();
      } catch (err) {
        console.error("Bulk add failed:", err);
        toastError("Some items could not be added to cart");
      }
    } else {
      const localCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
      items.forEach(item => {
        const product = item.product;
        const size = item.size || null;
        const selectedAttributes = item.selectedAttributes || null;
        const quantity = item.quantity || 1;
        const attrString = selectedAttributes ? JSON.stringify(selectedAttributes) : null;

        const existingItemIndex = localCart.findIndex(
          (i) => (i.id === product.id || i.product_id === product.id) &&
            i.size === size &&
            (i.selected_options ? JSON.stringify(i.selected_options) : null) === attrString
        );

        if (existingItemIndex > -1) {
          localCart[existingItemIndex].quantity += quantity;
        } else {
          localCart.push({
            ...product,
            product_id: product.id,
            temp_id: `${product.id}-${size || 'default'}-${attrString || 'none'}-${Date.now()}`,
            size,
            selected_options: selectedAttributes,
            customization_details: item.customization_details || null,
            quantity
          });
        }
      });
      localStorage.setItem("guestCart", JSON.stringify(localCart));
      setCart(localCart);
      toastSuccess(`${items.length} items added to cart`);
    }
  };

  const addToCart = (product, size = null, selectedAttributes = null, quantity = 1, customization_details = null) => {
    // Track Event
    import('../utils/analytics').then(({ trackEvent }) => {
      trackEvent('add_to_cart', {
        product_id: product.id,
        price: product.price,
        name: product.name,
        size,
        quantity
      });
    });

    if (user) {
      // Logged In
      axios
        .post(
          `${API_BASE_URL}/cart/add`,
          { product_id: product.id, quantity, size, selected_options: selectedAttributes, customization_details },
          { withCredentials: true }
        )
        .then((res) => {
          // toastSuccess("Added to cart");
          toastSuccess(`Successfully added ${product.name} to your cart`);

          fetchCart();
        })
        .catch((err) => {
          console.error(err);
          toastError("Failed to add to cart");
        });
    } else {
      // Guest Mode
      const localCart = JSON.parse(localStorage.getItem("guestCart") || "[]");

      // JSON stringify for deep comparison of objects
      const attrString = selectedAttributes ? JSON.stringify(selectedAttributes) : null;

      const existingItemIndex = localCart.findIndex(
        (item) => (item.id === product.id || item.product_id === product.id) &&
          item.size === size &&
          (item.selected_options ? JSON.stringify(item.selected_options) : null) === attrString
      );

      if (existingItemIndex > -1) {
        localCart[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        localCart.push({
          ...product,
          product_id: product.id,
          temp_id: `${product.id}-${size || 'default'}-${attrString || 'none'}-${Date.now()}`,
          size,
          selected_options: selectedAttributes,
          customization_details,
          quantity
        });
      }

      localStorage.setItem("guestCart", JSON.stringify(localCart));
      setCart(localCart);
      // toastSuccess("Added to cart");
      toastSuccess(`Successfully added ${product.name} to your cart`);
    }
  };

  const removeFromCart = (cartId) => {
    if (user) {
      // Logged In
      const removedItem = cart.find((item) => item.id === cartId);
      axios
        .delete(`${API_BASE_URL}/cart/${cartId}`, { withCredentials: true })
        .then(() => {
          setCart((prev) => prev.filter((item) => item.id !== cartId));
          toastSuccess(`Successfully removed ${removedItem?.name || 'Item'} from your cart`);
        })
        .catch((err) => {
          console.error(err);
          toastError("Failed to remove item");
        });
    } else {
      // Guest Mode
      // We need to identify strictly. 
      // If cartId comes from `item.id`, for guest items it might be the product id or temp_id.
      // Let's assume the UI passes the correct ID field.
      // In Guest Mode, we should probably pass the full item or a unique ID.
      // The `CartPage` or UI likely uses `item.id` or `item.cart_id`.

      const localCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
      // Filter out by temp_id if present, or product_id/id fallback
      const removedItem = localCart.find(
        (item) => (item.temp_id && item.temp_id === cartId) || item.id === cartId
      );
      const updatedCart = localCart.filter(item =>
        (item.temp_id && item.temp_id !== cartId) && (item.id !== cartId)
      );

      // If filtering didn't work (maybe cartId passed was valid product id but we removed all sizes?), 
      // ideally we use temp_id. 

      localStorage.setItem("guestCart", JSON.stringify(updatedCart));
      setCart(updatedCart);
      // toastSuccess("Removed from cart");
      toastSuccess(`Successfully removed ${removedItem?.name || 'Item'} from your cart`);
    }
  };

  const clearCart = () => {
    if (!user) localStorage.removeItem("guestCart");
    setCart([]);
  };

  const updateQuantity = (cartId, quantity) => {
    if (quantity < 1) return Promise.resolve();

    if (user) {
      return axios.put(`${API_BASE_URL}/cart/${cartId}`, { quantity }, { withCredentials: true })
        .then(() => {
          setCart(prev => prev.map(item => item.id === cartId ? { ...item, quantity } : item));
        })
        .catch(err => {
          console.error(err);
          toastError("Failed to update quantity");
          throw err;
        });
    } else {
      // Guest Mode
      return new Promise((resolve) => {
        const localCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
        const updated = localCart.map(item =>
          (item.temp_id === cartId || item.id === cartId) ? { ...item, quantity } : item
        );
        localStorage.setItem("guestCart", JSON.stringify(updated));
        setCart(updated);
        resolve();
      });
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, addMultipleToCart, removeFromCart, clearCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
};
