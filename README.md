# Polymer Reptation Lab - Monte Carlo Simulator

A high-performance, web-based visualization and analysis tool for **Polymer Reptation Monte Carlo (MC) Simulations**. This application simulates the movement of polymer chains within a crowded environment (quenched obstacles) on a 2D square lattice using Periodic Boundary Conditions (PBC).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg?style=flat&logo=tailwind-css)

## ⚛️ Physical Model

The simulation implements the **Reptation Model**, a theoretical framework developed by Pierre-Gilles de Gennes to describe the thermal motion of long linear polymer chains in entangled melts or porous media. 

In this implementation:
- **Lattice:** A 2D square grid with user-defined dimensions.
- **Dynamics:** A "snake-like" movement where a random end (head or tail) chooses a neighbor. If the move is valid (not occupied by an obstacle or another chain segment), the entire chain shifts along its contour "tube."
- **PBC:** Chains that move off one edge of the lattice reappear on the opposite side, simulating an infinite bulk system.
- **Obstacles:** Static, non-overlapping points that constrain the polymer's degrees of freedom, forcing reptation behavior.

## 🚀 Key Features

- **Interactive Visualization:** Real-time rendering of polymer chains and obstacles on an HTML5 Canvas.
- **Dynamic Configuration:**
  - Adjustable **Lattice Size** (L x L).
  - Variable **Number of Chains** and **Chain Length (N)**.
  - Custom **Obstacle Concentration** to study the transition from free diffusion to reptation.
  - Explicit **Max Steps Limit** for ensemble averaging.
- **Detailed Statistics:**
  - Root Mean Square (RMS) End-to-End Distance ($\langle R^2 \rangle^{1/2}$).
  - Radius of Gyration ($R_g$).
  - Acceptance Ratio tracking for simulation efficiency.
  - Real-time stability charts using Recharts.
- **AI Physicist Insight:** Integrates with the **Google Gemini API** to analyze the current statistical state and provide theoretical explanations regarding scaling laws and relaxation times.

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS
- **Visualization:** HTML5 Canvas API
- **Charts:** Recharts
- **AI Integration:** `@google/genai` (Gemini 3 Pro/Flash)

## 🚦 Getting Started

### Prerequisites

- A modern web browser.
- A Google Gemini API Key (for the "Analyze Summary Statistics" feature).

### Environment Variables

The application expects the following environment variable for AI insights:
- `API_KEY`: Your Google Gemini API key.

## 📊 Summary Statistics Explained

- **RMS End-to-End ($R$):** The typical distance between the first and last segment of a chain. In a random walk, $R \sim N^{1/2}$.
- **Radius of Gyration ($R_g$):** A measure of the space occupied by the polymer chain. For a linear chain, $R_g^2 = R^2/6$ in ideal conditions.
- **Acceptance Ratio:** The fraction of attempted Monte Carlo moves that were successful. High obstacle density or high chain concentration typically lowers this value.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

*Developed for educational and research purposes in Polymer Physics and Computational Chemistry.*