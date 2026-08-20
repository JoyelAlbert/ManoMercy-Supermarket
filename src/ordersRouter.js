// ================== ORDERS ROUTES ==================
import express from "express";
const ordersRouter = express.Router();

// ================== CREATE / FETCH DRAFT ==================
// Fetch current draft
ordersRouter.get("/draft", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const draft = await Order.findOne({ customerid: userId, status: "Draft" });
    if (!draft) return res.status(404).json({ message: "No draft order found" });
    res.json(draft);
  } catch (err) {
    console.error("Failed to fetch draft:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new draft
ordersRouter.post("/draft", authMiddleware, async (req, res) => {
  try {
    // Count total existing orders
    const orderCount = await Order.countDocuments();

    // Generate new readable order number
    const orderNumber = `Order No ${orderCount + 1}`;

    // Create new draft order
    const newOrder = new Order({
      user: req.user.id,
      orderNumber,
      status: "Draft",
      items: [],
      total: 0,
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) {
    console.error("Error creating draft:", err);
    res.status(500).json({ message: "Failed to create draft", error: err.message });
  }
});

// ================== ADD ITEM TO DRAFT ==================
ordersRouter.patch("/:id/add-item", authMiddleware, async (req, res) => {
  try {
    const { productId, name, price, qty, image } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "Draft") return res.status(400).json({ message: "Can only add items to draft" });

    const existingItem = order.items.find(i => i.productId.toString() === productId);
    if (existingItem) {
      existingItem.qty += qty;
    } else {
      order.items.push({ productId, name, price, qty, image });
    }

    order.total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    await order.save();
    res.json(order);
  } catch (err) {
    console.error("Failed to add item:", err.message);
    res.status(500).json({ message: "Failed to add item" });
  }
});

// ================== CONFIRM DRAFT ==================
ordersRouter.patch("/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const { paymentMode, deliveryMode, collectBy } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    order.paymentMode = paymentMode;
    order.deliveryMode = deliveryMode;
    order.collectBy = collectBy;
    order.status = "Pending";

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== CANCEL DRAFT ==================
ordersRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "Canceled") return res.status(400).json({ message: "Order already canceled" });

    order.status = "Canceled";
    await order.save();
    res.json(order);
  } catch (err) {
    console.error("Failed to cancel order:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== USER ORDERS ==================
ordersRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ customerid: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Failed to fetch orders:", err.message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// ================== ADMIN ORDERS ==================
ordersRouter.get("/admin/all", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) return res.status(403).json({ message: "Admins only" });

    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Failed to fetch admin orders:", err.message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

ordersRouter.put("/admin/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) return res.status(403).json({ message: "Admins only" });

    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Order not found" });

    res.json(updated);
  } catch (err) {
    console.error("Failed to update order:", err.message);
    res.status(500).json({ message: "Failed to update order" });
  }
});

ordersRouter.delete("/admin/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) return res.status(403).json({ message: "Admins only" });

    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Order not found" });

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Failed to delete order:", err.message);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

export default ordersRouter;
