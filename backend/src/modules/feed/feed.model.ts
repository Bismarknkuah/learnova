import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** Educational social feed: posts, research shares, comments, likes. */
const postSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  authorId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['post', 'research', 'question', 'achievement'], default: 'post', index: true },
  body: { type: String, required: true },
  link: String,                                   // research paper / resource link
  imageUrl: String,                               // attached photo (URL or data URL)
  tags: { type: [String], default: [] },
  likes: { type: [{ type: Types.ObjectId, ref: 'User' }], default: [] },
  commentCount: { type: Number, default: 0 },
}, { timestamps: true });

const commentSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  postId: { type: Types.ObjectId, ref: 'FeedPost', required: true, index: true },
  authorId: { type: Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
}, { timestamps: true });

export type FeedPost = InferSchemaType<typeof postSchema>;
export const FeedPostModel = model('FeedPost', postSchema);
export const FeedCommentModel = model('FeedComment', commentSchema);
