Vendored brand marks for the partners page.

Two sources. The SVGs are either from Simple Icons (below) or supplied by Kuma (FIS, Glownet), recoloured to slate with metadata removed. The PNGs (BBVA, Bertelsmann, Bkstg, BSH, CaixaBank, Coca-Cola, constellr, ICF, Landmark, L'Oréal, Michelin, Microsoft, Nestlé, P&G, Rootstock Labs, Santander, Shiseido, Strands, Talkspace, Vistage) were supplied by Kuma as raster images, cropped to the artwork, converted to a single slate tone with the luminance mapped to transparency, and exported at 2x display size.

Source: Simple Icons (CC0 1.0), via the @iconify-json/simple-icons package. Each file is a single path, viewBox cropped to the artwork, fill baked to #5F7380 to match the site's muted slate.

The marks remain trademarks of their owners and are shown only to indicate where a partner has worked.

To add another logo: save a single-path SVG here, bake in fill="#5F7380", then in partners.html replace the matching <span class="client-name"> with
<img class="client-logo" src="assets/logos/NAME.svg" alt="Company" width="W" height="20" loading="lazy">
(use client-logo--wide for very wide wordmarks, 16px high).
