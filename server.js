const express = require('express');
const bodyParser = require('body-parser');
const { Appointment, Slot } = require('./models');
const cors = require('cors');
const db = require('./models');  // Sequelize models
const app = express();
const moment = require('moment');

app.use(cors());
app.use(bodyParser.json());

db.sequelize.sync();  // Sync the database

const isValidDate = (dateString) => {
    return moment(dateString, 'YYYY-MM-DD', true).isValid();
  };

// POST endpoint to book an appointment
app.post('/appointments/book', async (req, res) => {
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


app.get('/slots/:date', async (req, res) => {
    console.log("Logging at /slots/:date");
    console.log(req.params);

    try {
        const date = req.params.date; // Extract date from URL parameters

        // Validate date format
        if (!isValidDate(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        }

        // Fetch all slots for the specified date
        const slots = await Slot.findAll({
            where: { date },  // Directly compare with date since `date` is now DATEONLY
            include: [{
                model: Appointment, // Include related appointments
                required: false, // Allow slots without appointments to be returned
            }],
        });

        // Map the slots and mark them as available or booked
        const slotsWithAvailability = slots.map(slot => {
            const isBooked = slot.available == 0; // Check if slot has any appointment
            return {
                id: slot.id,
                time: slot.time, // Assuming slot has a 'time' field
                date: slot.date,
                available: !isBooked, // Mark as available if not booked
            };
        });

        res.json(slotsWithAvailability); // Send the response with availability status
    } catch (error) {
        console.error('Error fetching all slots:', error); // Log error for debugging
        res.status(500).json({ error: 'Error fetching all slots' });
    }
});