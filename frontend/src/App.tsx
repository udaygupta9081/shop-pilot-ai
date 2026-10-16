import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Navbar from "./components/Navbar.tsx";
import Footer from "./components/Footer.tsx";
import { Outlet } from "react-router-dom";
import Search from "./pages/search";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CategoriesIndex from "./pages/CategoriesIndex";
import CategoryListing from "./pages/CategoryListing";
import ProductDetail from "./pages/ProductDetail";

const Layout = () => {
  return (
    <div>
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
};
const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/search" element={<Search />} />
        <Route path="/categories" element={<CategoriesIndex />} />
        <Route path="/categories/:mainSlug" element={<CategoryListing />} />
        <Route path="/categories/:mainSlug/:subSlug" element={<CategoryListing />} />
        <Route path="/product/:asin" element={<ProductDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
  );
};

export default App;
