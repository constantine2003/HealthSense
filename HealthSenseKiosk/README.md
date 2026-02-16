
# HealthSenseKiosk

HealthSenseKiosk is a modern kiosk application built with Svelte, TypeScript, Vite, and Tailwind CSS. It is designed for touch-screen health checkup stations, providing a streamlined user experience for login, checkup, and history viewing. The project is structured for easy deployment and customization.

## Features

- **Touch-friendly UI**: Optimized for kiosk devices (e.g., Raspberry Pi 5)
- **Session management**: Welcome, login, and home screens with navigation
- **Custom virtual keyboard**: For secure username/password entry
- **Biometric integration**: Fingerprint modal for alternative login
- **Responsive design**: Tailwind CSS for modern look and feel
- **Easy extensibility**: Modular Svelte components and clear folder structure

## Folder Structure

```
HealthSenseKiosk/
├── index.html
├── package.json
├── postcss.config.js
├── svelte.config.js
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── public/
├── src/
│   ├── app.css
│   ├── App.svelte
│   ├── main.ts
│   ├── assets/
│   └── lib/
│       ├── components/
│       └── pages/
│           ├── home.svelte
│           ├── login.svelte
│           └── welcome.svelte
│   └── services/
```

## Getting Started

1. **Install dependencies**

	```bash
	npm install
	```

2. **Run the development server**

	```bash
	npm run dev
	```

3. **Build for production**

	```bash
	npm run build
	```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)

## Customization

- Modify Svelte components in `src/lib/pages/` and `src/lib/components/` for UI changes.
- Update styles in `src/app.css` or Tailwind config files.
- Add new features or screens as needed.

## License

See the [LICENSE](../LICENSE) file for details.

---

For more information or help, see the project [README](../README.md) or contact the maintainer.
