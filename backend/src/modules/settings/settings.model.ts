import { Schema, model } from 'mongoose';

/** Platform-wide feature visibility, controlled by the super admin.
 *  `disabled[role]` = list of feature hrefs hidden for that role. Empty = everything on. */
const settingsSchema = new Schema({
  key: { type: String, default: 'global', unique: true },
  disabled: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
export const PlatformSettingsModel = model('PlatformSettings', settingsSchema);

let cache: Record<string, string[]> | null = null;
export async function getDisabledMap(): Promise<Record<string, string[]>> {
  if (cache) return cache;
  const doc = await PlatformSettingsModel.findOne({ key: 'global' }).catch(() => null);
  cache = (doc?.disabled as Record<string, string[]>) ?? {};
  return cache;
}
export async function setDisabledMap(map: Record<string, string[]>): Promise<Record<string, string[]>> {
  await PlatformSettingsModel.findOneAndUpdate({ key: 'global' }, { key: 'global', disabled: map }, { upsert: true });
  cache = map;
  return map;
}
