// js/config.js
export const CONFIG = {
    // Level geometry
    LEVEL_WIDTH: 400,
    LEVEL_HEIGHT: 20,
    LEVEL_DEPTH: 300,
    LEVEL_SPACING: 150,

    // Positioning
    ICON_OFFSET_Y: 25,
    LABEL_OFFSET_X: -220,

    // Camera - adjusted for 7 levels
    CAMERA_POSITION: [0, 200, 750],
    CAMERA_TARGET: [0, -450, 0],
    CAMERA_FOV: 60,
    CAMERA_NEAR: 1,
    CAMERA_FAR: 5000,

    // Risk colors (hex)
    COLORS: {
        HIGH: 0xF44336,
        MEDIUM: 0xFFC107,
        LOW: 0x4CAF50,
        BACKGROUND: 0x1a1a2e,
        BACKGROUND_LIGHT: 0xe8eaed,
        HOVER_EMISSIVE: 0x333333
    },

    // Interaction
    ISOLATION_FADE_OPACITY: 0.15,

    // Depth mapping - Newman Iron Operations (7 levels)
    DEPTHS: {
        1: 'Surface',
        2: '-75m',
        3: '-150m',
        4: '-225m',
        5: '-300m',
        6: '-375m',
        7: '-450m'
    }
};
