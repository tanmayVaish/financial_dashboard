import React, { useState, useEffect } from "react";
import { Paper, Skeleton } from "@mui/material";

const TransactionSummary = ({ summary }) => {
  const formatCurrencyAndDecimal = (value) => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  };

  // Assuming 'summary' is fetched from an API, set up a loading state.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (summary) {
      setLoading(false); // Data is loaded
    }
  }, [summary]); // Runs when the summary data is available

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
        {loading ? (
          // Display skeleton loader when loading
          <>
            <div className="flex flex-col gap-2 items-center justify-center">
              <Skeleton variant="text" width={150} height={30} />
              <Skeleton variant="text" width={100} height={40} />
            </div>
            <div className="flex flex-col gap-2 items-center justify-center">
              <Skeleton variant="text" width={150} height={30} />
              <Skeleton variant="text" width={100} height={40} />
            </div>
            <div className="flex flex-col gap-2 items-center justify-center">
              <Skeleton variant="text" width={150} height={30} />
              <Skeleton variant="text" width={100} height={40} />
            </div>
            <div className="flex flex-col gap-2 items-center justify-center">
              <Skeleton variant="text" width={150} height={30} />
              <Skeleton variant="text" width={100} height={40} />
            </div>
          </>
        ) : (
          // Display actual data once loading is finished
          <>
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
          </>
        )}
      </Paper>
    </div>
  );
};

export default TransactionSummary;
