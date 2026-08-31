import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Navbar from "./components/Navbar.tsx";
import Footer from "./components/Footer.tsx";
import { Outlet } from "react-router-dom";
import Search from "./pages/search";

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
      </Route>
    </Routes>
  );
};

export default App;
