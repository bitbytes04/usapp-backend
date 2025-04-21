const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const defaultRoutes = require("./routes/defaultRoutes");
const boardRoutes = require("./routes/boardRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/default", defaultRoutes);
app.use("/api/board", boardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
