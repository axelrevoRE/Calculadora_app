# Calculadora — Tradicional vs. Personalizado (Vite + React)

Proyecto listo para correr localmente y desplegar en Vercel/Netlify.

## Requisitos
- Node.js 18+
- npm 9+

## Ejecutar en local
```bash
npm install
npm run dev
# abre la URL que te muestra Vite (por ejemplo http://localhost:5173)
```

## Build de producción
```bash
npm run build
npm run preview
```

## Despliegue
- **Vercel**: conecta el repo y deja el _framework preset_ en **Vite**. Build: `npm run build`. Output: `dist/`.
- **Netlify**: Build: `npm run build`. Public dir: `dist/`.
- **Cloudflare Pages**: Build: `npm run build`. Output: `dist/`.

> Este proyecto usa Tailwind vía CDN en `index.html` para simplificar. Si prefieres integrar Tailwind con PostCSS, puedes hacerlo después.

## Nota de IP
- En `vite.config.js` se deshabilitan los **source maps** para proteger mejor el código.
- El bundle se entrega minificado por defecto.
