# Atitlán Vibes - Travel Events App

Una aplicación web de eventos de viaje construida con React + Vite, con soporte para Android mediante Capacitor.

## 🚀 Requisitos

- **Node.js** 18+
- **npm** 9+
- **Android Studio** (solo si vas a compilar para Android)

## 📦 Instalación

```bash
# Clonar o copiar el proyecto
cd atitlan-vibes

# Instalar dependencias
npm install
```

## 🛠️ Comandos de Desarrollo

### Servidor de desarrollo

```bash
npm run dev
```

Abre http://localhost:5173

### Compilar para producción

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## 📱 Android (Capacitor)

### Sincronizar cambios web con Android

Después de hacer cambios en el código web:

```bash
npm run build && npx cap sync
```

### Abrir en Android Studio

```bash
npx cap open android
```

### Generar APK/AAB

1. Abre Android Studio con `npx cap open android`
2. Ve a **Build → Generate Signed Bundle / APK**
3. Crea un keystore (primera vez) o usa uno existente
4. Selecciona **Android App Bundle** para Play Store o **APK** para pruebas

## 📁 Estructura del Proyecto

```
├── src/
│   ├── App.jsx          # Componente principal
│   ├── index.css        # Estilos globales
│   └── main.jsx         # Entry point
├── android/             # Proyecto Android (Capacitor)
├── dist/                # Build de producción (generado)
├── capacitor.config.json
├── vite.config.js
└── package.json
```

## 🔧 Configuración

- **App Name**: Atitlan Vibes
- **Bundle ID**: `com.atitlanvibes`
- **Web Dir**: `dist/`

## 📝 Archivos a compartir

Comparte TODO excepto:

- `node_modules/` (se regenera con `npm install`)
- `dist/` (se regenera con `npm run build`)

La forma más fácil es usar Git:

```bash
git init
git add .
git commit -m "Initial commit"
```

O comprime la carpeta excluyendo `node_modules` y `dist`.
