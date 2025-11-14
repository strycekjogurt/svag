#!/bin/bash
# Script pro vytvoření CRX balíčku Chrome Extension
# Použití: ./build-crx.sh

echo "🎨 Building SVAG Chrome Extension CRX..."
echo ""

# Barvy pro výstup
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Název výstupního souboru
OUTPUT_FILE="svag-extension.crx"
PEM_FILE="svag-extension.pem"
TEMP_DIR="extension-temp"

# Smazat starý CRX pokud existuje
if [ -f "$OUTPUT_FILE" ]; then
    echo -e "${YELLOW}⚠️  Odstraňuji starý CRX soubor${NC}"
    rm "$OUTPUT_FILE"
fi

# Vytvořit dočasný adresář pro extension soubory
echo -e "${BLUE}📦 Připravuji soubory rozšíření...${NC}"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Zkopírovat všechny potřebné soubory
cp manifest.json "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp popup.js "$TEMP_DIR/"
cp popup.css "$TEMP_DIR/"
cp content.js "$TEMP_DIR/"
cp content.css "$TEMP_DIR/"
cp background.js "$TEMP_DIR/"
cp config.js "$TEMP_DIR/"
cp -r icons "$TEMP_DIR/"
mkdir -p "$TEMP_DIR/Gallery"
cp Gallery/gallery-sync.js "$TEMP_DIR/Gallery/"

echo -e "${BLUE}🔐 Vytváření CRX balíčku...${NC}"

# Použít Chrome/Chromium CLI pro vytvoření CRX
# Najít Chrome executable
CHROME=""
if [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [ -f "/Applications/Chromium.app/Contents/MacOS/Chromium" ]; then
    CHROME="/Applications/Chromium.app/Contents/MacOS/Chromium"
elif command -v google-chrome &> /dev/null; then
    CHROME="google-chrome"
elif command -v chromium &> /dev/null; then
    CHROME="chromium"
fi

if [ -z "$CHROME" ]; then
    echo -e "${YELLOW}⚠️  Chrome není nalezen. Vytvářím ZIP balíček místo CRX.${NC}"
    echo -e "${BLUE}💡 Pro instalaci použij Developer Mode v chrome://extensions/${NC}"
    
    # Vytvořit ZIP místo CRX
    cd "$TEMP_DIR"
    zip -r "../svag-extension-manual.zip" . -x "*.DS_Store"
    cd ..
    
    echo ""
    echo -e "${GREEN}✅ ZIP balíček vytvořen: svag-extension-manual.zip${NC}"
    echo ""
    SIZE=$(du -h "svag-extension-manual.zip" | cut -f1)
    echo -e "${BLUE}📊 Velikost: $SIZE${NC}"
else
    # Vytvořit PEM klíč pokud neexistuje
    if [ ! -f "$PEM_FILE" ]; then
        echo -e "${BLUE}🔑 Generuji privátní klíč...${NC}"
    fi
    
    # Použít Chrome k vytvoření CRX
    "$CHROME" --pack-extension="$TEMP_DIR" --pack-extension-key="$PEM_FILE" 2>/dev/null
    
    # Chrome vytvoří soubor s .crx příponou v parent adresáři temp složky
    if [ -f "${TEMP_DIR}.crx" ]; then
        mv "${TEMP_DIR}.crx" "$OUTPUT_FILE"
        echo ""
        echo -e "${GREEN}✅ CRX balíček vytvořen: $OUTPUT_FILE${NC}"
        echo ""
        SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
        echo -e "${BLUE}📊 Velikost: $SIZE${NC}"
    else
        echo -e "${YELLOW}⚠️  Chyba při vytváření CRX. Vytvářím ZIP místo toho.${NC}"
        cd "$TEMP_DIR"
        zip -r "../svag-extension-manual.zip" . -x "*.DS_Store"
        cd ..
        echo -e "${GREEN}✅ ZIP balíček vytvořen: svag-extension-manual.zip${NC}"
    fi
fi

# Vyčistit temp adresář
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}✨ Hotovo!${NC}"
echo ""
echo "📝 Jak nainstalovat:"
if [ -f "$OUTPUT_FILE" ]; then
    echo "  1. Otevři Chrome a jdi na: chrome://extensions/"
    echo "  2. Zapni 'Developer mode' (vpravo nahoře)"
    echo "  3. Přetáhni soubor $OUTPUT_FILE do okna Chrome"
    echo "  4. Potvrď instalaci"
else
    echo "  1. Otevři Chrome a jdi na: chrome://extensions/"
    echo "  2. Zapni 'Developer mode' (vpravo nahoře)"
    echo "  3. Klikni 'Load unpacked'"
    echo "  4. Rozbal svag-extension-manual.zip a vyber složku"
fi
echo ""

