// js/data/RiskResolver.js
import { CONFIG } from '../config.js';

const RISK_PRIORITY = { low: 1, medium: 2, high: 3 };

export class RiskResolver {
    static resolveLevelRisk(activities) {
        if (!activities || activities.length === 0) return 'low';

        let maxRisk = 'low';
        for (const activity of activities) {
            if (RISK_PRIORITY[activity.risk] > RISK_PRIORITY[maxRisk]) {
                maxRisk = activity.risk;
            }
            if (maxRisk === 'high') break; // Early exit
        }
        return maxRisk;
    }

    static getRiskColor(risk) {
        const colorMap = {
            high: CONFIG.COLORS.HIGH,
            medium: CONFIG.COLORS.MEDIUM,
            low: CONFIG.COLORS.LOW
        };
        return colorMap[risk] || colorMap.low;
    }

    static getRiskColorCSS(risk) {
        const colorMap = {
            high: '#F44336',
            medium: '#FFC107',
            low: '#4CAF50'
        };
        return colorMap[risk] || colorMap.low;
    }
}
