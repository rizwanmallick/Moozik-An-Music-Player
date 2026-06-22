const { spawn } = require('child_process');

function streamYouTubeAudio(videoId, req, res) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ytdlp = spawn('yt-dlp', [
        '-f', 'bestaudio',
        '-o', '-',
        '--no-playlist',
        '--quiet',
        '--no-warnings',
        videoUrl,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Accept-Ranges', 'none');

    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on('data', (chunk) => {
        const msg = chunk.toString().trim();
        if (msg) console.error('yt-dlp:', msg);
    });

    ytdlp.on('error', (err) => {
        console.error('yt-dlp spawn error:', err.message);
        if (!res.headersSent) {
            res.status(500).send('Audio streaming unavailable. Install yt-dlp: pip install -U yt-dlp');
        }
    });

    ytdlp.on('close', (code) => {
        if (code !== 0 && code !== null && !res.writableEnded) {
            if (!res.headersSent) res.status(500).end('Stream failed');
        }
    });

    req.on('close', () => {
        if (!ytdlp.killed) ytdlp.kill();
    });
}

module.exports = { streamYouTubeAudio };
