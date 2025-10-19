import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./Orders.css";
import { useNavigate } from "react-router-dom";

const OrdersAdmin = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ================== FETCH ORDERS ==================
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch("http://localhost:5001/api/v1/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();

      // Clean + sort by order number
      const cleaned = data.map((order, index) => ({
        ...order,
        orderno: order.orderno || `Order No ${index + 1}`,
        customername: order.customername || "Unknown",
        email: order.email || "N/A",
        status: order.status || "Pending",
        items: order.items || [],
      }));

      const sorted = cleaned.sort(
        (a, b) =>
          Number(a.orderno.replace(/\D/g, "")) -
          Number(b.orderno.replace(/\D/g, ""))
      );
      setOrders(sorted);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ================== DOWNLOAD BILL ==================
  const downloadBill = (order) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("🧾 Customer Bill", 14, 20);
    doc.setFontSize(12);
    doc.text(`Order No: ${order.orderno}`, 14, 35);
    doc.text(`Customer: ${order.customername}`, 14, 45);
    doc.text(`Contact: ${order.contactnumber || "N/A"}`, 14, 55);
    doc.text(`Email: ${order.email}`, 14, 65);
    doc.text(`Address: ${order.address || "N/A"}`, 14, 75);
    doc.text(`Date: ${order.date || "N/A"} | Time: ${order.time || "N/A"}`, 14, 85);
    doc.text(`Payment Mode: ${order.paymentmode || "N/A"}`, 14, 95);
    doc.text(`Payment Status: ${order.paymentstatus || "N/A"}`, 14, 105);
    doc.text(`Status: ${order.status}`, 14, 115);

    const items = (order.items || []).map((item) => [
      item.name || "Unknown",
      item.qty || 0,
      `₹${item.price || 0}`,
      `₹${(item.qty || 0) * (item.price || 0)}`,
    ]);

    doc.autoTable({
      head: [["Item", "Qty", "Price", "Total"]],
      body: items,
      startY: 125,
    });

    doc.setFontSize(14);
    doc.text(
      `Grand Total: ₹${order.total || 0}`,
      14,
      doc.lastAutoTable.finalY + 10
    );
    doc.save(`bill_${order.orderno}.pdf`);
  };

  // ================== UPDATE STATUS ==================
  const updateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5001/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    }
  };

  // ================== DELETE ORDER ==================
  const deleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await fetch(`http://localhost:5001/api/admin/orders/${orderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete order");
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      console.error(err);
      alert("Error deleting order");
    }
  };

  // ================== FILTER ORDERS ==================
  const filteredOrders = orders
    .filter((order) => {
      const name = order.customername?.toLowerCase() || "";
      const email = order.email?.toLowerCase() || "";
      return (
        name.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase())
      );
    })
    .filter((order) => (statusFilter ? order.status === statusFilter : true));

  const getCardColor = (status) => {
    switch (status) {
      case "Accepted":
        return "#d4edda";
      case "Rejected":
        return "#f8d7da";
      case "Waiting":
        return "#fff3cd";
      case "Pending":
        return "#cce5ff";
      default:
        return "#ffffff";
    }
  };

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const handleStatusFilter = (status) => {
    setStatusFilter((prev) => (prev === status ? "" : status));
  };

  const resetFilter = () => setStatusFilter("");

  // ================== RENDER ==================
  return (
    <div className="orders-container">
      <div className="orders-title-bar-admin">
        <div className="title-left">
          <h1>📦 Admin Orders Panel</h1>
        </div>

        <div className="title-center">
          <input
            type="search"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="title-right">
          <button onClick={() => navigate("/admin_home")}>🏠 Admin Home</button>
          <button onClick={() => navigate("/orders_admin")} className="active">
            📦 Orders
          </button>
        </div>
      </div>

      {/* Status Dashboard */}
      <div className="status-dashboard">
        {["Pending", "Accepted", "Rejected", "Waiting"].map((status) => (
          <div
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`status-card ${statusFilter === status ? "active" : ""}`}
            style={{ background: getCardColor(status), padding: "12px" }}
          >
            {status}: {statusCounts[status] || 0}
          </div>
        ))}
        {statusFilter && (
          <button onClick={resetFilter} className="reset-filter-btn">
            🔄 Reset Filter
          </button>
        )}
      </div>

      {isLoading && <p className="loading-text">Loading orders...</p>}
      {error && <p className="error-text">{error}</p>}
      {filteredOrders.length === 0 && !isLoading && (
        <p className="no-orders-text">No orders found.</p>
      )}

      {/* Orders Grid */}
      <div className="orders-grid">
        {filteredOrders.map((order) => {
          const totalAmount =
            order.total ||
            order.items?.reduce((sum, i) => sum + i.price * i.qty, 0) ||
            0;
          return (
            <div
              className="order-card"
              key={order._id}
              style={{ backgroundColor: getCardColor(order.status) }}
            >
              <div className="order-header">
                <h2>{order.orderno}</h2>
                <p>
                  <strong>Customer:</strong> {order.customername}
                </p>
                <p>
                  <strong>Email:</strong> {order.email}
                </p>
                <p>
                  <strong>Status:</strong> {order.status}
                </p>
                <p>
                  <strong>Total:</strong> ₹{totalAmount}
                </p>
                <p>
                  <strong>Payment:</strong> {order.paymentmode || "N/A"} (
                  {order.paymentstatus || "N/A"})
                </p>
              </div>

              <table className="order-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Product Name</th>
                    <th>Qty</th>
                    <th>Single Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{item.name}</td>
                        <td>{item.qty}</td>
                        <td>₹{item.price}</td>
                        <td>₹{item.price * item.qty}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center" }}>
                        No items in this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="order-actions">
                <button
                  onClick={() => downloadBill(order)}
                  className="download-btn"
                >
                  ⬇ Download Bill
                </button>
                <button
                  onClick={() => updateStatus(order._id, "Accepted")}
                  className="confirm-btn"
                  disabled={order.status === "Accepted"}
                >
                  ✅ Accept
                </button>
                <button
                  onClick={() => updateStatus(order._id, "Rejected")}
                  className="delete-btn"
                  disabled={order.status === "Rejected"}
                >
                  ❌ Reject
                </button>
                <button
                  onClick={() => updateStatus(order._id, "Waiting")}
                  className="wait-btn"
                  disabled={order.status === "Waiting"}
                >
                  ⏳ Waiting
                </button>
                <button
                  onClick={() => deleteOrder(order._id)}
                  className="delete-btn"
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersAdmin;
