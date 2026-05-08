const Post = require("../models/Post.js");
const Comment = require("../models/Comment.js");
const Reply = require("../models/Reply.js");
const { formatTimestamp } = require("../utils/timeFormatter");
const fs = require("fs");
const path = require("path");
// const { uploadOnCloudinary } = require("../utils/cloudinary.js");
const { Types } = require("mongoose");
const Like = require("../models/Like.js");
const createPost = async (req, res) => {
  try {
    const { text, poll, category,userFullName } = req.body;
    const imageLocalPath = req.file?.path;
    if (!userFullName){
      return res.status(400).json({ error: "User full name is required" });
    }
    if (!(text || poll || imageLocalPath)) {
      return res.status(400).json({ error: "Need either text, poll or image to create post" });
    }

    let imageData = null;
    
    if (imageLocalPath && req.file?.filename) {
      const fileName = req.file.filename;
      const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
      imageData = {
        url: `${baseUrl}/uploads/${fileName}`,
        publicId: fileName
      };
    }
    
    const postData = {
      user: req.user,
      userFullName,
      text: text || null,
      category: category || 'all'
    };

    if (imageData) {
      postData.images = imageData;  
    }

    if (poll && poll.question) {
      if (!poll.options || poll.options.length < 2) {
        return res.status(400).json({ error: "Poll must have at least 2 options" });
      }

      postData.poll = {
        question: poll.question,
        options: poll.options.map(option => ({ text: option })), 
        expiresAt: poll.expiresAt ? new Date(poll.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
      };
    }

    const post = await Post.create(postData);
    
    const populatedPost = await Post.findById(post._id)
      .populate("user", "username profilePicture");

    const response = {
      ...populatedPost.toObject(),
      pollResults: post.poll ? post.getPollPercentages() : null
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ 
      error: "Failed to create post",
      details: error.message 
    });
  }
};
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.user.toString() !== req.user.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (post.images && post.images.length > 0) {
      for (const image of post.images) {
        if (image.publicId) {
          try {
             fs.unlinkSync(path.join(__dirname, '../public/uploads', image.publicId));
          } catch (err) {
             console.error("Failed to delete local image:", err.message);
          }
        }
      }
    }

    await Comment.deleteMany({ post: post._id });
    await Post.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" });
  }
};

const likePost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user; 

    const existingLike = await Like.findOne({ user: userId, post: postId });

    let post;
    
    if (existingLike) {
   
      await Like.findByIdAndDelete(existingLike._id);
      post = await Post.findByIdAndUpdate(
        postId,
        { 
          $inc: { likes: -1 },
          $pull: { likedBy: userId }
        },
        { new: true }
      ).populate("user", "username profilePicture");
    } else {
    
      await Like.create({ user: userId, post: postId });
      post = await Post.findByIdAndUpdate(
        postId,
        { 
          $inc: { likes: 1 },
          $addToSet: { likedBy: userId }
        },
        { new: true }
      ).populate("user", "username profilePicture");
    }

    if (!post) return res.status(404).json({ error: "Post not found" });

   
    const postObj = post.toObject();
    postObj.isLiked = !existingLike; 
    postObj.formattedTimestamp = formatTimestamp(post.createdAt);

    res.json(postObj);
  } catch (error) {
    console.error("Like error:", error);
    res.status(500).json({ error: "Failed to update like" });
  }
};

const addComment = async (req, res) => {
  try {
   
    const { text,userFullName } = req.body;
    if (!userFullName){
      return res.status(400).json({ error: "User full name is required" });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = new Comment({
      user: req.user,
      userFullName,
      post: post._id,
      text
    });

    console.log(comment)
    await comment.save();
    await Post.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: comment._id }, $inc: { commentCount: 1 } }
    );

    const populatedComment = await Comment.findById(comment._id)
      .populate("user");
      
    res.status(201).json({
      ...populatedComment.toObject(),
      formattedTimestamp: formatTimestamp(comment.createdAt)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" });
  }
};

const addReply = async (req, res) => {
  try {
    const { text ,userFullName} = req.body;
    if (!userFullName){
      return res.status(400).json({ error: "User full name is required" });
    }
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const reply = new Reply({
      user: req.user,
      userFullName,
      comment: comment._id,
      text
    });

    await reply.save();
    
    await Comment.findByIdAndUpdate(
      req.params.commentId,
      { $push: { replies: reply._id } }
    );

    const populatedReply = await Reply.findById(reply._id)
      .populate("user", "username profilePicture");
      
    res.status(201).json({
      ...populatedReply.toObject(),
      formattedTimestamp: formatTimestamp(reply.createdAt)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to add reply" });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Reply.deleteMany({ comment: comment._id });
    await Comment.findByIdAndDelete(req.params.commentId);
    
    await Post.findByIdAndUpdate(
      comment.post,
      { $pull: { comments: comment._id }, $inc: { commentCount: -1 } }
    );
    
    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
};

const voteOnPoll = async (req, res) => {
  try {
      const { optionIndex } = req.body;
      const userId = req.user;
      const post = await Post.findById(req.params.id);

      if (!post) return res.status(404).json({ error: "Post not found" });
      if (!post.poll) return res.status(400).json({ error: "This post doesn't have a poll" });
      if (post.poll.expiresAt < new Date()) {
          return res.status(400).json({ error: "This poll has expired" });
      }
      if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
          return res.status(400).json({ error: "Invalid option index" });
      }

      const hasVoted = post.poll.votedBy.includes(userId);
      const previousVoteIndex = hasVoted ? 
          post.poll.options.findIndex(opt => opt.votedBy.includes(userId)) : -1;

      if (hasVoted) {
          if (previousVoteIndex === optionIndex) {
          
              post.poll.options[previousVoteIndex].votes = 
                  Math.max(0, post.poll.options[previousVoteIndex].votes - 1);
              post.poll.options[previousVoteIndex].votedBy.pull(userId);
              post.poll.votedBy.pull(userId);
              post.poll.totalVotes = Math.max(0, post.poll.totalVotes - 1);
          } else {
          
              post.poll.options[previousVoteIndex].votes = 
                  Math.max(0, post.poll.options[previousVoteIndex].votes - 1);
              post.poll.options[previousVoteIndex].votedBy.pull(userId);
              
              post.poll.options[optionIndex].votes += 1;
              post.poll.options[optionIndex].votedBy.push(userId);
          }
      } else {
         
          post.poll.options[optionIndex].votes += 1;
          post.poll.options[optionIndex].votedBy.push(userId);
          post.poll.votedBy.push(userId);
          post.poll.totalVotes += 1;
      }

      await post.save();

      const pollResults = post.poll.options.map(option => ({
          votes: option.votes,
          percentage: post.poll.totalVotes > 0 
              ? Math.round((option.votes / post.poll.totalVotes) * 100)
              : 0
      }));

      res.json({
          pollResults,
          totalVotes: post.poll.totalVotes,
          hasVoted: post.poll.votedBy.includes(userId),
          selectedOption: post.poll.votedBy.includes(userId) ? optionIndex : null
      });
  } catch (error) {
      console.error("Vote error:", error);
      res.status(500).json({ error: "Failed to vote on poll" });
  }
};
const sharePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    );
    
    if (!post) return res.status(404).json({ error: "Post not found" });
    
    res.json({ 
      message: "Post shared successfully",
      shareCount: post.shares 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to share post" });
  }
};

const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "username profilePicture")
      .populate({
        path: "comments",
        populate: [
          { path: "user", select: "username profilePicture" },
          { 
            path: "replies",
            populate: { path: "user", select: "username profilePicture" }
          }
        ]
      });

    if (!post) return res.status(404).json({ error: "Post not found" });
    
    const response = {
      ...post.toObject(),
      formattedTimestamp: formatTimestamp(post.createdAt),
      pollResults: post.poll ? post.getPollPercentages() : null
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

const getPosts = async (req, res) => {
  try {
      const { category } = req.query;
      const filter = category && category !== 'all' ? { category } : {};
      
      const posts = await Post.find(filter)
          .sort({ createdAt: -1 })
          .populate("user")
          .populate({
              path: "comments",
              options: { limit: 2 },
              populate: [
                  { path: "user", select: "username profilePicture" },
                  { 
                      path: "replies",
                      options: { limit: 10 },
                      populate: { path: "user", select: "username profilePicture" }
                  }
              ]
          });

      const response = posts.map(post => ({
          ...post.toObject(),
          formattedTimestamp: formatTimestamp(post.createdAt),
          pollResults: post.poll ? post.getPollPercentages() : null
      }));
      
      res.json(response);
  } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
  }
};

module.exports = {
  createPost,
  deletePost,
  likePost,
  addComment,
  addReply,
  deleteComment,
  voteOnPoll,
  sharePost,
  getPost,
  getPosts
};