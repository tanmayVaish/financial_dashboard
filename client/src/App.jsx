import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./components/SignIn/SignIn";
import SignUp from "./components/SignUp/SignUp";
import Dashboard from "./components/Dashboard/Dashboard";

const App = () => {
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken")); // Check if the token is already in localStorage

  useEffect(() => {
    // Ensure to update the authToken if it changes in localStorage
    const token = localStorage.getItem("authToken");
    setAuthToken(token);
  }, []); // Empty dependency ensures this runs only once on mount

  return (
    <>
      <Routes>
        {/* Root Route - redirect based on authToken */}
        <Route
          path="/"
          element={
            authToken ? <Navigate to="/dashboard" /> : <Navigate to="/signin" />
          }
        />
        {/* Other Routes */}
        <Route
          path="/signin"
          element={<SignIn setAuthToken={setAuthToken} authToken={authToken} />}
        />
        <Route path="/signup" element={<SignUp authToken={authToken} />} />
        <Route
          path="/dashboard"
          element={
            authToken ? (
              <Dashboard authToken={authToken} />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
      </Routes>
    </>
  );
};

export default App;
