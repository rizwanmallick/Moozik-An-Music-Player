const MAX_ROOM_SIZE = 5;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const rooms = new Map();
let queueIdCounter = 0;

function emptySong() {
    return { videoId: null, title: null, img: null, startTime: null, duration: null, addedBy: null, queueId: null };
}

function nextQueueId() {
    queueIdCounter += 1;
    return `q${Date.now()}_${queueIdCounter}`;
}

function generateRoomCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
}

function createRoom(hostUsername) {
    let code;
    do {
        code = generateRoomCode();
    } while (rooms.has(code));

    const room = {
        code,
        host: hostUsername,
        members: new Map(),
        currentSong: emptySong(),
        queue: [],
        skipVotes: new Set(),
        createdAt: Date.now(),
    };

    rooms.set(code, room);
    return room;
}

function getRoom(code) {
    if (!code) return null;
    return rooms.get(String(code).toUpperCase()) || null;
}

function getMemberList(room) {
    return Array.from(room.members.values());
}

function addMember(room, socketId, username) {
    if (room.members.size >= MAX_ROOM_SIZE && !room.members.has(socketId)) {
        return { ok: false, error: 'Room is full (max 5 people)' };
    }
    room.members.set(socketId, username);
    return { ok: true };
}

function removeMember(room, socketId) {
    room.members.delete(socketId);
    if (room.members.size === 0) {
        rooms.delete(room.code);
    }
}

function isHost(room, username) {
    return room.host === username;
}

function getSkipThreshold(room) {
    const count = getMemberList(room).length;
    if (count <= 1) return 1;
    return Math.floor(count / 2) + 1;
}

function clearSkipVotes(room) {
    room.skipVotes.clear();
}

function addSkipVote(room, username) {
    room.skipVotes.add(username);
    return room.skipVotes.size;
}

function hasSkipVoted(room, username) {
    return room.skipVotes.has(username);
}

function createQueueItem({ videoId, title, thumbnail, duration, addedBy }) {
    return {
        id: nextQueueId(),
        videoId,
        title,
        thumbnail,
        duration,
        addedBy,
    };
}

function addToQueue(room, item) {
    room.queue.push(item);
    return item;
}

function removeFromQueue(room, itemId) {
    const index = room.queue.findIndex(q => q.id === itemId);
    if (index === -1) return null;
    const [removed] = room.queue.splice(index, 1);
    return removed;
}

function isPlaying(room) {
    return !!(room.currentSong.videoId && room.currentSong.startTime);
}

function setCurrentSong(room, songInfo) {
    const now = Date.now();
    room.currentSong = {
        videoId: songInfo.videoId,
        title: songInfo.title,
        img: songInfo.thumbnail,
        startTime: now,
        duration: songInfo.duration,
        addedBy: songInfo.addedBy || null,
        queueId: songInfo.queueId || songInfo.id || null,
    };
    clearSkipVotes(room);
}

function clearCurrentSong(room) {
    room.currentSong = emptySong();
    clearSkipVotes(room);
}

function getElapsedSeconds(room) {
    if (!room.currentSong.videoId || !room.currentSong.startTime) return 0;
    return (Date.now() - room.currentSong.startTime) / 1000;
}

function serializeQueue(room) {
    return room.queue.map(q => ({
        id: q.id,
        videoId: q.videoId,
        title: q.title,
        thumbnail: q.thumbnail,
        duration: q.duration,
        addedBy: q.addedBy,
    }));
}

function serializeSkipVotes(room) {
    return {
        votes: room.skipVotes.size,
        threshold: getSkipThreshold(room),
        voters: Array.from(room.skipVotes),
    };
}

function serializeNowPlaying(room) {
    if (!room.currentSong.videoId) return null;
    return {
        videoId: room.currentSong.videoId,
        title: room.currentSong.title,
        thumbnail: room.currentSong.img,
        duration: room.currentSong.duration,
        addedBy: room.currentSong.addedBy,
        elapsed: getElapsedSeconds(room),
    };
}

module.exports = {
    MAX_ROOM_SIZE,
    rooms,
    createRoom,
    getRoom,
    getMemberList,
    addMember,
    removeMember,
    isHost,
    getSkipThreshold,
    clearSkipVotes,
    addSkipVote,
    hasSkipVoted,
    createQueueItem,
    addToQueue,
    removeFromQueue,
    isPlaying,
    setCurrentSong,
    clearCurrentSong,
    getElapsedSeconds,
    serializeQueue,
    serializeSkipVotes,
    serializeNowPlaying,
};
