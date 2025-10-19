import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useCart } from "./CartContext";
import { useNavigate, Link } from "react-router-dom";
import useProducts from "./useProducts";
import "./Products.css";

function Beauty() {
  const { cartItems = [], addToCart } = useCart();
  const navigate = useNavigate();

  // Use the custom hook
  const {
    allProducts,
    isLoading,
    error,
    fetchProducts
  } = useProducts("http://localhost:5001/api/beauty_products");

  const [search, setSearch] = useState("");
  const [activeSubcategory, setActiveSubcategory] = useState("All");
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveForLater, setSaveForLater] = useState(false);

  const mainCategory = "Beauty";
  const categoriesMap = {
    Beauty: ["All", "Facewash", "Creams", "Lotions", "Shampoo", "Soap", "Other"],
  };
  const subcategories = categoriesMap[mainCategory];

  // ✅ Consistent inStock checking function
  const isOutOfStock = (product) => {
    return product.inStock === false || product.inStock === "false";
  };

  // ✅ Filter logic optimized with useMemo
  const filteredProducts = useMemo(() => {
    const active = (activeSubcategory || "").toLowerCase();
    const searchLower = search.toLowerCase();

    return allProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sub = (p.subcategory || "").toLowerCase();

      const matchSub =
        !activeSubcategory ||
        active === "all" ||
        sub.includes(active) ||
        name.includes(active) ||
        sub.includes(active + "s") ||
        name.includes(active + "s");

      const matchSearch = name.includes(searchLower);
      return matchSub && matchSearch;
    });
  }, [allProducts, activeSubcategory, search]);

  const selectSubcategory = (sub) => setActiveSubcategory(sub);

  // ✅ Enhanced Add to Cart with draft options
  const handleAddToCartClick = useCallback((product) => {
    if (isOutOfStock(product)) {
      alert("❌ This product is out of stock!");
      return;
    }
    setSelectedProduct(product);
    setQuantity(1);
    setSaveForLater(false);
    setShowPopup(true);
  }, []);

  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setSelectedProduct(null);
    setIsProcessing(false);
    setSaveForLater(false);
  }, []);

  // Get or Create Draft Order
  const getOrCreateDraftOrder = async (token) => {
    try {
      // Try to get existing draft orders
      const ordersRes = await fetch("http://localhost:5001/api/orders", {
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

      // Create new draft if none exists
      const createRes = await fetch("http://localhost:5001/api/orders/draft", {
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
    if (isOutOfStock(product)) {
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

      const updatedOrder = await addItemRes.json();
      console.log("✅ Item added to order successfully");

      // 3️⃣ Navigate to address page for order confirmation
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
    if (isOutOfStock(product)) {
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
  const handleSimpleAddToCart = useCallback(
    (product) => {
      if (isOutOfStock(product)) {
        alert("❌ This product is out of stock!");
        return;
      }

      const input = prompt(`Enter quantity for ${product.name}:`, "1");
      if (input === null) {
        alert("Cancelled adding to cart.");
        return;
      }

      const qty = parseInt(input);
      if (isNaN(qty) || qty <= 0) {
        alert("Please enter a valid quantity!");
        return;
      }

      const cartItem = {
        productId: product._id,
        name: product.name,
        price: product.finalPrice || product.price,
        quantity: qty,
        total: (product.finalPrice || product.price) * qty,
        image: product.image,
      };

      addToCart(cartItem);

      // Update localStorage
      const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
      const existingItemIndex = existingCart.findIndex((i) => i.productId === product._id);

      if (existingItemIndex >= 0) {
        existingCart[existingItemIndex].quantity += qty;
        existingCart[existingItemIndex].total =
          existingCart[existingItemIndex].price * existingCart[existingItemIndex].quantity;
      } else {
        existingCart.push(cartItem);
      }

      localStorage.setItem("cart", JSON.stringify(existingCart));
      alert(`✅ ${product.name} (x${qty}) added to cart!`);
    },
    [addToCart]
  );

  return (
    <div className="beauty-user-container">
      {/* Loading State */}
      {isLoading && (
        <div className="page-loading products-loading">
          <i className="fas fa-spa fa-spin"></i>
          <h3>Loading Beauty Products</h3>
          <p>Getting amazing beauty products for you...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="page-loading error-loading">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Error Loading Products</h3>
          <p>{error}</p>
          <button 
            onClick={fetchProducts} 
            className="retry-btn"
          >
            <i className="fas fa-redo"></i> Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* ================= Title Bar ================= */}
          <div className="beauty-user-title-bar">
            <div className="title-left">
              <h1>ManoMercy Supermarket</h1>
            </div>
            <div className="title-center">
              <div className="beauty-user-title-bar-search-bar">
                <i className="fas fa-search"></i>
                <input
                  type="search"
                  placeholder="Search for beauty products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
            </div>
          </div>

          {/* ================= Subcategory Tabs ================= */}
          <div className="beauty-user-tabs">
            {subcategories.map((sub) => (
              <button
                key={sub}
                className={activeSubcategory === sub ? "active" : ""}
                onClick={() => selectSubcategory(sub)}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* ================= Product List ================= */}
          <div className={`beauty-user-list ${filteredProducts.length <= 3 ? "center-cards" : ""}`}>
            {filteredProducts.length === 0 ? (
              <div className="no-products">
                <i className="fas fa-search"></i>
                <h3>No Beauty Products Found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const outOfStock = isOutOfStock(p);
                return (
                  <div
                    className={`beauty-user-card ${outOfStock ? 'out-of-stock' : ''}`}
                    key={p._id}
                  >
                    <img
                      src={p.image || "https://via.placeholder.com/200"}
                      alt={p.name}
                    />
                    <div className="beauty-user-card-content">
                      <h2>{p.name}</h2>
                      <p className="description">{p.description?.substring(0, 50)}...</p>
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

                      {p.discount > 0 && (
                        <p className="discount">Save {p.discount}%</p>
                      )}
                      {outOfStock && (
                        <p className="stock-status out-of-stock-text">Out of Stock</p>
                      )}
                    </div>
                    
                    <div className="beauty-user-actions">
                      <button 
                        onClick={() => handleAddToCartClick(p)}
                        disabled={outOfStock}
                        className={outOfStock ? "disabled-btn" : "primary-btn"}
                      >
                        <i className="fas fa-cart-plus"></i> 
                        {outOfStock ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ================= Enhanced Add to Cart Popup ================= */}
          {showPopup && selectedProduct && (
            <div className="beauty-user-modal">
              <div className="beauty-user-modal-content">
                <span 
                  className="beauty-user-close" 
                  onClick={() => !isProcessing && handleClosePopup()}
                >
                  &times;
                </span>
                
                <div className="modal-header">
                  <h3>Add {selectedProduct.name} to Cart</h3>
                  {isOutOfStock(selectedProduct) && (
                    <span className="out-of-stock-badge">
                      <i className="fas fa-times-circle"></i> Out of Stock
                    </span>
                  )}
                </div>
                
                <div className="modal-body">
                  <p className="product-price">
                    <i className="fas fa-tag"></i> Price: ₹{selectedProduct.finalPrice || selectedProduct.price}
                  </p>
                  
                  <label className="quantity-label">
                    <i className="fas fa-box"></i> Quantity:
                    <input
                      type="number"
                      min="1"
                      max={isOutOfStock(selectedProduct) ? "0" : "100"}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      disabled={isProcessing || isOutOfStock(selectedProduct)}
                    />
                  </label>
                  
                  <h3 className="total-amount">
                    <i className="fas fa-receipt"></i> Total: ₹{(selectedProduct.finalPrice || selectedProduct.price) * quantity}
                  </h3>
                  
                  {!isOutOfStock(selectedProduct) && (
                    <div className="cart-options">
                      <label className="save-for-later-option">
                        <input
                          type="checkbox"
                          checked={saveForLater}
                          onChange={(e) => setSaveForLater(e.target.checked)}
                          disabled={isProcessing}
                        />
                        <i className="fas fa-bookmark"></i>
                        Save for later (Add to draft order)
                      </label>
                      
                      <div className="options-info">
                        <p><strong>Choose your option:</strong></p>
                        <ul>
                          <li>✅ <strong>Confirm Order</strong> - Proceed to checkout with address</li>
                          <li>💾 <strong>Save for Later</strong> - Save to draft order for future</li>
                          <li>🛒 <strong>Simple Add to Cart</strong> - Just add to local cart</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {isOutOfStock(selectedProduct) && (
                    <div className="out-of-stock-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      <p>This product is currently out of stock and cannot be purchased.</p>
                    </div>
                  )}
                </div>

                <div className="modal-action-buttons">
                  <button 
                    onClick={() => handleSimpleAddToCart(selectedProduct)}
                    disabled={isProcessing || isOutOfStock(selectedProduct)}
                    className="secondary-btn"
                  >
                    <i className="fas fa-shopping-cart"></i> Simple Add to Cart
                  </button>
                  
                  <button 
                    onClick={handleClosePopup} 
                    disabled={isProcessing}
                    className="cancel-btn"
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                  
                  <button 
                    onClick={() => 
                      saveForLater 
                        ? handleSaveToDraft(selectedProduct, quantity)
                        : handleConfirmOrder(selectedProduct, quantity)
                    }
                    disabled={isProcessing || isOutOfStock(selectedProduct)}
                    className={isOutOfStock(selectedProduct) ? "disabled-btn" : "confirm-btn"}
                  >
                    {isProcessing ? (
                      <span className="button-loading">
                        <i className="fas fa-spinner fa-spin"></i> Processing...
                      </span>
                    ) : isOutOfStock(selectedProduct) ? (
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
        </>
      )}
    </div>
  );
}

export default Beauty;