import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Cart.css";

const Cart = () => {
  const navigate = useNavigate();
  
  // ====== Cart & Saved State ======
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  const [savedItems, setSavedItems] = useState(() => {
    const saved = localStorage.getItem("saved");
    return saved ? JSON.parse(saved) : [];
  });

  // ====== Persist to localStorage ======
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem("saved", JSON.stringify(savedItems));
  }, [savedItems]);

  // ====== Cart Functions ======
  const addToCart = (product) => {
    const exists = cartItems.find((p) => p.id === product.id);
    if (exists) {
      setCartItems(
        cartItems.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCartItems(cartItems.filter((p) => p.id !== id));
  };

  const updateQuantity = (id, qty) => {
    if (qty < 1) {
      removeFromCart(id);
      return;
    }
    setCartItems(cartItems.map((p) => (p.id === id ? { ...p, quantity: qty } : p)));
  };

  const saveForLater = (item) => {
    setSavedItems([...savedItems, { ...item, savedAt: new Date().toISOString() }]);
    removeFromCart(item.id);
  };

  // ====== Saved Items Functions ======
  const moveToCart = (item) => {
    addToCart(item);
    setSavedItems(savedItems.filter((p) => p.id !== item.id));
  };

  const removeSavedItem = (id) => {
    setSavedItems(savedItems.filter((p) => p.id !== id));
  };

  const clearCart = () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      setCartItems([]);
    }
  };

  const clearSavedItems = () => {
    if (window.confirm("Are you sure you want to clear all saved items?")) {
      setSavedItems([]);
    }
  };

  // ====== Totals ======
  const cartTotal = cartItems
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
    .toFixed(2);

  const itemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // ====== Checkout ======
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    // navigate("/checkout");
  };

  return (
    <div className="cart-page">
      {/* ====== Enhanced Navigation Bar ====== */}
      <nav className="cart-nav-bar">
        <div className="nav-content">
          <div className="nav-brand">
            <span className="brand-icon">🛒</span>
            <h1>Mercy Supermarket</h1>
          </div>
          
          <div className="nav-links">
            <Link to="/home" className="nav-link">
              <i className="fas fa-home"></i>
              <span>Home</span>
            </Link>
            <Link to="/cart" className="nav-link active">
              <i className="fas fa-shopping-cart"></i>
              <span>Cart</span>
              {cartItems.length > 0 && (
                <span className="cart-badge">{itemsCount}</span>
              )}
            </Link>
            <Link to="/profile" className="nav-link">
              <i className="fas fa-user"></i>
              <span>Profile</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="cart-container">
        {/* ====== Cart Header ====== */}
        <div className="cart-header">
          <div className="header-content">
            <h1 className="page-title">
              <i className="fas fa-shopping-cart"></i>
              Shopping Cart
            </h1>
            {cartItems.length > 0 && (
              <div className="header-actions">
                <button className="clear-cart-btn" onClick={clearCart}>
                  <i className="fas fa-trash"></i>
                  Clear Cart
                </button>
              </div>
            )}
          </div>
          {cartItems.length > 0 && (
            <p className="cart-summary">
              {itemsCount} item{itemsCount !== 1 ? 's' : ''} in your cart
            </p>
          )}
        </div>

        {/* ====== Cart Items ====== */}
        {cartItems.length === 0 ? (
          <div className="empty-cart-state">
            <div className="empty-cart-icon">
              <i className="fas fa-shopping-cart"></i>
            </div>
            <h2>Your cart is empty</h2>
            <p>Browse our products and add items to your cart</p>
            <Link to="/" className="continue-shopping-btn">
              <i className="fas fa-shopping-bag"></i>
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items-section">
              <div className="section-header">
                <h2>Cart Items ({itemsCount})</h2>
              </div>
              
              <div className="cart-items-grid">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item-card">
                    <div className="item-image">
                      <img src={item.image} alt={item.name} />
                      {item.discount > 0 && (
                        <span className="discount-badge">-{item.discount}%</span>
                      )}
                    </div>
                    
                    <div className="item-details">
                      <h3 className="item-name">{item.name}</h3>
                      <p className="item-description">{item.description}</p>
                      
                      <div className="price-info">
                        {item.discount > 0 ? (
                          <div className="discounted-price">
                            <span className="original-price">₹{item.price}</span>
                            <span className="final-price">
                              ₹{(item.finalPrice || item.price).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="final-price">₹{item.price}</span>
                        )}
                        <p className="item-total">
                          Total: ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>

                      <div className="quantity-section">
                        <label>Quantity:</label>
                        <div className="quantity-controls">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="quantity-btn"
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="quantity-display">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="quantity-btn"
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="item-actions">
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="remove-btn"
                      >
                        <i className="fas fa-trash"></i>
                        Remove
                      </button>
                      <button 
                        onClick={() => saveForLater(item)}
                        className="save-btn"
                      >
                        <i className="fas fa-bookmark"></i>
                        Save for Later
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ====== Order Summary ====== */}
            <div className="order-summary">
              <div className="summary-card">
                <h3>Order Summary</h3>
                
                <div className="summary-row">
                  <span>Subtotal ({itemsCount} items):</span>
                  <span>₹{cartTotal}</span>
                </div>
                
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span className="free-shipping">FREE</span>
                </div>
                
                <div className="summary-row">
                  <span>Tax:</span>
                  <span>₹{(cartTotal * 0.18).toFixed(2)}</span>
                </div>
                
                <div className="summary-divider"></div>
                
                <div className="summary-row total-row">
                  <span>Total:</span>
                  <span className="total-amount">
                    ₹{(parseFloat(cartTotal) + parseFloat(cartTotal) * 0.18).toFixed(2)}
                  </span>
                </div>

                <button className="checkout-btn" onClick={handleCheckout}>
                  <i className="fas fa-lock"></i>
                  Proceed to Checkout
                </button>
                
                <Link to="/" className="continue-shopping-link">
                  <i className="fas fa-arrow-left"></i>
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ====== Saved for Later ====== */}
        {savedItems.length > 0 && (
          <div className="saved-section">
            <div className="section-header">
              <div className="header-title">
                <i className="fas fa-bookmark"></i>
                <h2>Saved for Later ({savedItems.length})</h2>
              </div>
              <button className="clear-saved-btn" onClick={clearSavedItems}>
                <i className="fas fa-trash"></i>
                Clear All
              </button>
            </div>
            
            <div className="saved-items-grid">
              {savedItems.map((item) => (
                <div key={item.id} className="saved-item-card">
                  <div className="item-image">
                    <img src={item.image} alt={item.name} />
                  </div>
                  
                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-price">₹{item.price}</p>
                    
                    {item.savedAt && (
                      <p className="saved-date">
                        Saved on {new Date(item.savedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="saved-actions">
                    <button 
                      onClick={() => moveToCart(item)}
                      className="move-to-cart-btn"
                    >
                      <i className="fas fa-cart-plus"></i>
                      Move to Cart
                    </button>
                    <button 
                      onClick={() => removeSavedItem(item.id)}
                      className="remove-saved-btn"
                    >
                      <i className="fas fa-times"></i>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;