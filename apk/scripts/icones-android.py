# Gera os ícones do launcher do Android nos tamanhos que ele espera (o formato que funcionou no celular).
# Uso: python3 icones-android.py assets android/app/src/main/res ../icons
# Roda depois do capacitor-assets, que cria a tela de abertura; aqui só os ícones são refeitos.
#  - legado: 48dp x densidade (quadrado e redondo)
#  - adaptativo: camadas de 108dp x densidade (fundo e frente), sem inset
import os, sys
from PIL import Image, ImageDraw

assets, res, icons = sys.argv[1], sys.argv[2], sys.argv[3]
cheio = Image.open(os.path.join(assets, "icon-only.png")).convert("RGBA")        # icone cheio
frente = Image.open(os.path.join(assets, "icon-foreground.png")).convert("RGBA") # arte, fundo transparente
fundo = Image.open(os.path.join(assets, "icon-background.png")).convert("RGBA")  # degrade
arredondado = Image.open(os.path.join(icons, "icon-512.png")).convert("RGBA")    # cantos arredondados
dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for nome, e in dens.items():
    p = os.path.join(res, "mipmap-" + nome); os.makedirs(p, exist_ok=True)
    n = round(48 * e); t = round(108 * e)
    arredondado.resize((n, n), Image.LANCZOS).save(os.path.join(p, "ic_launcher.png"))
    q = cheio.resize((n, n), Image.LANCZOS)
    m = Image.new("L", (n, n), 0); ImageDraw.Draw(m).ellipse((0, 0, n - 1, n - 1), fill=255)
    r = Image.new("RGBA", (n, n), (0, 0, 0, 0)); r.paste(q, (0, 0), m); r.save(os.path.join(p, "ic_launcher_round.png"))
    frente.resize((t, t), Image.LANCZOS).save(os.path.join(p, "ic_launcher_foreground.png"))
    fundo.resize((t, t), Image.LANCZOS).save(os.path.join(p, "ic_launcher_background.png"))
any26 = os.path.join(res, "mipmap-anydpi-v26"); os.makedirs(any26, exist_ok=True)
xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
for f in ("ic_launcher.xml", "ic_launcher_round.xml"):
    open(os.path.join(any26, f), "w", encoding="utf-8").write(xml)
print("icones gerados em", res)
