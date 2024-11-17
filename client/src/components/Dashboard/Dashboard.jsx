import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "./TransactionTable";
import TransactionSummary from "./TransactionSummary";
import TransactionRecent from "./TransactionRecent";
import { Paper, Snackbar, Alert } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";

import axios from "axios";

const Dashboard = ({ authToken }) => {
  const [summary, setSummary] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success"); // can be "error" or "success"

  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/summary`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      setSummary(response.data);
      setSnackbarMessage("Data fetched successfully!");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
    } catch (error) {
      if (error.response.status === 401) {
        localStorage.removeItem("authToken");
        navigate("/signin");
        return;
      }

      if (error.response.status === 429) {
        setSnackbarMessage(
          "Too many requests! Please try again after 2 minutes."
        );
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
        return;
      }

      setSnackbarMessage("Error fetching transactions!");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      console.error("Error fetching transactions:", error);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (!authToken) {
      navigate("/signin");
    }
  }, [authToken, navigate]);

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <div className="flex flex-col items-center bg-gray-200 p-4">
      <h1 className="text-5xl m-4 font-bold text-center">Dashboard</h1>
      <div className="w-full max-w-screen-xl flex flex-col gap-5 mx-auto">
        <TransactionSummary summary={summary} />

        {/* Graphs and Transaction Status */}
        <div className="flex flex-wrap gap-5 w-full">
          <TransactionRecent />

          {/* Transaction Status Pie Chart */}
          <div className="flex flex-col gap-4 items-center justify-center w-full sm:w-96">
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
            >
              <h2 className="text-center font-semibold">Transaction Status</h2>
            </Paper>
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
              className="flex flex-col items-center justify-center"
            >
              {summary?.statusCount && (
                <PieChart
                  series={[
                    {
                      data: [
                        {
                          id: 0,
                          value: summary.statusCount[0]._count.status,
                          label: "Successful",
                        },
                        {
                          id: 1,
                          value: summary.statusCount[1]._count.status,
                          label: "Pending",
                        },
                        {
                          id: 2,
                          value: summary.statusCount[2]._count.status,
                          label: "Failed",
                        },
                      ],
                    },
                  ]}
                  width={400}
                  height={200}
                />
              )}
            </Paper>
          </div>
        </div>

        {/* Transaction Table */}
        <DataTable />

        {/* Bar Charts for Last 30 Days */}
        <div className="flex flex-wrap gap-5 w-full">
          <div className="flex flex-col gap-4 w-full sm:w-1/2">
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
            >
              <h2 className="text-center font-semibold">
                Volume in Last 30 Days
              </h2>
            </Paper>
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
            >
              <BarChart
                xAxis={[
                  {
                    scaleType: "band",
                    data: Array.from({ length: 30 }, (_, i) =>
                      (i + 1).toString()
                    ), // 1 to 30
                  },
                ]}
                series={[{ data: summary?.last30DaysCount || [] }]}
                height={500}
              />
            </Paper>
          </div>

          <div className="flex flex-col gap-4 w-full sm:w-1/2">
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
            >
              <h2 className="text-center font-semibold">
                Total Amount in Last 30 Days
              </h2>
            </Paper>
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
            >
              <BarChart
                xAxis={[
                  {
                    scaleType: "band",
                    data: Array.from({ length: 30 }, (_, i) =>
                      (i + 1).toString()
                    ), // 1 to 30
                  },
                ]}
                series={[{ data: summary?.last30DaysAmount || [] }]}
                height={500}
              />
            </Paper>
          </div>
        </div>
      </div>

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Dashboard;
