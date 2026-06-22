require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Skeleton route for health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend initialized successfully!' });
});

app.listen(PORT, () => {
  console.log(`Skeleton server is running on port ${PORT}`);
});
