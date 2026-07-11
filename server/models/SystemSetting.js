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
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', SystemSettingSchema);
