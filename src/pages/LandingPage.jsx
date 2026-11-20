import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      <header className="header">
        <div className="brand">FinPulse</div>
      </header>

      <main className="hero">
        <h1>
          Welcome to F
          <span className="spark-i">
            ı<span className="spark-dot"></span>
          </span>
          nPulse
        </h1>
        <p>Manage your finance with FinPulse</p>

        <div className="btn-group">
          <button
            className="btn btn-primary"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </div>
      </main>
    </div>
  );
}

export default LandingPage;