// js/ui/TimelinePanel.js

/**
 * Timeline panel for historical playback and time navigation.
 * Provides scrubbing, playback controls, and event markers.
 */
export class TimelinePanel {
    constructor(container, stateManager, apiClient) {
        this.container = container;
        this.stateManager = stateManager;
        this.apiClient = apiClient;

        // Timeline range (24 hours by default)
        this.rangeHours = 24;
        this.rangeStart = new Date(Date.now() - this.rangeHours * 60 * 60 * 1000);
        this.rangeEnd = new Date();

        // Events for markers
        this.events = [];

        // DOM elements
        this.elements = {};

        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
        this.loadEvents();

        // Listen to state manager events
        this.stateManager.addEventListener('modeChanged', (e) => this.onModeChanged(e.detail));
        this.stateManager.addEventListener('stateChanged', (e) => this.onStateChanged(e.detail));
        this.stateManager.addEventListener('playbackChanged', (e) => this.onPlaybackChanged(e.detail));
    }

    render() {
        this.container.innerHTML = `
            <div class="timeline-panel">
                <div class="timeline-controls">
                    <button class="timeline-btn live-btn active" data-action="live">
                        <span class="live-indicator"></span>
                        LIVE
                    </button>
                    <button class="timeline-btn" data-action="play">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <button class="timeline-btn" data-action="pause" style="display:none">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                    </button>
                    <select class="speed-select">
                        <option value="1">1x</option>
                        <option value="2">2x</option>
                        <option value="5">5x</option>
                        <option value="10">10x</option>
                    </select>
                    <span class="time-display">--:--</span>
                </div>
                <div class="timeline-track-container">
                    <div class="timeline-track">
                        <div class="timeline-progress"></div>
                        <div class="timeline-markers"></div>
                        <input type="range" class="timeline-scrubber" min="0" max="1000" value="1000">
                    </div>
                    <div class="timeline-labels">
                        <span class="timeline-label start"></span>
                        <span class="timeline-label end"></span>
                    </div>
                </div>
            </div>
        `;

        // Cache element references
        this.elements = {
            liveBtn: this.container.querySelector('[data-action="live"]'),
            playBtn: this.container.querySelector('[data-action="play"]'),
            pauseBtn: this.container.querySelector('[data-action="pause"]'),
            speedSelect: this.container.querySelector('.speed-select'),
            timeDisplay: this.container.querySelector('.time-display'),
            scrubber: this.container.querySelector('.timeline-scrubber'),
            progress: this.container.querySelector('.timeline-progress'),
            markers: this.container.querySelector('.timeline-markers'),
            startLabel: this.container.querySelector('.timeline-label.start'),
            endLabel: this.container.querySelector('.timeline-label.end'),
        };

        this.updateLabels();
        this.updateTimeDisplay();
    }

    bindEvents() {
        // Live button
        this.elements.liveBtn.addEventListener('click', () => {
            this.stateManager.goLive();
        });

        // Play button
        this.elements.playBtn.addEventListener('click', () => {
            const speed = parseInt(this.elements.speedSelect.value, 10);
            if (this.stateManager.getIsLive()) {
                // Start from 1 hour ago if in live mode
                const startTime = new Date(Date.now() - 60 * 60 * 1000);
                this.stateManager.setViewTime(startTime).then(() => {
                    this.stateManager.startPlayback(speed);
                });
            } else {
                this.stateManager.startPlayback(speed);
            }
        });

        // Pause button
        this.elements.pauseBtn.addEventListener('click', () => {
            this.stateManager.pausePlayback();
        });

        // Speed selector
        this.elements.speedSelect.addEventListener('change', () => {
            if (this.stateManager.isPlaying) {
                const speed = parseInt(this.elements.speedSelect.value, 10);
                this.stateManager.startPlayback(speed);
            }
        });

        // Scrubber
        this.elements.scrubber.addEventListener('input', (e) => {
            const value = parseInt(e.target.value, 10);
            const timestamp = this.valueToTimestamp(value);
            this.updateProgressFromValue(value);
            this.updateTimeDisplay(timestamp);
        });

        this.elements.scrubber.addEventListener('change', (e) => {
            const value = parseInt(e.target.value, 10);
            const timestamp = this.valueToTimestamp(value);

            // If at the end (within 1%), go live
            if (value >= 990) {
                this.stateManager.goLive();
            } else {
                this.stateManager.setViewTime(timestamp);
            }
        });
    }

    async loadEvents() {
        try {
            const response = await this.apiClient.getEvents({
                from: this.rangeStart,
                to: this.rangeEnd,
            });
            this.events = response.events || [];
            this.renderMarkers();
        } catch (error) {
            console.warn('Failed to load events for timeline:', error);
        }
    }

    renderMarkers() {
        this.elements.markers.innerHTML = '';

        for (const event of this.events) {
            const timestamp = new Date(event.timestamp);
            const position = this.timestampToPercent(timestamp);

            if (position < 0 || position > 100) continue;

            const marker = document.createElement('div');
            marker.className = `timeline-marker severity-${event.severity}`;
            marker.style.left = `${position}%`;
            marker.title = `${event.eventType} (${this.formatTime(timestamp)})`;

            marker.addEventListener('click', () => {
                this.stateManager.setViewTime(timestamp);
            });

            this.elements.markers.appendChild(marker);
        }
    }

    updateLabels() {
        this.elements.startLabel.textContent = this.formatDateTime(this.rangeStart);
        this.elements.endLabel.textContent = this.formatDateTime(this.rangeEnd);
    }

    updateTimeDisplay(timestamp = null) {
        const time = timestamp || this.stateManager.getViewingTimestamp() || new Date();
        this.elements.timeDisplay.textContent = this.formatTime(time);
    }

    updateProgress() {
        const timestamp = this.stateManager.getViewingTimestamp();
        if (!timestamp) {
            this.elements.progress.style.width = '100%';
            this.elements.scrubber.value = 1000;
            return;
        }

        const percent = this.timestampToPercent(timestamp);
        this.elements.progress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        this.elements.scrubber.value = Math.round(percent * 10);
    }

    updateProgressFromValue(value) {
        const percent = value / 10;
        this.elements.progress.style.width = `${percent}%`;
    }

    // Event handlers
    onModeChanged(detail) {
        const { isLive } = detail;

        if (isLive) {
            this.elements.liveBtn.classList.add('active');
            this.elements.scrubber.value = 1000;
            this.elements.progress.style.width = '100%';
        } else {
            this.elements.liveBtn.classList.remove('active');
        }

        this.updateProgress();
    }

    onStateChanged(detail) {
        this.updateTimeDisplay(detail.timestamp);
        this.updateProgress();

        // Update range end to now
        this.rangeEnd = new Date();
        this.updateLabels();
    }

    onPlaybackChanged(detail) {
        const { isPlaying } = detail;

        if (isPlaying) {
            this.elements.playBtn.style.display = 'none';
            this.elements.pauseBtn.style.display = '';
        } else {
            this.elements.playBtn.style.display = '';
            this.elements.pauseBtn.style.display = 'none';
        }
    }

    // Utility functions
    timestampToPercent(timestamp) {
        const total = this.rangeEnd.getTime() - this.rangeStart.getTime();
        const elapsed = timestamp.getTime() - this.rangeStart.getTime();
        return (elapsed / total) * 100;
    }

    valueToTimestamp(value) {
        const percent = value / 1000;
        const total = this.rangeEnd.getTime() - this.rangeStart.getTime();
        return new Date(this.rangeStart.getTime() + total * percent);
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    }

    formatDateTime(date) {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    }

    /**
     * Set a new time range for the timeline.
     * @param {number} hours - Number of hours to show
     */
    setRange(hours) {
        this.rangeHours = hours;
        this.rangeStart = new Date(Date.now() - hours * 60 * 60 * 1000);
        this.rangeEnd = new Date();
        this.updateLabels();
        this.loadEvents();
        this.updateProgress();
    }

    dispose() {
        this.container.innerHTML = '';
    }
}
