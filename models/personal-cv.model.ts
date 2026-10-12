import mongoose from "mongoose";

// One personal CV per account; application CVs remain in their existing collection.
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true, select: false }
}, { timestamps: true });

export default mongoose.model("PersonalCV", schema, "personal-cvs");
