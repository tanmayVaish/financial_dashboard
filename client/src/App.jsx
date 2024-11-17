// src/App.js
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import SignIn from "./components/SignIn/SignIn";
import SignUp from "./components/SignUp/SignUp";
import Dashboard from "./components/Dashboard/Dashboard";

const App = () => {
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken")); // Check if the token is already in localStorage

  return (
    <>
      <Routes>
        <Route
          path="/signin"
          element={<SignIn setAuthToken={setAuthToken} authToken={authToken} />}
        />
        <Route path="/signup" element={<SignUp authToken={authToken} />} />
        <Route
          path="/dashboard"
          element={<Dashboard authToken={authToken} />}
        />
      </Routes>
    </>
  );
};

export default App;
