/**
 * Anime Detector Plugin
 * Detects if content is anime based on keywords and Japanese text
 */

import { isJapanese, isKana } from 'wanakana';
import type { PluginManifest, ProcessRequest, CallbackPayload } from './types.js';
import { MetaCoreClient } from './meta-core-client.js';

export const manifest: PluginManifest = {
    id: 'anime-detector',
    name: 'Anime Detector',
    version: '1.0.0',
    description: 'Detects anime content based on keywords, Japanese text, and audio tracks',
    author: 'MetaMesh',
    dependencies: ['file-info', 'ffmpeg', 'filename-parser'],
    priority: 35,
    color: '#E91E63',
    defaultQueue: 'fast',
    timeout: 30000,
    schema: {
        anime: { label: 'Is Anime', type: 'boolean', readonly: true },
        'titles/jpn': { label: 'Japanese Title', type: 'string' },
    },
    config: {},
};

// Anime keywords from @metazla/filename-tools - fansub group identifiers only
// Note: Codec patterns (HEVC, x265, etc.) are NOT anime indicators
const ANIME_KEYWORDS = [
    '[HorribleSubs]',
    '[DB]', // Dragon Ball fansubs, also generic for various sub groups
    '[Erai-raws]',
    '[SubsPlease]',
    '[GG]', // A known fansub group
    '[Commie]', // A fansubbing group
    '[Underwater]', // A fansubbing group
    '[Nyaa]', // A reference to the Nyaa Torrents site, often included in anime torrents
    '[FFF]', // A fansubbing group
    '[Coalgirls]', // A fansubbing group known for high-quality releases
    '[Chihiro]', // A fansubbing group
    '[DameDesuYo]', // A fansubbing group
    '[GJM]', // A fansubbing group (Good Job! Media)
    '[AhorribleSubs]', // A misspelling of HorribleSubs sometimes used
    '[AnimeRG]', // A group known for releasing anime torrents
    '[Judas]', // A group known for their anime releases
    '[Cleo]', // A group known for their anime encodes
    '[LostYears]', // A group known for dub and sub releases
    '[KaiDubs]', // A group known for dubbed anime releases
    '[AnimeKaizoku]', // A website known for anime downloads, sometimes included in filenames
    '[AnimeLand]', // A website known for anime downloads, sometimes included in filenames
    '[Beatrice-Raws]', // A group known for raw anime blu-ray encodes
    '[BakedFish]', // A less common but recognized release group
    '[DeadFish]', // A group known for re-encoding fansubs into hardsubbed mp4 format
    '[Golumpa]', // A group known for dubbed anime releases
    '[EMBER]', // A group known for their anime releases
];

export async function process(
    request: ProcessRequest,
    sendCallback: (payload: CallbackPayload) => Promise<void>
): Promise<void> {
    const startTime = Date.now();
    const metaCore = new MetaCoreClient(request.metaCoreUrl);

    try {
        const { cid, filePath, existingMeta } = request;

        // Only process video files
        if (existingMeta?.fileType !== 'video') {
            await sendCallback({
                taskId: request.taskId,
                status: 'skipped',
                duration: Date.now() - startTime,
                reason: 'Not a video file',
            });
            return;
        }

        const originalTitle = existingMeta?.originalTitle || '';
        const fileName = existingMeta?.fileName || '';
        let isAnime = false;
        let isJpn = false;

        // Check if "anime" is in the filepath
        if (/anime/i.test(filePath)) {
            isAnime = true;
            isJpn = true;
        }

        // Check for anime keywords
        for (const keyword of ANIME_KEYWORDS) {
            if (fileName.includes(keyword)) {
                isAnime = true;
                isJpn = true;
                break;
            }
        }

        // Check if title is Japanese
        if (originalTitle && (isKana(originalTitle) || isJapanese(originalTitle))) {
            isJpn = true;
        }

        // Check audio streams for Japanese language
        for (let i = 0; i < 10; i++) {
            const lang = existingMeta?.[`fileinfo/streamdetails/audio/${i}/language`];
            if (lang === 'jpn' || lang === 'ja') {
                isJpn = true;
                break;
            }
            if (!lang) break;
        }

        // Check video streams for Japanese language (matching original)
        for (let i = 0; i < 10; i++) {
            const lang = existingMeta?.[`fileinfo/streamdetails/video/${i}/language`];
            if (lang === 'jpn' || lang === 'ja') {
                isJpn = true;
                break;
            }
            if (!lang) break;
        }

        const metadata: Record<string, string> = {};

        if (isJpn && originalTitle) {
            if (isKana(originalTitle)) {
                metadata['titles/jpn'] = originalTitle;
            } else {
                metadata['titles/rom'] = originalTitle;
            }
        }

        if (isAnime || isJpn) {
            metadata.anime = 'true';
            await metaCore.mergeMetadata(cid, metadata);
            await metaCore.addToSet(cid, 'genres', 'Anime');
        }

        await sendCallback({
            taskId: request.taskId,
            status: 'completed',
            duration: Date.now() - startTime,
        });
    } catch (error) {
        await sendCallback({
            taskId: request.taskId,
            status: 'failed',
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
