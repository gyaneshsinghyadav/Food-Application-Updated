import React from 'react';
import { useHealthProfileStore } from "../store/useUserInformationStore";
import { useNavigate } from "react-router-dom";
import { Camera, MessageCircle, Users, Sparkles, ArrowRight, Zap, Shield, Leaf } from 'lucide-react';

function Home() {
    const { profile } = useHealthProfileStore();
    const navigate = useNavigate();

    const features = [
      {
        icon: Camera,
        title: 'Scan Food',
        desc: 'Instant AI-powered nutrition analysis from any food photo',
        color: 'emerald',
        path: '/scan',
        gradient: 'from-emerald-500/20 to-teal-500/20',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        borderColor: 'hover:border-emerald-500/30',
      },
      {
        icon: MessageCircle,
        title: 'AI Chat',
        desc: 'Get personalized nutrition advice from your AI dietitian',
        color: 'blue',
        path: '/chat',
        gradient: 'from-blue-500/20 to-indigo-500/20',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        borderColor: 'hover:border-blue-500/30',
      },
      {
        icon: Users,
        title: 'Community',
        desc: 'Share healthy recipes and connect with fellow health enthusiasts',
        color: 'amber',
        path: '/posts',
        gradient: 'from-amber-500/20 to-orange-500/20',
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-400',
        borderColor: 'hover:border-amber-500/30',
      },
    ];

    const stats = [
      { icon: Zap, label: 'Local AI', value: 'Offline', desc: 'No cloud needed' },
      { icon: Shield, label: 'Privacy', value: '100%', desc: 'Data stays on device' },
      { icon: Leaf, label: 'Analysis', value: 'Instant', desc: 'Powered by Ollama' },
    ];

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <div className="relative pt-12 md:pt-20 pb-16 md:pb-32 px-4">
                {/* Background orbs */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-40 right-10 w-60 h-60 bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-6xl mx-auto relative">
                    <div className="text-center mb-12 md:mb-20 animate-fadeInUp">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
                            <Sparkles className="w-3.5 h-3.5" />
                            Powered by Local AI — No Cloud Required
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-8xl font-black mb-4 md:mb-6 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            <span className="text-emerald-400">Eat</span>
                            <span className="text-amber-400">iT</span>
                        </h1>
                        <p className="text-lg md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
                            Your AI-powered nutrition assistant.{' '}
                            <span className="text-slate-300">Scan food, get instant analysis, and make healthier choices.</span>
                        </p>

                        {profile?.fullName && (
                            <div className="mt-6 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Welcome back, <span className="font-semibold text-white">{profile.fullName}</span>
                            </div>
                        )}

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                            <button
                                onClick={() => navigate('/scan')}
                                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30"
                            >
                                <Camera className="w-5 h-5" />
                                Start Scanning
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => navigate('/chat')}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium border border-white/10 hover:border-white/20 transition-all"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Ask AI Nutritionist
                            </button>
                        </div>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16 stagger">
                        {features.map(({ icon: Icon, title, desc, path, gradient, iconBg, iconColor, borderColor }) => (
                            <div
                                key={title}
                                onClick={() => navigate(path)}
                                className={`group relative overflow-hidden rounded-2xl p-5 md:p-7 cursor-pointer
                                    bg-gradient-to-br ${gradient} backdrop-blur-sm
                                    border border-white/5 ${borderColor}
                                    transition-all duration-300 hover:translate-y-[-4px]
                                    animate-fadeInUp`}
                                style={{ opacity: 0 }}
                            >
                                {/* Hover glow */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/3 to-transparent" />

                                <div className="relative">
                                    <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
                                        <Icon className={`w-6 h-6 ${iconColor}`} />
                                    </div>
                                    <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
                                    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-emerald-400 transition-colors">
                                        Explore <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto mb-12">
                        {stats.map(({ icon: Icon, label, value, desc }) => (
                            <div key={label} className="text-center p-4 rounded-xl bg-white/3 border border-white/5">
                                <Icon className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                                <div className="text-xl md:text-2xl font-bold text-white">{value}</div>
                                <div className="text-xs text-slate-500 mt-1">{desc}</div>
                            </div>
                        ))}
                    </div>

                    {/* Health Stats Section */}
                    {profile && (
                        <div className="rounded-2xl p-5 md:p-8 bg-white/3 border border-white/5 max-w-4xl mx-auto animate-fadeInUp">
                            <h2 className="text-lg md:text-xl font-bold text-white mb-5 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-emerald-400" />
                                </div>
                                Your Health Profile
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {profile.heightCm && (
                                    <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/10 text-center">
                                        <p className="text-xs text-blue-400 font-medium mb-1">Height</p>
                                        <p className="text-xl font-bold text-white">{profile.heightCm}<span className="text-sm text-slate-400 ml-1">cm</span></p>
                                    </div>
                                )}
                                {profile.weightKg && (
                                    <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/10 text-center">
                                        <p className="text-xs text-emerald-400 font-medium mb-1">Weight</p>
                                        <p className="text-xl font-bold text-white">{profile.weightKg}<span className="text-sm text-slate-400 ml-1">kg</span></p>
                                    </div>
                                )}
                                {profile.healthGoal && (
                                    <div className="rounded-xl p-4 bg-purple-500/10 border border-purple-500/10 text-center">
                                        <p className="text-xs text-purple-400 font-medium mb-1">Goal</p>
                                        <p className="text-sm font-bold text-white truncate">{profile.healthGoal}</p>
                                    </div>
                                )}
                                {profile.dietPreference && (
                                    <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/10 text-center">
                                        <p className="text-xs text-amber-400 font-medium mb-1">Diet</p>
                                        <p className="text-sm font-bold text-white truncate">{profile.dietPreference}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Home;
