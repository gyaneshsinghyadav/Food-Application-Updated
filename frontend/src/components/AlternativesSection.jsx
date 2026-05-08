import React from 'react';
import { ShoppingBag, Play, ExternalLink } from 'lucide-react';

const AlternativesSection = ({ data, label }) => {
  const alternatives = Array.isArray(data?.alternatives) ? data.alternatives : [];
  const amazonProducts = Array.isArray(data?.amazonProducts) ? data.amazonProducts : [];
  const youtubeRecipes = Array.isArray(data?.youtubeRecipes) ? data.youtubeRecipes : [];
  if (!alternatives.length && !amazonProducts.length && !youtubeRecipes.length) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/3 backdrop-blur-sm p-5 md:p-7 mb-5 animate-fadeInUp">
      <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-purple-400" />
        </div>
        Healthier Alternatives
      </h2>

      {/* Alternative chips */}
      {alternatives.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-3">Try these healthier alternatives to <span className="text-white font-medium">{label}</span>:</p>
          <div className="flex flex-wrap gap-2">
            {alternatives.map((alt, index) => {
              const text = typeof alt === 'object' && alt !== null ? alt.name || alt.title || Object.values(alt)[0] : alt;
              return (
                <span key={index} className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition-colors">
                  {text}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Amazon Products */}
      {amazonProducts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            Recommended Products
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {amazonProducts.map((product, index) => (
              <a
                key={index}
                href={product.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex rounded-xl border border-white/5 bg-white/3 overflow-hidden hover:border-amber-500/20 hover:bg-white/5 transition-all group"
              >
                <div className="w-24 bg-white/5 flex-shrink-0">
                  <img src={product.image || "https://via.placeholder.com/150"} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-3 min-w-0">
                  <h4 className="font-medium text-xs text-slate-200 line-clamp-2 group-hover:text-white transition-colors">{product.name}</h4>
                  {product.price && (
                    <p className="text-amber-400 font-semibold text-sm mt-1">{product.price}</p>
                  )}
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                    View on Amazon <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* YouTube Recipes */}
      {youtubeRecipes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Play className="w-4 h-4 text-red-400" />
            Healthy Recipe Videos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {youtubeRecipes.map((video, index) => (
              <a
                key={index}
                href={video.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/5 bg-white/3 overflow-hidden hover:border-red-500/20 hover:bg-white/5 transition-all group"
              >
                <div className="relative">
                  <img src={video.thumbnail || "https://via.placeholder.com/320x180"} alt={video.title} className="w-full h-36 object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-xs text-slate-200 line-clamp-2 group-hover:text-white transition-colors">{video.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-1">{video.channelTitle}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlternativesSection;
