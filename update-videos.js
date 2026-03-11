import fs from 'fs';
import https from 'https';

function embedToLbryUrl(embedUrl) {
    if (!embedUrl) return null;
    try {
        const path = embedUrl.split('/$/embed/')[1].split('?')[0];
        return 'lbry://' + path.replace(/:/g, '#');
    } catch(e) { return null; }
}

function fetchOdysee(lbryUrl) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            method: 'resolve',
            params: { urls: [lbryUrl] }
        });

        const req = https.request('https://api.na-backend.odysee.com/api/v1/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk.toString());
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json.result[lbryUrl]?.value);
                } catch(e) {
                    resolve(null);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function formatDuration(seconds) {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

async function run() {
    const raw = fs.readFileSync('c:/Users/hithe/Downloads/cornspace/data/videos.json');
    const videos = JSON.parse(raw);

    for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (v.thumbnail) {
            console.log(`Skipping ${v.title}, already has thumbnail`);
            continue;
        }

        console.log(`Fetching metadata for ${v.title}...`);
        const lbryUrl = embedToLbryUrl(v.odyseeEmbed);
        if (lbryUrl) {
            try {
                const meta = await fetchOdysee(lbryUrl);
                if (meta) {
                    v.thumbnail = meta.thumbnail?.url || "";
                    if (!v.duration || v.duration === "00:00") {
                        v.duration = meta.video?.duration ? formatDuration(meta.video.duration) : v.duration;
                    }
                } else {
                    v.thumbnail = "";
                }
            } catch (err) {
                console.error(`Failed on ${v.title}:`, err.message);
            }
        }
        
        // Let's not hammer the API too hard
        await new Promise(r => setTimeout(r, 500));
    }

    fs.writeFileSync('c:/Users/hithe/Downloads/cornspace/data/videos.json', JSON.stringify(videos, null, 2));
    console.log("Migration complete!");
}

run();
