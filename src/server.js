const express = require('express');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const icy = require('icy');
const { PassThrough } = require('stream');

const app = express();
const PORT = process.env.PORT || 4123;

// This adds 'Access-Control-Allow-Origin: *' to every response
app.use(cors());

// 1. Basic Auth
app.use(basicAuth({
  users: {
    'kemi': 'kemi',
    'admin': 'radio-pass-2026'
  },
  challenge: true,
}));

// 2. Data (Simplified for brevity)
const radioStations = require('./stations.js').stations;

// 3. Routes
app.get('/api/stations', (req, res) => {
  const simplifiedStations = radioStations.map(({ id, name, description, imageUrl }) => ({
    id,
    name,
    description,
    imageUrl,
    streamUrl: `${req.protocol}://${req.get('host')}/api/stations/${id}/stream`
  }));
  res.json(simplifiedStations);
});

// 4. Static Files (Updated Path)
// We use .. because the 'public' folder is now inside 'src' 
// or at the same level as this file depending on your move.
// Based on the structure above:
app.use('/images', express.static(path.join(__dirname, 'public/images')));


// Helper function to fetch metadata as a Promise
const getLiveMetadata = (url) => {
  return new Promise((resolve) => {
    // Set a 2-second timeout so the API doesn't hang if the stream is down
    const timeout = setTimeout(() => resolve(null), 1000);

    icy.get(url, (icyRes) => {
      icyRes.on('metadata', (metadata) => {
        clearTimeout(timeout);
        const parsed = icy.parse(metadata);
        resolve(parsed.StreamTitle || "No Title Provided");
        icyRes.destroy(); // Close connection immediately
      });

      icyRes.on('error', () => {
        clearTimeout(timeout);
        resolve("Error Fetching Metadata");
      });
    });
  });
};

// Get station details by ID
app.get('/api/stations/:id', async (req, res) => {
  const station = radioStations.find(s => s.id === req.params.id);
  if (!station) {
    return res.status(404).send('Station not found');
  }

  const nowPlaying = await getLiveMetadata(station.streamUrl);
  res.json({ ...station, nowPlaying });
});

// 5. ACC stream from radio station ID
app.get('/api/stations/:id/stream', (req, res) => {
  const station = radioStations.find(s => s.id === req.params.id);
  if (!station) {
    return res.status(404).send('Station not found');
  }

  const streamBus = getOrCreateStream(station);
  if (activeStreams[station.id]) activeStreams[station.id].listenerCount++;

  res.setHeader('Content-Type', 'audio/aac');
  
  // Pipe the shared bus to this specific response
  streamBus.pipe(res);

  req.on('close', () => {
    if (activeStreams[station.id]) activeStreams[station.id].listenerCount--;
    // Cleanup: If no one is listening, kill the FFmpeg process to save memory
    if (activeStreams[station.id].listenerCount <= 0) {
      console.log(`[Optimization] Idle station ${station.id}. Killing process.`);
      activeStreams[station.id].command.kill('SIGKILL');
      delete activeStreams[station.id];
    }
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Store active station managers
const activeStreams = {};

function getOrCreateStream(station) {
  if (activeStreams[station.id]) {
    console.log(`[ffmpeg] Reusing existing stream for ${station.name} (Listeners: ${activeStreams[station.id].listenerCount})`);
    return activeStreams[station.id].bus;
  }

  console.log(`[ffmpeg] Spawning singleton process for ${station.name}`);

  const bus = new PassThrough();
  const command = ffmpeg(station.streamUrl)
    .inputOptions(['-timeout', '10000000', '-user_agent', 'Mozilla/5.0'])
    .noVideo()
    .audioCodec('aac')
    .audioBitrate('128k')
    .format('adts')
    .on('stderr', (line) => {
      // console.log(line)
      // Look for the "title" or "artist" metadata patterns in the FFmpeg log
      // FFmpeg often prints: Metadata: title: Song Name, artist: Artist Name
      const titleMatch = line.match(/title\s*:\s*(.*)/i);
      const artistMatch = line.match(/artist\s*:\s*(.*)/i);

      if (titleMatch) {
        const title = titleMatch ? titleMatch[1].trim() : "";
        console.log(`[ffmpeg] Title: ${title}`);
        station.metadata.title = title;
      }

      if (artistMatch) {
        const artist = artistMatch ? artistMatch[1].trim() : "";
        console.log(`[ffmpeg] Artist: ${artist}`);
        station.metadata.artist = artist;
      }
    })
    .on('start', (cmd) => {
      console.log('[ffmpeg] Executing:', cmd)
    })
    .on('progress', (progress) => {
      // Uncomment for debugging stream issues
      // console.log(`[ffmpeg] Progress: ${progress.timemark} (${progress.percent}%)`);
    })
    .on('codecData', (data) => {
      console.log(`[ffmpeg] Codec Data: ${JSON.stringify(data)}`);
    })
    .on('error', (err) => {
      console.error(`FFmpeg Error (${station.id}):`, err.message);
      delete activeStreams[station.id];
    });

  const ffmpegStream = command.pipe();

  // Distribute FFmpeg output to our central bus
  ffmpegStream.pipe(bus);

  activeStreams[station.id] = { 
    command, 
    bus, 
    listenerCount: 0
  };

  return bus;
}