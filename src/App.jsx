import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import AuditorDashboard from "./pages/AuditorDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />
        <Route path="/auditor-dashboard" element={<AuditorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;