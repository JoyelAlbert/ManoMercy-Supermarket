import React from 'react';
import './PageLoading.css';

// Cart Page Loading
export const CartLoading = () => (
  <div className="page-loading cart-loading">
    <i className="fas fa-shopping-cart fa-spin"></i>
    <h3>Loading Your Cart</h3>
    <p>Fetching your items...</p>
  </div>
);

// Profile Page Loading
export const ProfileLoading = () => (
  <div className="page-loading profile-loading">
    <i className="fas fa-user fa-spin"></i>
    <h3>Loading Profile</h3>
    <p>Getting your information...</p>
  </div>
);

// Orders Page Loading
export const OrdersLoading = () => (
  <div className="page-loading orders-loading">
    <i className="fas fa-clipboard-list fa-spin"></i>
    <h3>Loading Orders</h3>
    <p>Fetching your orders...</p>
  </div>
);

// Products Page Loading
export const ProductsLoading = () => (
  <div className="page-loading products-loading">
    <i className="fas fa-boxes fa-spin"></i>
    <h3>Loading Products</h3>
    <p>Getting amazing deals for you...</p>
  </div>
);

// General Loading
export const GeneralLoading = ({ message = "Loading..." }) => (
  <div className="page-loading general-loading">
    <i className="fas fa-spinner fa-spin"></i>
    <h3>{message}</h3>
  </div>
);

// Button Loading
export const ButtonLoading = ({ text = "Processing..." }) => (
  <div className="button-loading">
    <i className="fas fa-spinner fa-spin"></i>
    <span>{text}</span>
  </div>
);