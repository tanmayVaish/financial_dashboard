import * as React from "react";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import { Skeleton, Snackbar, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const columns = [
  { field: "id", headerName: "ID", flex: 1 },
  { field: "type", headerName: "Transaction Type", flex: 2 },
  { field: "amount", headerName: "Transaction Amount", flex: 2 },
  {
    field: "status",
    headerName: "Status",
    flex: 1,
    align: "right",
    headerAlign: "right",
  },
  {
    field: "createdAt",
    headerName: "Date",
    flex: 2,
    align: "right",
    sortable: false,
    headerAlign: "right",
    valueFormatter: (params) => {
      const date = new Date(params);
      return date.toLocaleDateString();
    },
  },
];

const DataTable = () => {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [id, setId] = React.useState("");
  const [loading, setLoading] = React.useState(true); // Add loading state
  const [transactions, setTransactions] = React.useState([]);
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState("");
  const [snackbarSeverity, setSnackbarSeverity] = React.useState("success");

  const navigate = useNavigate();

  React.useEffect(() => {
    fetchTransactions();
  }, [page, limit, type, status, startDate, endDate, id]);

  const fetchTransactions = async () => {
    try {
      setLoading(true); // Start loading
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/transactions`,
        {
          params: {
            page,
            limit,
            type,
            status,
            startDate,
            endDate,
            id,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );
      setTransactions(response.data);
      setLoading(false); // End loading when data is fetched
      setSnackbarMessage("Transactions loaded successfully!");
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

      setLoading(false); // End loading on error
      setSnackbarMessage("Failed to load transactions. Please try again.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const handleTypeChange = (event) => {
    setType(event.target.value);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Paper
        sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
      >
        <h2>Transaction Table</h2>
      </Paper>
      <div className="flex flex-col gap-2">
        <Paper
          sx={{ backgroundColor: "#f5f5f5", width: "100%" }}
          className="flex items-center flex-wrap justify-end gap-5 p-4"
        >
          <div className="flex flex-1 gap-2 items-center justify-between pr-10 border-r-2">
            <TextField
              onChange={(e) => setId(e.target.value)}
              fullWidth
              id="id"
              placeholder="Search By ID..."
            />
          </div>

          <div className="flex gap-2 items-center justify-center pr-10 border-r-2">
            <InputLabel htmlFor="start-date">Start Date</InputLabel>
            <TextField
              id="start-date"
              type="date"
              InputLabelProps={{ shrink: true }}
              onChange={handleStartDateChange}
            />
          </div>
          <div className="flex gap-2 items-center justify-center pr-10 border-r-2">
            <InputLabel htmlFor="end-date">End Date</InputLabel>
            <TextField
              id="end-date"
              type="date"
              InputLabelProps={{ shrink: true }}
              onChange={handleEndDateChange}
            />
          </div>
          <div className="flex gap-2 items-center justify-center pr-10 border-r-2">
            <Select
              defaultValue={""}
              label="Transaction Type"
              onChange={handleTypeChange}
            >
              <MenuItem value="credit">Credit</MenuItem>
              <MenuItem value="debit">Debit</MenuItem>
              <MenuItem value="">None</MenuItem>
            </Select>
          </div>
          <div className="flex gap-2 items-center justify-center ">
            <Select
              defaultValue=""
              label="Status"
              onChange={handleStatusChange}
            >
              <MenuItem value="successful">Successful</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="">None</MenuItem>
            </Select>
          </div>
        </Paper>

        <Paper
          sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
        >
          {loading ? (
            // Skeleton loader for the table
            <Skeleton variant="rectangular" width="100%" height={400} />
          ) : (
            <DataGrid
              rows={transactions}
              columns={columns}
              pagination
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage + 1)}
              initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 5 } },
              }}
              pageSizeOptions={[5, 10]}
              sx={{ border: 0 }}
              autoHeight
            />
          )}
        </Paper>
      </div>

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default DataTable;
