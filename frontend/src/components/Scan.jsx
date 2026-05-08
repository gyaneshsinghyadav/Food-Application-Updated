import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import NutritionCard from './NutritionCard';
import AlternativesSection from './AlternativesSection';
import CameraCapture from './CameraCapture';
import axios from 'axios';
import {
  Camera, Upload, Scan as ScanIcon, Loader2, AlertTriangle,
  Sparkles, Pill, Droplet, ShoppingBag, Coffee, Utensils, Ban, Share2
} from 'lucide-react';
import { useHealthProfileStore } from "../store/useUserInformationStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// ─── Category metadata ─────────────────────────────────────────────────────
const CATEGORY_META = {
  food: {
    label: 'Food',
    icon: Utensils,
    color: 'emerald',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
  },
  beverage: {
    label: 'Beverage',
    icon: Coffee,
    color: 'blue',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
  },
  medicine: {
    label: 'Medicine / Supplement',
    icon: Pill,
    color: 'violet',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
  },
  skincare: {
    label: 'Skincare / Cosmetic',
    icon: Droplet,
    color: 'pink',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    text: 'text-pink-400',
  },
  packaged_food: {
    label: 'Packaged Food',
    icon: ShoppingBag,
    color: 'amber',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
  },
};

// ─── Graceful rejection card ───────────────────────────────────────────────
function RejectionCard({ message, suggestion }) {
  return (
    <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6 animate-fadeInUp text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Ban className="w-8 h-8 text-orange-400" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-orange-300 mb-2">Item Not Supported</h3>
      <p className="text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-line">
        {message || "😊 This doesn't look like something I can analyse! EatiT works best with food, beverages, medicines, and skincare products."}
      </p>
      {suggestion && (
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-slate-400 text-left">
          <span className="text-slate-300 font-medium">💡 Try scanning: </span>
          {suggestion}
        </div>
      )}
    </div>
  );
}

// ─── Category badge ────────────────────────────────────────────────────────
function CategoryBadge({ category }) {
  const meta = CATEGORY_META[category];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.border} border ${meta.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

// ─── Main Scan page ────────────────────────────────────────────────────────
function Scan() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { profile } = useHealthProfileStore();
  const navigate = useNavigate();

  const handleShareToCommunity = async () => {
    if (!file || !result?.analysis) {
      toast.error('No scan result to share.');
      return;
    }

    if (!profile?.fullName) {
      toast.error('Please complete your profile to share to the community.');
      navigate('/profile');
      return;
    }

    setSharing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const productName = result.analysis.product || 'an item';
      const verdict = result.analysis.verdict || 'interesting';
      const categoryLabel = CATEGORY_META[category]?.label || category || 'food';

      const postText = `I just scanned ${productName} (${categoryLabel}) with EatiT!\n\nThe AI verdict is: ${verdict.replace(/_/g, ' ')}\n\nHas anyone else tried this?`;

      formData.append('text', postText);
      formData.append('category', 'nutrition');
      formData.append('userFullName', profile.fullName);

      await axios.post(
        `${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/posts`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      toast.success('Successfully shared to the Community Feed!');
      navigate('/posts');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to share to community');
    } finally {
      setSharing(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleCapture = (imageBlob) => {
    if (!imageBlob) { setError('Failed to capture image.'); return; }
    const capturedFile = new File([imageBlob], 'camera-capture.jpg', { type: 'image/jpeg', lastModified: Date.now() });
    setFile(capturedFile);
    setPreview(URL.createObjectURL(imageBlob));
    setCameraActive(false);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select or capture an image.'); return; }
    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    setError(null);
    setResult(null);

    // Simulate progress steps for UX
    const steps = [
      'Classifying image...',
      'Checking for nutrition label...',
      'Identifying item...',
      'Running deep analysis...',
      'Fetching alternatives...',
    ];
    let stepIdx = 0;
    setLoadingStep(steps[0]);
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setLoadingStep(steps[stepIdx]);
    }, 3500);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/identify`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      const data = response.data;
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred while processing the request.');
    } finally {
      clearInterval(stepTimer);
      setLoadingStep('');
      setLoading(false);
    }
  };

  const [hasCamera, setHasCamera] = useState(true);
  React.useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) setHasCamera(false);
  }, []);

  const category = result?.category || result?.analysis?.category;
  const catMeta = CATEGORY_META[category];

  return (
    <div className="min-h-screen pt-4 pb-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-6 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
            <ScanIcon className="w-3.5 h-3.5" />
            AI Vision Analysis
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="text-emerald-400">Smart</span>{' '}
            <span className="text-amber-400">Scanner</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Scan food, beverages, medicines & skincare — get instant health insights
          </p>

          {/* Category legend */}
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {Object.values(CATEGORY_META).map((m) => {
              const Icon = m.icon;
              return (
                <span key={m.label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ${m.bg} ${m.border} border ${m.text}`}>
                  <Icon className="w-3 h-3" /> {m.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Scan Card ── */}
        <div className="rounded-2xl border border-white/5 bg-white/3 backdrop-blur-sm overflow-hidden mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="p-5 md:p-7">
            {cameraActive ? (
              <CameraCapture onCapture={handleCapture} onCancel={() => setCameraActive(false)} />
            ) : (
              <div className="space-y-4">
                {/* Button row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hasCamera && (
                    <button
                      onClick={() => setCameraActive(true)}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Camera className="w-5 h-5" />
                      Take Photo
                    </button>
                  )}
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium border border-white/10 hover:border-white/20 cursor-pointer transition-all"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Image
                  </label>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-upload" />
                </div>

                {/* Drop zone */}
                {!preview && (
                  <label htmlFor="file-upload" className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/30 bg-white/2 cursor-pointer transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7 text-emerald-400" />
                    </div>
                    <span className="text-slate-400 text-sm">Drag & drop or click to upload</span>
                    <span className="text-slate-600 text-xs mt-1">PNG, JPG, WEBP up to 10MB</span>
                  </label>
                )}

                {/* Preview */}
                {preview && (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30">
                    <img src={preview} alt="Preview" className="w-full max-h-72 object-contain" />
                    <button
                      onClick={() => { setFile(null); setPreview(null); setResult(null); setError(null); }}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 text-white/70 hover:text-white text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Analyze button */}
                {preview && (
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all ${
                      loading
                        ? 'bg-slate-700 text-slate-400 cursor-wait'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{loadingStep || 'Analyzing...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Analyze Image
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6 animate-fadeInUp">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* ── Results ── */}
        {result && !error && (
          <div className="space-y-5 animate-fadeInUp">

            {/* Rejected / not supported */}
            {result.rejected && (
              <RejectionCard message={result.userMessage} suggestion={result.suggestion} />
            )}

            {/* Clarity warning (couldn't identify) */}
            {!result.rejected && !result.analysis && result.userMessage && (
              <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">{result.userMessage}</p>
              </div>
            )}

            {/* Valid result */}
            {result.analysis && (
              <>
                {/* Product header with category badge */}
                <div className="rounded-2xl border border-white/5 bg-white/3 backdrop-blur-sm p-5 md:p-7">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <CategoryBadge category={category} />
                    {result.analysis.processingLevel && (
                      <span className="text-xs text-slate-500 font-medium">{result.analysis.processingLevel}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{result.analysis.product || 'Identified Item'}</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">{result.analysis.productDescription}</p>

                  {/* Medicine disclaimer */}
                  {category === 'medicine' && result.analysis.doctorAdvice && (
                    <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs">
                      <Pill className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{result.analysis.doctorAdvice}</span>
                    </div>
                  )}

                  {/* Skincare application tip */}
                  {category === 'skincare' && result.analysis.applicationTips && (
                    <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs">
                      <Droplet className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{result.analysis.applicationTips}</span>
                    </div>
                  )}

                  {/* Skincare skin types */}
                  {category === 'skincare' && Array.isArray(result.analysis.suitableForSkinTypes) && result.analysis.suitableForSkinTypes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-slate-500 font-medium self-center">Suitable for:</span>
                      {result.analysis.suitableForSkinTypes.map((s, i) => {
                        const text = typeof s === 'object' && s !== null ? s.name || s.type || Object.values(s)[0] : s;
                        return (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300">
                            {text}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Medicine active ingredients */}
                  {category === 'medicine' && Array.isArray(result.analysis.activeIngredients) && result.analysis.activeIngredients.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs text-slate-500 font-medium block mb-1.5">Active Ingredients:</span>
                      <div className="flex flex-wrap gap-2">
                        {result.analysis.activeIngredients.map((ing, i) => {
                          const text = typeof ing === 'object' && ing !== null ? ing.name || Object.values(ing)[0] : ing;
                          return (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                              {text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Packaged food — allergens + additives */}
                  {category === 'packaged_food' && (
                    <>
                      {Array.isArray(result.analysis.allergens) && result.analysis.allergens.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs text-red-400 font-semibold block mb-1.5">⚠ Allergens:</span>
                          <div className="flex flex-wrap gap-2">
                            {result.analysis.allergens.map((a, i) => {
                              const text = typeof a === 'object' && a !== null ? a.name || Object.values(a)[0] : a;
                              return (
                                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                                  {text}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {Array.isArray(result.analysis.additives) && result.analysis.additives.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs text-amber-400 font-semibold block mb-1.5">Additives / Preservatives:</span>
                          <div className="flex flex-wrap gap-2">
                            {result.analysis.additives.map((a, i) => {
                              const text = typeof a === 'object' && a !== null ? a.name || Object.values(a)[0] : a;
                              return (
                                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                                  {text}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Nutrition / Analysis card */}
                <NutritionCard info={result.analysis} category={category} />

                {/* Raw label text (packaged food) */}
                {result.rawLabelText && (
                  <details className="rounded-xl border border-white/5 bg-white/3 backdrop-blur-sm p-4 text-sm text-slate-500 cursor-pointer">
                    <summary className="text-slate-400 font-medium hover:text-slate-300 transition-colors">📋 Raw Label Text (OCR)</summary>
                    <pre className="mt-3 text-xs text-slate-500 whitespace-pre-wrap font-mono bg-black/20 rounded-lg p-3 max-h-48 overflow-y-auto">
                      {result.rawLabelText}
                    </pre>
                  </details>
                )}

                {/* Alternatives (only for food/beverage/packaged) */}
                {['food', 'beverage', 'packaged_food'].includes(category) && Array.isArray(result.analysis.alternatives) && result.analysis.alternatives.length > 0 && (
                  <AlternativesSection
                    data={{
                      alternatives: result.analysis.alternatives,
                      amazonProducts: result.analysis.amazonProducts || [],
                      youtubeRecipes: result.analysis.youtubeRecipes || [],
                    }}
                    label={result.analysis.product || 'item'}
                  />
                )}

                {/* Alternatives for medicine/skincare (text-only, no recipes) */}
                {['medicine', 'skincare'].includes(category) && Array.isArray(result.analysis.alternatives) && result.analysis.alternatives.length > 0 && (
                  <div className="rounded-2xl border border-white/5 bg-white/3 backdrop-blur-sm p-5">
                    <h3 className="text-base font-semibold text-white mb-3">
                      {category === 'medicine' ? '💊 Alternative Options' : '🌿 Natural Alternatives'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.analysis.alternatives.map((alt, i) => {
                        const text = typeof alt === 'object' && alt !== null ? alt.name || alt.product || alt.description || Object.values(alt)[0] : alt;
                        return (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300">
                            <span className="text-emerald-400">→</span> {text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Share to Community Button */}
                <div className="mt-6 flex justify-center animate-fadeInUp">
                  <button
                    onClick={handleShareToCommunity}
                    disabled={sharing}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg text-white ${
                      sharing
                        ? 'bg-emerald-600/50 cursor-wait'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/25'
                    }`}
                  >
                    {sharing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sharing...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" />
                        Share Scan to Community
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Scan Tips ── */}
        <div className="mt-6 rounded-xl p-4 bg-blue-500/5 border border-blue-500/10 text-sm text-blue-300/80 animate-fadeInUp" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <h3 className="font-medium mb-2 text-blue-400">💡 Scan Tips</h3>
          <ul className="space-y-1 text-xs text-slate-500">
            <li>• Supports food, beverages, medicines, and skincare items</li>
            <li>• Take clear, well-lit photos — face the item directly</li>
            <li>• For packaged goods, scan the nutrition label for precise data</li>
            <li>• Non-edible / off-topic items will be flagged gracefully</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default Scan;
