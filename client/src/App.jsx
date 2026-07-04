import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import ReportForm from "./pages/ReportForm";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* ── Top Navigation ── */}
        <nav className="topnav">
          <div className="topnav__brand">
            <span className="topnav__logo">⚡</span>
            <span className="topnav__name">VeriMap</span>
            <span className="topnav__tag">Lagos Disaster Intelligence</span>
          </div>
          <div className="topnav__links">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `topnav__link${isActive ? " topnav__link--active" : ""}`
              }
              end
            >
              Report Incident
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `topnav__link${isActive ? " topnav__link--active" : ""}`
              }
            >
              Dispatcher Map
            </NavLink>
          </div>
        </nav>

        {/* ── Page Content ── */}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<ReportForm />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
