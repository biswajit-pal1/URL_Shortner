import mongoose from 'mongoose'


const urlSchema = new mongoose.Schema({
  full: { type: String, required: true },
  short: { type: String, required: true, unique: true },
  clicks: { type: Number, default: 0 }
});

const Url = mongoose.model('Url', urlSchema);
export default Url