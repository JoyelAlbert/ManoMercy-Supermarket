import { useState, useEffect } from "react";

function useProducts(baseUrl) {
  const [allProducts, setAllProducts] = useState([]);
  const [homeProducts, setHomeProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    image: null,
    description: "",
    price: "",
    discount: 0,
    finalPrice: 0,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // ================= Handle input fields =================
  const handleInput = (e) => {
    const { name, value, files } = e.target;

    if (name === "image") {
      const file = files[0];
      setNewProduct((prev) => ({ ...prev, image: file }));

      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
      }
    } else {
      const updated = { ...newProduct, [name]: value };
      const price = parseFloat(updated.price) || 0;
      const discount = parseFloat(updated.discount) || 0;
      updated.finalPrice = parseFloat((price - (price * discount) / 100).toFixed(2));
      setNewProduct(updated);
    }
  };

  // ================= Enhanced Fetch products =================
  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`🔄 Fetching products from: ${baseUrl}`);
      
      const res = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log(`📊 Response status: ${res.status} ${res.statusText}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log(`✅ Successfully fetched ${data.length} products`);
      
      setAllProducts(data);
      setHomeProducts(data.filter((p) => p.showOnHome).slice(0, 8));
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError(err.message || "Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= Add new product =================
  const addProduct = async (arg) => {
    let product;

    if (arg?.preventDefault) {
      arg.preventDefault();
      product = newProduct;
    } else {
      product = arg;
    }

    setError(null);
    setIsLoading(true);

    if (!product.name || !product.price || !product.image) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("description", product.description);
      formData.append("price", product.price);
      formData.append("discount", product.discount || 0);
      formData.append("finalPrice", product.finalPrice || product.price);
      formData.append("image", product.image);

      const res = await fetch(baseUrl, { 
        method: "POST", 
        body: formData 
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add product");
      }

      const data = await res.json();
      setAllProducts((prev) => [...prev, data]);
      setHomeProducts((prev) => [...prev, data].filter((p) => p.showOnHome).slice(0, 8));
      setNewProduct({ name: "", description: "", price: "", discount: 0, finalPrice: 0, image: null });
      setImagePreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ================= Edit product =================
  const editProduct = async (id, updatedValues) => {
    setError(null);
    setIsLoading(true);

    try {
      let body;
      let headers = {};

      if (updatedValues.image instanceof File) {
        body = new FormData();
        body.append("name", updatedValues.name);
        body.append("description", updatedValues.description);
        body.append("price", updatedValues.price);
        body.append("discount", updatedValues.discount || 0);
        body.append("finalPrice", updatedValues.finalPrice || updatedValues.price);
        body.append("image", updatedValues.image);
      } else {
        body = JSON.stringify({
          name: updatedValues.name,
          description: updatedValues.description,
          price: updatedValues.price,
          discount: updatedValues.discount || 0,
          finalPrice: updatedValues.finalPrice || updatedValues.price,
        });
        headers["Content-Type"] = "application/json";
      }

      const res = await fetch(`${baseUrl}/${id}`, { 
        method: "PUT", 
        headers, 
        body 
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update product");
      }

      const data = await res.json();
      setAllProducts((prev) =>
        prev.map((p) =>
          p._id === id
            ? { ...p, ...updatedValues, image: updatedValues.image instanceof File ? data.image || p.image : p.image }
            : p
        )
      );

      setHomeProducts((prev) =>
        prev.map((p) =>
          p._id === id
            ? { ...p, ...updatedValues, image: updatedValues.image instanceof File ? data.image || p.image : p.image }
            : p
        )
      );

      if (updatedValues.image instanceof File) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(updatedValues.image);
      }

      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ================= Delete product =================
  const deleteProduct = async (id) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete product");
      }

      const data = await res.json();
      setAllProducts((prev) => prev.filter((p) => p._id !== id));
      setHomeProducts((prev) => prev.filter((p) => p._id !== id));
      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ================= Toggle "Show on Home" =================
  const toggleHomeProduct = async (id, value) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      
      const homeCount = allProducts.filter((p) => p.showOnHome).length;
      
      if (value && homeCount >= 8) {
        alert("❌ Maximum of 8 products allowed on Home page!");
        return;
      }

      const res = await fetch(`${baseUrl}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnHome: value }),
      });

      if (!res.ok) throw new Error("Update failed");

      setAllProducts(prev => 
        prev.map(p => p._id === id ? { ...p, showOnHome: value } : p)
      );

    } catch (err) {
      console.error("Toggle error:", err);
      alert("Failed to update");
    } finally {
      setIsUpdating(false);
    }
  };

  // ================= Toggle "Out of Stock" =================
  const toggleOutOfStock = async (id, currentValue) => {
    if (updatingId === id) return;
    setUpdatingId(id);
    try {
      setAllProducts((prev) =>
        prev.map((p) =>
          p._id === id ? { ...p, inStock: !currentValue } : p
        )
      );
      
      const res = await fetch(`${baseUrl}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inStock: !currentValue }),
      });
      
      if (!res.ok) throw new Error("Failed to update");
      console.log("✅ Stock toggled");
    } catch (err) {
      console.error("❌ Toggle error:", err);
      fetchProducts(); // Refresh data on error
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [baseUrl]);

  return {
    allProducts,
    homeProducts,
    newProduct,
    setNewProduct,
    imagePreview,
    setImagePreview,
    error,
    isLoading,
    handleInput,
    fetchProducts,
    addProduct,
    editProduct,
    deleteProduct,
    toggleHomeProduct,
    toggleOutOfStock,
  };
}

export default useProducts;