/* Guide client: theme toggle, mobile sidebar, scroll-spy table of contents, and search. */

(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'mgjs-guide-theme';

  function stored(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function store(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* Private mode, or storage is full. The toggle still works for this page view. */
    }
  }

  // ---------------------------------------------------------------- theme
  var savedTheme = stored(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.setAttribute('data-theme', savedTheme);
  }

  var themeButton = document.querySelector('[data-theme-toggle]');

  function currentTheme() {
    return (
      root.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
  }

  function updateThemeLabel() {
    if (!themeButton) return;
    themeButton.setAttribute(
      'aria-label',
      currentTheme() === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme',
    );
  }

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store(THEME_KEY, next);
      updateThemeLabel();
    });
  }
  updateThemeLabel();

  // -------------------------------------------------------------- sidebar
  var sidebarToggle = document.querySelector('[data-sidebar-toggle]');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      document.body.classList.toggle('sidebar-open');
    });
    document.addEventListener('click', function (event) {
      if (!document.body.classList.contains('sidebar-open')) return;
      if (event.target.closest('.sidebar') || event.target.closest('[data-sidebar-toggle]')) return;
      document.body.classList.remove('sidebar-open');
    });
  }

  // ------------------------------------------------------------ toc + spy
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  var headings = tocLinks
    .map(function (link) {
      var id = decodeURIComponent(link.getAttribute('href').slice(1));
      var heading = document.getElementById(id);
      return heading ? { link: link, heading: heading } : null;
    })
    .filter(Boolean);

  function highlightToc() {
    if (headings.length === 0) return;
    var offset = 96;
    var activeIndex = 0;
    for (var i = 0; i < headings.length; i += 1) {
      if (headings[i].heading.getBoundingClientRect().top <= offset) activeIndex = i;
    }
    for (var j = 0; j < headings.length; j += 1) {
      headings[j].link.classList.toggle('active', j === activeIndex);
    }
  }

  if (headings.length > 0) {
    var ticking = false;
    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          highlightToc();
          ticking = false;
        });
      },
      { passive: true },
    );
    highlightToc();
  }

  // --------------------------------------------------------------- search
  var overlay = document.querySelector('[data-search-overlay]');
  var input = overlay ? overlay.querySelector('input') : null;
  var results = overlay ? overlay.querySelector('[data-search-results]') : null;
  var openers = Array.prototype.slice.call(document.querySelectorAll('[data-search-open]'));
  var searchIndex = null;
  var documents = {};
  var loading = false;
  var selected = -1;
  var matches = [];

  var basePath = document.body.getAttribute('data-base') || '';

  function loadIndex(onReady) {
    if (searchIndex) return onReady();
    if (loading) return;
    loading = true;
    fetch(basePath + 'search-index.json')
      .then(function (response) {
        return response.json();
      })
      .then(function (payload) {
        documents = payload.documents || {};
        searchIndex = window.lunr.Index.load(payload.index);
        loading = false;
        onReady();
      })
      .catch(function () {
        loading = false;
      });
  }

  function entryFor(ref) {
    var doc = documents[ref];
    return {
      slug: ref,
      title: doc ? doc.title : ref,
      section: doc ? doc.section : '',
      snippet: doc ? doc.snippet : '',
    };
  }

  function defaultEntries() {
    return Object.keys(documents)
      .slice(0, 10)
      .map(entryFor);
  }

  function paint() {
    if (!results) return;
    results.textContent = '';
    if (matches.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'search-empty';
      empty.textContent = searchIndex ? 'No page matches that.' : 'Search is still loading.';
      results.appendChild(empty);
      return;
    }
    matches.forEach(function (entry, position) {
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = basePath + entry.slug + '.html';
      link.setAttribute('aria-selected', position === selected ? 'true' : 'false');

      var title = document.createElement('span');
      title.className = 'result-title';
      title.textContent = entry.title;
      link.appendChild(title);

      if (entry.section) {
        var section = document.createElement('span');
        section.className = 'result-section';
        section.textContent = entry.section;
        link.appendChild(section);
      }
      if (entry.snippet) {
        var snippet = document.createElement('span');
        snippet.className = 'result-snippet';
        snippet.textContent = entry.snippet;
        link.appendChild(snippet);
      }

      item.appendChild(link);
      results.appendChild(item);
    });
  }

  function runSearch(query) {
    if (!searchIndex) return;
    if (query.trim() === '') {
      matches = defaultEntries();
      paint();
      return;
    }
    matches = searchIndex
      .search(query, { wildcard: window.lunr.Query.wildcard.TRAILING })
      .slice(0, 12)
      .map(function (result) {
        return entryFor(result.ref);
      });
    paint();
  }

  function openSearch() {
    if (!overlay) return;
    overlay.classList.add('is-open');
    if (input) {
      input.value = '';
      input.focus();
    }
    selected = -1;
    matches = [];
    paint();
    loadIndex(function () {
      runSearch('');
    });
  }

  function closeSearch() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
  }

  if (input) {
    input.addEventListener('input', function () {
      runSearch(input.value);
    });
    input.addEventListener('keydown', function (event) {
      var links = results.querySelectorAll('a');
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selected = Math.min(selected + 1, links.length - 1);
        paint();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selected = Math.max(selected - 1, 0);
        paint();
      } else if (event.key === 'Enter' && links.length > 0) {
        event.preventDefault();
        links[selected >= 0 ? selected : 0].click();
      } else if (event.key === 'Escape') {
        closeSearch();
      }
    });
  }

  openers.forEach(function (opener) {
    opener.addEventListener('click', openSearch);
  });

  if (overlay) {
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeSearch();
    });
  }

  document.addEventListener('keydown', function (event) {
    var isOpenKey = (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
    if (isOpenKey) {
      event.preventDefault();
      openSearch();
    } else if (event.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      event.preventDefault();
      openSearch();
    } else if (event.key === 'Escape') {
      closeSearch();
      document.body.classList.remove('sidebar-open');
    }
  });
})();
