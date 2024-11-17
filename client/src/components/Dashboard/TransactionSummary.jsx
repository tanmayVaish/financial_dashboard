import React, { useState, useEffect } from "react";
import { Paper } from "@mui/material";
import axios from "axios";

const API_URL = "http://localhost:3000";

const TransactionSummary = () => {
  const [summary, setSummary] = useState([]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_URL}/summary`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  console.log("Summary:", summary);

  return (
    <Paper sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}>
      <h2>Transaction Summary</h2>
    </Paper>
  );
};

export default TransactionSummary;
