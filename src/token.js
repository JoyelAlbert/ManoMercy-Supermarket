// utils/token.js
export const getToken = () => {
  return localStorage.getItem("token");
};

export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch {
    return false;
  }
};

export const removeToken = () => {
  localStorage.removeItem("token");
};

export const setToken = (token) => {
  localStorage.setItem("token", token);
};