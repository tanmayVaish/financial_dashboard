import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "./TransactionTable";
import TransactionSummary from "./TransactionSummary";
import TransactionRecent from "./TransactionRecent";

const Dashboard = ({ authToken }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!authToken) {
      navigate("/signin");
    }
  }, [authToken, navigate]);

  return (
    <div className="flex flex-col items-center bg-gray-200 h-screen">
      <div className="text-5xl m-4 font-bold ">Dashboard</div>
      <div className="w-4/5 h-full flex flex-col gap-10">
        <DataTable />
        <div className="flex flex-row gap-10">
          <TransactionSummary />
          <TransactionRecent />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
