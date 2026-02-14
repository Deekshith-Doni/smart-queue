// Queue token model representing a customer's place in line.
// Fields align with requirement: tokenNumber, serviceType, status, timestamps.
import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema(
  {
    tokenNumber: { type: Number, required: true, index: true },
    serviceType: { type: String, required: true },
    status: { type: String, enum: ['waiting', 'serving', 'served'], default: 'waiting' },
    createdAt: { type: Date, default: Date.now },
    servedAt: { type: Date },
    assignedServiceTime: { type: Number, default: null }, // Optional: admin-assigned time in minutes
  },
  { versionKey: false }
);

// Ensure that only one token is in 'serving' state at any time is enforced in controller logic.

const Queue = mongoose.model('Queue', queueSchema);
export default Queue;
