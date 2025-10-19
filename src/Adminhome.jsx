import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminHome.css";

function Adminhome() {
  const categories = [
    { key: "grossory", key_admin: "grossory_admin", name: "Grossory", icon: "🥦" },
    { key: "snacks", key_admin: "snacks_admin", name: "Snacks", icon: "🍿" },
    { key: "soap", key_admin: "soap_admin", name: "Soap", icon: "🧼" },
    { key: "beauty", key_admin: "beauty_admin", name: "Beauty", icon: "💄" },
  ];

  const navigate = useNavigate();
  const [sliderImages, setSliderImages] = useState([]);
  const [showSliderModal, setShowSliderModal] = useState(false);
  const [editSlideId, setEditSlideId] = useState(null);
  const [newSlide, setNewSlide] = useState({ title: "", image: null });
  const [slidePreview, setSlidePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = "http://localhost:5001/api";

  // ===================== Fetch Slider =====================
  const fetchSlider = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/v1/slider`);
      if (!res.ok) throw new Error("Failed to fetch slider images");
      
      const data = await res.json();
      setSliderImages(data);
    } catch (err) {
      console.error("Error fetching slider:", err);
      setError("Failed to load slider images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlider();
  }, []);

  // ===================== Slider Handlers =====================
  const handleSlideInput = (e) => {
    const { name, value, files } = e.target;
    
    if (name === "image" && files && files[0]) {
      const file = files[0];
      setNewSlide({ ...newSlide, image: file });
      setSlidePreview(URL.createObjectURL(file));
    } else {
      setNewSlide({ ...newSlide, [name]: value });
    }
  };

  const resetSlideForm = () => {
    setNewSlide({ title: "", image: null });
    setSlidePreview(null);
    setEditSlideId(null);
    setError("");
  };

  const handleSlideSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const formData = new FormData();
    formData.append("title", newSlide.title);
    if (newSlide.image) formData.append("image", newSlide.image);

    const apiUrl = `${API_BASE}/v1/slider${editSlideId ? `/${editSlideId}` : ""}`;
    const method = editSlideId ? "PUT" : "POST";

    try {
      const res = await fetch(apiUrl, { method, body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save slide");
      }

      setShowSliderModal(false);
      resetSlideForm();
      fetchSlider();
    } catch (err) {
      console.error("Error saving slide:", err);
      setError(err.message || "Failed to save slide");
    }
  };

  const deleteSlide = async (id) => {
    if (!window.confirm("Are you sure you want to delete this slide?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/v1/slider/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete slide");
      
      fetchSlider();
    } catch (err) {
      console.error("Error deleting slide:", err);
      alert("Failed to delete slide");
    }
  };

  const openEditSlide = (slide) => {
    setEditSlideId(slide._id);
    setNewSlide({ title: slide.title || "", image: null });
    setSlidePreview(slide.image || null);
    setShowSliderModal(true);
    setError("");
  };

  const navigateToCategoryAdmin = (cat) => {
    navigate(`/${cat.key_admin}`);
  };

  // ===================== Render =====================
  return (
    <div className="admin-container">
      {/* ===================== Enhanced Navigation Bar ===================== */}
      <nav className="admin-nav-bar">
        <div className="nav-content">
          <div className="nav-brand">
            <span className="brand-icon">⚙️</span>
            <h1>Admin Dashboard</h1>
          </div>
          
          <div className="nav-links">
            <button className="nav-link" onClick={() => navigate("/")}>
              <i className="fas fa-home"></i>
              <span>View Site</span>
            </button>
            <button className="nav-link active">
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </button>
            <button className="nav-link" onClick={() => navigate("/orders_admin")}>
              <i className="fas fa-clipboard-list"></i>
              <span>Orders</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="admin-content">
        {/* ===================== Header Section ===================== */}
        <div className="admin-header">
          <div className="header-main">
            <h1 className="page-title">
              <i className="fas fa-images"></i>
              Slider Management
            </h1>
            <p className="page-subtitle">
              Manage homepage slider images and banners
            </p>
          </div>

          <div className="header-actions">
            <button 
              className="add-btn primary"
              onClick={() => { resetSlideForm(); setShowSliderModal(true); }}
            >
              <i className="fas fa-plus"></i>
              Add Slide
            </button>
          </div>
        </div>

        {/* ===================== Category Navigation ===================== */}
        <div className="admin-category-nav">
          {categories.map((cat) => (
            <button 
              key={cat.key} 
              onClick={() => navigateToCategoryAdmin(cat)}
              className="category-btn"
            >
              <span className="category-icon">{cat.icon}</span>
              <span className="category-name">{cat.name} Admin</span>
            </button>
          ))}
          <button 
            onClick={() => navigate("/orders_admin")}
            className="category-btn orders-btn"
          >
            <i className="fas fa-clipboard-list"></i>
            Orders Admin
          </button>
        </div>

        {/* ===================== Error Display ===================== */}
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {/* ===================== Enhanced Slider Modal ===================== */}
        {showSliderModal && (
          <div className="admin-modal-overlay" onClick={() => setShowSliderModal(false)}>
            <div className="admin-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editSlideId ? "Edit Slide" : "Add New Slide"}</h3>
                <button className="close-btn" onClick={() => setShowSliderModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <form onSubmit={handleSlideSubmit} className="modal-form">
                <div className="form-group">
                  <label>Slide Title *</label>
                  <input 
                    type="text" 
                    name="title" 
                    value={newSlide.title} 
                    onChange={handleSlideInput} 
                    placeholder="Enter slide title" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Slide Image *</label>
                  <input 
                    type="file" 
                    name="image" 
                    onChange={handleSlideInput} 
                    className="file-input"
                    accept="image/*"
                    required={!editSlideId}
                  />
                  <small className="file-hint">Recommended size: 1200x400 pixels for best display</small>
                </div>

                {slidePreview && (
                  <div className="image-preview">
                    <img src={slidePreview} alt="preview" />
                  </div>
                )}

                {error && (
                  <div className="form-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {error}
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowSliderModal(false)}>
                    <i className="fas fa-times"></i>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn primary">
                    <i className={`fas ${editSlideId ? 'fa-save' : 'fa-plus'}`}></i>
                    {editSlideId ? "Update Slide" : "Add Slide"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================== Content Area ===================== */}
        <div className="admin-content-area">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading slider images...</p>
            </div>
          ) : (
            <>
              {/* ================= Slider List ================= */}
              <div className="admin-list">
                {sliderImages.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-images"></i>
                    <h3>No Slider Images</h3>
                    <p>Add some images to display on the homepage slider</p>
                    <button 
                      className="add-btn primary"
                      onClick={() => { resetSlideForm(); setShowSliderModal(true); }}
                    >
                      <i className="fas fa-plus"></i>
                      Add Your First Slide
                    </button>
                  </div>
                ) : (
                  <div className="slider-grid">
                    {sliderImages.map(slide => (
                      <div key={slide._id} className="admin-card slider-card">
                        <div className="card-image">
                          {slide.image ? (
                            <img src={slide.image} alt={slide.title} />
                          ) : (
                            <div className="no-image">
                              <i className="fas fa-image"></i>
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="card-content">
                          <h3 className="card-title">{slide.title}</h3>
                          <p className="card-description">Homepage Slider Image</p>
                          <div className="card-meta">
                            <span className="meta-item">
                              <i className="fas fa-calendar"></i>
                              {new Date(slide.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="card-actions">
                          <button 
                            className="edit-btn"
                            onClick={() => openEditSlide(slide)}
                          >
                            <i className="fas fa-edit"></i>
                            Edit
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => deleteSlide(slide._id)}
                          >
                            <i className="fas fa-trash"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ================= Stats Summary ================= */}
              {sliderImages.length > 0 && (
                <div className="stats-summary">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <i className="fas fa-images"></i>
                    </div>
                    <div className="stat-info">
                      <h3>{sliderImages.length}</h3>
                      <p>Total Slides</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">
                      <i className="fas fa-eye"></i>
                    </div>
                    <div className="stat-info">
                      <h3>{sliderImages.length}</h3>
                      <p>Active on Homepage</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">
                      <i className="fas fa-sync"></i>
                    </div>
                    <div className="stat-info">
                      <h3>Auto</h3>
                      <p>Rotation Enabled</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= Slider Instructions ================= */}
              {sliderImages.length > 0 && (
                <div className="instructions-panel">
                  <h4>
                    <i className="fas fa-info-circle"></i>
                    Slider Management Tips
                  </h4>
                  <ul>
                    <li>✅ Add up to 10 slides for optimal homepage display</li>
                    <li>🖼️ Use high-quality images (1200x400px recommended)</li>
                    <li>📱 Images will automatically adjust for mobile devices</li>
                    <li>🔄 Slides rotate automatically every 5 seconds</li>
                    <li>🎯 Add compelling titles to engage visitors</li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Adminhome;