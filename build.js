#!/usr/bin/env node
/**
 * build.js — pre-render projects.json into index.html for SEO.
 *
 * How it works:
 *   - Reads projects.json
 *   - Reads the current index.html
 *   - Replaces the contents of <section id="projects-root">...</section>
 *     with statically generated project cards (so crawlers see them).
 *   - The client-side script that already lives in index.html re-fetches
 *     projects.json at runtime and re-renders; behavior is unchanged for users.
 *
 * Run:  node build.js
 *
 * No dependencies required.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC_HTML = path.join(ROOT, 'index.html');
const PROJECTS_JSON = path.join(ROOT, 'projects.json');

function escHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escAttr(s) { return escHtml(s); }

function renderProjectMedia(p) {
    if (p.type === 'video' && p.media?.youtubeId) {
        const id = escAttr(p.media.youtubeId);
        const title = escAttr(p.media.title || p.title || 'video');
        return `
                        <div class="yt-lite"
                             data-yt-id="${id}"
                             data-yt-title="${title}"
                             style="--yt-thumb: url('https://i.ytimg.com/vi/${id}/hqdefault.jpg')"
                             role="button"
                             tabindex="0"
                             aria-label="Play ${title}">
                            <div class="yt-play-icon" aria-hidden="true"></div>
                        </div>`;
    }
    if (p.type === 'image' && p.media?.src) {
        const src = escAttr(p.media.src);
        const alt = escAttr(p.media.alt || p.title || '');
        return `<div class="project-image"><img src="${src}" alt="${alt}" loading="lazy"></div>`;
    }
    return '';
}

function renderProjectMeta(p) {
    const pills = (p.techStack || []).map(t => `<span class="tech-pill">${escHtml(t)}</span>`).join('');
    const date = p.date ? `<span class="meta-date">${escHtml(p.date)}</span>` : '';
    const links = [];
    if (p.github) {
        links.push(`<a class="project-link" href="${escAttr(p.github)}" target="_blank" rel="noopener">Code</a>`);
    }
    if (p.demoUrl) {
        links.push(`<a class="project-link" href="${escAttr(p.demoUrl)}" target="_blank" rel="noopener">Demo</a>`);
    }
    if (!pills && !date && !links.length) return '';
    const dot = (pills && date) ? '<span class="meta-dot"></span>' : '';
    const linksHtml = links.length ? `<div class="project-links">${links.join('')}</div>` : '';
    return `<div class="project-meta">${pills}${dot}${date}${linksHtml}</div>`;
}

function renderProjectCard(p) {
    const tagClass = p.tagColor && p.tagColor !== 'purple' ? ` ${escAttr(p.tagColor)}` : '';
    const tag = p.tag ? `<span class="project-tag${tagClass}">${escHtml(p.tag)}</span>` : '';
    const slug = escAttr(p.slug || p.id || '');
    const title = p.title
        ? `<h3 class="project-title"><a class="project-title-link" href="project.html?id=${slug}">${escHtml(p.title)}</a></h3>`
        : '';
    // NOTE: description is authored as HTML — we pass through as-is (dashboard is trusted authoring tool)
    const desc = p.description ? `<p class="project-desc">${p.description}</p>` : '';
    const meta = renderProjectMeta(p);
    const media = renderProjectMedia(p);
    const textOnly = p.type === 'text' || !media;
    return `
                <article class="project-card reveal${textOnly ? ' text-only' : ''}" data-id="${escAttr(p.id || '')}">
                    ${media}
                    <div class="project-content">
                        ${tag}
                        ${title}
                        ${desc}
                        ${meta}
                    </div>
                </article>`;
}

function renderCategory(cat) {
    const projects = Array.isArray(cat.projects) ? cat.projects : [];
    const full = projects.filter(p => p.size !== 'half');
    const half = projects.filter(p => p.size === 'half');

    const grids = [];
    if (full.length) grids.push(`
                <div class="project-grid full">
                    ${full.map(renderProjectCard).join('')}
                </div>`);
    if (half.length) grids.push(`
                <div class="project-grid split">
                    ${half.map(renderProjectCard).join('')}
                </div>`);

    const num = cat.number ? `${escHtml(cat.number)} — ` : '';
    return `
            <div id="${escAttr(cat.id || '')}" class="category-group">
                <div class="section-header reveal">
                    <div class="section-category">${num}${escHtml(cat.label || '')}</div>
                    <h2 class="section-title">${escHtml(cat.title || '')}</h2>
                    ${cat.description ? `<p class="section-desc">${escHtml(cat.description)}</p>` : ''}
                </div>
                ${grids.join('')}
            </div>`;
}

function main() {
    const projects = JSON.parse(fs.readFileSync(PROJECTS_JSON, 'utf8'));
    const html = fs.readFileSync(SRC_HTML, 'utf8');

    const categories = Array.isArray(projects.categories) ? projects.categories : [];
    const rendered = categories.map(renderCategory).join('\n');

    // Replace hero text while we're at it
    let out = html;
    if (projects.hero?.badge) {
        out = out.replace(
            /(<span id="hero-badge">)[\s\S]*?(<\/span>)/,
            `$1${escHtml(projects.hero.badge)}$2`
        );
    }
    if (projects.hero?.title) {
        out = out.replace(
            /(<h1 id="hero-title">)[\s\S]*?(<\/h1>)/,
            `$1${escHtml(projects.hero.title)}$2`
        );
    }
    if (projects.hero?.subtitle) {
        out = out.replace(
            /(<p id="hero-subtitle">)[\s\S]*?(<\/p>)/,
            `$1${escHtml(projects.hero.subtitle)}$2`
        );
    }

    // Replace the projects-root contents
    const replaced = out.replace(
        /(<section class="projects" id="projects-root">)[\s\S]*?(<\/section>)/,
        `$1\n${rendered}\n        $2`
    );

    if (replaced === out) {
        console.error('✗ Could not find <section id="projects-root"> in index.html.');
        process.exit(1);
    }

    fs.writeFileSync(SRC_HTML, replaced, 'utf8');
    const totalProjects = categories.reduce((n, c) => n + (c.projects?.length || 0), 0);
    console.log(`✓ build.js — pre-rendered ${totalProjects} project${totalProjects === 1 ? '' : 's'} into ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}.`);
    console.log(`  Written: ${SRC_HTML}`);
}

main();
