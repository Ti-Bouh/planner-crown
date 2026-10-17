"""Génère index.html (version GitHub Pages + Firebase) depuis la source de l'artifact."""
import sys, pathlib
src = pathlib.Path(sys.argv[1]).read_text()
shim = pathlib.Path(__file__).with_name("src").joinpath("firebase-shim.js").read_text()
anchor = "\n<script>\n"
assert src.count(anchor) == 1, "ancre <script> introuvable ou multiple"
out = src.replace(anchor, "\n<script>\n" + shim + "\n</script>" + anchor, 1)
head = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex">\n'
out = head + out.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '', 1)
# le reste du document (style + body) reste tel quel : les navigateurs ferment head/body seuls
# lien vers la page Calculs (calculs.html), ajouté à la barre des vues
LINK = '<div class="vgrp"><a class="vbtn" href="calculs.html" style="text-decoration:none">Calculs ↗</a></div>'
ANCHOR = '<div class="vgrp"><button type="button" class="vbtn" role="tab" data-view="outils" aria-selected="false">⚙ Réglages</button></div>'
if LINK not in out:
    if out.count(ANCHOR) == 1: out = out.replace(ANCHOR, ANCHOR + "\n    " + LINK, 1)
    else: print("attention : bouton Réglages introuvable, lien Calculs non ajouté")
pathlib.Path(__file__).with_name("index.html").write_text(out, encoding="utf-8")
print("index.html :", len(out), "octets")
