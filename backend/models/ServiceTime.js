// ServiceTime model stores default estimated minutes per service type.
import mongoose from 'mongoose';

const serviceTimeSchema = new mongoose.Schema(
  {
    serviceType: { type: String, required: true, unique: true },
    estimatedMinutes: { type: Number, required: true },
  },
  { versionKey: false }
);

const ServiceTime = mongoose.model('ServiceTime', serviceTimeSchema);
export default ServiceTime;
