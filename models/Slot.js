// models/Slot.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Slot extends Model {
    static associate(models) {
      Slot.hasMany(models.Appointment, { foreignKey: 'slotId' });
    }
  }

  Slot.init({
    time: DataTypes.STRING,  // Only keeping the 'time' field
    available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Slot',
  });

  return Slot;
};
