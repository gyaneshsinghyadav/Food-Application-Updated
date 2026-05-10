import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Flame, Dumbbell, Droplets, Wheat, Pill, Leaf, ShieldCheck, Users, Ban } from 'lucide-react';

// ─── Verdict config — covers food, medicine, skincare ─────────────────────
const verdictStyles = {
  healthy: {
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400',
    icon: CheckCircle, label: 'Healthy — Recommended ✓',
  },
  neutral: {
    bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400',
    icon: AlertTriangle, label: 'Neutral — Moderate consumption',
  },
  unhealthy: {
    bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400',
    icon: XCircle, label: 'Unhealthy — Consume with caution',
  },
  consult_doctor: {
    bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400',
    icon: Pill, label: 'Consult a doctor before use',
  },
  beneficial: {
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400',
    icon: ShieldCheck, label: 'Beneficial — Recommended use',
  },
  use_with_caution: {
    bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400',
    icon: AlertTriangle, label: 'Use with caution — Patch test first',
  },
  patch_test_required: {
    bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400',
    icon: AlertTriangle, label: 'Patch test required before use',
  },
};

const verdictFallback = verdictStyles.neutral;

// ─── Nutrient tile config ──────────────────────────────────────────────────
const nutrientConfig = [
  { key: 'calories',   label: 'Calories',  icon: Flame,    color: 'amber',   unit: 'kcal' },
  { key: 'protein_g',  label: 'Protein',   icon: Dumbbell, color: 'emerald', unit: 'g' },
  { key: 'fat_g',      label: 'Fat',       icon: Droplets, color: 'rose',    unit: 'g' },
  { key: 'carbs_g',    label: 'Carbs',     icon: Wheat,    color: 'blue',    unit: 'g' },
  { key: 'fibre_g',    label: 'Fibre',     icon: Leaf,     color: 'green',   unit: 'g' },
  { key: 'sugar_g',    label: 'Sugar',     icon: Flame,    color: 'pink',    unit: 'g' },
  { key: 'sodium_mg',  label: 'Sodium',    icon: Droplets, color: 'orange',  unit: 'mg' },
];

const colorMap = {
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   icon: 'text-amber-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-400' },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-400',    icon: 'text-rose-400' },
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    icon: 'text-blue-400' },
  green:   { bg: 'bg-green-500/10',   border: 'border-green-500/20',   text: 'text-green-400',   icon: 'text-green-400' },
  pink:    { bg: 'bg-pink-500/10',    border: 'border-pink-500/20',    text: 'text-pink-400',    icon: 'text-pink-400' },
  orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  text: 'text-orange-400',  icon: 'text-orange-400' },
};

// ─── Section list renderer ─────────────────────────────────────────────────
function BulletList({ title, items, bulletColor = 'text-emerald-500', icon: Icon }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="mb-5">
      <h3 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${bulletColor}`}>
        {Icon && <Icon className="w-4 h-4" />}
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => {
          const text = typeof item === 'object' && item !== null ? item.name || item.description || Object.values(item)[0] : item;
          return (
            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
              <span className={`${bulletColor} mt-1`}>•</span> {text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Tag row renderer ──────────────────────────────────────────────────────
function TagRow({ title, tags, tagStyle }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className="text-xs text-slate-500 font-semibold mb-1.5">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => {
          const text = typeof t === 'object' && t !== null ? t.name || t.type || Object.values(t)[0] : t;
          return (
            <span key={i} className={`text-xs px-2.5 py-1 rounded-full ${tagStyle}`}>{text}</span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Safe text extractor (AI may return string OR object) ──────────────────
function toDisplayString(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    // e.g. {name: "X", description: "Y"} → "X — Y"
    const parts = Object.values(val).filter(v => typeof v === 'string' && v.length > 0);
    return parts.join(' — ') || JSON.stringify(val);
  }
  return String(val);
}

// ─── Main NutritionCard ────────────────────────────────────────────────────
const NutritionCard = ({ info, category }) => {
  if (!info) return null;

  const verdict = info.verdict;
  const verdictStyle = verdictStyles[verdict] || verdictFallback;

  // Filter nutrient config to only show values present in the data
  const visibleNutrients = category === 'medicine' || category === 'skincare'
    ? [] // Don't show nutrient tiles for non-food
    : nutrientConfig.filter(n => info.basicNutrients?.[n.key] !== undefined && info.basicNutrients?.[n.key] !== 0);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/3 backdrop-blur-sm p-5 md:p-7 mb-5 animate-fadeInUp">
      <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
        <Flame className="w-5 h-5 text-amber-400" />
        {category === 'medicine' ? 'Pharmaceutical Analysis' :
         category === 'skincare' ? 'Skincare Analysis' :
         'Nutritional Information'}
      </h2>

      {info.error ? (
        <div className="text-red-400 font-medium">{info.error}</div>
      ) : (
        <>
          {/* ── Nutrient Grid (food/beverage/packaged only) ── */}
          {visibleNutrients.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {visibleNutrients.map(({ key, label, icon: Icon, color, unit }) => {
                const value = info.basicNutrients[key];
                const styles = colorMap[color];
                return (
                  <div key={key} className={`${styles.bg} border ${styles.border} rounded-xl p-4 text-center transition-all hover:scale-[1.02]`}>
                    <Icon className={`w-5 h-5 ${styles.icon} mx-auto mb-2`} />
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className={`text-xs font-medium ${styles.text} mt-0.5`}>{label}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{unit}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── How to use ─────────────────────────────────── */}
          {info.basicUse && (
            <div className="mb-5 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs font-semibold text-slate-400 block mb-1">📖 How to Use</span>
              <p className="text-sm text-slate-300 leading-relaxed">{info.basicUse}</p>
            </div>
          )}

          {/* ── Vitamins & Minerals (food) ──────────────────── */}
          {info.vitaminsAndMinerals?.length > 0 && (
            <TagRow
              title="Vitamins & Minerals"
              tags={info.vitaminsAndMinerals}
              tagStyle="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
            />
          )}

          {/* ── Key ingredients (skincare) ──────────────────── */}
          {info.keyIngredients?.length > 0 && (
            <TagRow
              title="Key Active Ingredients"
              tags={info.keyIngredients}
              tagStyle="bg-pink-500/10 border border-pink-500/20 text-pink-300"
            />
          )}

          {/* ── Uses ───────────────────────────────────────── */}
          {info.uses?.length > 0 && (
            <BulletList
              title="Uses"
              items={info.uses}
              bulletColor="text-blue-400"
              icon={ShieldCheck}
            />
          )}

          {/* ── Positives ──────────────────────────────────── */}
          <BulletList
            title={category === 'medicine' ? 'Therapeutic Benefits' : category === 'skincare' ? 'Skin Benefits' : 'Health Benefits'}
            items={info.positives}
            bulletColor="text-emerald-500"
            icon={CheckCircle}
          />

          {/* ── Negatives ──────────────────────────────────── */}
          <BulletList
            title={category === 'medicine' ? 'Side Effects & Contraindications' : category === 'skincare' ? 'Cautions & Irritants' : 'Health Concerns'}
            items={info.negatives}
            bulletColor="text-red-400"
            icon={XCircle}
          />

          {/* ── Recommended for ────────────────────────────── */}
          {info.recommendedFor?.length > 0 && (
            <TagRow
              title="✅ Recommended For"
              tags={info.recommendedFor}
              tagStyle="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
            />
          )}

          {/* ── Avoid for ──────────────────────────────────── */}
          {info.avoidFor?.length > 0 && (
            <TagRow
              title="⚠ Avoid If"
              tags={info.avoidFor}
              tagStyle="bg-red-500/10 border border-red-500/20 text-red-300"
            />
          )}

          {/* ── Serving suggestion (food) ───────────────────── */}
          {info.servingSuggestion && (
            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs font-semibold text-slate-400 block mb-1">🍽 Serving Suggestion</span>
              <p className="text-sm text-slate-300">{toDisplayString(info.servingSuggestion)}</p>
            </div>
          )}

          {/* ── Storage (medicine) ─────────────────────────── */}
          {info.storageInstructions && (
            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs font-semibold text-slate-400 block mb-1">📦 Storage Instructions</span>
              <p className="text-sm text-slate-300">{info.storageInstructions}</p>
            </div>
          )}

          {/* ── Personal Health Warnings ────────────────── */}
          {info.personalWarnings?.length > 0 && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <h3 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                ⚠️ Personal Health Warnings
              </h3>
              <ul className="space-y-2">
                {info.personalWarnings.map((warning, i) => {
                  const text = typeof warning === 'object' && warning !== null ? warning.message || warning.warning || Object.values(warning)[0] : warning;
                  return (
                    <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">⚠</span> {text}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ── Ingredient Risks ─────────────────────────── */}
          {info.ingredientRisks?.length > 0 && (
            <div className="mb-5 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <h3 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5 text-orange-400">
                <XCircle className="w-4 h-4" />
                Ingredient Risk Analysis
              </h3>
              <div className="space-y-2">
                {info.ingredientRisks.map((risk, i) => {
                  if (typeof risk === 'object' && risk !== null) {
                    return (
                      <div key={i} className="text-sm bg-black/20 rounded-lg px-3 py-2">
                        <span className="text-orange-300 font-medium">{risk.ingredient || 'Unknown'}</span>
                        <span className="text-slate-500 mx-1.5">→</span>
                        <span className="text-slate-300">{risk.risk || ''}</span>
                        {risk.condition && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                            {risk.condition}
                          </span>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">•</span> {risk}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Homemade Version ──────────────────────────── */}
          {info.homemadeVersion && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-xs font-semibold text-emerald-400 block mb-1">🏠 Healthier Homemade Version</span>
              <p className="text-sm text-slate-300 leading-relaxed">{info.homemadeVersion}</p>
            </div>
          )}

          {/* ── Closest Healthy Alternative ───────────────── */}
          {info.closestHealthyAlternative && (
            <div className="mb-5 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <span className="text-xs font-semibold text-blue-400 block mb-1">💡 Healthier Alternative For You</span>
              <p className="text-sm text-slate-300 leading-relaxed">{toDisplayString(info.closestHealthyAlternative)}</p>
            </div>
          )}

          {/* ── Medical alternatives ────────────────────────── */}
          {info.medicalAlternatives?.length > 0 && (
            <BulletList
              title="Natural / Medical Alternatives"
              items={info.medicalAlternatives}
              bulletColor="text-violet-400"
              icon={Leaf}
            />
          )}

          {/* ── Verdict ────────────────────────────────────── */}
          {verdict && (
            <div className={`${verdictStyle.bg} border ${verdictStyle.border} rounded-xl p-4 flex items-center gap-3 mt-2`}>
              {React.createElement(verdictStyle.icon, {
                className: `w-5 h-5 ${verdictStyle.text} flex-shrink-0`,
              })}
              <div>
                <h3 className={`font-semibold text-sm ${verdictStyle.text}`}>Overall Assessment</h3>
                <p className="text-slate-300 text-xs mt-0.5">{verdictStyle.label}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NutritionCard;
