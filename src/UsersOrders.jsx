import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./Orders.css";
import { useNavigate, Link } from "react-router-dom";

function OrdersUser() {
  const [draftOrders, setDraftOrders] = useState([]);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentModes, setPaymentModes] = useState({});
  const [deliveryModes, setDeliveryModes] = useState({});
  const [collectByNames, setCollectByNames] = useState({});
  const [activeTab, setActiveTab] = useState("drafts");
  
  const navigate = useNavigate();
  const API_BASE = "http://localhost:5001/api/v1/orders";

  // Get token with validation
  const getToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found. Please login again.");
      setLoading(false);
      navigate("/login");
      return null;
    }
    return token;
  };

  // Fetch all orders with better error handling
  const fetchOrders = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      setError("");
      
      const res = await fetch(`${API_BASE}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      if (res.status === 401) {
        localStorage.removeItem("token");
        setError("Your session has expired. Please login again.");
        navigate("/login");
        return;
      }
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      
      const drafts = data.filter((order) => order.status === "Draft");
      const confirmed = data.filter((order) => order.status === "Confirmed");

      // If no draft exists, create one
      if (drafts.length === 0) {
        await createDraftOrder(token);
      } else {
        setDraftOrders(drafts);
      }

      setConfirmedOrders(confirmed);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.message || "Failed to fetch orders. Please try again.");
      
      if (err.message.includes("401") || err.message.includes("unauthorized")) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Create draft order
  const createDraftOrder = async (token) => {
    try {
      const createRes = await fetch(`${API_BASE}/draft`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
      });
      
      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.message || "Failed to create draft order");
      }
      
      const newDraft = await createRes.json();
      setDraftOrders([newDraft]);
    } catch (err) {
      console.error("Error creating draft:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Confirm Order
  const confirmOrder = async (orderId) => {
    const token = getToken();
    if (!token) return;

    const paymentMode = paymentModes[orderId];
    const deliveryMode = deliveryModes[orderId];
    const collectBy = collectByNames[orderId] || "";

    if (!paymentMode || !deliveryMode) {
      alert("Please select both payment and delivery mode.");
      return;
    }

    if (deliveryMode === "doorDelivery" && !collectBy.trim()) {
      alert("Please enter the name of the person collecting the order.");
      return;
    }

    if (!window.confirm("Are you sure you want to confirm this order?")) return;

    try {
      const res = await fetch(`${API_BASE}/${orderId}/confirm`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMode, deliveryMode, collectBy }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        setError("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to confirm order");
      }

      const confirmedOrder = await res.json();
      
      setDraftOrders(prev => prev.filter(order => order._id !== orderId));
      setConfirmedOrders(prev => [confirmedOrder, ...prev]);
      
      // Clear form data
      setPaymentModes(prev => {
        const newModes = { ...prev };
        delete newModes[orderId];
        return newModes;
      });
      setDeliveryModes(prev => {
        const newModes = { ...prev };
        delete newModes[orderId];
        return newModes;
      });
      setCollectByNames(prev => {
        const newNames = { ...prev };
        delete newNames[orderId];
        return newNames;
      });

      alert("Order confirmed successfully!");
    } catch (err) {
      console.error("Error confirming order:", err);
      alert(err.message);
    }
  };

  // Cancel Draft Order
  const cancelOrder = async (orderId) => {
    const token = getToken();
    if (!token) return;

    if (!window.confirm("Are you sure you want to cancel this draft order?")) return;

    try {
      const res = await fetch(`${API_BASE}/${orderId}`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        setError("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to cancel order");
      }

      setDraftOrders(prev => prev.filter(order => order._id !== orderId));
      alert("Draft order canceled successfully");
    } catch (err) {
      console.error("Error canceling order:", err);
      alert(err.message);
    }
  };

  // Download PDF
  const downloadPDF = (order) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Order Summary", 14, 20);
    doc.setFontSize(12);
    doc.text(`Order ID: ${order._id}`, 14, 30);
    doc.text(`Status: ${order.status}`, 14, 36);
    doc.text(`Date: ${new Date(order.confirmedAt || order.createdAt).toLocaleString()}`, 14, 42);

    const tableData = order.items?.map((item, i) => [
      i + 1,
      item.name,
      item.qty,
      `₹${item.finalPrice || item.price}`,
      `₹${(item.finalPrice || item.price) * item.qty}`,
    ]) || [];

    doc.autoTable({
      startY: 50,
      head: [["S.No", "Product Name", "Qty", "Price", "Total"]],
      body: tableData,
    });

    const total = order.total || order.items?.reduce((sum, i) => sum + (i.finalPrice || i.price) * i.qty, 0) || 0;

    doc.text(`Total Amount: ₹${total}`, 14, doc.lastAutoTable.finalY + 10);
    
    if (order.paymentMode) {
      doc.text(`Payment Mode: ${order.paymentMode}`, 14, doc.lastAutoTable.finalY + 18);
    }
    
    if (order.deliveryMode) {
      doc.text(`Delivery Mode: ${order.deliveryMode}`, 14, doc.lastAutoTable.finalY + 24);
    }

    if (order.collectBy) {
      doc.text(`Collect By: ${order.collectBy}`, 14, doc.lastAutoTable.finalY + 30);
    }

    doc.save(`Order_${order._id}.pdf`);
  };

  // Refresh orders
  const handleRefresh = () => {
    fetchOrders();
  };

  // Get cart items count from localStorage
  const getCartItemsCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      return cart.reduce((total, item) => total + (item.quantity || 1), 0);
    } catch {
      return 0;
    }
  };

  // Render loading state
  if (loading) return (
    <div className="orders-container">
      <OrdersNavBar cartItemsCount={getCartItemsCount()} />
      <div className="loading">Loading orders...</div>
    </div>
  );
  
  // Render error state
  if (error) return (
    <div className="orders-container">
      <OrdersNavBar cartItemsCount={getCartItemsCount()} />
      <div className="error-message">
        <p>{error}</p>
        <button onClick={handleRefresh} className="confirm-btn" style={{ marginTop: '10px' }}>
          Try Again
        </button>
        <button onClick={() => navigate("/login")} className="cancel-btn" style={{ marginTop: '10px', marginLeft: '10px' }}>
          Go to Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="orders-container">
      {/* Enhanced Navigation Bar */}
      <OrdersNavBar cartItemsCount={getCartItemsCount()} />

      {/* Main Content */}
      <div className="orders-content">
        <div className="orders-title-bar">
          <div className="title-left">
            <h1>My Orders</h1>
            <p className="orders-subtitle">Manage your draft and confirmed orders</p>
          </div>
          <div className="title-right">
            <button onClick={handleRefresh} className="refresh-btn">
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="orders-tabs">
          <button 
            className={`tab-button ${activeTab === "drafts" ? "active" : ""}`}
            onClick={() => setActiveTab("drafts")}
          >
            <i className="fas fa-file-alt"></i>
            Draft Orders ({draftOrders.length})
          </button>
          <button 
            className={`tab-button ${activeTab === "confirmed" ? "active" : ""}`}
            onClick={() => setActiveTab("confirmed")}
          >
            <i className="fas fa-check-circle"></i>
            Confirmed Orders ({confirmedOrders.length})
          </button>
        </div>

        {/* Draft Orders Tab */}
        {activeTab === "drafts" && (
          <div className="orders-list">
            {draftOrders.length === 0 ? (
              <div className="no-orders">
                <i className="fas fa-file-alt"></i>
                <h3>No Draft Orders</h3>
                <p>You don't have any draft orders at the moment.</p>
                <Link to="/home" className="continue-shopping-btn">
                  <i className="fas fa-shopping-bag"></i>
                  Continue Shopping
                </Link>
              </div>
            ) : (
              draftOrders.map((order) => (
                <OrderCard 
                  key={order._id}
                  order={order}
                  type="draft"
                  paymentModes={paymentModes}
                  deliveryModes={deliveryModes}
                  collectByNames={collectByNames}
                  onPaymentChange={(value) => setPaymentModes(prev => ({ ...prev, [order._id]: value }))}
                  onDeliveryChange={(value) => setDeliveryModes(prev => ({ ...prev, [order._id]: value }))}
                  onCollectByChange={(value) => setCollectByNames(prev => ({ ...prev, [order._id]: value }))}
                  onConfirm={confirmOrder}
                  onCancel={cancelOrder}
                  onDownload={downloadPDF}
                />
              ))
            )}
          </div>
        )}

        {/* Confirmed Orders Tab */}
        {activeTab === "confirmed" && (
          <div className="orders-list">
            {confirmedOrders.length === 0 ? (
              <div className="no-orders">
                <i className="fas fa-check-circle"></i>
                <h3>No Confirmed Orders</h3>
                <p>You haven't confirmed any orders yet.</p>
                <Link to="/home" className="continue-shopping-btn">
                  <i className="fas fa-shopping-bag"></i>
                  Start Shopping
                </Link>
              </div>
            ) : (
              confirmedOrders.map((order) => (
                <OrderCard 
                  key={order._id}
                  order={order}
                  type="confirmed"
                  onDownload={downloadPDF}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Navigation Bar Component
function OrdersNavBar({ cartItemsCount }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <nav className="orders-nav-bar">
      <div className="nav-content">
        <div className="nav-brand">
          <span className="brand-icon">📦</span>
          <h1>Mercy Supermarket</h1>
        </div>
        
        <div className="nav-links">
          <Link to="/home" className="nav-link">
            <i className="fas fa-home"></i>
            <span>Home</span>
          </Link>
          <Link to="/cart" className="nav-link cart-link">
            <i className="fas fa-shopping-cart"></i>
            <span>Cart</span>
            {cartItemsCount > 0 && (
              <span className="cart-badge">{cartItemsCount}</span>
            )}
          </Link>
          <Link to="/profile" className="nav-link">
            <i className="fas fa-user"></i>
            <span>Profile</span>
          </Link>
          <button className="nav-link logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

// Order Card Component - Complete implementation
function OrderCard({ 
  order, 
  type, 
  paymentModes = {}, 
  deliveryModes = {}, 
  collectByNames = {},
  onPaymentChange,
  onDeliveryChange,
  onCollectByChange,
  onConfirm,
  onCancel,
  onDownload 
}) {
  const totalAmount = order.total || order.items?.reduce((sum, item) => sum + (item.finalPrice || item.price) * item.qty, 0) || 0;

  return (
    <div className={`order-card ${type}`}>
      <div className="order-header">
        <div className="header-main">
          <h2>
            <i className="fas fa-receipt"></i>
            Order ID: {order._id}
          </h2>
          <div className="order-meta">
            <span className={`status-badge status-${order.status.toLowerCase()}`}>
              <i className={`fas ${type === 'confirmed' ? 'fa-check-circle' : 'fa-file-alt'}`}></i>
              {order.status}
            </span>
            <span className="order-date">
              <i className="fas fa-calendar"></i>
              {new Date(order.confirmedAt || order.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="order-table-container">
        <table className="order-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Product Name</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.length > 0 ? (
              order.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td className="product-name">{item.name}</td>
                  <td className="quantity">{item.qty}</td>
                  <td className="price">₹{item.finalPrice || item.price}</td>
                  <td className="total">₹{(item.finalPrice || item.price) * item.qty}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-items">
                  <i className="fas fa-box-open"></i>
                  No items in this order
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="order-total-section">
        <div className="order-total">
          <i className="fas fa-rupee-sign"></i>
          Total Amount: ₹{totalAmount}
        </div>
      </div>

      {/* Order Details for Confirmed Orders */}
      {type === "confirmed" && (
        <div className="order-details">
          <div className="detail-item">
            <strong>Payment Mode:</strong> 
            <span className="detail-value">{order.paymentMode || "Not specified"}</span>
          </div>
          <div className="detail-item">
            <strong>Delivery Mode:</strong> 
            <span className="detail-value">{order.deliveryMode || "Not specified"}</span>
          </div>
          {order.collectBy && (
            <div className="detail-item">
              <strong>Collect By:</strong> 
              <span className="detail-value">{order.collectBy}</span>
            </div>
          )}
        </div>
      )}

      {/* Form for Draft Orders */}
      {type === "draft" && (
        <div className="order-form-section">
          <div className="form-group">
            <h3><i className="fas fa-credit-card"></i> Payment Mode:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name={`payment-${order._id}`}
                  value="cash"
                  checked={paymentModes[order._id] === "cash"}
                  onChange={(e) => onPaymentChange(e.target.value)}
                />
                <span className="radio-custom"></span>
                <i className="fas fa-money-bill-wave"></i>
                Cash
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name={`payment-${order._id}`}
                  value="online"
                  checked={paymentModes[order._id] === "online"}
                  onChange={(e) => onPaymentChange(e.target.value)}
                />
                <span className="radio-custom"></span>
                <i className="fas fa-mobile-alt"></i>
                Online
              </label>
            </div>
          </div>

          <div className="form-group">
            <h3><i className="fas fa-shipping-fast"></i> Delivery Mode:</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name={`delivery-${order._id}`}
                  value="doorDelivery"
                  checked={deliveryModes[order._id] === "doorDelivery"}
                  onChange={(e) => onDeliveryChange(e.target.value)}
                />
                <span className="radio-custom"></span>
                <i className="fas fa-home"></i>
                Door Delivery
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name={`delivery-${order._id}`}
                  value="collectFromShop"
                  checked={deliveryModes[order._id] === "collectFromShop"}
                  onChange={(e) => onDeliveryChange(e.target.value)}
                />
                <span className="radio-custom"></span>
                <i className="fas fa-store"></i>
                Collect from Shop
              </label>
            </div>
          </div>

          {deliveryModes[order._id] === "doorDelivery" && (
            <div className="form-group collect-by-section">
              <label>
                <i className="fas fa-user"></i>
                Collect Order By:
                <input
                  type="text"
                  placeholder="Enter name of person collecting"
                  value={collectByNames[order._id] || ""}
                  onChange={(e) => onCollectByChange(e.target.value)}
                  className="collect-input"
                />
              </label>
            </div>
          )}

          <div className="order-actions">
            <button
              className="confirm-btn"
              onClick={() => onConfirm(order._id)}
            >
              <i className="fas fa-check"></i>
              Confirm Order
            </button>
            <button
              className="cancel-btn"
              onClick={() => onCancel(order._id)}
            >
              <i className="fas fa-times"></i>
              Cancel Draft
            </button>
            <button
              className="download-btn"
              onClick={() => onDownload(order)}
            >
              <i className="fas fa-download"></i>
              Download Bill
            </button>
          </div>
        </div>
      )}

      {/* Actions for Confirmed Orders */}
      {type === "confirmed" && (
        <div className="order-actions">
          <button
            className="download-btn"
            onClick={() => onDownload(order)}
          >
            <i className="fas fa-file-pdf"></i>
            Download Invoice
          </button>
        </div>
      )}
    </div>
  );
}

export default OrdersUser;