(function (global) {
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  for (let i = 0, v = 1; i < 255; i++) {
    EXP[i] = v;
    EXP[i + 255] = v;
    LOG[v] = i;
    v = (v << 1) ^ (v & 0x80 ? 0x11d : 0);
  }

  // ISO/IEC 18004 Version 1..10, Error Correction Level M:
  // [version, size, ecPerBlock, [[count, dataCodewords], ...], alignPositions]
  const VERSIONS_M = [
    [1, 21, 10, [[1, 16]], []],
    [2, 25, 16, [[1, 28]], [6, 18]],
    [3, 29, 26, [[1, 44]], [6, 22]],
    [4, 33, 18, [[2, 32]], [6, 26]],
    [5, 37, 24, [[2, 43]], [6, 30]],
    [6, 41, 16, [[4, 27]], [6, 34]],
    [7, 45, 18, [[4, 31]], [6, 22, 38]],
    [8, 49, 22, [[2, 38], [2, 39]], [6, 24, 42]],
    [9, 53, 22, [[3, 36], [2, 37]], [6, 26, 46]],
    [10, 57, 26, [[4, 43], [1, 44]], [6, 28, 50]]
  ];

  function gfMul(a, b) {
    return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
  }

  function rsGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsRemainder(data, ecCount) {
    const gen = rsGenerator(ecCount);
    const buf = data.slice().concat(new Array(ecCount).fill(0));
    for (let i = 0; i < data.length; i++) {
      const coef = buf[i];
      if (coef === 0) continue;
      for (let j = 0; j < gen.length; j++) {
        buf[i + j] ^= gfMul(gen[j], coef);
      }
    }
    return buf.slice(data.length);
  }

  function toUtf8Bytes(text) {
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(String(text)));
    }
    const encoded = unescape(encodeURIComponent(String(text)));
    const bytes = [];
    for (let i = 0; i < encoded.length; i++) bytes.push(encoded.charCodeAt(i));
    return bytes;
  }

  function selectVersion(byteLen) {
    for (let i = 0; i < VERSIONS_M.length; i++) {
      const spec = VERSIONS_M[i];
      const countBits = spec[0] >= 10 ? 16 : 8;
      const totalData = spec[3].reduce(function (sum, g) { return sum + g[0] * g[1]; }, 0);
      if (4 + countBits + byteLen * 8 <= totalData * 8) return spec;
    }
    throw new Error('Texto demasiado largo para código QR');
  }

  function buildCodewords(bytes, spec) {
    const version = spec[0];
    const ecPerBlock = spec[2];
    const groups = spec[3];
    const totalData = groups.reduce(function (sum, g) { return sum + g[0] * g[1]; }, 0);
    const countBits = version >= 10 ? 16 : 8;
    const bits = [];

    function pushBits(val, len) {
      for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    }

    pushBits(0b0100, 4);
    pushBits(bytes.length, countBits);
    for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);
    const maxBits = totalData * 8;
    const term = Math.min(4, maxBits - bits.length);
    pushBits(0, term);
    while (bits.length % 8 !== 0) bits.push(0);

    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      data.push(b);
    }
    const pads = [0xec, 0x11];
    for (let p = 0; data.length < totalData; p++) data.push(pads[p & 1]);

    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let g = 0; g < groups.length; g++) {
      const count = groups[g][0];
      const len = groups[g][1];
      for (let b = 0; b < count; b++) {
        const block = data.slice(offset, offset + len);
        offset += len;
        dataBlocks.push(block);
        ecBlocks.push(rsRemainder(block, ecPerBlock));
      }
    }

    const result = [];
    const maxDataLen = Math.max.apply(null, dataBlocks.map(function (b) { return b.length; }));
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < dataBlocks.length; b++) {
        if (i < dataBlocks[b].length) result.push(dataBlocks[b][i]);
      }
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < ecBlocks.length; b++) {
        result.push(ecBlocks[b][i]);
      }
    }
    return result;
  }

  function createMatrix(size) {
    const modules = Array.from({ length: size }, function () { return new Int8Array(size); });
    const isFunc = Array.from({ length: size }, function () { return new Uint8Array(size); });
    return { size: size, modules: modules, isFunc: isFunc };
  }

  function setFunc(grid, r, c, dark) {
    grid.modules[r][c] = dark ? 1 : 0;
    grid.isFunc[r][c] = 1;
  }

  function drawFinder(grid, row, col) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= grid.size || c < 0 || c >= grid.size) continue;
        const inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const dark = inBox && (dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
          (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFunc(grid, r, c, dark);
      }
    }
  }

  function drawAlignment(grid, row, col) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const dark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
        setFunc(grid, row + dr, col + dc, dark);
      }
    }
  }

  function formatBits(mask) {
    const data = mask; // EC level M = 00 -> (0 << 3) | mask
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) {
      if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
    }
    return ((data << 10) | rem) ^ 0x5412;
  }

  function versionBits(version) {
    let rem = version << 12;
    for (let i = 17; i >= 12; i--) {
      if ((rem >> i) & 1) rem ^= 0x1f25 << (i - 12);
    }
    return (version << 12) | rem;
  }

  function drawFunctionPatterns(grid, spec) {
    const size = grid.size;
    drawFinder(grid, 0, 0);
    drawFinder(grid, 0, size - 7);
    drawFinder(grid, size - 7, 0);

    const align = spec[4];
    for (let i = 0; i < align.length; i++) {
      for (let j = 0; j < align.length; j++) {
        const r = align[i];
        const c = align[j];
        if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
        drawAlignment(grid, r, c);
      }
    }

    for (let i = 8; i < size - 8; i++) {
      setFunc(grid, 6, i, i % 2 === 0);
      setFunc(grid, i, 6, i % 2 === 0);
    }
    setFunc(grid, size - 8, 8, true);

    for (let i = 0; i < 9; i++) {
      if (i !== 6) {
        setFunc(grid, 8, i, false);
        setFunc(grid, i, 8, false);
      }
    }
    for (let i = 0; i < 8; i++) {
      setFunc(grid, 8, size - 1 - i, false);
      if (i < 7) setFunc(grid, size - 1 - i, 8, false);
    }

    if (spec[0] >= 7) {
      const vbits = versionBits(spec[0]);
      for (let i = 0; i < 18; i++) {
        const dark = ((vbits >> i) & 1) === 1;
        const a = Math.floor(i / 3);
        const b = i % 3;
        setFunc(grid, size - 11 + b, a, dark);
        setFunc(grid, a, size - 11 + b, dark);
      }
    }
  }

  function applyFormat(grid, mask) {
    const size = grid.size;
    const fbits = formatBits(mask);
    for (let i = 0; i < 15; i++) {
      const dark = ((fbits >> i) & 1) === 1;
      if (i < 6) setFunc(grid, i, 8, dark);
      else if (i < 8) setFunc(grid, i + 1, 8, dark);
      else setFunc(grid, size - 15 + i, 8, dark);

      if (i < 8) setFunc(grid, 8, size - 1 - i, dark);
      else if (i < 9) setFunc(grid, 8, 15 - i, dark);
      else setFunc(grid, 8, 14 - i, dark);
    }
  }

  function placeData(grid, codewords) {
    const size = grid.size;
    let bitIdx = 0;
    const totalBits = codewords.length * 8;
    let upward = true;
    for (let col = size - 1; col >= 1; col -= 2) {
      if (col === 6) col--;
      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (let dx = 0; dx < 2; dx++) {
          const c = col - dx;
          if (grid.isFunc[r][c]) continue;
          let dark = 0;
          if (bitIdx < totalBits) {
            dark = (codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          grid.modules[r][c] = dark;
        }
      }
      upward = !upward;
    }
  }

  function maskBit(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
      case 6: return (((r * c) % 2 + (r * c) % 3) % 2) === 0;
      default: return (((r + c) % 2 + (r * c) % 3) % 2) === 0;
    }
  }

  function toggleMask(grid, mask) {
    for (let r = 0; r < grid.size; r++) {
      for (let c = 0; c < grid.size; c++) {
        if (!grid.isFunc[r][c] && maskBit(mask, r, c)) {
          grid.modules[r][c] ^= 1;
        }
      }
    }
  }

  function penaltyScore(grid) {
    const size = grid.size;
    const m = grid.modules;
    let score = 0;
    let darkCount = 0;

    function linePenalty(getVal) {
      for (let i = 0; i < size; i++) {
        let runColor = getVal(i, 0);
        let runLen = 1;
        for (let j = 1; j < size; j++) {
          const v = getVal(i, j);
          if (v === runColor) {
            runLen++;
          } else {
            if (runLen >= 5) score += 3 + (runLen - 5);
            runColor = v;
            runLen = 1;
          }
        }
        if (runLen >= 5) score += 3 + (runLen - 5);

        for (let j = 0; j <= size - 11; j++) {
          const p = [];
          for (let k = 0; k < 11; k++) p.push(getVal(i, j + k));
          const a = p[0] === 1 && p[1] === 0 && p[2] === 1 && p[3] === 1 && p[4] === 1 &&
            p[5] === 0 && p[6] === 1 && p[7] === 0 && p[8] === 0 && p[9] === 0 && p[10] === 0;
          const b = p[0] === 0 && p[1] === 0 && p[2] === 0 && p[3] === 0 && p[4] === 1 &&
            p[5] === 0 && p[6] === 1 && p[7] === 1 && p[8] === 1 && p[9] === 0 && p[10] === 1;
          if (a || b) score += 40;
        }
      }
    }

    linePenalty(function (r, c) { return m[r][c]; });
    linePenalty(function (c, r) { return m[r][c]; });

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (m[r][c]) darkCount++;
        if (r < size - 1 && c < size - 1) {
          const sum = m[r][c] + m[r][c + 1] + m[r + 1][c] + m[r + 1][c + 1];
          if (sum === 0 || sum === 4) score += 3;
        }
      }
    }

    const percent = (darkCount * 100) / (size * size);
    const prev5 = Math.floor(Math.abs(percent - 50) / 5);
    score += prev5 * 10;
    return score;
  }

  function encode(text) {
    const bytes = toUtf8Bytes(text);
    const spec = selectVersion(bytes.length);
    const codewords = buildCodewords(bytes, spec);
    const grid = createMatrix(spec[1]);
    drawFunctionPatterns(grid, spec);
    placeData(grid, codewords);

    let bestMask = 0;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      applyFormat(grid, mask);
      toggleMask(grid, mask);
      const score = penaltyScore(grid);
      if (score < bestScore) {
        bestScore = score;
        bestMask = mask;
      }
      toggleMask(grid, mask);
    }

    applyFormat(grid, bestMask);
    toggleMask(grid, bestMask);
    return grid.modules;
  }

  function toSvg(text, options) {
    const opts = options || {};
    const margin = typeof opts.margin === 'number' ? opts.margin : 2;
    const label = opts.label || 'Código QR';
    const matrix = encode(text);
    const size = matrix.length;
    const total = size + margin * 2;
    let path = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c]) {
          path += 'M' + (c + margin) + ',' + (r + margin) + 'h1v1h-1z';
        }
      }
    }
    return '<svg class="qr-svg" viewBox="0 0 ' + total + ' ' + total + '" role="img" aria-label="' +
      String(label).replace(/[&<>'"]/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch];
      }) +
      '" shape-rendering="crispEdges">' +
      '<rect width="100%" height="100%" fill="#ffffff"/>' +
      '<path d="' + path + '" fill="#0d1b2c"/>' +
      '</svg>';
  }

  const api = { encode: encode, toSvg: toSvg };
  global.CIYA_QR_CODE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
