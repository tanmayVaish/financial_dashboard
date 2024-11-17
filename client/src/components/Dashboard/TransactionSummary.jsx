import React, { useState, useEffect } from "react";
import { Paper } from "@mui/material";

const TransactionSummary = ({ summary }) => {
  const formatCurrencyAndDecimal = (value) => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Paper
        sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
      >
        <h2>Transaction Summary</h2>
      </Paper>
      <Paper
        sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
        className="flex flex-wrap gap-10 items-center justify-between w-full p-10"
      >
        <div className="flex flex-col gap-2 items-center justify-center">
          <div className="font-bold text-xl">Total Volume</div>
          <div className="text-2xl font-semibold text-purple-800">
            {summary.totalVolume}
          </div>
        </div>
        <div className="flex flex-col gap-2 items-center justify-center">
          <div className="font-bold text-xl">Average Amount</div>
          <div className="text-2xl font-semibold text-purple-800">
            {summary.averageAmount &&
              formatCurrencyAndDecimal(summary.averageAmount)}
          </div>
        </div>
        <div className="flex flex-col gap-2 items-center justify-center">
          <div className="font-bold text-xl">Daily Total</div>
          <div className="text-2xl font-semibold text-purple-800">
            {summary.dailyVolume}
          </div>
        </div>
        <div className="flex flex-col gap-2 items-center justify-center">
          <div className="font-bold text-xl">Monthly Total</div>
          <div className="text-2xl font-semibold text-purple-800">
            {summary.monthlyVolume}
          </div>
        </div>
      </Paper>
    </div>
  );
};

export default TransactionSummary;
