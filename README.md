# Paso a Paso

App personal de productividad gamificada: sumás puntos por cada actividad, cuidás la racha de Tito y canjeás "permitidos".
Es una PWA (se instala en el celular y en la compu) hecha con Vite, React y TypeScript, con Supabase de backend.

## Correrla en tu compu

Necesitás Node 20 o más nuevo.

```bash
npm install
npm run dev   # http://localhost:5173
```

El archivo `.env` ya trae la URL y la clave publicable del proyecto de Supabase `paso-a-paso` (son públicas). Para apuntar a otro proyecto, copiá `.env.example` a `.env.local` y completalo.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequea tipos y arma la versión final en `dist/` |
| `npm run preview` | Sirve `dist/` para probar la PWA instalable y el modo offline |
| `npm run lint` | Linter (oxlint) |
| `npm test` | Tests de las reglas de racha (vitest) |

## Configurar el login con Google (una sola vez)

1. **Supabase:** el proyecto `paso-a-paso` ya está creado y sus claves están en `.env`.
2. **Google Cloud:** en [console.cloud.google.com](https://console.cloud.google.com) creá un proyecto, configurá la pantalla de consentimiento (tipo *External*, en modo prueba, con tu cuenta como tester) y habilitá la **Google Calendar API**.
3. Creá una credencial **OAuth client ID** de tipo *Web application*. En *Authorized redirect URIs* poné la URL de callback que muestra Supabase en *Authentication > Sign In / Providers > Google* (es `https://izdfvzjkypcqxuspsxsm.supabase.co/auth/v1/callback`).
4. En Supabase, activá el proveedor **Google** y pegá el Client ID y el Client Secret.
5. En Supabase, *Authentication > URL Configuration*: agregá `http://localhost:5173` (y más adelante la URL donde se publique la app) en *Redirect URLs*.

El login pide permiso de **lectura** de Google Calendar, porque en la v1 se muestran los eventos en el calendario de la app. Como la app de Google queda en modo prueba, Google muestra un aviso de "app no verificada" la primera vez: es normal para uso personal.

## Estructura

```
src/
  lib/          cliente de Supabase, sesión, datos (data.ts) y reglas de racha (racha.ts)
  components/   Tito y la barra inferior
  screens/      entrada (login) y el armazón con las 4 secciones
supabase/migrations/  tablas, permisos (RLS) y reglas de la base
public/icons/   ícono de la app (cara de Tito); los PNG se generan con scripts/generate-icons.mjs
```

## Documentación de diseño

Las reglas del producto, las pantallas y las animaciones están en los documentos del proyecto (00 a 05) y la elección del stack en [docs/stack-tecnico.md](docs/stack-tecnico.md).

## Orden de construcción

1. ✅ PWA base + login con Google + Supabase
2. ✅ Modelo de datos y reglas de puntos/racha
3. Pantallas
4. Animaciones del doc 03
5. Notificaciones (pg_cron + Edge Function + Web Push)
