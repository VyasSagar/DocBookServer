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
    date: DataTypes.DATE,
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
    }
  }, {
    sequelize,
    modelName: 'Appointment',
  });

  return Appointment;
};
