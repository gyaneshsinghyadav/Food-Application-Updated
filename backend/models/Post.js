const mongoose = require('mongoose');
const Comment = require('./Comment.js');

const PollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 },
  votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserAuth' }],
});

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAuth', required: true },
  userFullName: { type: String, required: true },
  text: String,
  images: { url: String, publicId: String },
  poll: {
    question: String,
    options: [PollOptionSchema],
    totalVotes: { type: Number, default: 0 },
    expiresAt: Date,
    votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserAuth' }],
},
  category: {
    type: String,
    enum: ['all', 'health', 'nutrition', 'exercise','diet','awareness'],
    default: 'all'
  },
  // Scan result sharing — populated when user shares a food scan
  scanData: {
    itemName: String,
    category: String,
    verdict: String,
    calories: Number,
    protein_g: Number,
    fat_g: Number,
    carbs_g: Number,
    imageUrl: String,
    description: String,
  },
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  commentCount: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserAuth' }] 
}, { timestamps: true });
PostSchema.methods.hasUserVoted = function(userId) {
  return this.poll?.votedBy?.includes(userId) || false;
};

PostSchema.methods.getUserVote = function(userId) {
  if (!this.poll) return null;
  for (let i = 0; i < this.poll.options.length; i++) {
    if (this.poll.options[i].votedBy.includes(userId)) {
      return i; 
    }
  }
  return null;
};
PostSchema.methods.getPollPercentages = function () {
  if (!this.poll || this.poll.totalVotes === 0) return null;
  return this.poll.options.map((option) => ({
      text: option.text,
      percentage: Math.round((option.votes / this.poll.totalVotes) * 100),
  }));
};

PostSchema.methods.isLikedBy = async function(userId) {
  return this.likedBy.includes(userId);
};

PostSchema.methods.getLikeCount = async function() {
  return await Like.countDocuments({ post: this._id });
};
module.exports = mongoose.model('Post', PostSchema);