/**
 * Anime Detector Plugin
 *
 * Detects if a file is likely anime based on:
 * - Common anime keywords in filename
 * - Japanese text in title (kana, kanji)
 * - Japanese audio tracks
 * - "anime" in file path
 *
 * Matches old AnimeDetector output:
 * - titles/jpn (if kana)
 * - titles/{romajiIsoCode} (if romaji)
 * - anime
 * - genres (add "Anime")
 */

import { isJapanese, isKana } from 'wanakana';
import { animeKeywords } from '@metazla/filename-tools';
import type { PluginManifest, ProcessRequest, CallbackPayload } from './types.js';
import { MetaCoreClient } from './meta-core-client.js';

// romajiIsoCode from @metazla/meta-interface is just 'jpl'
const romajiIsoCode = 'jpl';

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
        [`titles/${romajiIsoCode}`]: { label: 'Romaji Title', type: 'string' },
    },
    config: {},
};

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

        // Check for anime keywords in filename (from @metazla/filename-tools)
        for (const keyword of animeKeywords) {
            if (fileName.includes(keyword)) {
                isAnime = true;
                isJpn = true;
                break;
            }
        }

        // Check if title is in Japanese
        if (originalTitle && (isKana(originalTitle) || isJapanese(originalTitle))) {
            isJpn = true;
        }

        // Check audio streams for Japanese language
        for (let i = 0; i < 20; i++) {
            const lang = existingMeta?.[`fileinfo/streamdetails/audio/${i}/language`];
            if (!lang) break;
            if (lang === 'jpn') {
                isJpn = true;
                break;
            }
        }

        // Check video streams for Japanese language
        for (let i = 0; i < 20; i++) {
            const lang = existingMeta?.[`fileinfo/streamdetails/video/${i}/language`];
            if (!lang) break;
            if (lang === 'jpn') {
                isJpn = true;
                break;
            }
        }

        // Set Japanese title appropriately
        if (isJpn && originalTitle) {
            if (isKana(originalTitle)) {
                await metaCore.setProperty(cid, 'titles/jpn', originalTitle);
            } else {
                await metaCore.setProperty(cid, `titles/${romajiIsoCode}`, originalTitle);
            }
        }

        // Anything Japanese is considered anime (as per original implementation)
        if (isAnime || isJpn) {
            await metaCore.setProperty(cid, 'anime', 'true');
            // Use add for genres (RecordSet)
            await metaCore.addToSet(cid, 'genres', 'Anime');
            console.log(`[anime-detector] Detected anime: ${fileName}`);
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
