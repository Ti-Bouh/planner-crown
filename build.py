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
pathlib.Path(__file__).with_name("index.html").write_text(out, encoding="utf-8")
print("index.html :", len(out), "octets")
