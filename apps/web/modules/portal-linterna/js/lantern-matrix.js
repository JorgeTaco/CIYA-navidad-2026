(function () {
  const glyphHeight = 7;
  const wordGap = [0, 0, 0, 0];
  const loopGap = 7;
  const scrollSpeed = 11;
  const firstFrameHold = 650;

  // The dot patterns come from the CIYA light-matrix simulator.
  const patterns = {
    A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
    B: '####./#...#/#...#/####./#...#/#...#/####.',
    C: '.###./#...#/#..../#..../#..../#...#/.###.',
    D: '####./#...#/#...#/#...#/#...#/#...#/####.',
    E: '#####/#..../#..../####./#..../#..../#####',
    F: '#####/#..../#..../####./#..../#..../#....',
    G: '.###./#...#/#..../#..##/#...#/#...#/.####',
    H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
    I: '###/.#./.#./.#./.#./.#./###',
    J: '..###/...#./...#./...#./#..#./#..#./.##..',
    K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
    L: '#..../#..../#..../#..../#..../#..../#####',
    M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
    N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
    Ñ: '.##.#/...../#...#/##..#/#.#.#/#..##/#...#',
    O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
    P: '####./#...#/#...#/####./#..../#..../#....',
    Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
    R: '####./#...#/#...#/####./#.#../#..#./#...#',
    S: '.####/#..../#..../.###./....#/....#/####.',
    T: '#####/..#../..#../..#../..#../..#../..#..',
    U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
    V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
    W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
    X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
    Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
    Z: '#####/....#/...#./..#../.#.../#..../#####',
    Á: '..##./...../.###./#...#/#####/#...#/#...#',
    É: '..##./...../#####/#..../####./#..../#####',
    Í: '.##/.../###/.#./.#./.#./###',
    Ó: '..##./...../.###./#...#/#...#/#...#/.###.',
    Ú: '..##./...../#...#/#...#/#...#/#...#/.###.',
    Ü: '.#.#./...../#...#/#...#/#...#/#...#/.###.',
    0: '.###./#..##/#.#.#/#.#.#/##..#/#...#/.###.',
    1: '..#../.##../..#../..#../..#../..#../.###.',
    2: '.###./#...#/....#/..##./.#.../#..../#####',
    3: '####./....#/....#/.###./....#/....#/####.',
    4: '...#./..##./.#.#./#..#./#####/...#./...#.',
    5: '#####/#..../####./....#/....#/#...#/.###.',
    6: '.###./#..../#..../####./#...#/#...#/.###.',
    7: '#####/....#/...#./..#../.#.../.#.../.#...',
    8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
    9: '.###./#...#/#...#/.####/....#/....#/.###.',
    '-': '.../.../.../###/.../.../...',
    '—': '...../...../...../#####/...../...../.....',
    '!': '#/#/#/#/#/./#',
    '¡': '#/./#/#/#/#/#',
    '?': '.###./#...#/....#/...#./..#../...../..#..',
    '¿': '..#../...../..#../.#.../#..../#...#/.###.',
    '.': '../../../../../##/##',
    ',': '../../../../.#/##/#.',
    ':': '../##/##/../##/##/..',
    '+': '...../..#../..#../#####/..#../..#../.....',
    '/': '....#/...#./...#./..#../.#.../.#.../#....',
    '&': '.##../#..#./.##../#.#.#/#..#./#..#./.##.#',
    '★': '..#../..#../#####/.###./.#.#./#...#/.....',
    '♥': '...../.#.#./#####/#####/.###./..#../.....'
  };

  const glyphs = new Map(Object.entries(patterns).map(function ([char, pattern]) {
    const rows = pattern.split('/');
    const columns = Array.from({ length: rows[0].length }, function (_, column) {
      return rows.reduce(function (bits, row, index) {
        return row[column] === '#' ? bits | (1 << index) : bits;
      }, 0);
    });
    return [char, columns];
  }));

  function joinColumns(items, gap) {
    return items.flatMap(function (item, index) { return index ? [...gap, ...item] : item; });
  }

  function compileText(value) {
    const text = value.normalize('NFC').toUpperCase().replace(/\s+/gu, ' ').trim();
    const missing = new Set();
    const words = text ? text.split(' ').map(function (word) {
      const letters = Array.from(word, function (char) {
        if (glyphs.has(char)) return glyphs.get(char);
        missing.add(char);
        return glyphs.get('?');
      });
      return { letters, columns: joinColumns(letters, [0]) };
    }) : [];
    return { words, columns: joinColumns(words.map(function (word) { return word.columns; }), wordGap), missing };
  }

  function breakIntoLines(words, capacity) {
    const lines = [];
    let current = [];
    let splitWord = false;
    for (const word of words) {
      if (current.length && current.length + wordGap.length + word.columns.length > capacity) {
        lines.push(current);
        current = [];
      }
      if (word.columns.length <= capacity) {
        if (current.length) current.push(...wordGap);
        current.push(...word.columns);
        continue;
      }
      splitWord = true;
      for (const letter of word.letters) {
        if (current.length && current.length + 1 + letter.length > capacity) {
          lines.push(current);
          current = [];
        }
        if (current.length) current.push(0);
        current.push(...letter);
      }
    }
    if (current.length) lines.push(current);
    return { lines, splitWord };
  }

  function layoutFor(compiled, width, height, orientation, reducedMotion) {
    const capacity = Math.max(5, Math.min(52, Math.floor(width / 7) - 2));
    if (compiled.columns.length <= capacity) return { mode: 'fixed', lines: [compiled.columns], capacity };

    const { lines, splitWord } = breakIntoLines(compiled.words, capacity);
    if (orientation === 'vertical' && !splitWord && lines.length <= 3 && height >= (8 * lines.length + 3) * 6) {
      return { mode: 'fixed', lines, capacity };
    }
    if (reducedMotion) return { mode: 'parts', lines, capacity };
    return { mode: 'scroll', lines: [compiled.columns], capacity };
  }

  function create(canvas, onStateChange) {
    const context = canvas.getContext('2d');
    if (!context) return null;

    const deviceOrientation = window.matchMedia('(orientation: portrait)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let format = 'auto';
    let color = '#ffd166';
    let text = '';
    let compiled = compileText(text);
    let layout;
    let width = 0;
    let height = 0;
    let part = 0;
    let frameId = 0;
    let previousTime;
    let elapsed = 0;
    let columnOffset = 0;
    let paused = false;
    let visible = true;

    function orientation() {
      if (format !== 'auto') return format;
      return deviceOrientation.matches ? 'vertical' : 'horizontal';
    }

    function notify() {
      onStateChange({ orientation: orientation(), mode: layout.mode, paused,
        part: part + 1, count: layout.lines.length, missing: compiled.missing });
    }

    function paint() {
      if (!width || !height) return;
      const lines = layout.mode === 'parts' ? [layout.lines[part]] : layout.lines;
      const columns = layout.mode === 'scroll' ? layout.capacity : Math.max(5, ...lines.map(line => line.length));
      const rowStep = glyphHeight + 1;
      const rows = rowStep * lines.length + 1;
      const pitch = Math.min(width / (columns + 2), height / (rows + 2));
      const left = (width - (columns - 1) * pitch) / 2;
      const top = (height - (rows - 1) * pitch) / 2;
      const lit = [];
      const radius = pitch * 0.29;

      context.clearRect(0, 0, width, height);
      context.beginPath();
      for (let row = 0; row < rows; row++) {
        const line = lines[Math.floor((row - 1) / rowStep)];
        const bit = (row - 1) % rowStep;
        const margin = line ? Math.floor((columns - line.length) / 2) : 0;
        for (let column = 0; column < columns; column++) {
          const x = left + column * pitch;
          const y = top + row * pitch;
          const index = layout.mode === 'scroll' ?
            (column + columnOffset) % (compiled.columns.length + loopGap) : column - margin;
          if (line && bit < glyphHeight && (line[index] & (1 << bit))) {
            lit.push([x, y]);
          } else {
            context.moveTo(x + radius, y);
            context.arc(x, y, radius, 0, Math.PI * 2);
          }
        }
      }
      context.fillStyle = '#172127';
      context.fill();

      function fillLights(size, shade, alpha) {
        context.beginPath();
        for (const [x, y] of lit) {
          context.moveTo(x + size, y);
          context.arc(x, y, size, 0, Math.PI * 2);
        }
        context.fillStyle = shade;
        context.globalAlpha = alpha;
        context.fill();
      }

      fillLights(pitch * 0.49, color, 0.22);
      fillLights(radius, color, 1);
      fillLights(pitch * 0.10, '#fffdf2', 0.86);
      context.globalAlpha = 1;
    }

    function animate(time) {
      if (previousTime !== undefined) elapsed += Math.min(time - previousTime, 100);
      previousTime = time;
      const offset = Math.floor(Math.max(0, elapsed - firstFrameHold) * scrollSpeed / 1000);
      if (offset !== columnOffset) {
        columnOffset = offset;
        paint();
      }
      frameId = window.requestAnimationFrame(animate);
    }

    function schedule() {
      const playing = width && height && visible && layout.mode === 'scroll' && !paused;
      if (playing && !frameId) frameId = window.requestAnimationFrame(animate);
      if (!playing && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        previousTime = undefined;
      }
    }

    function redraw() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      layout = layoutFor(compiled, width, height, orientation(), reduceMotion.matches);
      part = Math.min(part, layout.lines.length - 1);
      notify();
      paint();
      schedule();
    }

    if (typeof ResizeObserver === 'function') new ResizeObserver(redraw).observe(canvas);
    else window.addEventListener('resize', redraw);
    deviceOrientation.addEventListener('change', redraw);
    reduceMotion.addEventListener('change', redraw);
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(function ([entry]) {
        visible = entry.isIntersecting;
        if (layout) schedule();
      }).observe(canvas);
    }

    return {
      show(message, nextColor, nextFormat) {
        if (message !== text) {
          text = message;
          compiled = compileText(message);
          part = 0;
          elapsed = 0;
          columnOffset = 0;
          paused = false;
        }
        color = nextColor;
        format = nextFormat;
        redraw();
      },
      togglePlaying() {
        paused = !paused;
        notify();
        schedule();
      },
      nextPart() {
        part = (part + 1) % layout.lines.length;
        notify();
        paint();
      }
    };
  }

  window.CIYA_LANTERN_MATRIX = { compileText, layoutFor, create };
})();
