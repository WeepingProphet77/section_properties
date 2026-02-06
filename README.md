# Section Properties Calculator

A browser-based tool for structural engineers to calculate elastic and plastic section properties for arbitrary cross-sections. All calculations are performed client-side using US customary units (inches).

## Features

- **9 parametric shape templates** with live-updating dimensioned diagrams: Rectangle, Hollow Rectangle, Circle, Hollow Circle, T-Shape, L-Shape (Angle), C-Shape (Channel), Wide Flange (I-Shape), Double Angle
- **DXF file import** for custom cross-section geometry
- **Elastic properties**: Area, centroid, moments of inertia (Ix, Iy, Ixy), principal moments, section moduli, radii of gyration
- **Plastic properties**: Plastic neutral axes (PNA), plastic section moduli (Zx, Zy)
- **Interactive 2D workspace** with pan, zoom, coordinate grid, centroidal axes overlay, and PNA overlay
- **Results export** via clipboard copy or print/PDF
- **Dark mode** support

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Client-side only (no backend)

## Getting Started

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Build

```bash
npm run build
```
