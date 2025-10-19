import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";

// 🛍️ User pages
import Beauty from "./Beauty";
import Grossory from "./Grossory";
import Snacks from "./Snacks";
import Soap from "./Soap";
import Cart from "./Cart";
import Home from "./Home";
import ProfileAndOrders from "./ProfileAndOrders";
import UsersOrders from "./UsersOrders";

// ⚙️ Admin pages
import Adminhome from "./Adminhome";
import Ordersadmin from "./Ordersadmin";
import Grossoryadmin from "./Grossoryadmin";
import Beautyadmin from "./Beautyadmin";
import Snacksadmin from "./Snacksadmin";
import Soapadmin from "./Soapadmin";

// 🔐 Login / Signup page
import Loginin from "./Loginin";
import { CartProvider } from './CartContext';


// 🔒 Protected route
import ProtectedRoute from "./ProtectedRoute";

function App() {
  const [user, setUser] = useState(null);

  return (
    <>
     <CartProvider>
       <Routes>
        {/* 🔐 Authentication (default page) */}
        <Route path="/" element={<Loginin />} />

        {/* 🏠 User Pages */}
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<ProfileAndOrders />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders_user" element={<UsersOrders />} />

        {/* 🛒 Product Pages */}
        <Route path="/grossory_products" element={<Grossory />} />
        <Route path="/snacks_products" element={<Snacks />} />
        <Route path="/soap_products" element={<Soap />} />
        <Route path="/beauty_products" element={<Beauty />} />

        {/* 🧑‍💼 Admin Pages — only admins can access */}
        <Route
          path="/admin_home"
          element={
            <ProtectedRoute adminOnly={true}>
              <Adminhome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders_admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Ordersadmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/grossory_admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Grossoryadmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/snacks_admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Snacksadmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/soap_admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Soapadmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/beauty_admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Beautyadmin />
            </ProtectedRoute>
          }
        />
      </Routes>
     </CartProvider>
    </>
  );
}

export default App;
