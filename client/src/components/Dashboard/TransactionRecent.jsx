import { Paper } from "@mui/material";
import React, { useEffect, useState } from "react";

const TransactionRecent = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:3000/events");

    eventSource.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData((prevData) => [...prevData, newData]);
    };

    eventSource.onerror = (error) => {
      console.error("Error receiving SSE data:", error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  console.log("Received data:", data);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <Paper
        sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
      >
        <h2>Transaction Recent</h2>
      </Paper>
      <Paper
        sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
      >
        {data.map((item, index) => (
          <p key={index}>{JSON.stringify(item)}</p>
        ))}
      </Paper>
    </div>
  );
};

export default TransactionRecent;
