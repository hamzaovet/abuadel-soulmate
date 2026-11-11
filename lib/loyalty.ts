export interface LoyaltyConfig {
  isLoyaltyEnabled: boolean;
  pointsPerPoundSpent: number;
  poundValuePerPoint: number;
  loyaltyRewardThreshold: number;
  loyaltyRewardValue: number;
  loyaltyAppliesToAbuAdel: boolean;
  loyaltyAppliesToSoulmate: boolean;
  loyaltyMotivationalMsg: string;
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  isLoyaltyEnabled: true,
  pointsPerPoundSpent: 1,
  poundValuePerPoint: 0.1,
  loyaltyRewardThreshold: 3000,
  loyaltyRewardValue: 200,
  loyaltyAppliesToAbuAdel: true,
  loyaltyAppliesToSoulmate: true,
  loyaltyMotivationalMsg:
    "جمع نقط مع كل أوردر من حلواني أبو عادل وسول ميت كافيه — وعند وصولك للهدف هتاخد هدية فورية تختار بيها أي حاجة تحبها! 🎁✨",
};

export function extractLoyaltyConfig(settings?: any): LoyaltyConfig {
  if (!settings) return { ...DEFAULT_LOYALTY_CONFIG };
  return {
    isLoyaltyEnabled:
      typeof settings.isLoyaltyEnabled === "boolean"
        ? settings.isLoyaltyEnabled
        : DEFAULT_LOYALTY_CONFIG.isLoyaltyEnabled,
    pointsPerPoundSpent:
      Number(settings.pointsPerPoundSpent) > 0
        ? Number(settings.pointsPerPoundSpent)
        : DEFAULT_LOYALTY_CONFIG.pointsPerPoundSpent,
    poundValuePerPoint:
      Number(settings.poundValuePerPoint) > 0
        ? Number(settings.poundValuePerPoint)
        : DEFAULT_LOYALTY_CONFIG.poundValuePerPoint,
    loyaltyRewardThreshold:
      Number(settings.loyaltyRewardThreshold) > 0
        ? Number(settings.loyaltyRewardThreshold)
        : DEFAULT_LOYALTY_CONFIG.loyaltyRewardThreshold,
    loyaltyRewardValue:
      Number(settings.loyaltyRewardValue) > 0
        ? Number(settings.loyaltyRewardValue)
        : DEFAULT_LOYALTY_CONFIG.loyaltyRewardValue,
    loyaltyAppliesToAbuAdel:
      typeof settings.loyaltyAppliesToAbuAdel === "boolean"
        ? settings.loyaltyAppliesToAbuAdel
        : DEFAULT_LOYALTY_CONFIG.loyaltyAppliesToAbuAdel,
    loyaltyAppliesToSoulmate:
      typeof settings.loyaltyAppliesToSoulmate === "boolean"
        ? settings.loyaltyAppliesToSoulmate
        : DEFAULT_LOYALTY_CONFIG.loyaltyAppliesToSoulmate,
    loyaltyMotivationalMsg:
      settings.loyaltyMotivationalMsg || DEFAULT_LOYALTY_CONFIG.loyaltyMotivationalMsg,
  };
}

export function isLoyaltyActiveForOutlet(outletCode?: string | null, config?: LoyaltyConfig): boolean {
  const cfg = config || DEFAULT_LOYALTY_CONFIG;
  if (!cfg.isLoyaltyEnabled) return false;
  if (!outletCode) return cfg.loyaltyAppliesToAbuAdel || cfg.loyaltyAppliesToSoulmate;
  if (outletCode === "ABU_ADEL_PATISSERIE") return cfg.loyaltyAppliesToAbuAdel;
  if (outletCode === "SOULMATE_CAFE") return cfg.loyaltyAppliesToSoulmate;
  return true;
}

export function calculateEarnedPoints(
  storeSpendAmount: number,
  outletCode?: string | null,
  settings?: any
): number {
  const cfg = extractLoyaltyConfig(settings);
  if (!isLoyaltyActiveForOutlet(outletCode, cfg)) return 0;
  const net = Math.max(0, Number(storeSpendAmount) || 0);
  if (net <= 0) return 0;
  return Math.max(0, Math.floor(net * cfg.pointsPerPoundSpent));
}

export interface LoyaltyProgress {
  points: number;
  threshold: number;
  rewardValue: number;
  unlockedRewardsCount: number;
  unlockedRewardEgp: number;
  directValueEgp: number;
  cyclePoints: number;
  progressPct: number;
  pointsToNextReward: number;
  canRedeemMilestone: boolean;
  motivationalHeadline: string;
}

export function getLoyaltyProgress(currentPoints: number, settings?: any): LoyaltyProgress {
  const cfg = extractLoyaltyConfig(settings);
  const points = Math.max(0, Math.floor(Number(currentPoints) || 0));
  const threshold = Math.max(1, cfg.loyaltyRewardThreshold);
  const rewardValue = Math.max(1, cfg.loyaltyRewardValue);

  const unlockedRewardsCount = Math.floor(points / threshold);
  const unlockedRewardEgp = Number((unlockedRewardsCount * rewardValue).toFixed(2));
  const directValueEgp = Number((points * cfg.poundValuePerPoint).toFixed(2));

  const remainder = points % threshold;
  const cyclePoints = unlockedRewardsCount > 0 ? threshold : remainder;
  const progressPct =
    unlockedRewardsCount > 0 ? 100 : Math.min(100, Math.round((remainder / threshold) * 100));
  const pointsToNextReward = remainder === 0 && unlockedRewardsCount > 0 ? threshold : threshold - remainder;
  const canRedeemMilestone = unlockedRewardsCount >= 1;

  let motivationalHeadline = cfg.loyaltyMotivationalMsg;
  if (canRedeemMilestone) {
    motivationalHeadline = `🎉 مبروك يا بطل! رصيدك ${points.toLocaleString()} نقطة وعندك هدية بقيمة ${unlockedRewardEgp.toLocaleString()} ج.م جاهزة تاخد بيها أي حاجة من المحل!`;
  } else if (progressPct >= 80) {
    motivationalHeadline = `🔥 قربت جداً! جمعت ${points.toLocaleString()} من ${threshold.toLocaleString()} نقطة — فاضلك ${pointsToNextReward.toLocaleString()} نقطة بس على هدية ${rewardValue} ج.م!`;
  } else if (progressPct >= 45) {
    motivationalHeadline = `⭐ عاش يا بطل! معاك ${points.toLocaleString()} نقطة (${progressPct}%) — كمّل وهتكسب هدية بـ ${rewardValue} ج.م!`;
  } else if (points > 0) {
    motivationalHeadline = `✨ خطوة ممتازة! معاك ${points.toLocaleString()} نقطة — فاضلك ${pointsToNextReward.toLocaleString()} نقطة وتفتح هدية الـ ${rewardValue} ج.م!`;
  }

  return {
    points,
    threshold,
    rewardValue,
    unlockedRewardsCount,
    unlockedRewardEgp,
    directValueEgp,
    cyclePoints,
    progressPct,
    pointsToNextReward,
    canRedeemMilestone,
    motivationalHeadline,
  };
}
