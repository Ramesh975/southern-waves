const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_settings',
    },
    globalCommentLock: {
      type: Boolean,
      default: false,
    },
    globalChatLock: {
      type: Boolean,
      default: false,
    },
    defaultUniversity: {
      type: String,
      default: 'University of Madras',
    },
    restrictToDefaultUniversity: {
      type: Boolean,
      default: false,
    },
    strictIndianPhone: {
      type: Boolean,
      default: true,
    },
    allowedUniversities: {
      type: [String],
      default: [
        'University of Madras',
        'Anna University',
        'Indian Institute of Technology (IIT) Madras',
        'SRM Institute of Science and Technology',
        'VIT University',
        'Loyola College, Chennai',
        'Presidency College, Chennai',
        'Madurai Kamaraj University',
        'Bharathiar University',
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', SystemSettingSchema);
