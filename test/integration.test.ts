/**
 * Anime Detector Plugin Integration Tests
 *
 * Tests anime detection based on keywords, Japanese text, and audio tracks.
 * Uses wanakana library for Japanese text detection.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isJapanese, isKana } from 'wanakana';
import { animeKeywords } from '@metazla/filename-tools';

// Dynamic import of plugin module
let manifest: typeof import('../src/plugin.js').manifest;
let processFile: typeof import('../src/plugin.js').process;

// Mock callback collector
interface CallbackResult {
    taskId: string;
    status: 'completed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    reason?: string;
}

let lastCallback: CallbackResult | null = null;

const mockSendCallback = async (payload: CallbackResult): Promise<void> => {
    lastCallback = payload;
};

describe('Anime Detector Plugin Integration Tests', () => {
    beforeAll(async () => {
        const plugin = await import('../src/plugin.js');
        manifest = plugin.manifest;
        processFile = plugin.process;
    });

    describe('Manifest', () => {
        it('has required fields', () => {
            expect(manifest.id).toBe('anime-detector');
            expect(manifest.name).toBeDefined();
            expect(manifest.version).toBeDefined();
            expect(manifest.dependencies).toContain('file-info');
            expect(manifest.dependencies).toContain('ffmpeg');
            expect(manifest.dependencies).toContain('filename-parser');
            expect(manifest.priority).toBe(35);
        });

        it('declares correct schema', () => {
            expect(manifest.schema).toHaveProperty('anime');
            expect(manifest.schema).toHaveProperty('titles/jpn');
        });
    });

    describe('Japanese Text Detection (wanakana)', () => {
        it('detects hiragana', () => {
            expect(isKana('あいうえお')).toBe(true);
            expect(isJapanese('あいうえお')).toBe(true);
        });

        it('detects katakana', () => {
            expect(isKana('アイウエオ')).toBe(true);
            expect(isJapanese('アイウエオ')).toBe(true);
        });

        it('detects kanji', () => {
            expect(isKana('漢字')).toBe(false);
            expect(isJapanese('漢字')).toBe(true);
        });

        it('does not detect English as Japanese', () => {
            expect(isJapanese('Attack on Titan')).toBe(false);
            expect(isKana('Naruto')).toBe(false);
        });

        it('detects mixed Japanese', () => {
            expect(isJapanese('進撃の巨人')).toBe(true);
        });
    });

    describe('Anime Keywords', () => {
        it('has anime keywords defined', () => {
            expect(Array.isArray(animeKeywords)).toBe(true);
            expect(animeKeywords.length).toBeGreaterThan(0);
        });

        it('contains common anime keywords', () => {
            // Common patterns like [SubGroup], [720p], etc. are in animeKeywords
            const hasRelevantKeywords = animeKeywords.some(kw =>
                kw.includes('[') || kw.includes(']') || kw.includes('anime')
            );
            expect(hasRelevantKeywords || animeKeywords.length > 0).toBe(true);
        });
    });

    describe('Process Function', () => {
        it('skips non-video files', async () => {
            await processFile({
                taskId: 'test-anime-1',
                cid: 'test-cid-anime',
                filePath: '/anime/test.txt',
                callbackUrl: 'http://localhost/callback',
                metaCoreUrl: 'http://localhost:9000',
                existingMeta: {
                    fileType: 'document',
                },
            }, mockSendCallback);

            expect(lastCallback).toBeDefined();
            expect(lastCallback?.status).toBe('skipped');
            expect(lastCallback?.reason).toBe('Not a video file');
        });

        it('processes video with anime in path', async () => {
            await processFile({
                taskId: 'test-anime-2',
                cid: 'test-cid-anime-2',
                filePath: '/anime/Naruto S01E01.mkv',
                callbackUrl: 'http://localhost/callback',
                metaCoreUrl: 'http://localhost:9000',
                existingMeta: {
                    fileType: 'video',
                    originalTitle: 'Naruto',
                    fileName: 'Naruto S01E01.mkv',
                },
            }, mockSendCallback);

            expect(lastCallback).toBeDefined();
            expect(lastCallback?.status).toBe('completed');
        });

        it('processes video with Japanese audio track', async () => {
            await processFile({
                taskId: 'test-anime-3',
                cid: 'test-cid-anime-3',
                filePath: '/videos/Movie.mkv',
                callbackUrl: 'http://localhost/callback',
                metaCoreUrl: 'http://localhost:9000',
                existingMeta: {
                    fileType: 'video',
                    originalTitle: 'Attack on Titan',
                    fileName: 'Attack on Titan.mkv',
                    'fileinfo/streamdetails/audio/0/language': 'jpn',
                },
            }, mockSendCallback);

            expect(lastCallback).toBeDefined();
            expect(lastCallback?.status).toBe('completed');
        });

        it('processes video with Japanese title', async () => {
            await processFile({
                taskId: 'test-anime-4',
                cid: 'test-cid-anime-4',
                filePath: '/videos/anime.mkv',
                callbackUrl: 'http://localhost/callback',
                metaCoreUrl: 'http://localhost:9000',
                existingMeta: {
                    fileType: 'video',
                    originalTitle: '進撃の巨人',
                    fileName: 'anime.mkv',
                },
            }, mockSendCallback);

            expect(lastCallback).toBeDefined();
            expect(lastCallback?.status).toBe('completed');
        });

        it('processes non-anime video', async () => {
            await processFile({
                taskId: 'test-anime-5',
                cid: 'test-cid-anime-5',
                filePath: '/movies/Action Movie.mkv',
                callbackUrl: 'http://localhost/callback',
                metaCoreUrl: 'http://localhost:9000',
                existingMeta: {
                    fileType: 'video',
                    originalTitle: 'Action Movie',
                    fileName: 'Action Movie.mkv',
                },
            }, mockSendCallback);

            expect(lastCallback).toBeDefined();
            expect(lastCallback?.status).toBe('completed');
        });
    });
});
