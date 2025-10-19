// Home.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "./CartContext";
import "./Home.css";

const Home = () => {
  const { cartItems = [], addToCart } = useCart();
  const navigate = useNavigate();
  const API_BASE = "http://localhost:5001";

  // States
  const [search, setSearch] = useState("");
  const [homeProducts, setHomeProducts] = useState({
    grocery: [],
    snacks: [],
    soap: [],
    beauty: [],
  });
  const [sliderImages, setSliderImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sliderLoading, setSliderLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Enhanced Add to Cart popup
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveForLater, setSaveForLater] = useState(false);

  const categories = [
    { key: "grocery", title: "Groceries", link: "/grossory_products", icon: "🥦", api: "grossory_products" },
    { key: "snacks", title: "Snacks", link: "/snacks_products", icon: "🍿", api: "snacks_products" },
    { key: "soap", title: "Soaps", link: "/soap_products", icon: "🧼", api: "soap_products" },
    { key: "beauty", title: "Beauty", link: "/beauty_products", icon: "💄", api: "beauty_products" },
  ];

  // Enhanced fetch function with better error handling and debugging
  // const fetchHomeProducts = async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);
  //     console.log("🔄 Fetching home products...");
      
  //     const homeProductsData = {
  //       grocery: [],
  //       snacks: [],
  //       soap: [],
  //       beauty: []
  //     };

  //     // Fetch all products and filter those marked for home display
  //     for (const cat of categories) {
  //       try {
  //         console.log(`📦 Fetching ${cat.title}...`);
  //         const response = await fetch(`${API_BASE}/api/v1/${cat.api}`);
          
  //         if (!response.ok) {
  //           throw new Error(`HTTP ${response.status} for ${cat.title}`);
  //         }
          
  //         const products = await response.json();
  //         console.log(`✅ ${cat.title} raw data:`, products);
          
  //         // Filter products that are marked to show on home page
  //         const homeProducts = Array.isArray(products) 
  //           ? products.filter(product => {
  //               const showHome = product.showOnHome === true;
  //               console.log(`📋 ${product.name}: showOnHome = ${product.showOnHome}, included = ${showHome}`);
  //               return showHome;
  //             })
  //           : [];
          
  //         console.log(`🏠 ${cat.title} home products:`, homeProducts);
  //         homeProductsData[cat.key] = homeProducts.slice(0, 8); // Limit to 8 products per category
          
  //       } catch (err) {
  //         console.error(`❌ Error fetching ${cat.title}:`, err);
  //         homeProductsData[cat.key] = [];
  //       }
  //     }

  //     console.log("🎯 Final home products data:", homeProductsData);
  //     setHomeProducts(homeProductsData);
  //     setLoading(false);
      
  //   } catch (err) {
  //     console.error("❌ Error in fetchHomeProducts:", err);
  //     setError("Failed to load featured products");
  //     setLoading(false);
  //   }
  // };

  // Alternative method using query parameters (if your backend supports it)
  const fetchHomeProductsWithQuery = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const productPromises = categories.map(cat =>
        fetch(`${API_BASE}/api/v1/${cat.api}?showOnHome=true`)
          .then(async (res) => {
            if (!res.ok) throw new Error(`Failed to fetch ${cat.title}`);
            const data = await res.json();
            console.log(`✅ ${cat.title} with query:`, data);
            return data;
          })
          .catch(err => {
            console.error(`❌ Query failed for ${cat.title}, falling back...`, err);
            // Fallback to client-side filtering
            return fetch(`${API_BASE}/api/v1/${cat.api}`)
              .then(res => {
                if (!res.ok) throw new Error(`Fallback failed for ${cat.title}`);
                return res.json();
              })
              .then(products => {
                return Array.isArray(products) 
                  ? products.filter(product => product.showOnHome === true)
                  : [];
              });
          })
      );

      const results = await Promise.allSettled(productPromises);
      
      const homeProductsData = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const homeProducts = Array.isArray(result.value) ? result.value : [];
          console.log(`🎯 ${categories[index].title} filtered:`, homeProducts);
          homeProductsData[categories[index].key] = homeProducts.slice(0, 8);
        } else {
          console.error(`❌ Final error for ${categories[index].title}:`, result.reason);
          homeProductsData[categories[index].key] = [];
        }
      });

      setHomeProducts(homeProductsData);
      setLoading(false);
    } catch (err) {
      console.error("❌ Error in fetchHomeProductsWithQuery:", err);
      setError("Failed to load featured products");
      setLoading(false);
    }
  };

  // Fetch slider images
  const fetchSlider = async () => {
    try {
      setSliderLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/slider`);
      if (!res.ok) throw new Error("Failed to fetch slider");
      const data = await res.json();
      setSliderImages(data);
      setSliderLoading(false);
    } catch (err) {
      console.error("Error fetching slider:", err);
      setSliderLoading(false);
    }
  };

  useEffect(() => {
    // Try with query first, fallback to client filtering
    fetchHomeProductsWithQuery();
    fetchSlider();
  }, []);

  // Refresh home products when component comes into focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("🔄 Refreshing home products due to focus");
      fetchHomeProductsWithQuery();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Slider auto rotation
  useEffect(() => {
    if (!sliderImages || sliderImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [sliderImages]);

  const goToSlide = (i) => setCurrentSlide(i);
  const goToPrevSlide = () =>
    setCurrentSlide((prev) =>
      prev === 0 ? sliderImages.length - 1 : prev - 1
    );
  const goToNextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % sliderImages.length);

  // Enhanced Add to Cart handlers
  const handleAddToCartClick = (product) => {
    if (!product.inStock) {
      alert("❌ This product is out of stock!");
      return;
    }
    setSelectedProduct(product);
    setQuantity(1);
    setSaveForLater(false);
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedProduct(null);
    setIsProcessing(false);
    setSaveForLater(false);
  };

  // Get or Create Draft Order
  const getOrCreateDraftOrder = async (token) => {
    try {
      const ordersRes = await fetch("http://localhost:5001/api/v1/orders", {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        const draftOrder = orders.find(order => order.status === "Draft");
        if (draftOrder) {
          return draftOrder;
        }
      }

      const createRes = await fetch("http://localhost:5001/api/v1/orders/draft", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.message || "Failed to create draft order");
      }

      return await createRes.json();
    } catch (err) {
      console.error("Error in getOrCreateDraftOrder:", err);
      throw err;
    }
  };

  // ✅ Confirm Order (with address collection)
  const handleConfirmOrder = async (product, qty) => {
    if (!product.inStock) {
      alert("❌ This product is out of stock and cannot be ordered!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("🛒 Confirming order with address...");

      // 1️⃣ Get or create draft order
      const draftOrder = await getOrCreateDraftOrder(token);
      
      if (!draftOrder || !draftOrder._id) {
        throw new Error("Failed to get valid draft order");
      }

      // 2️⃣ Add selected product to draft
      const orderItem = {
        productId: product._id,
        name: product.name,
        price: product.finalPrice || product.price,
        qty: qty,
        image: product.image,
        discount: product.discount || 0
      };

      const addItemRes = await fetch(`http://localhost:5001/api/v1/orders/${draftOrder._id}/add-item`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderItem),
      });

      if (!addItemRes.ok) {
        const errorData = await addItemRes.json();
        throw new Error(errorData.message || "Failed to add item to draft order");
      }

      console.log("✅ Item added to order successfully");

      // 3️⃣ Navigate to checkout page for address collection and order confirmation
      setShowPopup(false);
      navigate("/checkout", { 
        state: { 
          orderId: draftOrder._id,
          fromProduct: true 
        } 
      });

    } catch (err) {
      console.error("Error confirming order:", err);
      alert(err.message || "Failed to confirm order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Save to Draft (for later purchase)
  const handleSaveToDraft = async (product, qty) => {
    if (!product.inStock) {
      alert("❌ This product is out of stock and cannot be saved!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("💾 Saving product to draft order...");

      // 1️⃣ Get or create draft order
      const draftOrder = await getOrCreateDraftOrder(token);

      if (!draftOrder || !draftOrder._id) {
        throw new Error("Failed to get valid draft order");
      }

      // 2️⃣ Add selected product to draft
      const orderItem = {
        productId: product._id,
        name: product.name,
        price: product.finalPrice || product.price,
        qty: qty,
        image: product.image,
        discount: product.discount || 0
      };

      const addItemRes = await fetch(`http://localhost:5001/api/v1/orders/${draftOrder._id}/add-item`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderItem),
      });

      if (!addItemRes.ok) {
        const errorData = await addItemRes.json();
        throw new Error(errorData.message || "Failed to add item to draft order");
      }

      console.log("✅ Item saved to draft successfully");

      alert(`✅ "${product.name}" (x${qty}) has been saved to your draft order!\n\nYou can review and confirm your order later in the Orders page.`);
      setShowPopup(false);

    } catch (err) {
      console.error("Error saving to draft:", err);
      alert(err.message || "Failed to save to draft. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Simple Add to Cart (local storage only)
  const handleSimpleAddToCart = (product) => {
    if (!product.inStock) {
      alert("❌ This product is out of stock!");
      return;
    }

    const cartItem = {
      productId: product._id,
      name: product.name,
      price: product.finalPrice || product.price,
      quantity: 1,
      total: (product.finalPrice || product.price) * 1,
      image: product.image,
    };

    addToCart(cartItem);

    // Update localStorage
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
    const existingItemIndex = existingCart.findIndex((i) => i.productId === product._id);

    if (existingItemIndex >= 0) {
      existingCart[existingItemIndex].quantity += 1;
      existingCart[existingItemIndex].total =
        existingCart[existingItemIndex].price * existingCart[existingItemIndex].quantity;
    } else {
      existingCart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.stringify(existingCart));
    alert(`✅ ${product.name} added to cart!`);
  };

  // Get total home products count
  const getTotalHomeProducts = () => {
    return Object.values(homeProducts).reduce((total, products) => total + products.length, 0);
  };

  // Scroll to section function
  const scrollToSection = (catKey) => {
    const element = document.getElementById(`section-${catKey}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Debug function to check home products
  const debugHomeProducts = () => {
    console.log("🐛 Debug Home Products:", homeProducts);
    categories.forEach(cat => {
      console.log(`🐛 ${cat.title}:`, homeProducts[cat.key]);
    });
  };

  return (
    <div className="home-products-page">
      {/* Enhanced Navigation Bar */}
      <nav className="home-nav-bar">
        <div className="home-nav-content">
          <div className="home-nav-brand">
            <span className="home-brand-icon">🛒</span>
            <h1>ManoMercy Supermarket</h1>
          </div>
          
          <div className="home-nav-search">
            <div className="home-search-container">
              <i className="fas fa-search home-search-icon"></i>
              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="home-search-input"
              />
            </div>
          </div>

          <div className="home-nav-links">
            <Link to="/home" className="home-nav-link active">
              <i className="fas fa-home"></i>
              <span>Home</span>
            </Link>
            <Link to="/cart" className="home-nav-link home-cart-link">
              <i className="fas fa-shopping-cart"></i>
              <span>Cart</span>
              {cartItems.length > 0 && (
                <span className="home-cart-badge">{cartItems.length}</span>
              )}
            </Link>
            <Link to="/profile" className="home-nav-link">
              <i className="fas fa-user"></i>
              <span>Profile</span>
            </Link>
            <Link to="/orders_user" className="home-nav-link home-cart-link">
              <i className="fas fa-box"></i> Orders
            </Link>
            
            {/* Debug button - remove in production */}
            <button 
              onClick={debugHomeProducts} 
              className="home-debug-btn"
              style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              title="Debug Home Products"
            >
              <i className="fas fa-bug"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Refresh Button */}
      <div className="home-refresh-section">
        <button 
          onClick={() => fetchHomeProductsWithQuery()}
          className="home-refresh-btn"
          disabled={loading}
        >
          <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i>
          {loading ? 'Refreshing...' : 'Refresh Products'}
        </button>
        
        {/* Status Indicator */}
        <div className="home-status-indicator">
          <span className={`home-status-dot ${loading ? 'loading' : 'ready'}`}></span>
          <span>{loading ? 'Loading featured products...' : `Ready - ${getTotalHomeProducts()} products`}</span>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="home-category-nav-container">
        <div className="home-category-nav">
          {categories.map((cat) => (
            <button 
              key={cat.key} 
              onClick={() => scrollToSection(cat.key)}
              className="home-category-nav-btn"
            >
              <span className="home-category-icon">{cat.icon}</span>
              <span className="home-category-title">{cat.title}</span>
              <span className="home-product-count-badge">
                {homeProducts[cat.key]?.length || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="home-stats-bar">
        <div className="home-stat-item">
          <i className="fas fa-star"></i>
          <span>Featured Products: {getTotalHomeProducts()}</span>
        </div>
        <div className="home-stat-item">
          <i className="fas fa-images"></i>
          <span>Offers: {sliderImages.length}</span>
        </div>
        <div className="home-stat-item">
          <i className="fas fa-tags"></i>
          <span>Categories: {categories.length}</span>
        </div>
      </div>

      {/* Enhanced Slider */}
      <div className="home-slider-section">
        {sliderLoading && (
          <div className="home-slider-loading">
            <div className="home-loading-spinner"></div>
            <p>Loading offers...</p>
          </div>
        )}
        {!sliderLoading && sliderImages?.length > 0 && (
          <div className="home-slider-container">
            {sliderImages.map((img, idx) => (
              <div
                key={img._id}
                className={`home-slide ${idx === currentSlide ? "active" : ""}`}
              >
                <img
                  src={img.image || img.url}
                  alt={img.title || `Slide ${idx + 1}`}
                  className="home-slide-image"
                />
                {img.title && (
                  <div className="home-slide-content">
                    <h3 className="home-slide-title">{img.title}</h3>
                  </div>
                )}
              </div>
            ))}
            
            {sliderImages.length > 1 && (
              <>
                <button className="home-slider-arrow home-slider-arrow-left" onClick={goToPrevSlide}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button className="home-slider-arrow home-slider-arrow-right" onClick={goToNextSlide}>
                  <i className="fas fa-chevron-right"></i>
                </button>
                
                <div className="home-slider-indicators">
                  {sliderImages.map((_, idx) => (
                    <button
                      key={idx}
                      className={`home-slider-indicator ${idx === currentSlide ? "active" : ""}`}
                      onClick={() => goToSlide(idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {!sliderLoading && sliderImages.length === 0 && (
          <div className="home-no-slider">
            <i className="fas fa-images"></i>
            <p>No special offers at the moment</p>
          </div>
        )}
      </div>

      {/* Featured Products Sections */}
      <div className="home-sections-container">
        {categories.map((cat) => {
          const products = homeProducts[cat.key] || [];
          const filtered = products.filter((p) =>
            p.name?.toLowerCase().includes(search.toLowerCase())
          );
          
          return (
            <div className="home-section" key={cat.key} id={`section-${cat.key}`}>
              <div className="home-section-header">
                <h2 className="home-section-title">
                  <span className="home-section-icon">{cat.icon}</span>
                  {cat.title}
                  <span className="home-product-count">({filtered.length})</span>
                </h2>
                <div className="home-section-actions">
                  <button 
                    onClick={() => navigate(cat.link)}
                    className="home-view-all-btn"
                  >
                    View All <i className="fas fa-arrow-right"></i>
                  </button>
                  <button 
                    onClick={() => console.log(`Debug ${cat.title}:`, products)}
                    className="home-debug-section-btn"
                    title="Debug this section"
                  >
                    <i className="fas fa-info-circle"></i>
                  </button>
                </div>
              </div>
              
              <div className="home-products-container">
                {loading && (
                  <div className="home-loading-products">
                    <div className="home-loading-spinner small"></div>
                    <p>Loading {cat.title}...</p>
                  </div>
                )}
                
                {error && !loading && (
                  <div className="home-error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>{error}</p>
                    <button 
                      onClick={fetchHomeProductsWithQuery}
                      className="home-retry-btn"
                    >
                      <i className="fas fa-redo"></i> Retry
                    </button>
                  </div>
                )}
                
                {!loading && !error && filtered.length === 0 && (
                  <div className="home-no-products">
                    <i className="fas fa-star"></i>
                    <p>No featured {cat.title.toLowerCase()} available</p>
                    <small>Admin can toggle products to show on home page</small>
                    <button 
                      onClick={() => navigate(cat.link)}
                      className="home-browse-products-btn"
                    >
                      Browse All {cat.title}
                    </button>
                  </div>
                )}
                
                {!loading && !error && filtered.map((p) => (
                  <div className={`home-product-card ${!p.inStock ? 'home-out-of-stock' : ''}`} key={p._id}>
                    <div className="home-product-image">
                      <img src={p.image} alt={p.name} />
                      {p.discount > 0 && (
                        <span className="home-discount-badge label">-{p.discount}%</span>
                      )}
                      {p.showOnHome && (
                        <span className="home-home-badge" title="Featured on Home">
                          <i className="fas fa-home"></i>
                        </span>
                      )}
                      {!p.inStock && (
                        <div className="home-out-of-stock-overlay">
                          <span>Out of Stock</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="home-product-info">
                      <h3 className="home-product-name">{p.name}</h3>
                      <p className="home-product-description">{p.description}</p>
                      
                      <div className="home-price-section">
                        {p.discount > 0 ? (
                          <>
                            <span className="home-original-price">₹{p.price}</span>
                            <span className="home-final-price">₹{p.finalPrice || p.price}</span>
                          </>
                        ) : (
                          <span className="home-final-price">₹{p.price}</span>
                        )}
                      </div>
                    </div>

                    <div className="home-card-actions">
                      <button 
                        className="home-add-cart-btn" 
                        onClick={() => handleAddToCartClick(p)}
                        disabled={!p.inStock}
                      > 
                        <i className="fas fa-cart-plus"></i>
                        {!p.inStock ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Add to Cart Popup */}
      {showPopup && selectedProduct && (
        <div className="home-buy-modal-overlay">
          <div className="home-buy-modal">
            <div className="home-modal-header">
              <h3>Add {selectedProduct.name} to Cart</h3>
              <button 
                className="home-close-btn"
                onClick={handleClosePopup}
                disabled={isProcessing}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="home-modal-body">
              <div className="home-product-details">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="home-modal-product-image"
                />
                <div className="home-modal-product-info">
                  <h4>{selectedProduct.name}</h4>
                  <p className="home-modal-product-description">{selectedProduct.description}</p>
                  <p className="home-modal-product-price">
                    ₹{selectedProduct.finalPrice || selectedProduct.price}
                    {selectedProduct.discount > 0 && (
                      <span className="home-discount-text"> ({selectedProduct.discount}% off)</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="home-quantity-selector">
                <label>Quantity:</label>
                <div className="home-quantity-controls">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isProcessing}
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span className="home-quantity-display">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={isProcessing}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>
              
              <div className="home-total-section">
                <h3>Total: ₹{(selectedProduct.finalPrice || selectedProduct.price) * quantity}</h3>
              </div>

              {!selectedProduct.inStock ? (
                <div className="home-out-of-stock-message">
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>This product is currently out of stock and cannot be purchased.</p>
                </div>
              ) : (
                <div className="home-cart-options">
                  <label className="home-save-for-later-option">
                    <input
                      type="checkbox"
                      checked={saveForLater}
                      onChange={(e) => setSaveForLater(e.target.checked)}
                      disabled={isProcessing}
                    />
                    <i className="fas fa-bookmark"></i>
                    Save for later (Add to draft order)
                  </label>
                  
                  <div className="home-options-info">
                    <p><strong>Choose your option:</strong></p>
                    <ul>
                      <li>✅ <strong>Confirm Order</strong> - Proceed to checkout with address</li>
                      <li>💾 <strong>Save for Later</strong> - Save to draft order for future</li>
                      <li>🛒 <strong>Simple Add to Cart</strong> - Just add to local cart</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            
            <div className="home-modal-actions">
              <button 
                className="home-secondary-btn"
                onClick={() => handleSimpleAddToCart(selectedProduct)}
                disabled={isProcessing || !selectedProduct.inStock}
              >
                <i className="fas fa-shopping-cart"></i>
                Simple Add to Cart
              </button>
              
              <button 
                className="home-cancel-btn"
                onClick={handleClosePopup}
                disabled={isProcessing}
              >
                Cancel
              </button>
              
              <button 
                className="home-confirm-btn"
                onClick={() => 
                  saveForLater 
                    ? handleSaveToDraft(selectedProduct, quantity)
                    : handleConfirmOrder(selectedProduct, quantity)
                }
                disabled={isProcessing || !selectedProduct.inStock}
              >
                {isProcessing ? (
                  <span className="home-button-loading">
                    <i className="fas fa-spinner fa-spin"></i> Processing...
                  </span>
                ) : !selectedProduct.inStock ? (
                  <>
                    <i className="fas fa-times-circle"></i> Out of Stock
                  </>
                ) : saveForLater ? (
                  <>
                    <i className="fas fa-save"></i> Save for Later
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i> Confirm Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Footer */}
      <footer className="home-footer">
        <div className="home-footer-content">
          <div className="home-footer-brand">
            <span className="home-footer-brand-icon">🛒</span>
            <h3>Mercy Supermarket</h3>
            <p>Your one-stop shop for all daily needs</p>
          </div>
          
          <div className="home-footer-links">
            <div className="home-footer-section">
              <h4>Quick Links</h4>
              <Link to="/">Home</Link>
              <Link to="/cart">Cart</Link>
              <Link to="/profile">Profile</Link>
            </div>
            
            <div className="home-footer-section">
              <h4>Categories</h4>
              {categories.map(cat => (
                <button 
                  key={cat.key} 
                  onClick={() => scrollToSection(cat.key)}
                  className="home-footer-category-link"
                >
                  {cat.title}
                </button>
              ))}
            </div>
            
            <div className="home-footer-section">
              <h4>Support</h4>
              <a href="#contact">Contact Us</a>
              <a href="#help">Help Center</a>
              <a href="#terms">Terms of Service</a>
            </div>
          </div>
        </div>
        
        <div className="home-footer-bottom">
          <p>&copy; 2025 Mercy Supermarket. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;