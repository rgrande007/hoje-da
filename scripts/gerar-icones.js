'use strict';
// Gera os ícones do PWA a partir do ícone oficial (BRAND/icone.svg).
// Executar: node scripts/gerar-icones.js
//
// - icon-192 / icon-512: o quadrado arredondado recortado, sem a margem e a sombra do arquivo da marca.
// - icon-512-maskable: fundo azul de ponta a ponta, com a barra dentro da "área segura" do Android
//   (círculo de 80% do centro), para o sistema poder recortar em círculo/gota sem cortar o desenho.
// - apple-touch-icon (180): quadrado cheio e sem transparência (o iOS arredonda sozinho e
//   pintaria a transparência de preto).
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const RAIZ = path.join(__dirname, '..');
const SAIDA = path.join(RAIZ, 'public', 'icons');
const svgOriginal = fs.readFileSync(path.join(RAIZ, 'BRAND', 'icone.svg'), 'utf8');

// Sombra do arquivo da marca: os <path> com fill="url(#f)" e fill="#b7b6b6" (parte de baixo).
const semSombra = svgOriginal
  .replace(/<path fill="url\(#f\)"[^>]*\/>/g, '')
  .replace(/<path fill="#b7b6b6"[^>]*\/>/g, '');

// O primeiro <path> é o quadrado arredondado (gradiente #a). Trocado por um retângulo cheio,
// o fundo vira "de ponta a ponta" com o mesmo gradiente.
function fundoCheio(svg, viewBox) {
  const [x, y, w, h] = viewBox;
  return svg
    .replace(/viewBox="[^"]*"/, `viewBox="${viewBox.join(' ')}"`)
    .replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)
    .replace(/<path fill="url\(#a\)"[^>]*\/>/, `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#a)"/>`);
}

async function main() {
  fs.mkdirSync(SAIDA, { recursive: true });

  // 1) Ícone "any": quadrado arredondado sem margem, centralizado num quadrado transparente.
  const recortado = await sharp(Buffer.from(semSombra), { density: 144 }).trim().png().toBuffer();
  const meta = await sharp(recortado).metadata();
  const lado = Math.max(meta.width, meta.height);
  const quadrado = await sharp({ create: { width: lado, height: lado, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: recortado, gravity: 'center' }]).png().toBuffer();
  for (const tam of [192, 512]) {
    await sharp(quadrado).resize(tam, tam).png({ compressionLevel: 9 }).toFile(path.join(SAIDA, `icon-${tam}.png`));
  }

  // 2) Maskable: conteúdo (barra + check, x≈270–995, y≈320–770 no original) centralizado
  //    num quadrado de 1080 → o canto mais distante fica a ~39% do lado, dentro do raio de 40%.
  const cx = 632, cy = 545, L = 1080;
  const maskable = fundoCheio(semSombra, [cx - L / 2, cy - L / 2, L, L]);
  await sharp(Buffer.from(maskable), { density: 72 }).resize(512, 512).flatten({ background: '#0B2A5C' })
    .png({ compressionLevel: 9 }).toFile(path.join(SAIDA, 'icon-512-maskable.png'));

  // 3) iPhone: mesmo enquadramento do maskable, um pouco mais justo (o iOS só arredonda as pontas).
  const L2 = 940;
  const apple = fundoCheio(semSombra, [cx - L2 / 2, cy - L2 / 2, L2, L2]);
  await sharp(Buffer.from(apple), { density: 72 }).resize(180, 180).flatten({ background: '#0B2A5C' })
    .png({ compressionLevel: 9 }).toFile(path.join(SAIDA, 'apple-touch-icon.png'));

  for (const f of ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png']) {
    const m = await sharp(path.join(SAIDA, f)).metadata();
    console.log(f.padEnd(24), `${m.width}x${m.height}`, `${Math.round(fs.statSync(path.join(SAIDA, f)).size / 1024)} KB`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
