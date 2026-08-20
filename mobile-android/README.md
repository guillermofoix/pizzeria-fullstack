# 📱 Proyecto Móvil Nativo Android (Ciclo DAM - Módulo PMDM)

Este módulo permite a los alumnos de **2º DAM (Programación Multimedia y Dispositivos Móviles)** compilar la WebApp en una aplicación **`.apk` nativa de Android** para instalarla en cualquier smartphone real sin depender de navegadores web.

---

## 🛠️ Requisitos Previos en el Aula
1. **Node.js 18 o 20+** instalado en el puesto del alumno.
2. **Android Studio** instalado con el SDK de Android (versión API 33 o superior).

---

## 🚀 Pasos para Generar el APK en Clase:

### 1. Instalar dependencias de Capacitor:
```bash
cd mobile-android
npm install
```

### 2. Inicializar la plataforma Android:
```bash
npx cap add android
npx cap sync
```

### 3. Abrir el proyecto en Android Studio:
```bash
npx cap open android
```

### 4. Generar el archivo instalable `.apk`:
* En Android Studio: Menú **Build** ➔ **Build Bundle(s) / APK(s)** ➔ **Build APK(s)**.
* Se generará el archivo `app-debug.apk` listo para pasar por cable USB o subir a GitHub Releases.
