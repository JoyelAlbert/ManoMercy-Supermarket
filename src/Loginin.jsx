import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Loginin() {
  const navigate = useNavigate();

  // UI States
  const [isFlipped, setIsFlipped] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStage, setResetStage] = useState(1);

  // --- Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  // --- Validation
  const validateForm = () => {
    const isSignup = isFlipped;
    if (isSignup) {
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        setError("Please fill in all fields.");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
    } else {
      if (!formData.email || !formData.password) {
        setError("Email and password are required.");
        return false;
      }
    }
    return true;
  };

  // --- Submit (Signup/Login)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const isSignup = isFlipped;

    setLoading(true);
    try {
      const endpoint = isSignup
        ? "http://localhost:5001/api/v1/signup"
        : "http://localhost:5001/api/v1/login";

      const payload = isSignup
        ? { ...formData, role: "user" }
        : { email: formData.email, password: formData.password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        alert(`✅ ${isSignup ? "Signup" : "Login"} successful!`);

        if (!isSignup && data.user.role?.toLowerCase() === "admin") {
          navigate("/admin_home");
        } else {
          navigate("/home");
        }
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server.");
      setLoading(false);
    }
  };

  // --- Forgot Password: Send Reset Code
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5001/api/v1/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Reset code sent to your email!");
        setResetStage(2);
      } else alert(`❌ ${data.message}`);
    } catch {
      alert("Error connecting to server.");
    }
  };

  // --- Verify Code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5001/api/v1/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, code: resetCode }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Code verified! You can reset your password.");
        setResetStage(3);
      } else alert(`❌ ${data.message}`);
    } catch {
      alert("Error verifying code.");
    }
  };

  // --- Reset Password
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5001/api/v1/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Password reset successful!");
        setForgotOpen(false);
        setResetStage(1);
        setForgotEmail("");
        setResetCode("");
        setNewPassword("");
      } else alert(`❌ ${data.message}`);
    } catch {
      alert("Error resetting password.");
    }
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

       {/* Optional animated welcome intro */} 
       <div className="welcome-section"> 
        <div className="welcome-content"> 
        <h1 className="login-title">
           <span className="title-icon">🛒</span>Welcome to ManoMercy Supermarket</h1>
       <p className="login-subtitle">Your one-stop destination for all daily needs</p> 
       </div> 
       </div>

      <div className="page">
        <div className="Login">
          <div className="app-brand">
            <h2 className="app-title">ManoMercy Supermarket</h2>
          </div>

          <div className={`cube ${isFlipped ? "flipped" : ""}`}>
            {/* ==== Sign In ==== */}
            <div className="front">
              <div className="form-header">
                <h2>Sign In</h2>
                <p>Access your account</p>
              </div>

              {error && <p className="error">{error}</p>}
              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  onChange={handleChange}
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  required
                  onChange={handleChange}
                />
                <div className="form-options">
                  <label>
                    <input type="checkbox" /> Remember me
                  </label>
                  <span
                    className="forgot-password"
                    onClick={() => setForgotOpen(true)}
                  >
                    Forgot Password?
                  </span>
                </div>
                <button className="submit-btn" disabled={loading}>
                  {loading ? "Loading..." : "Sign In"}
                </button>
              </form>
            </div>

            {/* ==== Sign Up ==== */}
            <div className="back">
              <div className="form-header">
                { <h2>Create Account</h2> }
                { <p>Shop smarter, join today</p> }
              </div>

              {error && <p className="error">{error}</p>}
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  required
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="phone"
                  placeholder="Phone Number"
                  required
                  onChange={handleChange}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  onChange={handleChange}
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  required
                  onChange={handleChange}
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  required
                  onChange={handleChange}
                />
                <button className="submit-btn" disabled={loading}>
                  {loading ? "Loading..." : "Sign Up"}
                </button>
              </form>
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="toggle-section">
            <p className="toggle-text">
              {isFlipped
                ? "Already have an account?"
                : "Don’t have an account yet?"}
            </p>
            <div className="toggle-buttons">
              <button
                className={`toggle-btn ${!isFlipped ? "active" : ""}`}
                onClick={() => setIsFlipped(false)}
              >
                Sign In
              </button>
              <button
                className={`toggle-btn ${isFlipped ? "active" : ""}`}
                onClick={() => setIsFlipped(true)}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==== Forgot Password Overlay ==== */}
      {forgotOpen && (
        <div className="forgot-overlay">
          <div className="forgot-box">
            <h2>Reset Password</h2>

            {resetStage === 1 && (
              <form onSubmit={handleForgotPassword}>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
                <button type="submit">Send Reset Code</button>
              </form>
            )}

            {resetStage === 2 && (
              <form onSubmit={handleVerifyCode}>
                <input
                  type="text"
                  placeholder="Enter verification code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                />
                <button type="submit">Verify Code</button>
              </form>
            )}

            {resetStage === 3 && (
              <form onSubmit={handlePasswordReset}>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button type="submit">Reset Password</button>
              </form>
            )}

            <button className="close-btn" onClick={() => setForgotOpen(false)}>
              ✖ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
