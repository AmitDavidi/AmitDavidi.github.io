#!/usr/bin/env node
/**
 * validate.js — schema validator for projects.json
 *
 * Run locally: node validate.js
 * Exits 0 on success, 1 on any validation error.
 *
 * No dependencies — plain Node.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const VALID_TAG_COLORS = ['purple', 'cyan', 'pink', 'orange'];
const VALID_TYPES = ['video', 'image', 'text'];
const VALID_SIZES = ['full', 'half'];

const errors = [];
const warnings = [];

function err(pathStr, msg) { errors.push(`  ✗ ${pathStr}: ${msg}`); }
function warn(pathStr, msg) { warnings.push(`  ! ${pathStr}: ${msg}`); }

function isString(v) { return typeof v === 'string'; }
function isNonEmptyString(v) { return typeof v === 'string' && v.trim().length > 0; }
function isUrl(v) {
    if (!isString(v)) return false;
    try { new URL(v); return true; } catch { return false; }
}

function validate(data) {
    if (!data || typeof data !== 'object') {
        err('$', 'Root must be an object');
        return;
    }

    // ----- hero -----
    if (!data.hero || typeof data.hero !== 'object') {
        err('$.hero', 'Missing or not an object');
    } else {
        ['badge', 'title', 'subtitle'].forEach(k => {
            if (!isNonEmptyString(data.hero[k])) err(`$.hero.${k}`, 'Expected non-empty string');
        });
    }

    // ----- categories -----
    if (!Array.isArray(data.categories)) {
        err('$.categories', 'Must be an array');
        return;
    }

    const catIds = new Set();
    const projectIds = new Set();
    const projectSlugs = new Set();

    data.categories.forEach((cat, i) => {
        const base = `$.categories[${i}]`;
        if (!cat || typeof cat !== 'object') {
            err(base, 'Not an object');
            return;
        }
        if (!isNonEmptyString(cat.id)) err(`${base}.id`, 'Missing/empty');
        else if (catIds.has(cat.id)) err(`${base}.id`, `Duplicate id "${cat.id}"`);
        else catIds.add(cat.id);

        if (!isNonEmptyString(cat.label)) err(`${base}.label`, 'Missing/empty');
        if (!isNonEmptyString(cat.title)) err(`${base}.title`, 'Missing/empty');

        if (cat.number != null && !isString(cat.number)) warn(`${base}.number`, 'Should be a string (got ' + typeof cat.number + ')');

        if (!Array.isArray(cat.projects)) {
            err(`${base}.projects`, 'Must be an array');
            return;
        }

        cat.projects.forEach((p, j) => {
            const pb = `${base}.projects[${j}]`;
            if (!p || typeof p !== 'object') { err(pb, 'Not an object'); return; }
            if (!isNonEmptyString(p.id)) err(`${pb}.id`, 'Missing/empty');
            else if (projectIds.has(p.id)) err(`${pb}.id`, `Duplicate project id "${p.id}"`);
            else projectIds.add(p.id);

            if (p.slug) {
                if (!isNonEmptyString(p.slug)) err(`${pb}.slug`, 'Must be non-empty string');
                else if (projectSlugs.has(p.slug)) warn(`${pb}.slug`, `Duplicate slug "${p.slug}" (detail-page links may collide)`);
                else projectSlugs.add(p.slug);
                if (p.slug && !/^[a-z0-9-]+$/.test(p.slug)) warn(`${pb}.slug`, `Slug should be lowercase letters/digits/hyphens only ("${p.slug}")`);
            }

            if (!VALID_TYPES.includes(p.type)) err(`${pb}.type`, `Must be one of ${VALID_TYPES.join('|')} (got "${p.type}")`);
            if (!isNonEmptyString(p.title)) err(`${pb}.title`, 'Missing/empty');

            if (p.size && !VALID_SIZES.includes(p.size)) err(`${pb}.size`, `Must be one of ${VALID_SIZES.join('|')} (got "${p.size}")`);
            if (p.tagColor && !VALID_TAG_COLORS.includes(p.tagColor)) err(`${pb}.tagColor`, `Must be one of ${VALID_TAG_COLORS.join('|')} (got "${p.tagColor}")`);

            // Media validation
            if (p.type === 'video') {
                const id = p.media?.youtubeId;
                if (!isNonEmptyString(id)) err(`${pb}.media.youtubeId`, 'Required for video projects');
                else if (!/^[A-Za-z0-9_-]{11}$/.test(id)) warn(`${pb}.media.youtubeId`, `"${id}" doesn't look like a valid 11-char YouTube ID`);
            } else if (p.type === 'image') {
                if (!isNonEmptyString(p.media?.src)) err(`${pb}.media.src`, 'Required for image projects');
            }

            // Optional fields
            if (p.techStack != null && !Array.isArray(p.techStack)) err(`${pb}.techStack`, 'Must be an array of strings');
            if (Array.isArray(p.techStack) && p.techStack.some(t => !isNonEmptyString(t))) err(`${pb}.techStack`, 'All entries must be non-empty strings');

            if (p.github && !isUrl(p.github)) err(`${pb}.github`, `Not a valid URL: "${p.github}"`);
            if (p.demoUrl && !isUrl(p.demoUrl)) err(`${pb}.demoUrl`, `Not a valid URL: "${p.demoUrl}"`);
        });
    });
}

function main() {
    if (!fs.existsSync(PROJECTS_FILE)) {
        console.error(`ERROR: ${PROJECTS_FILE} does not exist.`);
        process.exit(1);
    }

    let raw;
    try {
        raw = fs.readFileSync(PROJECTS_FILE, 'utf8');
    } catch (e) {
        console.error(`ERROR: Could not read ${PROJECTS_FILE}: ${e.message}`);
        process.exit(1);
    }

    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error(`ERROR: ${PROJECTS_FILE} is not valid JSON:\n  ${e.message}`);
        process.exit(1);
    }

    validate(data);

    const totalProjects = (data.categories || []).reduce((sum, c) => sum + (c.projects?.length || 0), 0);

    console.log(`validate.js — projects.json`);
    console.log(`  categories: ${(data.categories || []).length}`);
    console.log(`  projects:   ${totalProjects}`);
    console.log('');

    if (warnings.length) {
        console.log(`Warnings (${warnings.length}):`);
        warnings.forEach(w => console.log(w));
        console.log('');
    }

    if (errors.length) {
        console.log(`Errors (${errors.length}):`);
        errors.forEach(e => console.log(e));
        console.log('');
        console.error('✗ Validation failed.');
        process.exit(1);
    }

    console.log('✓ projects.json is valid.');
}

main();
