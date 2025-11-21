# Ikony Extension

Do této složky umístěte následující soubory:

- `icon16.png` (16x16 px)
- `icon48.png` (48x48 px)
- `icon128.png` (128x128 px)

## Vytvoření ikon

### Možnost 1: Online nástroje
- [Favicon Generator](https://www.favicon-generator.org/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### Možnost 2: Grafický editor
- Vytvořte čtvercový obrázek s SVG ikonou nebo logem
- Exportujte ve třech velikostech: 16x16, 48x48, 128x128 px
- Uložte jako PNG s transparentním pozadím

### Možnost 3: Příkazová řádka (s ImageMagick)

```bash
# Pokud máte SVG soubor
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

## Doporučení
- Použijte jednoduchou ikonu s dobrým kontrastem
- PNG soubory by měly mít transparentní pozadí
- Ikona by měla být dobře viditelná i v malé velikosti (16x16)










