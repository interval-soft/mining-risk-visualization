// js/data/DataLoader.js
export class DataLoader {
    async load(url = 'data/mine-data.json') {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            this.validate(data);
            return data;
        } catch (error) {
            console.error('Failed to load mine data:', error);
            throw error;
        }
    }

    validate(data) {
        if (!data.timestamp) {
            throw new Error('Missing timestamp in data');
        }
        if (!Array.isArray(data.levels)) {
            throw new Error('Missing or invalid levels array');
        }

        data.levels.forEach((level, i) => {
            if (typeof level.level !== 'number') {
                throw new Error(`Level ${i}: missing level number`);
            }
            if (typeof level.name !== 'string') {
                throw new Error(`Level ${i}: missing name`);
            }
            if (!Array.isArray(level.activities)) {
                throw new Error(`Level ${i}: missing activities array`);
            }

            level.activities.forEach((activity, j) => {
                if (!['low', 'medium', 'high'].includes(activity.risk)) {
                    throw new Error(`Level ${i}, Activity ${j}: invalid risk value`);
                }
            });
        });
    }
}
