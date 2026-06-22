const {
    setCurrentSong,
    clearCurrentSong,
    serializeQueue,
    serializeSkipVotes,
    serializeNowPlaying,
} = require('./rooms');

function emitSong(io, roomCode, songInfo, startTime = 0) {
    const stream = `/chat/stream/${songInfo.videoId}`;
    io.to(roomCode).emit('song', stream, songInfo.title, songInfo.thumbnail, startTime, songInfo.addedBy);
}

function broadcastQueueState(io, room) {
    io.to(room.code).emit('queueUpdate', serializeQueue(room));
    io.to(room.code).emit('skipVoteUpdate', serializeSkipVotes(room));
    io.to(room.code).emit('nowPlaying', serializeNowPlaying(room));
}

function playSongInRoom(io, room, songInfo) {
    setCurrentSong(room, songInfo);
    emitSong(io, room.code, songInfo, 0);
    broadcastQueueState(io, room);
}

function playNextInRoom(io, room, reason = 'skipped') {
    if (room.queue.length === 0) {
        clearCurrentSong(room);
        io.to(room.code).emit('skipTrack');
        io.to(room.code).emit('nowPlaying', null);
        broadcastQueueState(io, room);
        if (reason === 'skipped') {
            io.to(room.code).emit('message', '⏭ Queue finished — no more songs.', 'System');
        }
        return null;
    }

    const next = room.queue.shift();
    playSongInRoom(io, room, next);
    io.to(room.code).emit('message', `🎵 Now playing: ${next.title}`, 'System');
    return next;
}

module.exports = {
    emitSong,
    broadcastQueueState,
    playSongInRoom,
    playNextInRoom,
};
