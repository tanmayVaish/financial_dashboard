import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "./TransactionTable";
import TransactionSummary from "./TransactionSummary";
import TransactionRecent from "./TransactionRecent";
import { Paper } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";

import axios from "axios";

const API_URL = "http://localhost:3000";

const Dashboard = ({ authToken }) => {
  const [summary, setSummary] = useState([]);

  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API_URL}/summary`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      setSummary(response.data);
    } catch (error) {
      if (error.response.status === 401) {
        localStorage.removeItem("authToken");
        navigate("/signin");
        return;
      }

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

  return (
    <div className="flex flex-col items-center bg-gray-200 ">
      <div className="text-5xl m-4 font-bold ">Dashboard</div>
      <div className="w-4/5 h-full flex flex-col gap-5">
        <TransactionSummary summary={summary} />
        <div className="flex flex-wrap gap-5 w-full">
          <TransactionRecent />
          <div className="flex flex-col gap-2 items-center justify-center w-96">
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
            >
              <h2>Transaction Status</h2>
            </Paper>
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
              className="flex flex-col gap-2 items-center justify-center"
            >
              {summary && summary.statusCount && (
                <PieChart
                  series={[
                    {
                      data: [
                        {
                          id: 0,
                          value: summary.statusCount[0]._count.status,
                          label: "Successfull",
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
        <DataTable />
        <div className="flex flex-row gap-5">
          <div className="flex flex-col gap-2 w-1/2">
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
            >
              <h2>Volume in Last 30 Days</h2>
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
                    data: [
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                      "9",
                      "10",
                      "11",
                      "12",
                      "13",
                      "14",
                      "15",
                      "16",
                      "17",
                      "18",
                      "19",
                      "20",
                      "21",
                      "22",
                      "23",
                      "24",
                      "25",
                      "26",
                      "27",
                      "28",
                      "29",
                      "30",
                    ],
                  },
                ]}
                series={[
                  {
                    data:
                      summary && summary.last30DaysCount
                        ? summary.last30DaysCount
                        : [],
                  },
                ]}
                height={500}
              />
            </Paper>
          </div>
          <div className="flex flex-col gap-2 w-1/2">
            <Paper
              sx={{
                backgroundColor: "#f5f5f5",
                width: "100%",
                padding: "10px",
              }}
            >
              <h2>Total Amount in Last 30 Days</h2>
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
                    data: [
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                      "9",
                      "10",
                      "11",
                      "12",
                      "13",
                      "14",
                      "15",
                      "16",
                      "17",
                      "18",
                      "19",
                      "20",
                      "21",
                      "22",
                      "23",
                      "24",
                      "25",
                      "26",
                      "27",
                      "28",
                      "29",
                      "30",
                    ],
                  },
                ]}
                series={[
                  {
                    data:
                      summary && summary.last30DaysAmount
                        ? summary.last30DaysAmount
                        : [],
                  },
                ]}
                height={500}
              />
            </Paper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
