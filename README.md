# Polymer Reptation Lab - Monte Carlo Simulator

A high-performance, web-based visualization and analysis tool for **Polymer Reptation Monte Carlo (MC) Simulations**. This application simulates the movement of polymer chains within a crowded environment (quenched obstacles) on a 2D square lattice using Periodic Boundary Conditions (PBC).

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
  - To ensure every chain has an identical length $N$, the algorithm uses a **Grow-or-Retry** strategy. If a chain becomes trapped before reaching length $N$, it is discarded, and the growth process restarts from a new random location.

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
The instantaneous root-mean-square distance between the head and tail.

### 2. Vector Autocorrelation (C(t))
Measures the loss of memory of the initial chain configuration.

## 💻 Running Locally (Web Version)

1. **Install:** `npm install vite react react-dom recharts @google/genai`
2. **Key:** Add `VITE_API_KEY=your_key` to a `.env` file.
3. **Start:** `npx vite`

## 🐍 Standalone Python Version

A standalone Python implementation using Tkinter and Matplotlib is included as `standalone_python_version.py`.

### Running the Python Version:
1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Set API Key (Optional for AI features):**
   ```bash
   export API_KEY=your_gemini_api_key
   ```
3. **Run:**
   ```bash
   python standalone_python_version.py
   ```

---
Polymer Reptation Lab Simulator v1.1