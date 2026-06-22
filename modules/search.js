const ytSearch = require('yt-search');

async function searchYouTube(query) {
    const { videos } = await ytSearch({ search: query, pages: 1 });
    return videos.slice(0, 8).map(v => ({
        videoId: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        duration: v.seconds,
        author: v.author?.name || 'Unknown',
    }));
}

async function resolveVideo(videoId) {
    const { videos } = await ytSearch({ videoId, pages: 1 });
    if (!videos.length) return null;
    const v = videos[0];
    return {
        videoId: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        duration: v.seconds,
    };
}

module.exports = { searchYouTube, resolveVideo };
