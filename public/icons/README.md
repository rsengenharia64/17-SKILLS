# Ícones

Os ícones `icon-192.png` e `icon-512.png` usados pelo manifesto do PWA devem ser
gerados a partir de `icon.svg`. Qualquer conversor (Inkscape, ImageMagick, um
site como maskable.app) serve.

Comandos sugeridos:

```bash
# via ImageMagick
convert -background none public/icons/icon.svg -resize 192x192 public/icons/icon-192.png
convert -background none public/icons/icon.svg -resize 512x512 public/icons/icon-512.png
```

Sem os PNGs o app continua funcionando — o navegador cai no SVG de favicon —
mas o botão "Instalar" fica mais bonito com ícones raster.
