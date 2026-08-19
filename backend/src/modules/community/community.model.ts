import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const groupSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  kind: { type: String, enum: ['club', 'study_group', 'research', 'forum'], default: 'forum' },
  description: String,
  createdBy: { type: Types.ObjectId, ref: 'User' },
  memberIds: [{ type: Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const postSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  groupId: { type: Types.ObjectId, ref: 'Group', required: true, index: true },
  authorId: { type: Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  parentId: { type: Types.ObjectId, ref: 'Post' }, // threaded replies
}, { timestamps: true });

export type Group = InferSchemaType<typeof groupSchema>;
export type Post = InferSchemaType<typeof postSchema>;
export const GroupModel = model('Group', groupSchema);
export const PostModel = model('Post', postSchema);
