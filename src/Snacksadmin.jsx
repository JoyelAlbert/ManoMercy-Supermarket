import React, { useState, useMemo } from "react";
import useProducts from "./useProducts";
import { useNavigate } from "react-router-dom";
import "./Products.css";

function Snacksadmin() {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("snacks_admin");
  const navigate = useNavigate();

  const categories = [
    { key: "grossory", key_admin: "grossory_admin", name: "Grossory" },
    { key: "snacks", key_admin: "snacks_admin", name: "Snacks" },
    { key: "soap", key_admin: "soap_admin", name: "Soap" },
    { key: "beauty", key_admin: "beauty_admin", name: "Beauty" },
  ];

  const {
    allProducts,
    newProduct,
    setNewProduct,
    imagePreview,
    setImagePreview,
    error,
    isLoading,
    addProduct,
    editProduct,
    deleteProduct,
    toggleOutOfStock,
    toggleHomeProduct,
    homeProducts
  } = useProducts("http://localhost:5001/api/v1/snacks_products");

  // Reset form
  const resetForm = () => {
    setNewProduct({
      name: "",
      description: "",
      price: "",
      discount: 0,
      finalPrice: 0,
      image: null,
      inStock: true,
      subcategory: ""
    });
    setImagePreview(null);
    setEditId(null);
  };

  // Open modal for editing
  const openEditModal = (product) => {
    setEditId(product._id);
    setNewProduct({
      name: product.name || "",
      description: product.description || "",
      price: product.price || "",
      discount: product.discount || 0,
      finalPrice: product.finalPrice || product.price || 0,
      inStock: product.inStock !== undefined ? product.inStock : true,
      subcategory: product.subcategory || "",
      image: null,
    });
    setImagePreview(product.image || null);
    setShowModal(true);
  };

  // Handle form inputs
  const handleInputChange = (e) => {
    const { name, value, files, type, checked } = e.target;

    if (name === "image" && files && files[0]) {
      setNewProduct({ ...newProduct, image: files[0] });
      setImagePreview(URL.createObjectURL(files[0]));
      return;
    }

    const updated = { ...newProduct };

    if (type === "checkbox") {
      updated[name] = checked;
    } else {
      updated[name] = value;
    }

    // Calculate final price if price or discount changes
    if (name === "price" || name === "discount") {
      const price = parseFloat(updated.price) || 0;
      const discount = parseFloat(updated.discount) || 0;
      updated.finalPrice = parseFloat((price - (price * discount) / 100).toFixed(2));
    }

    setNewProduct(updated);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await editProduct(editId, newProduct);
      } else {
        await addProduct(newProduct);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      // Error is handled in the useProducts hook
    }
  };

  // Edit/Delete handlers
  const handleEdit = (product) => openEditModal(product);

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteProduct(id);
    }
  };

  // Filter products by search
  const filteredProducts = useMemo(() => {
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(search.toLowerCase()))
    );
  }, [allProducts, search]);

  // Subcategories for Snacks
  const snacksSubcategories = ["Chips", "Biscuit", "Drinks", "Other"];

  return (
    <div className="snacks-home-container">
      {/* Loading State */}
      {isLoading && (
        <div className="page-loading admin-loading">
          <i className="fas fa-cookie-bite fa-spin"></i>
          <h3>Loading Snacks Products</h3>
          <p>Managing your snacks products...</p>
        </div>
      )}

      {/* Title Bar */}
      <div className="snacks-home-title-bar">
        <div className="title-left">
          <h1>Snacks Products Admin</h1>
          <p>Total Products: {allProducts.length} | Home Products: {homeProducts.length}/8</p>
        </div>
        <div className="title-center">
          <div className="snacks-home-title-bar-search-bar">
            <i className="fas fa-search"></i>
            <input
              type="search"
              placeholder="Search snacks products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="title-right">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="add-button"
          >
            <i className="fas fa-plus"></i> Add Product
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="snacks-home-tabs">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              navigate(`/${cat.key_admin}`);
              setActiveTab(cat.key_admin);
            }}
            className={activeTab === cat.key_admin ? "active" : ""}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Product List */}
      <div className="snacks-home-list">
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <i className="fas fa-cookie-bite"></i>
            <h3>No Snacks Products Found</h3>
            <p>Try adding some products or adjusting your search</p>
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div className={`snacks-home-card ${!p.inStock ? "out-of-stock" : ""}`} key={p._id}>
              <div className="image-wrapper">
                <img src={p.image || "https://via.placeholder.com/200"} alt={p.name} />
                {p.discount > 0 && (
                  <span className="discount-badge">{p.discount}% OFF</span>
                )}
              </div>
              <div className="snacks-home-card-content">
                <h2>{p.name}</h2>
                <p className="description">{p.description}</p>
                <div className="price-section">
                  <p className="price">₹{p.finalPrice || p.price}</p>
                  {p.discount > 0 && (
                    <p className="original-price">₹{p.price}</p>
                  )}
                </div>
                {p.subcategory && (
                  <p className="subcategory">
                    <i className="fas fa-tag"></i> {p.subcategory}
                  </p>
                )}
                <div className="status-section">
                  <span className={`stock-status ${p.inStock ? 'in-stock' : 'out-of-stock'}`}>
                    <i className={`fas ${p.inStock ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    {p.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                  <span className={`home-status ${p.showOnHome ? 'on-home' : 'off-home'}`}>
                    <i className="fas fa-home"></i>
                    {p.showOnHome ? 'On Home' : 'Not on Home'}
                  </span>
                </div>
              </div>
              <div className="snacks-home-actions">
                <button 
                  className="edit" 
                  onClick={() => handleEdit(p)}
                  disabled={isLoading}
                >
                  <i className="fas fa-edit"></i> Edit
                </button>
                <button 
                  className="delete" 
                  onClick={() => handleDelete(p._id)}
                  disabled={isLoading}
                >
                  <i className="fas fa-trash"></i> Delete
                </button>
                <button
                  onClick={() => toggleOutOfStock(p._id, p.inStock)}
                  className={p.inStock ? "stock-btn out-stock" : "stock-btn in-stock"}
                  disabled={isLoading}
                >
                  <i className={`fas ${p.inStock ? 'fa-times' : 'fa-check'}`}></i>
                  {p.inStock ? "Out of Stock" : "In Stock"}
                </button>
                <button
                  onClick={() => toggleHomeProduct(p._id, !p.showOnHome)}
                  className={p.showOnHome ? "home-btn remove-home" : "home-btn add-home"}
                  disabled={isLoading || (!p.showOnHome && homeProducts.length >= 8)}
                >
                  <i className="fas fa-home"></i>
                  {p.showOnHome ? "Remove from Home" : "Add to Home"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="snacks-home-modal" onClick={() => setShowModal(false)}>
          <div className="snacks-home-modal-content" onClick={(e) => e.stopPropagation()}>
            <span 
              className="snacks-home-close" 
              onClick={() => setShowModal(false)}
            >
              &times;
            </span>
            
            <h2>{editId ? "Edit Snacks Product" : "Add New Snacks Product"}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter product name"
                  value={newProduct.name || ""}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Enter product description"
                  value={newProduct.description || ""}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price *</label>
                  <input
                    type="number"
                    name="price"
                    placeholder="Price"
                    value={newProduct.price || ""}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Discount (%)</label>
                  <input
                    type="number"
                    name="discount"
                    placeholder="Discount"
                    value={newProduct.discount || 0}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Final Price</label>
                <input
                  type="number"
                  name="finalPrice"
                  placeholder="Final Price"
                  value={newProduct.finalPrice || 0}
                  readOnly
                  className="readonly"
                />
              </div>

              <div className="form-group">
                <label>Subcategory</label>
                <select
                  name="subcategory"
                  value={newProduct.subcategory || ""}
                  onChange={handleInputChange}
                >
                  <option value="">Select Subcategory</option>
                  {snacksSubcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="inStock"
                    checked={newProduct.inStock}
                    onChange={handleInputChange}
                  /> 
                  <span className="checkmark"></span>
                  In Stock
                </label>
              </div>

              <div className="form-group">
                <label>Product Image</label>
                <input 
                  type="file" 
                  name="image" 
                  onChange={handleInputChange}
                  accept="image/*"
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="preview" />
                  </div>
                )}
              </div>

              {error && (
                <div className="form-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <div className="modal-action-buttons">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="button-loading">
                      <i className="fas fa-spinner fa-spin"></i> 
                      {editId ? "Updating..." : "Adding..."}
                    </span>
                  ) : (
                    <>
                      <i className={`fas ${editId ? 'fa-save' : 'fa-plus'}`}></i>
                      {editId ? "Update Product" : "Add Product"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Snacksadmin;