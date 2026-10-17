/** Inline the chart's colors, logos, and font so the PNG works without external assets. */
export async function downloadChart(id: string) {
  const source = document.getElementById(`chart-${id}`);
  if (!(source instanceof SVGSVGElement)) throw new Error('Select models before exporting a chart.');
  const clone = source.cloneNode(true);
  if (!(clone instanceof SVGSVGElement)) throw new Error('The chart could not be copied.');
  const properties = ['fill', 'stroke', 'font-family', 'font-size', 'font-weight', 'opacity', 'filter'];
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  originals.forEach((original, index) => {
    const copy = copies[index];
    if (!copy) return;
    const style = getComputedStyle(original);
    for (const property of properties) copy.setAttribute(property, style.getPropertyValue(property));
  });
  await Promise.all(
    [...clone.querySelectorAll('image')].map(async (image) => {
      const href = image.getAttribute('href');
      if (!href) return;
      const response = await fetch(href);
      if (!response.ok) throw new Error('A chart logo could not be loaded.');
      image.setAttribute(
        'href',
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await response.text())}`,
      );
    }),
  );
  const fontResponse = await fetch('/fonts/dm-sans.ttf');
  if (!fontResponse.ok) throw new Error('The chart font could not be loaded.');
  const font = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not embed the chart font.'));
    reader.onerror = () => reject(new Error('Could not read the chart font.'));
    void fontResponse.blob().then((blob) => reader.readAsDataURL(blob), reject);
  });
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `@font-face{font-family:'DM Sans';src:url('${font}');font-weight:100 1000}`;
  clone.prepend(style);
  const width = source.viewBox.baseVal.width;
  const height = source.viewBox.baseVal.height;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG export is unavailable in this browser.');
    context.scale(2, 2);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Could not create PNG.'))),
        'image/png',
      ),
    );
    const download = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = download;
    link.download = `slopalytics-${id}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(download), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
