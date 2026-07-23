Drop your licensed Rigid Square (Dharma Type) files here with these exact
names, and poster-generator.html will pick them up automatically via the
@font-face rules at the top of its <style> block:

  RigidSquare-Light.woff2   (+ .woff fallback, optional)
  RigidSquare-Bold.woff2    (+ .woff fallback, optional)
  RigidSquare-Italic.woff2  (+ .woff fallback, optional)

Sizing rule used throughout the generator (applied per text layer, not
guessed per element):
  >= 16px  -> Bold
  12-14px  -> Light (registered as "regular")
Italic is registered at both weight 300 and 700, pointing at the same
Italic file, so italic text at any size resolves correctly regardless of
which weight the rule assigns it.

Until these files are added, the browser silently falls back to Inter at
matching weights so the tool still runs, just not with the exact typeface.

Rigid Square is a commercial font by Dharma Type. License it via Adobe
Fonts, Fontspring, or MyFonts if you don't already have web-font files.
