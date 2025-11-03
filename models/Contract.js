import { Schema, model, models } from 'mongoose';

const contractSchema = new Schema({
  noticeId: { type: String, unique: true },
  title: String,
  solicitationNumber: String,
  fullParentPathName: String, // e.g., "Department of Defense.Department of the Army"
  fullParentPathCode: String,
  department: String, // Deprecated, but included for compatibility
  subTier: String, // Deprecated - agency
  office: String, // Deprecated
  postedDate: Date,
  archiveDate: Date,
  responseDeadLine: Date,
  type: String,
  baseType: String,
  archiveType: String,
  typeOfSetAsideDescription: String,
  typeOfSetAside: String, // Primary set-aside field
  setAside: String, // Keep for backward compatibility
  naicsCode: String,
  classificationCode: String,
  active: Boolean,
  award: {
    date: Date,
    number: String,
    amount: Number,
    awardee: {
      name: String,
      ueiSAM: String,
      location: {
        streetAddress: String,
        streetAddress2: String,
        city: {
          code: String,
          name: String
        },
        state: {
          code: String,
          name: String
        },
        country: {
          code: String,
          name: String
        },
        zip: String
      }
    }
  },
  pointOfContact: [Schema.Types.Mixed], // Array of contact objects
  description: String, // URL to description
  organizationType: String,
  officeAddress: {
    city: String,
    state: String,
    zipcode: String,
    countryCode: String
  },
  placeOfPerformance: {
    streetAddress: String,
    streetAddress2: String,
    city: {
      code: String,
      name: String,
      state: {
        code: String,
        name: String
      }
    },
    state: {
      code: String,
      name: String
    },
    country: {
      code: String,
      name: String
    },
    zip: String
  },
  additionalInfoLink: String,
  uiLink: String,
  links: [Schema.Types.Mixed], // Array of link objects
  resourceLinks: [String], // Array of strings
  link: String, // Legacy field - keep for backward compatibility
  source: String, // 'federal', 'ny', 'il', etc.
}, { timestamps: true });

// Add indexes for commonly queried fields to improve performance
contractSchema.index({ postedDate: -1 }); // For sorting by date (descending)
contractSchema.index({ naicsCode: 1 }); // For category filtering
contractSchema.index({ setAside: 1 }); // For set-aside filtering (backward compat)
contractSchema.index({ typeOfSetAside: 1 }); // For set-aside filtering (primary)
contractSchema.index({ 'placeOfPerformance.state.code': 1 }); // For state filtering
contractSchema.index({ source: 1 }); // For source filtering
contractSchema.index({ 'award.amount': 1 }); // For value filtering
contractSchema.index({ active: 1 }); // For active status filtering
contractSchema.index({ title: 'text', description: 'text' }); // Text search index

const Contract = models.Contract || model('Contract', contractSchema);
export default Contract;