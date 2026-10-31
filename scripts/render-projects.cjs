// Generate static, accessible page content; the scroll animation stays in app.js.
// Edit content/projects.json, then run: node scripts/render-projects.cjs
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const content = JSON.parse(fs.readFileSync(path.join(root, 'content/projects.json'), 'utf8'));
const projects = [...content.projects].sort((a, b) => a.displayOrder - b.displayOrder);
const profile = content.profile || {};
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const number = p => String(p.displayOrder).padStart(2, '0');
// 中文用正体衬线，避免斜体字幕里出现被"拉斜"的汉字
const marqueeWord = word => /[一-鿿]/.test(word) ? `<i>${escape(word)}</i>` : escape(word);

// 速览视频：优先 videoPreview，其次开场循环用的 videoLoop
const preview = p => ({ src: p.videoPreview || p.videoLoop, poster: p.previewPoster || p.loopPoster || p.poster, duration: p.previewDuration || '' });

function media(project, figure) {
  const name = escape(project.name), pv = preview(project), full = escape(project.videoDuration || '');
  const caption = text => `<figcaption><span>FIG. ${figure} — ${name}</span>${text}</figcaption>`;
  if (project.video && pv.src) {
    return `<figure class="media" data-media data-preview="${escape(pv.src)}" data-preview-poster="${escape(pv.poster || '')}" data-preview-len="${escape(pv.duration)}" data-full="${escape(project.video)}" data-full-poster="${escape(project.poster || '')}" data-full-len="${full}">
            <div class="media-frame">
              <video playsinline muted loop preload="none" aria-label="${name} 项目演示"></video>
              <div class="media-ui"><div class="seg" role="group" aria-label="视频版本"><button type="button" data-mode="preview" aria-pressed="true">${escape(pv.duration)}速览</button><button type="button" data-mode="full" aria-pressed="false">${full}完整演示</button></div><span class="media-note" data-note>静音循环</span></div>
              <button class="play-badge" type="button" data-play><span class="pi" aria-hidden="true">▶</span><span class="bl">播放</span>完整演示<span class="bl"> · ${full}</span></button>
            </div>
            ${caption(`<span data-cap>项目速览 · ${escape(pv.duration)}</span>`)}
          </figure>`;
  }
  if (project.video) {
    return `<figure class="media" data-media-static>
            <div class="media-frame"><video controls playsinline preload="metadata"${project.poster ? ` poster="${escape(project.poster)}"` : ''} src="${escape(project.video)}" aria-label="${name} 项目演示"><a href="${escape(project.video)}">打开项目演示视频</a></video></div>
            ${caption(`<span>完整演示 · ${full}</span>`)}
          </figure>`;
  }
  const share = project.videoShareUrl
    ? `<a href="${escape(project.videoShareUrl)}" target="_blank" rel="noopener noreferrer">打开视频分享页 ↗</a>`
    : '<span>演示视频准备中</span>';
  return `<figure class="media" data-media-static>
            <div class="media-frame${project.poster ? '' : ' media-empty'}">${project.poster ? `<img src="${escape(project.poster)}" alt="${name} 项目封面">` : 'VIDEO COMING SOON'}</div>
            ${caption(share)}
          </figure>`;
}

function article(project, index) {
  const id = escape(project.id), n = number(project), theme = project.theme || {};
  const vars = [['--pa', theme.accent], ['--pa-ink', theme.accentInk], ['--pa-bg', theme.mediaBackground]]
    .filter(([, value]) => value).map(([key, value]) => `${key}:${escape(value)}`).join(';');
  return `<article class="project${index % 2 ? ' is-flip' : ''}" id="${id}" aria-labelledby="${id}-name"${vars ? ` style="${vars}"` : ''}>
          <header class="p-head">
            <span class="p-num" aria-hidden="true">${n}</span>
            <div class="p-titles">
              <p class="label" data-reveal>${n} / ${escape(project.category)}</p>
              <h3 class="p-title mask-lines" id="${id}-name"><span class="m"><span class="ln">${escape(project.name)}</span></span></h3>
              <p class="p-headline mask-lines"><span class="m"><span class="ln">${escape(project.headline)}</span></span></p>
            </div>
          </header>
          ${media(project, String(index + 2).padStart(2, '0'))}
          <div class="p-body">
            <div class="p-desc" data-reveal>
              <p class="p-summary">${escape(project.summary)}</p>
              <ul class="tags" aria-label="技术与项目特点">${project.tags.map(tag => `<li>${escape(tag)}</li>`).join('')}</ul>
              <details class="more"><summary>了解项目 <span class="plus" aria-hidden="true"></span></summary><p>${escape(project.description)}</p></details>
            </div>
            <ol class="hl-list">
              ${project.highlights.map((h, i) => `<li class="hl" data-reveal style="--d:${i + 1}"><span class="hl-n">0${i + 1}</span><div><h4>${escape(h.title)}</h4><p>${escape(h.description)}</p></div></li>`).join('\n              ')}
            </ol>
          </div>
        </article>`;
}

// 开场最后张开的窗口里放精选项目（featured: true，没有就用第一个）的速览视频
const featured = projects.find(project => project.featured) || projects[0];
const fpv = preview(featured);
const featuredContent = `<div class="win-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${escape(featured.name.toUpperCase())} / PREVIEW</span>${fpv.src ? '<button class="win-btn" type="button" data-loop-toggle aria-pressed="false">播放预览 ▷</button>' : '<span></span>'}</div>
                <div class="win-body">${fpv.src
    ? `<video data-loop data-src="${escape(fpv.src)}" poster="${escape(fpv.poster || '')}" muted loop playsinline preload="none" aria-label="${escape(featured.name)} ${escape(fpv.duration)}预览"></video>`
    : featured.poster ? `<img src="${escape(featured.poster)}" alt="${escape(featured.name)} 项目封面">` : ''}</div>
                <div class="win-foot"><span>${fpv.src ? `${escape(fpv.duration)} · 静音循环` : escape(featured.category)}</span><a href="#${escape(featured.id)}" data-open-full="${escape(featured.id)}">${featured.video ? `观看完整演示 · ${escape(featured.videoDuration || '')}` : '查看项目'} <span class="arr dn" aria-hidden="true">↘</span></a></div>`;

const listContent = `<div class="work-top" data-reveal><span class="label">Selected work · 精选项目</span><span class="label">${String(projects.length).padStart(2, '0')} Projects · 持续探索，持续创造</span></div>

        ${projects.map(article).join('\n\n        ')}`;

// 名字、邮箱、GitHub 留空时对应的内容不显示，避免把占位信息发布出去
const headline = [profile.name ? `你好，我是 <span class="about-name">${escape(profile.name)}</span>。` : '你好。', ...(profile.headline || []).map(escape)];
const facts = [
  profile.focus?.length && ['关注方向', profile.focus.map(escape).join('<br>')],
  profile.tools?.length && ['常用技术', profile.tools.map(escape).join('<br>')],
  ['作品', projects.map(p => `<a class="btn-link" href="#${escape(p.id)}">${number(p)} ${escape(p.name)}</a>`).join('<br>')]
].filter(Boolean);
const aboutContent = `<div class="about-side" data-reveal><p class="label">05 / About</p></div>
        <h2 class="about-title mask-lines" id="about-title">${headline.map(line => `<span class="m"><span class="ln">${line}</span></span>`).join('')}</h2>
        ${profile.intro ? `<p class="about-text" data-reveal>${escape(profile.intro)}</p>` : ''}
        <dl class="facts">
          ${facts.map(([term, value], i) => `<div data-reveal style="--d:${i}"><dt>${term}</dt><dd>${value}</dd></div>`).join('\n          ')}
        </dl>`;

const words = ['Multi-Agent', '想法 → 作品', 'AI Product', ...projects.map(p => p.name), 'Keep curious'];
const strip = `<span>${words.map(word => `${marqueeWord(word)} <b>✳</b>`).join(' ')}</span>`;
// 同一段放两遍，滚到一半时无缝衔接
const marqueeContent = `${strip}\n        ${strip}`;

const contactContent = [
  profile.email && `<a class="btn btn-primary" href="mailto:${escape(profile.email)}">写信给我 <span class="arr up" aria-hidden="true">↗</span></a>`,
  profile.github && `<a class="btn-link" href="${escape(profile.github)}" target="_blank" rel="noopener noreferrer">GitHub <span class="arr up" aria-hidden="true">↗</span></a>`,
  '<a class="btn-link" href="#top">回到起点，重看开场 <span class="arr up" aria-hidden="true">↑</span></a>'
].filter(Boolean).join('\n            ');

const file = path.join(root, 'index.html');
let html = fs.readFileSync(file, 'utf8');
for (const [slot, value] of [['featured-project', featuredContent], ['project-list', listContent], ['about', aboutContent], ['marquee', marqueeContent], ['contact', contactContent]]) {
  const start = `<!-- ${slot}:start -->`;
  const end = `<!-- ${slot}:end -->`;
  const startAt = html.indexOf(start);
  const endAt = html.indexOf(end);
  if (startAt < 0 || endAt < startAt) throw new Error(`Missing template slot: ${slot}`);
  const indent = html.slice(html.lastIndexOf('\n', startAt) + 1, startAt);
  html = html.slice(0, startAt + start.length) + '\n' + indent + value + '\n' + indent + html.slice(endAt);
}
fs.writeFileSync(file, html);
console.log(`Rendered ${projects.length} projects: ${projects.map(project => project.name).join(' → ')}`);
const missing = [['name', '名字'], ['email', '邮箱'], ['github', 'GitHub']].filter(([key]) => !profile[key]).map(([, label]) => label);
if (missing.length) console.log(`提示：profile 里还没填 ${missing.join('、')}，页面上对应内容暂不显示。`);
