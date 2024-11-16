import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "./TransactionTable";

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
      <div className="w-4/5 h-full">
        <DataTable />
      </div>
    </div>
  );
};

export default Dashboard;
