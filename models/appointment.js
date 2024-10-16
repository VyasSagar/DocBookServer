// models/Appointment.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      Appointment.belongsTo(models.Slot, { foreignKey: 'slotId' });
    }
  }

  Appointment.init({
    name: DataTypes.STRING,
    contactNumber: DataTypes.STRING,
    email: DataTypes.STRING,
    age: DataTypes.INTEGER,
    gender: DataTypes.STRING,
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    slotId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Slots',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'scheduled'
    },
    token: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    natureOfBooking: {
      type: DataTypes.ENUM('Appointment', 'Spot'),
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'Appointment',
  });

  return Appointment;
};
