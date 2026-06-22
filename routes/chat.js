const express = require('express');
const { streamYouTubeAudio } = require('../modules/stream');
const { searchYouTube, resolveVideo } = require('../modules/search');
const { broadcastQueueState, playSongInRoom, playNextInRoom, emitSong } = require('../modules/playback');
const { verifyTokenFromCookie, requireAuth, requireAuthApi } = require('../modules/auth');
const {
    createRoom,
    getRoom,
    getMemberList,
    addMember,
    removeMember,
    isHost,
    addSkipVote,
    hasSkipVoted,
    getSkipThreshold,
    createQueueItem,
    addToQueue,
    removeFromQueue,
    isPlaying,
    getElapsedSeconds,
    serializeQueue,
    serializeSkipVotes,
    serializeNowPlaying,
    MAX_ROOM_SIZE,
} = require('../modules/rooms');

module.exports = function(io) {
    const router = express.Router();

    router.get('/', requireAuth, (req, res) => {
        res.redirect('/chat/lobby');
    });

    router.get('/lobby', requireAuth, (req, res) => {
        res.sendFile('lobby.html', { root: './views' });
    });

    router.get('/room/:code', requireAuth, (req, res) => {
        const room = getRoom(req.params.code);
        if (!room) {
            return res.redirect('/chat/lobby?error=Room+not+found');
        }
        res.sendFile('chat.html', { root: './views' });
    });

    router.get('/stream/:videoId', (req, res) => {
        const { videoId } = req.params;
        if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
            return res.status(400).send('Invalid video ID');
        }
        streamYouTubeAudio(videoId, req, res);
    });

    router.get('/me', (req, res) => {
        const tokenPayload = verifyTokenFromCookie(req.headers.cookie || '');
        if (tokenPayload && tokenPayload.username) {
            return res.json({ username: tokenPayload.username, authenticated: true });
        }
        return res.json({ username: null, authenticated: false });
    });

    router.post('/rooms', requireAuthApi, (req, res) => {
        const room = createRoom(req.user.username);
        res.json({ code: room.code, maxMembers: MAX_ROOM_SIZE });
    });

    router.post('/rooms/:code/join', requireAuthApi, (req, res) => {
        const room = getRoom(req.params.code);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        if (room.members.size >= MAX_ROOM_SIZE) {
            return res.status(403).json({ error: 'Room is full (max 5 people)' });
        }
        res.json({ code: room.code, host: room.host, members: getMemberList(room).length });
    });

    io.on('connection', (socket) => {
        const tokenPayload = verifyTokenFromCookie(socket.handshake.headers.cookie || '');

        socket.on('joinRoom', (code) => {
            if (!tokenPayload || !tokenPayload.username) {
                socket.emit('roomError', { message: 'Please sign in to join a room', redirect: '/auth?next=/chat/lobby' });
                return;
            }

            const room = getRoom(code);
            if (!room) {
                socket.emit('roomError', { message: 'Room not found', redirect: '/chat/lobby' });
                return;
            }

            const username = tokenPayload.username;

            if (socket.roomCode) {
                leaveRoom(socket);
            }

            const result = addMember(room, socket.id, username);
            if (!result.ok) {
                socket.emit('roomError', { message: result.error, redirect: '/chat/lobby' });
                return;
            }

            socket.roomCode = room.code;
            socket.username = username;
            socket.join(room.code);

            socket.emit('you', username);
            socket.emit('roomJoined', {
                code: room.code,
                host: room.host,
                isHost: isHost(room, username),
                maxMembers: MAX_ROOM_SIZE,
                queue: serializeQueue(room),
                skipVotes: serializeSkipVotes(room),
                nowPlaying: serializeNowPlaying(room),
            });

            io.to(room.code).emit('updateOnlineUsers', getMemberList(room));
            io.to(room.code).emit('message', `🎵 ${username} joined the room!`, 'System');

            if (room.currentSong.videoId && room.currentSong.startTime) {
                const elapsed = getElapsedSeconds(room);
                const duration = room.currentSong.duration || 0;
                
                // Only send song if it's still playing (not finished)
                if (elapsed < duration) {
                    emitSong(io, room.code, {
                        videoId: room.currentSong.videoId,
                        title: room.currentSong.title,
                        thumbnail: room.currentSong.img,
                        addedBy: room.currentSong.addedBy,
                    }, elapsed);
                }
            }

            broadcastQueueState(io, room);
        });

        socket.on('message', (msg, sender) => {
            if (!socket.roomCode) return;
            if (sender === 'System') {
                io.to(socket.roomCode).emit('message', msg, 'System');
            } else {
                io.to(socket.roomCode).emit('message', msg, socket.username);
            }
        });

        socket.on('searchSongs', async (query) => {
            if (!socket.roomCode || !query || !query.trim()) return;
            try {
                const results = await searchYouTube(query.trim());
                socket.emit('searchResults', results);
            } catch (err) {
                console.error('Search error:', err);
                socket.emit('searchResults', []);
            }
        });

        socket.on('addToQueue', async (payload) => {
            if (!socket.roomCode) return;
            const room = getRoom(socket.roomCode);
            if (!room) return;

            let video = payload;
            if (payload.query) {
                const results = await searchYouTube(payload.query);
                if (!results.length) {
                    socket.emit('queueError', 'No results found');
                    return;
                }
                video = results[0];
            }

            if (!video?.videoId) return;

            const item = createQueueItem({
                videoId: video.videoId,
                title: video.title,
                thumbnail: video.thumbnail,
                duration: video.duration,
                addedBy: socket.username,
            });

            if (!isPlaying(room)) {
                playSongInRoom(io, room, item);
                io.to(room.code).emit('message', `🎵 ${socket.username} started: ${item.title}`, 'System');
            } else {
                addToQueue(room, item);
                broadcastQueueState(io, room);
                io.to(room.code).emit('message', `➕ ${socket.username} added "${item.title}" to the queue`, 'System');
            }
        });

        socket.on('removeFromQueue', (itemId) => {
            if (!socket.roomCode) return;
            const room = getRoom(socket.roomCode);
            if (!room || !isHost(room, socket.username)) return;

            const removed = removeFromQueue(room, itemId);
            if (removed) {
                broadcastQueueState(io, room);
                io.to(room.code).emit('message', `🗑 Host removed "${removed.title}" from the queue`, 'System');
            }
        });

        socket.on('voteSkip', () => {
            if (!socket.roomCode) return;
            const room = getRoom(socket.roomCode);
            if (!room || !isPlaying(room)) return;

            if (hasSkipVoted(room, socket.username)) return;

            const votes = addSkipVote(room, socket.username);
            const threshold = getSkipThreshold(room);
            broadcastQueueState(io, room);

            if (votes >= threshold) {
                io.to(room.code).emit('message', `⏭ Skip vote passed (${votes}/${threshold}) — skipping track`, 'System');
                playNextInRoom(io, room, 'vote');
            } else {
                io.to(room.code).emit('message', `🗳 ${socket.username} voted to skip (${votes}/${threshold})`, 'System');
            }
        });

        socket.on('hostSkip', () => {
            if (!socket.roomCode) return;
            const room = getRoom(socket.roomCode);
            if (!room || !isHost(room, socket.username) || !isPlaying(room)) return;

            io.to(room.code).emit('message', `⏭ Host ${socket.username} skipped the track`, 'System');
            playNextInRoom(io, room, 'host');
        });

        socket.on('songEnded', (videoId) => {
            if (!socket.roomCode) return;
            const room = getRoom(socket.roomCode);
            if (!room || room.currentSong.videoId !== videoId) return;

            playNextInRoom(io, room, 'ended');
        });

        socket.on('leaveRoom', () => {
            leaveRoom(socket);
        });

        socket.on('disconnect', () => {
            leaveRoom(socket);
        });
    });

    function leaveRoom(socket) {
        if (!socket.roomCode) return;

        const roomCode = socket.roomCode;
        const room = getRoom(roomCode);
        const username = socket.username;

        socket.leave(roomCode);
        socket.roomCode = null;

        if (!room) return;

        removeMember(room, socket.id);

        const updatedRoom = getRoom(roomCode);
        if (updatedRoom) {
            io.to(roomCode).emit('updateOnlineUsers', getMemberList(updatedRoom));
            broadcastQueueState(io, updatedRoom);

            if (
                isPlaying(updatedRoom) &&
                updatedRoom.skipVotes.size >= getSkipThreshold(updatedRoom)
            ) {
                io.to(roomCode).emit('message', '⏭ Skip vote passed — skipping track', 'System');
                playNextInRoom(io, updatedRoom, 'vote');
            } else if (username) {
                io.to(roomCode).emit('message', `🌟 ${username} left the room.`, 'System');
            }
        }
    }

    return router;
};
