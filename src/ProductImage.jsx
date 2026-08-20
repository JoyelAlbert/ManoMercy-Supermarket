const API_URL = "https://manomercy-supermarket.onrender.com";

const ProductImage = ({ image, alt }) => (
  <img
    src={
      image
        ? `${API_URL}${image}`
        : "https://images.unsplash.com/photo-1542838132-92c53300491e"
    }
    alt={alt}
  />
);

export default ProductImage;