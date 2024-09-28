// models/Slot.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Slot extends Model {
    static associate(models) {
      // Define association here
      Slot.hasMany(models.Appointment, { foreignKey: 'slotId' });
    }
  }

  Slot.init({
    date: DataTypes.DATEONLY,  // Change from DATE to DATEONLY
    time: DataTypes.STRING,
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
