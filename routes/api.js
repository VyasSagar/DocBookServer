// routes/api.js
const express = require('express');
const { Appointment, Slot } = require('../models');
const router = express.Router();
const moment = require('moment'); // Ensure you have moment installed if using it

// Function to validate date format
const isValidDate = (dateString) => {
  return moment(dateString, 'YYYY-MM-DD', true).isValid();
};

// Get available slots for a specific date
router.get('/availableSlots/:date', async (req, res) => {
  try {
    const date = req.params.date;

    // Validate date format
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

// Get all slots for a specific date with availability status
router.get('/slots/:date', async (req, res) => {
    console.log("logging at /slots/:date");
    console.log(req);
    
    
  try {
    const date = req.params.date; // Extract date from URL parameters

    // Validate date format
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Fetch all slots for the specified date
    const slots = await Slot.findAll({
      where: { date }, // Filter slots by the requested date
      include: [{
        model: Appointment, // Include related appointments
        required: false, // Allow slots without appointments to be returned
      }],
    });

    // Map the slots and mark them as available or booked
    const slotsWithAvailability = slots.map(slot => {
      const isBooked = slot.Appointments && slot.Appointments.length > 0; // Check if slot has any appointment
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

// Get all appointments
router.get('/appointments', async (req, res) => {
    try {
      // Fetch all appointments from the database
      const appointments = await Appointment.findAll({
        include: [{
          model: Slot, // Include related slots
          required: false // Allow appointments without associated slots
        }]
      });
  
      // Send the appointments data as a JSON response
      res.json(appointments);
    } catch (error) {
      console.error('Error fetching all appointments:', error); // Log error for debugging
      res.status(500).json({ error: 'Error fetching all appointments' });
    }
  });

  router.get('/availableSlots/:date', async (req, res) => {
    try {
      const date = req.params.date;
  
      // Validate date format
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

module.exports = router;
