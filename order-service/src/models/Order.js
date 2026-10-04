const mongoose = require('mongoose');

// An order stores only *references* (userId, productId) plus a snapshot of the values
// that were true when it was placed. It never reads the user or product databases.
const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    userName: { type: String, required: true },
    productName: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ['CREATED'], default: 'CREATED' }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
      }
    }
  }
);

orderSchema.virtual('id').get(function idVirtual() {
  return this._id.toHexString();
});

module.exports = mongoose.model('Order', orderSchema);
