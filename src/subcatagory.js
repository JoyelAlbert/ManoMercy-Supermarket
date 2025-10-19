// useSubcategory.js
import useProducts from "./useProducts";
import { useState, useMemo } from "react";

/**
 * A reusable hook for any category page.
 * @param {string} baseUrl - API endpoint for products
 * @param {Array<string>} subcategoriesList - list of subcategories for this page
 */
function subcategory(baseUrl, subcategoriesList = []) {
  const { allProducts, addProduct, editProduct, deleteProduct, error, isLoading } = useProducts(baseUrl);

  const [activeSubcategory, setActiveSubcategory] = useState(null);

  // Filter products based on active subcategory
  const filteredProducts = useMemo(() => {
    if (!activeSubcategory) return allProducts; // show all if none selected
    return allProducts.filter((p) => p.subcategory === activeSubcategory);
  }, [allProducts, activeSubcategory]);

  const selectSubcategory = (sub) => setActiveSubcategory(sub);

  return {
    subcategories: subcategoriesList,
    activeSubcategory,
    filteredProducts,
    selectSubcategory,
    addProduct,
    editProduct,
    deleteProduct,
    error,
    isLoading,
  };
}

export default subcategory;
