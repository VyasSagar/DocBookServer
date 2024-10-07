const express = require('express');
const bodyParser = require('body-parser');
const { Appointment, Slot } = require('./models');
const cors = require('cors');
const db = require('./models');  // Sequelize models
const app = express();
const moment = require('moment');
const { Op } = require('sequelize');

app.use(cors());
app.use(bodyParser.json());

db.sequelize.sync();  // Sync the database

const isValidDate = (dateString) => {
    return moment(dateString, 'YYYY-MM-DD', true).isValid();
  };

app.post('/appointments/book', async (req, res) => {
  try {
    console.log("request");
    console.log(req);
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

app.get('/availableSlots/:date', async (req, res) => {
  try {
    const date = req.params.date;

    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const slots = await Slot.findAll({
      where: { date },
      include: [{
        model: Appointment,
        required: false,
      }],
    });

    const availableSlots = slots.filter(slot => slot.Appointments.length === 0);
    res.json(availableSlots);
  } catch (error) {
    console.error('Error fetching available slots:', error); // Log error for debugging
    res.status(500).json({ error: 'Error fetching available slots' });
  }
});

app.get('/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      include: [{
        model: Slot,
        required: false
      }]
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching all appointments:', error); // Log error for debugging
    res.status(500).json({ error: 'Error fetching all appointments' });
  }
});

app.get('/appointments/:date', async (req, res) => {
  try {
    const date = req.params.date; // Extract date from URL parameters

    // Validate date format (you can use a helper function here if needed)
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Fetch appointments for the specific date
    const appointments = await Appointment.findAll({
      where: {
        date: {
          [Op.eq]: date, // Use Op.eq to avoid time zone conversion
        },
      },
      include: [{
        model: Slot,
        required: false,
        attributes: ['id', 'time'] // Fetch both 'id' and 'time' fields from the Slot table
      }],
    });

    res.json(appointments); // Send the response as JSON
  } catch (error) {
    console.error('Error fetching appointments for the date:', error);
    res.status(500).json({ error: 'Error fetching appointments for the date' });
  }
});

app.get('/getAllSlots', async (req, res) => {
  try {
    const slots = await Slot.findAll(); // Fetch all slots
    res.json(slots); // Send all slots as JSON response
  } catch (error) {
    console.error('Error fetching all slots:', error); // Log error for debugging
    res.status(500).json({ error: 'Error fetching all slots' });
  }
});

app.get('/getAvailableSlotsForDate/:date', async (req, res) => {
  try {
    const date = req.params.date;

    // Validate date format
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Fetch all slots
    const slots = await Slot.findAll();

    // Fetch all appointments for the given date
    const appointmentsForDate = await Appointment.findAll({
      where: { date }, // Filter appointments for the given date
      attributes: ['slotId'], // Only fetch the slotId field
    });

    // Get the list of booked slot IDs
    const bookedSlotIds = appointmentsForDate.map(appointment => appointment.slotId);

    // Map through the slots and mark unavailable if they are in the list of booked slot IDs
    const availableSlots = slots.map(slot => {
      return {
        id: slot.id,
        time: slot.time,
        available: !bookedSlotIds.includes(slot.id), // Mark as unavailable if slotId is in bookedSlotIds
      };
    });

    res.json(availableSlots); // Send the list of slots with their availability status
  } catch (error) {
    console.error('Error fetching available slots for the date:', error); // Log error for debugging
    res.status(500).json({ error: 'Error fetching available slots for the date' });
  }
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
app.patch('/appointments/changeStatus/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const appointment = await Appointment.findByPk(id); // Fetch the appointment by ID

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    appointment.status = status; // Update the status
    await appointment.save(); // Save the changes

    res.json(appointment); // Return the updated appointment
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Error updating appointment status' });
  }
});