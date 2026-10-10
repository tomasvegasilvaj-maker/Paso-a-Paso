# Paso a Paso — Stack técnico

10 oct 2026 · Confirmado por Tomi el 10 oct 2026.

## Recomendación

**PWA (Vite + React + TypeScript + vite-plugin-pwa) con Supabase como backend.**
Sin FastAPI, sin tiendas de apps. Costo: $0.

Por qué, en una línea: el doc 01 ya fija que la app es una PWA para celular y compu, el lienzo y las animaciones del doc 03 ya están hechos en HTML/CSS/SVG (se reusan casi tal cual), y es la única opción sin costo de tiendas.

## Comparación

| Criterio | PWA | Flutter | React Native (Expo) | Backend FastAPI |
| --- | --- | --- | --- | --- |
| Celular + compu con un código | Sí, nativo de la web | Sí, pero la versión web es pesada | Web vía react-native-web, floja | No es frontend: igual falta la app |
| Reusar lienzo y animaciones (doc 03) | Directo (CSS/SVG) | Reescribir todo en Dart | Reescribir con Reanimated | — |
| Notificaciones a hora fija | Push web desde servidor (ver abajo) | Locales programadas, muy confiables | Locales programadas, muy confiables | Puede enviar push, pero hay que hostearlo |
| iPhone | Push solo si se instala en inicio (iOS 16.4+) | Sí | Sí | — |
| Offline | Service worker + IndexedDB | Bueno | Bueno | — |
| Lenguaje | TypeScript | Dart (nuevo) | TypeScript | Python (el que ya sabés) |
| Costo | $0 | Play Store US$25 único; App Store US$99/año | Igual que Flutter | Hosting gratis que se duerme (Render) o pago |
| Actualizar | Se actualiza sola al abrir | Pasar por la tienda | Expo OTA o tienda | — |

**FastAPI queda afuera** porque no resuelve la app que ves: es solo backend, y Supabase ya da base de datos, login con Google y funciones programadas sin mantener un servidor. Python sigue sirviendo para scripts sueltos (por ejemplo migrar o analizar datos), no hace falta en el núcleo.

**Flutter / React Native** ganan solo en notificaciones locales confiables. Si la PWA falla en eso en la práctica, la salida es empaquetar la misma web con Capacitor (Android) sin reescribir nada.

## El punto delicado: notificaciones

Una PWA **no puede programar notificaciones locales** a una hora (la API de Notification Triggers se abandonó). Las de 8:55, 11:30 y 22:15 tienen que salir **desde un servidor** como Web Push:

- `pg_cron` en Supabase dispara una Edge Function a horario (ojo: cron en UTC, 8:55 ART = 11:55 UTC).
- La función revisa condiciones (por ejemplo "fueguito en peligro" solo si el día < 2000) y manda el push con claves VAPID.
- Las que dependen de una acción (permitido disponible, hito de racha) se pueden disparar desde el cliente o desde un trigger de la base.
- Android: funciona con la PWA instalada o no. iPhone: solo instalada en pantalla de inicio.

## Supabase vs Firebase (pendiente del doc 00)

Las notificaciones programadas inclinan la balanza a **Supabase**:

| | Supabase (gratis) | Firebase (gratis) |
| --- | --- | --- |
| Tareas programadas | pg_cron + Edge Functions, incluidas | Cloud Functions requieren plan Blaze (tarjeta cargada, aunque tenga cuota gratis) |
| Modelo de datos | Postgres: historial con fecha/nombre/puntaje, sumas por día y semana con SQL | Firestore: agregados más incómodos |
| Offline | No trae: hay que hacerlo (cola local en IndexedDB y sincronizar) | Firestore lo trae de fábrica |
| Contra | El proyecto gratis se pausa tras 7 días sin uso (con uso diario no pasa) | Tarjeta para las funciones |

**No está firme:** si preferís offline sin trabajo extra y no te molesta cargar tarjeta, Firebase también sirve.

## Offline (con Supabase)

- Service worker (vite-plugin-pwa / Workbox) cachea la app.
- Cada tilde se guarda primero en IndexedDB (Dexie) y se sube cuando hay red. Los puntos del día y la billetera se calculan localmente y se reconcilian con el servidor.
- Las actividades son fijas y personales: conflictos casi imposibles, alcanza con "último gana" por id de actividad y día.

## Google Calendar (v1, solo lectura)

- Login con Google en Supabase pidiendo el scope `calendar.readonly`; el token de Google se usa desde el cliente para leer eventos.
- El token dura 1 hora: al vencer se vuelve a pedir en silencio. Como es uso personal, la app de Google Cloud puede quedar en modo prueba con tu cuenta como tester.

## Orden de construcción (sin cambios respecto del doc 00)

1. PWA base + login con Google + Supabase.
2. Modelo de datos y reglas de puntos/racha (con tests).
3. Pantallas.
4. Animaciones del doc 03.
5. Notificaciones (pg_cron + Edge Function + Web Push).
