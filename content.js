class YTMusicCrossfader {
    constructor() {
        this.crossfadeDuration = 10; // Total crossfade duration (in seconds)
        this.audioContext = null;
        this.currentTrack = null;
        this.isInitialized = false;
        this.isCrossfading = false;

        console.log('[Crossfader] Initializing...');
        this.setupCrossfader();
    }

    setupCrossfader() {
        document.addEventListener(
            'click',
            () => {
                if (!this.isInitialized) {
                    this.initializeAudio();
                }
            },
            { once: true }
        );
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            const videoElement = document.querySelector('video');
            if (!videoElement) throw new Error('No video element found');

            this.currentTrack = this.createTrack(videoElement);

            videoElement.addEventListener('play', () => {
                console.log('[Crossfader] New track started, resetting state');
                this.isCrossfading = false;
                this.resetGain(this.currentTrack.gain, 1);
            });

            this.isInitialized = true;
            console.log('[Crossfader] Audio initialized');
            this.startMonitoring();
        } catch (error) {
            console.error('[Crossfader] Initialization error:', error);
        }
    }

    createTrack(videoElement) {
        try {
            // Check if the video element already has a connected source
            if (this.currentTrack?.element === videoElement) {
                console.log('[Crossfader] Reusing current track');
                return this.currentTrack; // Reuse the existing track
            }

            console.log('[Crossfader] Creating new track');
            const source = this.audioContext.createMediaElementSource(videoElement);
            const gain = this.audioContext.createGain();

            source.connect(gain);
            gain.connect(this.audioContext.destination);

            gain.gain.setValueAtTime(1, this.audioContext.currentTime); // Start at full volume

            return { element: videoElement, source, gain };
        } catch (error) {
            console.error('[Crossfader] Error creating track:', error);
        }
    }

    resetGain(gainNode, value) {
        gainNode.gain.setValueAtTime(value, this.audioContext.currentTime);
    }

    getTimeRemaining() {
        const video = this.currentTrack?.element;
        if (!video) return null;

        return video.duration - video.currentTime;
    }

    async beginCrossfade() {
        if (this.isCrossfading) return;

        console.log('[Crossfader] Starting crossfade');
        this.isCrossfading = true;

        try {
            const fadeOutDuration = this.crossfadeDuration * 2 / 3; // Longer fade-out for smoother transition
            const fadeInDuration = this.crossfadeDuration / 3; // Shorter fade-in for quick transition

            const fadeOutStartTime = this.audioContext.currentTime;
            const fadeOutEndTime = fadeOutStartTime + fadeOutDuration;

            // Fade out the current track
            console.log('[Crossfader] Fading out current track');
            this.currentTrack.gain.gain.setValueAtTime(1, fadeOutStartTime);
            this.currentTrack.gain.gain.linearRampToValueAtTime(0, fadeOutEndTime);

            // Wait for the fade-out to complete before starting the next track
            setTimeout(async () => {
                console.log('[Crossfader] Fade-out complete, triggering next track');
                await this.prepareAndFadeInNextTrack(fadeInDuration);
            }, fadeOutDuration * 1000);
        } catch (error) {
            console.error('[Crossfader] Error during crossfade:', error);
            this.isCrossfading = false;
        }
    }

    async prepareAndFadeInNextTrack(fadeInDuration) {
        try {
            const nextButton = document.querySelector('ytmusic-player-bar .next-button');
            if (!nextButton) throw new Error('Next button not found');

            // Trigger the next track
            nextButton.click();
            console.log('[Crossfader] Next track triggered');

            // Wait for the new video element to load
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second for the new video to load

            const videoElement = document.querySelector('video');
            if (!videoElement) throw new Error('New video element not found');

            // Create a new track for the next video
            const newTrack = this.createTrack(videoElement);

            // Start the new track at volume 0 and fade it in
            console.log('[Crossfader] Fading in new track');
            newTrack.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            newTrack.gain.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + fadeInDuration);

            videoElement.play();
            this.currentTrack = newTrack; // Replace currentTrack with the new one
            console.log('[Crossfader] New track playing and fading in');
        } catch (error) {
            console.error('[Crossfader] Error preparing next track:', error);
        } finally {
            this.isCrossfading = false;
        }
    }

    checkAndStartCrossfade() {
        if (this.isCrossfading || !this.isInitialized) return;

        const remainingTime = this.getTimeRemaining();
        if (remainingTime !== null && remainingTime <= this.crossfadeDuration) {
            this.beginCrossfade();
        }
    }

    startMonitoring() {
        setInterval(() => {
            this.checkAndStartCrossfade();
        }, 250); // Check 4 times per second
    }
}

// Initialize the extension
const initializeExtension = () => {
    const videoElement = document.querySelector('video');
    if (videoElement) {
        new YTMusicCrossfader();
    } else {
        setTimeout(initializeExtension, 1000);
    }
};

initializeExtension();
