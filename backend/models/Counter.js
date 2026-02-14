// Counter model for atomic auto-increment sequences (e.g., tokenNumber)
// Using a dedicated collection avoids race conditions under concurrent requests.
import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
