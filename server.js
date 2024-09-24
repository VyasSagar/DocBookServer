const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./models');  // Sequelize models
const app = express();

app.use(cors());
app.use(bodyParser.json());

db.sequelize.sync();  // Sync the database

// POST endpoint to book an appointment
app.post('/appointments', async (req, res) => {
  try {
    const appointment = await db.Appointment.create(req.body);
    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.get('/', (req, res) => {
    res.send('Hello from the Node.js backend!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
