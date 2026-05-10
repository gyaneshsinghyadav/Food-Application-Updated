import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
    Heart,
    MessageSquare,
    Share2,
    Copy,
    MoreHorizontal,
    Image as ImageIcon,
    BarChart2,
    X,
    Send,
    Check,
    Users, Clock,
    Leaf,
    Apple,
    Utensils,
    Activity,
    Feather,
    ChevronDown,
    ThumbsUp,
    Bookmark,
    BookmarkCheck,
    Trophy,
    TrendingUp,
    Camera,
    Lightbulb,
    Flame
} from "lucide-react";
import axios from "axios";
import { useUserStore } from "../store/useUserStore";
import { useHealthProfileStore } from "../store/useUserInformationStore"

// Daily health challenges pool
const DAILY_CHALLENGES = [
    { emoji: "🥗", text: "Eat 5 servings of fruits & vegetables today", category: "nutrition" },
    { emoji: "💧", text: "Drink 8 glasses of water today", category: "health" },
    { emoji: "🚶", text: "Walk 10,000 steps today", category: "exercise" },
    { emoji: "🍳", text: "Cook a homemade protein-rich breakfast", category: "diet" },
    { emoji: "🧘", text: "Do 15 minutes of stretching or yoga", category: "exercise" },
    { emoji: "🥜", text: "Replace one snack with nuts or seeds", category: "nutrition" },
    { emoji: "🫖", text: "Swap one sugary drink with green tea", category: "health" },
    { emoji: "🥒", text: "Add a raw salad to your lunch", category: "diet" },
    { emoji: "🏋️", text: "Do a 20-minute home workout", category: "exercise" },
    { emoji: "😴", text: "Sleep 7+ hours tonight for recovery", category: "awareness" },
];

const Post = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [showCommentBox, setShowCommentBox] = useState(null);
    const [commentText, setCommentText] = useState("");
    const [replyText, setReplyText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [imagePreview, setImagePreview] = useState(null);
    const [isCreatingPoll, setIsCreatingPoll] = useState(false);
    const fileInputRef = useRef();
    const { user } = useUserStore();
    const [showSharePopup, setShowSharePopup] = useState(false);
    const [sharePostId, setSharePostId] = useState(null);
    const { profile } = useHealthProfileStore();
    const fullname = profile?.fullName;

    // New community feature states
    const [bookmarkedPosts, setBookmarkedPosts] = useState(() => {
        try { return JSON.parse(localStorage.getItem('eatit_bookmarks') || '[]'); } catch { return []; }
    });
    const [challengeCompleted, setChallengeCompleted] = useState(() => {
        const saved = localStorage.getItem('eatit_challenge_date');
        return saved === new Date().toDateString();
    });
    const [showScanShare, setShowScanShare] = useState(false);
    const [lastScanResult, setLastScanResult] = useState(() => {
        try { return JSON.parse(localStorage.getItem('eatit_last_scan') || 'null'); } catch { return null; }
    });

    // Get today's challenge based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const todayChallenge = DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];

    const toggleBookmark = (postId) => {
        setBookmarkedPosts(prev => {
            const next = prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId];
            localStorage.setItem('eatit_bookmarks', JSON.stringify(next));
            toast.success(next.includes(postId) ? 'Post saved!' : 'Removed from saved');
            return next;
        });
    };

    const completeChallenge = () => {
        setChallengeCompleted(true);
        localStorage.setItem('eatit_challenge_date', new Date().toDateString());
        toast.success('🎉 Challenge completed! Great job!');
    };
    // Add this function in both components
    const handleShare = (postId) => {
        setSharePostId(postId);
        setShowSharePopup(true);
    };

    // Add this function in both components
    const handleCopyLink = () => {
        const postUrl = `${window.location.origin}/posts/${sharePostId}`;
        navigator.clipboard.writeText(postUrl);
        toast.success("Link copied to clipboard!");
        setShowSharePopup(false);
    };
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        defaultValues: {
            text: "",
            category: "all",
            poll: {
                question: "",
                options: ["", ""],
                expiresIn: 7, // days
            },
        },
    });

    const pollQuestion = watch("poll.question");
    const pollOptions = watch("poll.options");

    // Category icons mapping
    const categoryIcons = {
        all: <Utensils size={16} />,
        health: <Activity size={16} />,
        nutrition: <Apple size={16} />,
        exercise: <Activity size={16} />,
        diet: <Leaf size={16} />,
        awareness: <Feather size={16} />
    };

    // Category color mapping
    const categoryColors = {
        all: "from-green-500 to-teal-500",
        health: "from-blue-500 to-indigo-500",
        nutrition: "from-green-500 to-emerald-600",
        exercise: "from-orange-500 to-amber-500",
        diet: "from-purple-500 to-fuchsia-500",
        awareness: "from-teal-500 to-cyan-500"
    };

    // Fetch posts
    const fetchPosts = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/posts${selectedCategory !== "all" ? `?category=${selectedCategory}` : ""}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );

            const transformedPosts = response.data.map(post => ({
                ...post,
                isLiked: post.likedBy?.includes(user?._id) || false,
                poll: post.poll ? {
                    ...post.poll,
                    expiresAt: new Date(post.poll.expiresAt),
                    hasVoted: post.poll.votedBy?.includes(user?._id) || false,
                    selectedOption: post.poll.options.findIndex(opt =>
                        opt.votedBy?.includes(user?._id)
                    ),
                    options: post.poll.options.map((opt, idx) => ({
                        ...opt,
                        percentage: post.pollResults ? post.pollResults[idx]?.percentage : 0,
                    })),
                } : null
            }));

            setPosts(transformedPosts);
        } catch (error) {
            toast.error("Failed to fetch posts");
            console.error("Fetch posts error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [selectedCategory, user?._id]);

    // Create post
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            const formData = new FormData();

            if (data.text) formData.append("text", data.text);
            if (data.category) formData.append("category", data.category);
            formData.append("userFullName", fullname);
            const imageFile = fileInputRef.current?.files?.[0];
            if (imageFile) {
                formData.append("image", imageFile);
            }

            if (pollQuestion && pollOptions.some(opt => opt.trim() !== "")) {
                formData.append("poll[question]", pollQuestion);
                pollOptions.forEach((opt, i) => {
                    if (opt.trim() !== "") formData.append(`poll[options][${i}]`, opt);
                });
                formData.append(
                    "poll[expiresAt]",
                    new Date(Date.now() + data.poll.expiresIn * 24 * 60 * 60 * 1000).toISOString()
                );
            }

            await axios.post(`${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/posts`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            toast.success("Post created successfully");
            reset();
            setImagePreview(null);
            setIsCreatingPoll(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchPosts();
        } catch (error) {
            const errorMessage = error.response?.data?.error || "Failed to create post";
            toast.error(errorMessage);
            console.error("Create post error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Like post
    const handleLike = async (postId) => {
        try {
            await axios.post(`${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/posts/${postId}/like`);
            fetchPosts();
        } catch (error) {
            toast.error("Failed to like post");
            console.error("Like post error:", error);
        }
    };

    // Add comment
    const handleAddComment = async (postId) => {
        if (!commentText.trim()) {
            toast.error("Comment cannot be empty");
            return;
        }

        try {
            await axios.post(`${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/posts/${postId}/comment`, { text: commentText, userFullName: fullname });
            setCommentText("");
            setShowCommentBox(null);
            fetchPosts();
        } catch (error) {
            toast.error("Failed to add comment");
            console.error("Add comment error:", error);
        }
    };

    // Add reply
    const handleAddReply = async (commentId) => {
        if (!replyText.trim()) {
            toast.error("Reply cannot be empty");
            return;
        }

        try {
            await axios.post(`${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/posts/comment/${commentId}/reply`, { text: replyText, userFullName: fullname });
            setReplyText("");
            setReplyingTo(null);
            fetchPosts();
        } catch (error) {
            toast.error("Failed to add reply");
            console.error("Add reply error:", error);
        }
    };

    // Vote on poll
    const handleVote = async (postId, optionIndex) => {
        const currentPosts = [...posts];

        try {
            // Optimistic UI update
            setPosts((prevPosts) =>
                prevPosts.map((post) => {
                    if (post._id !== postId || !post.poll) return post;

                    const { hasVoted, selectedOption, options, totalVotes } = post.poll;
                    const updatedOptions = [...options];
                    let updatedTotalVotes = totalVotes;

                    if (hasVoted) {
                        if (selectedOption === optionIndex) {
                            updatedOptions[optionIndex].votes = Math.max(0, updatedOptions[optionIndex].votes - 1);
                            updatedTotalVotes = Math.max(0, updatedTotalVotes - 1);
                        } else {
                            updatedOptions[selectedOption].votes = Math.max(0, updatedOptions[selectedOption].votes - 1);
                            updatedOptions[optionIndex].votes += 1;
                        }
                    } else {
                        updatedOptions[optionIndex].votes += 1;
                        updatedTotalVotes += 1;
                    }

                    const updatedOptionsWithPercentages = updatedOptions.map((opt) => ({
                        ...opt,
                        percentage: updatedTotalVotes > 0
                            ? Math.round((opt.votes / updatedTotalVotes) * 100)
                            : 0
                    }));

                    return {
                        ...post,
                        poll: {
                            ...post.poll,
                            hasVoted: !(hasVoted && selectedOption === optionIndex),
                            selectedOption: hasVoted && selectedOption === optionIndex ? null : optionIndex,
                            totalVotes: updatedTotalVotes,
                            options: updatedOptionsWithPercentages,
                        },
                    };
                })
            );

            // Send vote to the server
            const response = await axios.post(
                `${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/posts/${postId}/vote`,
                { optionIndex },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );

            // Update UI with server response
            if (response.data) {
                setPosts((prevPosts) =>
                    prevPosts.map((post) => {
                        if (post._id !== postId || !post.poll) return post;

                        return {
                            ...post,
                            poll: {
                                ...post.poll,
                                hasVoted: response.data.hasVoted,
                                selectedOption: response.data.selectedOption,
                                totalVotes: response.data.totalVotes,
                                options: post.poll.options.map((opt, idx) => ({
                                    ...opt,
                                    votes: response.data.pollResults[idx]?.votes || opt.votes,
                                    percentage: response.data.pollResults[idx]?.percentage || 0,
                                })),
                            },
                        };
                    })
                );
            }
        } catch (error) {
            // Rollback to previous state on error
            setPosts(currentPosts);
            const errorMessage = error.response?.data?.error || "Failed to vote";
            toast.error(errorMessage);
            console.error("Vote error:", error);
        }
    };

    // Handle image preview
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        } else {
            setImagePreview(null);
        }
    };

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    // Add poll option
    const addPollOption = () => {
        if (pollOptions.length >= 4) {
            toast.info("Maximum 4 options allowed");
            return;
        }
        setValue("poll.options", [...pollOptions, ""]);
    };

    // Remove poll option
    const removePollOption = (index) => {
        if (pollOptions.length <= 2) {
            toast.info("Minimum 2 options required");
            return;
        }
        const newOptions = [...pollOptions];
        newOptions.splice(index, 1);
        setValue("poll.options", newOptions);
    };

    const categories = ["all", "health", "nutrition", "exercise", "diet", "awareness"];

    // Format post date
    const formatPostDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6 bg-gradient-to-br from-green-50 to-blue-50 min-h-screen">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-md p-5 border-b-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-500 bg-clip-text text-transparent">
                        Nutrition Community Feed
                    </h2>
                    <div className="flex items-center space-x-2">
                        <Leaf className="text-green-500" size={20} />
                        <Apple className="text-red-500" size={20} />
                        <Activity className="text-blue-500" size={20} />
                    </div>
                </div>
                <p className="text-gray-600 text-sm">Share your healthy meals, nutrition tips, and fitness journey</p>
            </div>

            {/* 🏆 Daily Health Challenge */}
            <div className={`rounded-2xl shadow-md p-5 border-l-4 transition-all duration-300 ${challengeCompleted ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${challengeCompleted ? 'bg-green-100' : 'bg-amber-100'}`}>
                            {challengeCompleted ? '✅' : todayChallenge.emoji}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Trophy size={16} className={challengeCompleted ? 'text-green-600' : 'text-amber-600'} />
                                <span className={`text-xs font-bold uppercase tracking-wide ${challengeCompleted ? 'text-green-600' : 'text-amber-600'}`}>
                                    Today's Challenge
                                </span>
                            </div>
                            <p className={`text-sm font-medium mt-0.5 ${challengeCompleted ? 'text-green-700 line-through' : 'text-gray-800'}`}>
                                {todayChallenge.text}
                            </p>
                        </div>
                    </div>
                    {!challengeCompleted && (
                        <button
                            onClick={completeChallenge}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1"
                        >
                            <Check size={14} /> Done!
                        </button>
                    )}
                    {challengeCompleted && (
                        <span className="text-green-600 text-xs font-bold flex items-center gap-1 bg-green-100 px-3 py-1.5 rounded-full">
                            <Check size={14} /> Completed!
                        </span>
                    )}
                </div>
            </div>

            {/* 🎯 AI Health Tip */}
            {profile && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-md p-5 border-l-4 border-indigo-400">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Lightbulb size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Weekly Tip For You</span>
                            <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                                {profile.dietPreference === 'Vegetarian' || profile.dietPreference === 'Vegan'
                                    ? `As a ${profile.dietPreference.toLowerCase()}, boost your protein with dal, paneer, chickpeas, and quinoa. Pair with vitamin C-rich foods for better iron absorption!`
                                    : profile.healthGoal === 'Weight Loss'
                                        ? 'For weight loss, try replacing one meal with a protein-rich salad. Add boiled eggs, grilled chicken, and lots of greens!'
                                        : profile.healthGoal === 'Gain Weight'
                                            ? 'To gain healthy weight, add calorie-dense foods like peanut butter, banana shakes, and whole grain roti with ghee to your meals.'
                                            : 'Focus on balanced meals — fill half your plate with vegetables, quarter with protein, and quarter with whole grains for optimal nutrition!'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Post Form */}
            <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-green-500">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="flex items-start space-x-4">
                        {/* User Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-teal-400 flex items-center justify-center text-white font-bold shadow-md">
                            {fullname?.[0]?.toUpperCase() || 'U'}
                        </div>

                        <div className="flex-1">
                            <textarea
                                {...register("text")}
                                placeholder="Share your nutritional journey, healthy recipes, or fitness tips..."
                                className="w-full border-2 border-green-100 rounded-xl focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all duration-200 resize-none placeholder-gray-400 text-gray-700 p-4"
                                rows={3}
                            />

                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="relative mt-3 group">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="rounded-xl w-full h-64 object-cover border-2 border-green-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImagePreview(null);
                                            setValue("image", null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 rounded-full p-2 text-red-500 transition-colors duration-200 shadow-md"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Poll Creation */}
                            {isCreatingPoll && (
                                <div className="mt-4 p-5 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border border-green-100 shadow-sm">
                                    <h3 className="font-medium text-green-800 mb-3">Create a Nutrition Poll</h3>
                                    <input
                                        type="text"
                                        {...register("poll.question")}
                                        placeholder="Ask about favorite superfoods, diet preferences, etc..."
                                        className="w-full border-2 border-green-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all duration-200 mb-4"
                                    />
                                    <div className="space-y-3">
                                        {pollOptions.map((option, index) => (
                                            <div key={index} className="flex items-center space-x-2 group">
                                                <input
                                                    type="text"
                                                    {...register(`poll.options.${index}`)}
                                                    placeholder={`Option ${index + 1}`}
                                                    className="flex-1 border-2 border-green-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all duration-200"
                                                />
                                                {pollOptions.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePollOption(index)}
                                                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-all duration-200"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {pollOptions.length < 4 && (
                                            <button
                                                type="button"
                                                onClick={addPollOption}
                                                className="text-sm text-green-600 hover:text-green-700 transition-colors duration-200 flex items-center space-x-1 mt-2"
                                            >
                                                <span>+ Add another option</span>
                                            </button>
                                        )}
                                        <div className="flex items-center space-x-3 mt-4 text-sm text-gray-600">
                                            <Clock size={16} className="text-green-500" />
                                            <select
                                                {...register("poll.expiresIn")}
                                                className="border-2 border-green-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all duration-200 bg-white"
                                            >
                                                <option value="1">Expires in 1 day</option>
                                                <option value="3">Expires in 3 days</option>
                                                <option value="7">Expires in 7 days</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-4 border-t mt-4 gap-2">
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                    <label className="cursor-pointer text-gray-600 hover:text-green-600 transition-colors duration-200 flex items-center space-x-2 bg-gray-50 hover:bg-green-50 px-3 py-2 rounded-lg">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        <ImageIcon size={18} />
                                        <span className="text-sm font-medium">Image</span>
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingPoll(!isCreatingPoll)}
                                        className={`flex items-center space-x-2 transition-colors duration-200 px-3 py-2 rounded-lg ${isCreatingPoll ? 'text-green-600 bg-green-50' : 'text-gray-600 hover:text-green-600 bg-gray-50 hover:bg-green-50'
                                            }`}
                                    >
                                        <BarChart2 size={18} />
                                        <span className="text-sm font-medium">Poll</span>
                                    </button>

                                    {lastScanResult && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const scanText = `🔍 I just scanned "${lastScanResult.product}" on EatiT!\n\n` +
                                                    `📊 Verdict: ${lastScanResult.verdict || 'N/A'}\n` +
                                                    `🔥 Calories: ${lastScanResult.basicNutrients?.calories || '?'} kcal\n` +
                                                    `💪 Protein: ${lastScanResult.basicNutrients?.protein_g || '?'}g\n\n` +
                                                    `${lastScanResult.productDescription || ''}\n\n#EatiT #NutritionCheck`;
                                                setValue('text', scanText);
                                                setValue('category', 'nutrition');
                                                toast.success('Scan result added to your post!');
                                            }}
                                            className="flex items-center space-x-2 transition-colors duration-200 px-3 py-2 rounded-lg text-orange-600 bg-orange-50 hover:bg-orange-100"
                                        >
                                            <Camera size={18} />
                                            <span className="text-sm font-medium">Share Scan</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center space-x-3">
                                    <select
                                        {...register("category")}
                                        className="border-2 border-green-100 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all duration-200 bg-white"
                                    >
                                        {categories.filter(c => c !== "all").map(category => (
                                            <option key={category} value={category}>
                                                {category.charAt(0).toUpperCase() + category.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={loading || (!watch('text') && !imagePreview && !(pollQuestion && pollOptions.some(o => o.trim())))}
                                        className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 disabled:opacity-50 disabled:hover:from-green-500 disabled:hover:to-teal-500 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                <span>Posting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                <span>Share with Community</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div className="bg-white p-3 rounded-xl shadow-md">
                <h3 className="text-sm font-medium text-gray-500 mb-3 px-2">Filter by Category</h3>
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 ${selectedCategory === category
                                ? `bg-gradient-to-r ${categoryColors[category]} text-white shadow-md`
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            <span>{categoryIcons[category]}</span>
                            <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading && !posts.length ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-md">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-100 border-t-green-500"></div>
                    <p className="text-gray-500 mt-4">Loading nutrition posts...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Utensils size={24} className="text-green-500" />
                    </div>
                    <h3 className="text-gray-800 font-medium mb-2">No nutrition posts yet</h3>
                    <p className="text-gray-500">Be the first to share your healthy recipes and tips!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {posts.map((post) => (
                        <div key={post._id} className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-green-400 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">

                            <Link to={`/posts/${post._id}`}>
                                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-400 flex items-center justify-center text-white font-medium shadow-sm">
                                            {post.userFullName?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-800">{post.userFullName || 'Unknown User'}</div>
                                            <p className="text-xs text-gray-500">
                                                {formatPostDate(post.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </Link>


                            {post.category !== "all" && (
                                <div className="px-4 pb-2 pt-2">
                                    <span className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium bg-gradient-to-r ${categoryColors[post.category]} text-white rounded-full shadow-sm`}>
                                        {categoryIcons[post.category]}
                                        <span>{post.category.charAt(0).toUpperCase() + post.category.slice(1)}</span>
                                    </span>
                                </div>
                            )}

                            <Link to={`/posts/${post._id}`}>
                                {post.text && (
                                    <p className="px-4 py-3 text-gray-800 whitespace-pre-line leading-relaxed">
                                        {post.text}
                                    </p>
                                )}
                            </Link>


                            {post.images?.url && (
                                <Link to={`/posts/${post._id}`}>
                                    <div className="w-full overflow-hidden">
                                        <img
                                            src={post.images.url}
                                            alt="Nutrition Post"
                                            className="w-full object-cover max-h-[500px] hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                </Link>
                            )}


                            {post.poll.options.length > 0 && (
                                <div className="p-5 bg-gradient-to-br from-green-50 to-teal-50 border-t border-b border-green-100">
                                    <h3 className="font-semibold text-lg mb-4 text-green-800">{post.poll.question}</h3>
                                    <div className="space-y-3">
                                        {post.poll.options.map((option, index) => {
                                            const isSelected = post.poll.selectedOption === index;
                                            const percentage = option.percentage || 0;

                                            return (
                                                <div key={index} className="relative">
                                                    <button
                                                        onClick={() => handleVote(post._id, index)}
                                                        disabled={post.poll.expiresAt < new Date()}
                                                        className={`group w-full text-left relative z-10 px-4 py-3 rounded-lg border-2 transition-all duration-300 ${isSelected
                                                            ? "border-green-500 bg-green-50"
                                                            : "border-gray-200 hover:border-green-200 hover:bg-green-50/30"
                                                            }`}
                                                    >

                                                        {(post.poll.hasVoted || isSelected) && (
                                                            <div
                                                                className={`absolute top-0 left-0 h-full rounded-lg transition-all duration-500 ${isSelected ? "bg-green-100" : "bg-gray-100"
                                                                    }`}
                                                                style={{ width: `${percentage}%`, zIndex: -1 }}
                                                            />
                                                        )}

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${isSelected
                                                                    ? "border-green-500 bg-green-500"
                                                                    : "border-gray-300 group-hover:border-green-300"
                                                                    }`}>
                                                                    {isSelected && (
                                                                        <Check size={12} className="text-white" />
                                                                    )}
                                                                </div>
                                                                <span className={`font-medium ${isSelected ? "text-green-700" : "text-gray-700"
                                                                    }`}>
                                                                    {option.text}
                                                                </span>
                                                            </div>
                                                            {(post.poll.hasVoted || isSelected) && (
                                                                <span className={`text-sm font-semibold ${isSelected ? "text-green-600" : "text-gray-500"}`}>
                                                                    {percentage}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                                        <Users size={14} />
                                        <span>{post.poll.totalVotes || 0} votes</span>
                                        <span>•</span>
                                        <Clock size={14} />
                                        <span>
                                            {post.poll.expiresAt < new Date()
                                                ? "Poll ended"
                                                : `Ends in ${Math.ceil((post.poll.expiresAt - new Date()) / (1000 * 60 * 60 * 24))} days`}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {/* Scan Data Card */}
                            {post.scanData?.itemName && (
                                <div className="mx-4 mb-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                                            <Camera size={22} className="text-orange-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800">{post.scanData.itemName}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${post.scanData.verdict === 'healthy' ? 'bg-green-100 text-green-700' : post.scanData.verdict === 'unhealthy' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {post.scanData.verdict || 'N/A'}
                                                </span>
                                                {post.scanData.calories > 0 && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Flame size={12} /> {post.scanData.calories} kcal
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4 border-t border-gray-100">
                                <div className="flex items-center">
                                    <button
                                        onClick={() => handleLike(post._id)}
                                        className={`flex items-center space-x-1 mr-6 ${post.isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                                            } transition-colors duration-200`}
                                    >
                                        <Heart size={18} fill={post.isLiked ? "currentColor" : "none"} />
                                        <span className="text-sm">{post.likes || 0}</span>
                                    </button>
                                    <button
                                        onClick={() => setShowCommentBox(showCommentBox === post._id ? null : post._id)}
                                        className="flex items-center space-x-1 mr-6 text-gray-500 hover:text-blue-500 transition-colors duration-200"
                                    >
                                        <MessageSquare size={18} />
                                        <span className="text-sm">{post.comments?.length || 0}</span>
                                    </button>
                                    <button
                                        onClick={() => handleShare(post._id)}
                                        className="flex items-center space-x-1 mr-6 text-gray-500 hover:text-green-500 transition-colors duration-200"
                                    >
                                        <Share2 size={18} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => toggleBookmark(post._id)}
                                    className={`transition-colors duration-200 ${bookmarkedPosts.includes(post._id) ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
                                    title={bookmarkedPosts.includes(post._id) ? 'Remove bookmark' : 'Save for later'}
                                >
                                    {bookmarkedPosts.includes(post._id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                                </button>
                            </div>


                            {showCommentBox === post._id && (
                                <div className="p-4 bg-gray-50 border-t border-gray-100">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-teal-400 flex items-center justify-center text-white font-medium shadow-sm text-xs">
                                            {fullname?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <textarea
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                placeholder="Add a comment..."
                                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400"
                                                rows={2}
                                            />
                                            <div className="flex justify-end mt-2">
                                                <button
                                                    onClick={() => handleAddComment(post._id)}
                                                    disabled={!commentText.trim()}
                                                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-1 rounded-full text-sm transition-colors duration-200 flex items-center space-x-1"
                                                >
                                                    <Send size={14} />
                                                    <span>Comment</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>


                                    {post.comments && post.comments.length > 0 && (
                                        <div className="mt-4 space-y-4">
                                            {post.comments.map((comment) => (
                                                <div key={comment._id} className="relative pl-8 pt-2">
                                                    <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center justify-center text-white text-xs shadow-sm">
                                                        {comment.userFullName?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-medium text-sm text-gray-800">
                                                                {comment.userFullName || 'Unknown User'}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {formatPostDate(comment.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700 text-sm">{comment.text}</p>
                                                        <div className="flex items-center mt-2 space-x-4 text-xs">
                                                            <button
                                                                className="text-gray-500 hover:text-blue-500 transition-colors duration-200 flex items-center space-x-1"
                                                                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                                                            >
                                                                <MessageSquare size={12} />
                                                                <span>Reply</span>
                                                            </button>

                                                        </div>


                                                        {replyingTo === comment._id && (
                                                            <div className="mt-3 pl-4 border-l-2 border-gray-200">
                                                                <div className="flex items-start space-x-2">
                                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-green-400 to-teal-400 flex items-center justify-center text-white text-xs shadow-sm">
                                                                        {fullname?.[0]?.toUpperCase() || 'U'}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <textarea
                                                                            value={replyText}
                                                                            onChange={(e) => setReplyText(e.target.value)}
                                                                            placeholder="Write a reply..."
                                                                            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400"
                                                                            rows={1}
                                                                        />
                                                                        <div className="flex justify-end mt-2">
                                                                            <button
                                                                                onClick={() => handleAddReply(comment._id)}
                                                                                disabled={!replyText.trim()}
                                                                                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1 rounded-full text-xs transition-colors duration-200 flex items-center space-x-1"
                                                                            >
                                                                                <Send size={10} />
                                                                                <span>Reply</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}


                                                        {comment.replies && comment.replies.length > 0 && (
                                                            <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-3">
                                                                {comment.replies.map((reply) => (
                                                                    <div key={reply._id} className="relative pl-6">
                                                                        <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 flex items-center justify-center text-white text-[10px] shadow-sm">
                                                                            {reply.userFullName?.[0]?.toUpperCase() || 'U'}
                                                                        </div>
                                                                        <div className="bg-gray-50 rounded-lg p-2 shadow-sm">
                                                                            <div className="flex justify-between items-center mb-1">
                                                                                <span className="font-medium text-xs text-gray-800">
                                                                                    {reply.userFullName || 'Unknown User'}
                                                                                </span>
                                                                                <span className="text-[10px] text-gray-500">
                                                                                    {formatPostDate(reply.createdAt)}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-gray-700 text-xs">{reply.text}</p>

                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <SharePopup
                isOpen={showSharePopup}
                onClose={() => setShowSharePopup(false)}
                onCopy={handleCopyLink}
            />
        </div>
    );
};

const SharePopup = ({ isOpen, onClose, onCopy }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 relative">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <X size={20} />
                </button>

                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Share Post
                </h3>

                <button
                    onClick={onCopy}
                    className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg transition-colors duration-200"
                >
                    <Copy size={18} />
                    <span>Copy Link</span>
                </button>
            </div>
        </div>
    );
};
export default Post;