const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    course: { type: String, required: true },
    semester: { type: Number, required: true }
  },
  {
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
      }
    }
  }
);

userSchema.virtual('id').get(function idVirtual() {
  return this._id.toHexString();
});

module.exports = mongoose.model('User', userSchema);
