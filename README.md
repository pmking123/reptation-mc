# Polymer Reptation Lab - Monte Carlo Simulator

A high-performance, web-based visualization and analysis tool for **Polymer Reptation Monte Carlo (MC) Simulations**. This application simulates the movement of polymer chains within a crowded environment using a lattice-based Monte Carlo approach.

## ⚛️ Physical Model

The simulation implements the **Reptation Model** to describe the thermal motion of long linear polymer chains in a confined environment.

- **Dynamics:** "Snake-like" movement where a random end moves to a neighbor, and the rest of the chain follows the contour.
- **Multi-Chain Ensemble:** Statistics are calculated as instantaneous ensemble averages over all $M$ chains to provide stable physical insights.

## 🛠 Simulation Algorithm

The simulator employs a lattice-based Monte Carlo approach with the following steps:

### 1. Initialization
- **Lattice Setup:** A square lattice of size $L \times L$ is initialized with Periodic Boundary Conditions (PBC).
- **Obstacle Placement:** Static obstacles are randomly placed until the target concentration is reached. These sites are "quenched" and remain impassable throughout the simulation.
- **Chain Growth (Guaranteed Uniform Length):** 
  - Each chain is grown segment-by-segment from a random starting point.
  - To ensure every chain has an identical length $N$, the algorithm uses a **Grow-or-Retry** strategy. If a chain becomes trapped before reaching length $N$, it is discarded, and the growth process restarts.

### 2. The Reptation Step (Monte Carlo Move)
In each attempt for a single chain:
1. **End Selection:** One of the two ends (Head or Tail) of the chain is selected with 50% probability.
2. **Move Attempt:** A random neighboring site of the selected end is chosen.
3. **Constraint Check:** The move is rejected if the target site is:
   - Occupied by an obstacle.
   - Occupied by another segment (Excluded Volume).
4. **Propagation:** If accepted:
   - The selected end moves to the new site.
   - All other segments move into the position previously held by their neighbor in the chain.
   - The segment at the opposite end is removed from its old site.

### 3. Ensemble Sweeps
- A "Sweep" (the unit of simulation time in this app) consists of $M$ individual reptation attempts (where $M$ is the number of chains).
- This ensures that on average, every chain in the ensemble has an opportunity to move once per time step.

## 📊 Summary Statistics Explained

For a system with $M$ chains of length $N$:

### 1. RMS End-to-End Distance (⟨R²⟩¹ᐟ²)

The instantaneous root-mean-square distance between the head and tail:

$$\text{RMS} = \sqrt{\frac{1}{M} \sum_{i=1}^{M} |\mathbf{R}_i(t)|^2}$$

*Calculation Note:* $\mathbf{R}_i(t)$ is the "unwrapped" vector, accounting for PBC crossings to represent the true physical expansion.

### 2. Vector Autocorrelation (C(t))

Measures the loss of memory of the initial chain configuration:

$$C(t) = \frac{\sum_{i=1}^{M} \mathbf{R}_i(t) \cdot \mathbf{R}_i(0)}{\sum_{i=1}^{M} \mathbf{R}_i(0) \cdot \mathbf{R}_i(0)}$$

In the reptation regime, this tracks the "tube renewal" time.

### 3. Radius of Gyration ($R_g$)

Describes the typical "size" of the chain's spatial distribution:

$$R_g^2 = \frac{1}{M} \sum_{i=1}^{M} \left( \frac{1}{N} \sum_{j=1}^{N} (\mathbf{r}_{i,j} - \mathbf{r}_{i,cm})^2 \right)$$

## 🚀 Key Features

- **Deterministic Chain Length:** Advanced initialization logic guarantees $N$ segments per chain.
- **Real-time Visualization:** High-performance Canvas rendering of polymer dynamics.
- **AI Physicist Insight:** Gemini 3 analyzes ensemble averages to identify scaling regimes and relaxation times.
- **Data Export:** Generate comprehensive Markdown lab reports for documentation.

---

## 💻 Running Locally

To run this simulation on your local machine, follow these steps:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Gemini API Key](https://aistudio.google.com/app/apikey) for the AI analysis features.

### 2. Installation
Clone or download this repository and install the dependencies:
```bash
# Initialize npm if you haven't already
npm init -y

# Install required libraries
npm install vite react react-dom recharts @google/genai @types/react @types/react-dom
```

### 3. Environment Setup
The app uses `process.env.API_KEY` for Gemini integration. Create a `.env` file in the project root:
```env
VITE_API_KEY=your_gemini_api_key_here
```

### 4. Vite Configuration
Create a `vite.config.ts` file in the root directory to bridge the environment variables to the app:
```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY)
    }
  };
});
```

### 5. Start Development Server
```bash
npx vite
```
The app will be available at `http://localhost:5173`.

---
Polymer Reptation Lab Simulator v1.1