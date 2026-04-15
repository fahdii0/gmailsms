import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettings extends Document {
  key: string;
  value: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings;

export async function getSetting(key: string, defaultValue: string = ""): Promise<string> {
  const setting = await Settings.findOne({ key });
  return setting?.value ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
}
