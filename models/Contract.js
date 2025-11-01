import { Schema, model, models } from 'mongoose';

const contractSchema = new Schema({
  noticeId: { type: String, unique: true },
  title: String,
  postedDate: Date,
  type: String,
  setAside: String,
  naicsCode: String,
  award: {
    amount: Number,
  },
  placeOfPerformance: {
    state: { code: String },
  },
  // Add more fields if needed later
}, { timestamps: true });

const Contract = models.Contract || model('Contract', contractSchema);
export default Contract;