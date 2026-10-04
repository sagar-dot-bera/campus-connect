require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const orderRoutes = require('./src/routes/orderRoutes');

const app = express();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ service: 'order-service', status: dbUp ? 'UP' : 'DEGRADED', database: dbUp ? 'UP' : 'DOWN' });
});

app.use('/orders', orderRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(port, () => {
        console.log(`Order Service listening on port ${port}`);
      });
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB', err);
      process.exit(1);
    });
}

module.exports = app;
