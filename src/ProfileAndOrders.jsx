import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ProfileAndOrders.css";

const ProfileAndOrders = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", email: "", phone: "", address: "" });
  const [updateMessage, setUpdateMessage] = useState("");

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  // Search
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch profile & orders
  useEffect(() => {
    const fetchProfileAndOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No token found. Please login again.");
          setLoading(false);
          return;
        }

        const profileRes = await axios.get("http://localhost:5001/api/v1/users", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const ordersRes = await axios.get("http://localhost:5001/api/v1/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile(profileRes.data);
        setOrders(ordersRes.data);
        setFilteredOrders(ordersRes.data);
      } catch (err) {
        console.error(err.response?.data || err.message);
        setError(err.response?.data?.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndOrders();
  }, []);

  // Handle Edit Inputs
  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  // Toggle Edit Mode
  const handleEditToggle = () => {
    if (!isEditing && profile) {
      setEditData({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
      });
    }
    setIsEditing(!isEditing);
    setUpdateMessage("");
  };

  // Save Edited Profile
  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5001/api/v1/users/${profile._id}`,
        editData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfile(res.data);
      setIsEditing(false);
      setUpdateMessage("Profile updated successfully!");
    } catch (err) {
      console.error(err.response?.data || err.message);
      setUpdateMessage("Failed to update profile");
    }
  };

  // Password handlers
  const handlePasswordChange = (e) =>
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPassError("New password and confirm password do not match");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5001/api/v1/users/${profile._id}/password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPassSuccess(res.data.message || "Password updated successfully");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      console.error(err.response?.data || err.message);
      setPassError(err.response?.data?.message || "Failed to update password");
    }
  };

  // Search orders
  useEffect(() => {
    const filtered = orders.filter((order) => {
      const idMatch = order._id.toLowerCase().includes(searchTerm.toLowerCase());
      const itemsMatch = order.items.some((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return idMatch || itemsMatch;
    });
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  // Navigation functions
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const navigateToHome = () => navigate("/");
  const navigateToCart = () => navigate("/cart");
  const navigateToProfile = () => navigate("/profile");

  // Get status class
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'completed': return 'status-completed';
      case 'delivered': return 'status-delivered';
      default: return 'status-pending';
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
    </div>
  );
  
  if (error) return (
    <div className="profile-main-container">
      <div className="profile-container">
        <div className="profile-card">
          <div className="message message-error">{error}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="profile-main-container">
      {/* Navigation Bar */}
      <nav className="profile-nav-bar">
        <div className="nav-content">
          <div className="nav-title">My Account</div>
          <div className="nav-links">
            <a href="/" className="nav-link">
              <i className="fas fa-home"></i>
              Home
            </a>
            <a href="/cart" className="nav-link">
              <i className="fas fa-shopping-cart"></i>
              Cart
            </a>
            <a href="/profile" className="nav-link">
              <i className="fas fa-user"></i>
              Profile
            </a>
          </div>
        </div>
      </nav>

      <div className="profile-container">
        {/* Profile Section */}
        {profile && (
          <div className="profile-card">
            <h2 className="section-title">
              <i className="fas fa-user-circle"></i>
              Profile Information
            </h2>

            {!isEditing ? (
              <>
                <div className="profile-info">
                  <div className="info-item">
                    <strong>Name:</strong>
                    <p>{profile.name}</p>
                  </div>
                  <div className="info-item">
                    <strong>Email:</strong>
                    <p>{profile.email}</p>
                  </div>
                  <div className="info-item">
                    <strong>Phone:</strong>
                    <p>{profile.phone || "Not provided"}</p>
                  </div>
                  <div className="info-item">
                    <strong>Address:</strong>
                    <p>{profile.address || "Not provided"}</p>
                  </div>
                </div>

                <div className="profile-actions">
                  <button className="btn btn-primary" onClick={handleEditToggle}>
                    <i className="fas fa-edit"></i>
                    Edit Profile
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowPasswordForm(!showPasswordForm)}>
                    <i className="fas fa-key"></i>
                    {showPasswordForm ? "Cancel" : "Change Password"}
                  </button>
                  <button className="btn btn-danger" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="edit-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editData.name}
                    onChange={handleEditChange}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={editData.email}
                    onChange={handleEditChange}
                    placeholder="Enter your email address"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={editData.phone}
                    onChange={handleEditChange}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={editData.address}
                    onChange={handleEditChange}
                    placeholder="Enter your complete address"
                  />
                </div>
                <div className="edit-buttons">
                  <button className="btn btn-primary" onClick={handleSaveProfile}>
                    <i className="fas fa-save"></i>
                    Save Changes
                  </button>
                  <button className="btn btn-secondary" onClick={handleEditToggle}>
                    <i className="fas fa-times"></i>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {updateMessage && (
              <div className={`message ${updateMessage.includes('successfully') ? 'message-success' : 'message-error'}`}>
                {updateMessage}
              </div>
            )}

            {showPasswordForm && (
              <form onSubmit={handlePasswordSubmit} className="change-password-form">
                <h3 style={{ margin: '0 0 15px 0', color: '#667eea' }}>
                  <i className="fas fa-lock"></i>
                  Change Password
                </h3>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-key"></i>
                  Update Password
                </button>
                {passError && <div className="message message-error">{passError}</div>}
                {passSuccess && <div className="message message-success">{passSuccess}</div>}
              </form>
            )}
          </div>
        )}

        {/* Orders Section */}
        <div className="profile-card">
          <h2 className="section-title">
            <i className="fas fa-shopping-bag"></i>
            Order History
          </h2>
          
          <input
            type="text"
            placeholder="🔍 Search orders by ID or product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="order-search-bar"
          />

          {filteredOrders.length > 0 ? (
            <div className="orders-list">
              {filteredOrders.map((order) => (
                <div className="order-card" key={order._id}>
                  <div className="order-header">
                    <div className="order-id">Order #{order._id.slice(-8).toUpperCase()}</div>
                    <div className={`order-status ${getStatusClass(order.status)}`}>
                      {order.status || "Pending"}
                    </div>
                  </div>
                  
                  <div className="order-details">
                    <div className="order-detail">
                      <strong>Customer</strong>
                      <span>{order.number || "N/A"}</span>
                    </div>
                    <div className="order-detail">
                      <strong>Payment Mode</strong>
                      <span>{order.paymentmode || "N/A"}</span>
                    </div>
                    <div className="order-detail">
                      <strong>Payment Status</strong>
                      <span>{order.paymentstatus || "N/A"}</span>
                    </div>
                    <div className="order-detail">
                      <strong>Contact</strong>
                      <span>{order.contactnumber || "N/A"}</span>
                    </div>
                    <div className="order-detail">
                      <strong>Total Amount</strong>
                      <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '16px' }}>
                        ₹{order.total || "0"}
                      </span>
                    </div>
                    <div className="order-detail">
                      <strong>Order Date</strong>
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>

                  <div className="order-items">
                    <strong>Order Items ({order.items.length})</strong>
                    <ul>
                      {order.items.map((item, idx) => (
                        <li key={idx}>
                          <strong>{item.name}</strong> - Qty: {item.qty} - ₹{item.price}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <i className="fas fa-shopping-cart" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
              <p style={{ fontSize: '18px', margin: 0 }}>No orders found</p>
              {searchTerm && <p style={{ marginTop: '10px' }}>Try adjusting your search terms</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileAndOrders;