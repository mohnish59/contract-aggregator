import { Schema, model, models } from 'mongoose';

const contractSchema = new Schema({
  noticeId: { type: String, unique: true },  // For federal; states may use title or custom ID
  title: String,
  description: String,  // New: For better search
  postedDate: Date,
  dueDate: Date,  // New: Bid due date
  type: String,
  setAside: String,
  naicsCode: String,
  award: {
    amount: Number,
  },
  placeOfPerformance: {
    state: { code: String },
  },
  link: String,  // New: URL to original posting
  source: String,  // New: 'federal', 'va', 'md'
}, { timestamps: true });

const Contract = models.Contract || model('Contract', contractSchema);
export default Contract;