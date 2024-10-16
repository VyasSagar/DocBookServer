const express = require('express');
const bodyParser = require('body-parser');
const { Appointment, Slot } = require('./models');
const cors = require('cors');
const db = require('./models');  // Sequelize models
const http = require('http'); // Import http for socket.io
const socketIo = require('socket.io');
const moment = require('moment');
const { Op } = require('sequelize');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:4200', // Update this to your frontend URL
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
});

const corsOptions = {
  origin: 'http://localhost:4200', // Update this to your frontend URL
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true,
};
// app.use(cors());
app.use(bodyParser.json());
app.use(cors(corsOptions));



db.sequelize.sync();  // Sync the database

const isValidDate = (dateString) => {
  return moment(dateString, 'YYYY-MM-DD', true).isValid();
};


io.on('connection', (socket) => {
  console.log('A client connected');
  const today = new Date().toISOString().split('T')[0];
  const fetchDashboardData = async () => {
    try {
      const nowVisitingAppointments = await Appointment.findAll({
        where: { status: 'in-progress', date: today },
        order: [['token', 'ASC']], // Sort by token if necessary
        limit: 1, // Only the current appointment
      });

      const upNextAppointments = await Appointment.findAll({
        where: { status: 'scheduled', date: today },
        ordDoker: [['token', 'ASC']], // Sort by token if necessary
        limit: 5, // Get the next 5 appointments
      });

      // Emit the data to the client
      socket.emit('dashboardData', {
        nowVisiting: nowVisitingAppointments,
        upNext: upNextAppointments
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  fetchDashboardData();


  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// app.post('/appointments/book', async (req, res) => {
//     try {
//         const appointment = await db.Appointment.create(req.body);
//         res.status(201).json(appointment);
//         // Emit event for the new appointment
//         io.emit('appointmentBooked', appointment);
//         console.log("appointmentBooked, emitting this:");
//       console.log(appointment);
//     } catch (error) {
//         console.error('Error booking appointment:', error); // Log error for debugging
//         res.status(400).json({ error: error.message });
//     }
// });


app.post('/appointments/book', async (req, res) => {
  try {
    const appointment = await db.Appointment.create(req.body);
    const today = new Date().toISOString().split('T')[0];

    // Check if the appointment is for today
    if (appointment.date === today) {
      // Get all appointments for today
      const allAppointments = await Appointment.findAll({ where: { date: today } });

      // Generate a token for today's appointment
      await generateToken(appointment, today, allAppointments);
    }

    res.status(201).json({ message: 'Appointment booked successfully', token: appointment.token, appointment });
    // res.status(201).json(appointment);

    // Emit event for the new appointment
    io.emit('appointmentBooked', appointment);
    console.log("appointmentBooked, emitting this:");
    console.log(appointment);
  } catch (error) {
    console.error('Error booking appointment:', error); // Log error for debugging
    res.status(400).json({ error: error.message });
  }
});

app.post('/appointments/book-spot', async (req, res) => {
  try {
    const { name, contactNumber, email, age, gender } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = moment().format('HH:mm');  // Current time in HH:mm format

    console.log("Spot booking Date:", today);
    console.log("Spot booking time:", currentTime);
    
    // Fetch all slots for today
    const allSlots = await Slot.findAll();

    // Fetch all appointments for today
    const todayAppointments = await Appointment.findAll({ where: { date: today } });

    // Identify booked slots
    const bookedSlotIds = todayAppointments.map(appointment => appointment.slotId);

    // Find the next available slot after the current time
    let nextAvailableSlot = allSlots
      .filter(slot => !bookedSlotIds.includes(slot.id) && moment(slot.time, 'HH:mm').isAfter(moment(currentTime, 'HH:mm')))
      .sort((a, b) => moment(a.time, 'HH:mm').diff(moment(b.time, 'HH:mm')))[0];  // Get the earliest slot

    console.log("Next Available Slot:", nextAvailableSlot);

    // If no slot is available after the current time, set slotId to 0
    let slotId;
    if (!nextAvailableSlot) {
      console.log("No next slots available");
      slotId = 0;
    } else {
      slotId = nextAvailableSlot.id;
    }

    // Create the new spot appointment with the next available slotId
    const appointment = await Appointment.create({
      name,
      contactNumber,
      email,
      age,
      gender,
      date: today,
      slotId: slotId,  // Assign the slotId directly
      natureOfBooking: 'Spot',
      status: 'scheduled'
    });

    // Generate token for spot appointment
    const allAppointments = await Appointment.findAll({ where: { date: today } });
    await generateToken(appointment, today, allAppointments);

    // Send response with the generated token
    res.json({ message: 'Spot appointment booked successfully', token: appointment.token, appointment });
    console.log("Spot appointment booked:", appointment);
    io.emit('appointmentBooked', appointment);
  } catch (error) {
    console.error('Error booking spot appointment:', error);
    res.status(500).json({ error: 'Error booking spot appointment' });
  }
});

// app.post('/appointments/book-spot', async (req, res) => {
//   try {
//     const { name, contactNumber, email, age, gender, slotId } = req.body;
//     const today = new Date().toISOString().split('T')[0];

//     // Create a new spot appointment
//     const appointment = await Appointment.create({
//       name,
//       contactNumber,
//       email,
//       age,
//       gender,
//       date: today,
//       slotId,
//       natureOfBooking: 'Spot',
//       status: 'scheduled'
//     });

//     // Get all appointments for today
//     const allAppointments = await Appointment.findAll({ where: { date: today } });

//     // Generate a new spot token
//     await generateToken(appointment, today, allAppointments);

//     // Send response with the generated token
//     res.json({ message: 'Spot appointment booked successfully', token: appointment.token, appointment });
//     console.log("Spot appointmentBooked, emitting this:");
//     console.log(appointment);
//     io.emit('appointmentBooked', appointment);
//   } catch (error) {
//     console.error('Error booking spot appointment:', error);
//     res.status(500).json({ error: 'Error booking spot appointment' });
//   }
// });

// app.post('/appointments/book-spot', async (req, res) => {
//   try {
//       const { name, contactNumber, email, age, gender, slotId } = req.body;
//       const today = new Date().toISOString().split('T')[0];

//       // Create a new spot appointment
//       const appointment = await Appointment.create({
//           name,
//           contactNumber,
//           email,
//           age,
//           gender,
//           date: today,
//           slotId,
//           natureOfBooking: 'Spot',
//           status: 'scheduled'
//       });

//       // Get all appointments for today
//       const allAppointments = await Appointment.findAll({ where: { date: today } });

//       // Filter existing tokens for spot bookings and find the maximum counter
//       const existingTokens = allAppointments
//           .map(a => a.token)
//           .filter(token => token && token.startsWith(today.replace(/-/g, '').slice(2) + 'OP'));

//       let maxSpotCounter = existingTokens
//           .map(token => parseInt(token.slice(-3), 10))
//           .reduce((max, counter) => (counter > max ? counter : max), 0);

//       // Generate a new spot token
//       const spotCounter = maxSpotCounter + 1;
//       const token = `${today.replace(/-/g, '').slice(2)}OP${String(spotCounter).padStart(3, '0')}`;

//       // Assign the generated token to the appointment and save it
//       appointment.token = token;
//       await appointment.save();

//       // Send response with the generated token
//       res.json({ message: 'Spot appointment booked successfully', token, appointment });
//       console.log("Spot appointmentBooked, emitting this:");
//       console.log(appointment);
//       io.emit('appointmentBooked', appointment);
//   } catch (error) {
//       console.error('Error booking spot appointment:', error);
//       res.status(500).json({ error: 'Error booking spot appointment' });
//   }
// });

app.get('/', (req, res) => {
  res.send('Hello from the Node.js backend!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// Available slots
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
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Error fetching available slots' });
  }
});

// Get all appointments
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
    console.error('Error fetching all appointments:', error);
    res.status(500).json({ error: 'Error fetching all appointments' });
  }
});

// Appointments for specific date
app.get('/appointments/:date', async (req, res) => {
  try {
    const date = req.params.date;

    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const appointments = await Appointment.findAll({
      where: {
        date: {
          [Op.eq]: date,
        },
      },
      include: [{
        model: Slot,
        required: false,
        attributes: ['id', 'time'] // Fetch both 'id' and 'time' fields from the Slot table
      }],
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments for the date:', error);
    res.status(500).json({ error: 'Error fetching appointments for the date' });
  }
});

// Get all slots
app.get('/getAllSlots', async (req, res) => {
  try {
    const slots = await Slot.findAll();
    res.json(slots);
  } catch (error) {
    console.error('Error fetching all slots:', error);
    res.status(500).json({ error: 'Error fetching all slots' });
  }
});

// Get available slots for a specific date
app.get('/getAvailableSlotsForDate/:date', async (req, res) => {
  try {
    const date = req.params.date;

    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const slots = await Slot.findAll();
    const appointmentsForDate = await Appointment.findAll({
      where: { date },
      attributes: ['slotId'],
    });

    const bookedSlotIds = appointmentsForDate.map(appointment => appointment.slotId);

    const availableSlots = slots.map(slot => {
      return {
        id: slot.id,
        time: slot.time,
        available: !bookedSlotIds.includes(slot.id),
      };
    });

    res.json(availableSlots);
  } catch (error) {
    console.error('Error fetching available slots for the date:', error);
    res.status(500).json({ error: 'Error fetching available slots for the date' });
  }
});

// Get slots for a specific date
app.get('/slots/:date', async (req, res) => {
  console.log("Logging at /slots/:date");
  console.log(req.params);

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

    const slotsWithAvailability = slots.map(slot => {
      const isBooked = slot.Appointments.length > 0;
      return {
        id: slot.id,
        time: slot.time,
        date: slot.date,
        available: !isBooked,
      };
    });

    res.json(slotsWithAvailability);
  } catch (error) {
    console.error('Error fetching all slots:', error);
    res.status(500).json({ error: 'Error fetching all slots' });
  }
});

// Change appointment status
app.patch('/appointments/changeStatus/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    appointment.status = status;
    await appointment.save();

    res.json(appointment);
    // Emit event for the updated status
    io.emit('statusChanged', appointment);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Error updating appointment status' });
  }
});

// Generate tokens for today's appointments
app.post('/appointments/update-tokens', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await Appointment.findAll({ where: { date: today } });

    let appointmentCounter = 1;
    let spotCounter = 1;

    for (let appointment of appointments) {
      let token;

      const datePrefix = today.replace(/-/g, '').slice(2);

      if (appointment.natureOfBooking === 'Appointment') {
        token = `${datePrefix}A${String(appointmentCounter).padStart(3, '0')}`;
        appointmentCounter++;
      } else if (appointment.natureOfBooking === 'Spot') {
        token = `${datePrefix}OP${String(spotCounter).padStart(3, '0')}`;
        spotCounter++;
      }

      appointment.token = token;
      await appointment.save();
    }

    res.json({ message: 'Tokens generated successfully', appointments });
  } catch (error) {
    console.error('Error generating tokens:', error);
    res.status(500).json({ error: 'Error generating tokens' });
  }
});


// Generate tokens for appointments if not already set
app.post('/appointments/generate-tokens/:date', async (req, res) => {
  try {
    // Get the date from the route parameters
    const { date } = req.params;

    // Ensure the date is in the correct format (YYYY-MM-DD)
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const appointments = await Appointment.findAll({ where: { date } });

    const existingTokens = appointments
      .map(appointment => appointment.token)
      .filter(token => token);

    let maxAppointmentCounter = 0;
    let maxSpotCounter = 0;

    existingTokens.forEach(token => {
      const isSpotToken = token.startsWith(date.replace(/-/g, '').slice(2) + 'OP');
      const counterValue = parseInt(token.slice(-3), 10);

      if (isSpotToken) {
        if (counterValue > maxSpotCounter) {
          maxSpotCounter = counterValue;
        }
      } else if (token.startsWith(date.replace(/-/g, '').slice(2) + 'A')) {
        if (counterValue > maxAppointmentCounter) {
          maxAppointmentCounter = counterValue;
        }
      }
    });

    let appointmentCounter = maxAppointmentCounter + 1;
    let spotCounter = maxSpotCounter + 1;

    for (let appointment of appointments) {
      if (!appointment.token || appointment.token === '') {
        let token;

        const datePrefix = date.replace(/-/g, '').slice(2); // Use the provided date

        if (appointment.natureOfBooking === 'Appointment') {
          token = `${datePrefix}A${String(appointmentCounter).padStart(3, '0')}`;
          appointmentCounter++;
        } else if (appointment.natureOfBooking === 'Spot') {
          token = `${datePrefix}OP${String(spotCounter).padStart(3, '0')}`;
          spotCounter++;
        }

        appointment.token = token;
        await appointment.save();
      }
    }

    res.json({ message: 'Tokens generated successfully', appointments });
  } catch (error) {
    console.error('Error generating tokens:', error);
    res.status(500).json({ error: 'Error generating tokens' });
  }
});

// app.post('/appointments/book-spot', async (req, res) => {
//     try {
//         const { name, contactNumber, email, age, gender, slotId } = req.body;
//         const today = new Date().toISOString().split('T')[0];

//         // Create a new spot appointment
//         const appointment = await Appointment.create({
//             name,
//             contactNumber,
//             email,
//             age,
//             gender,
//             date: today,
//             slotId,
//             natureOfBooking: 'Spot',
//             status: 'scheduled'
//         });

//         // Generate a spot token immediately
//         const existingTokens = await Appointment.findAll({ where: { date: today } })
//             .map(a => a.token)
//             .filter(token => token && token.startsWith(today.replace(/-/g, '').slice(2) + 'OP'));

//         let maxSpotCounter = existingTokens
//             .map(token => parseInt(token.slice(-3), 10))
//             .reduce((max, counter) => (counter > max ? counter : max), 0);

//         const spotCounter = maxSpotCounter + 1;
//         const token = `${today.replace(/-/g, '').slice(2)}OP${String(spotCounter).padStart(3, '0')}`;

//         appointment.token = token;
//         await appointment.save();

//         res.json({ message: 'Spot appointment booked successfully', token, appointment });
//     } catch (error) {
//         console.error('Error booking spot appointment:', error);
//         res.status(500).json({ error: 'Error booking spot appointment' });
//     }
// });

// Endpoint to fetch today's appointments
app.get('/appointments/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await Appointment.findAll({
      where: { date: today },
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching today\'s appointments:', error);
    res.status(500).json({ error: 'Error fetching today\'s appointments' });
  }
});

async function generateToken(appointment, today, allAppointments) {
  const datePrefix = today.replace(/-/g, '').slice(2);

  // Filter existing tokens based on the nature of booking (Appointment/Spot)
  const existingTokens = allAppointments
    .map(a => a.token)
    .filter(token => token && token.startsWith(datePrefix + (appointment.natureOfBooking === 'Spot' ? 'OP' : 'A')));

  // Determine the maximum counter for the existing tokens
  let maxCounter = existingTokens
    .map(token => parseInt(token.slice(-3), 10))
    .reduce((max, counter) => (counter > max ? counter : max), 0);

  // Generate a new token
  const counter = maxCounter + 1;
  const token = `${datePrefix}${appointment.natureOfBooking === 'Spot' ? 'OP' : 'A'}${String(counter).padStart(3, '0')}`;

  // Assign the generated token to the appointment
  appointment.token = token;

  // Save the appointment with the token
  await appointment.save();

  return token;
}
