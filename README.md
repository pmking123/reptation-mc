
# Polymer Reptation Lab - Monte Carlo Simulator

A high-performance, web-based visualization and analysis tool for **Polymer Reptation Monte Carlo (MC) Simulations**. This application simulates the movement of polymer chains within a crowded environment (quenched obstacles) on a 2D square lattice using Periodic Boundary Conditions (PBC).

## ⚛️ Physical Model

The simulation implements the **Reptation Model** to describe the thermal motion of long linear polymer chains.

- **Dynamics:** "Snake-like" movement where a random end moves to a neighbor, and the rest of the chain follows the contour.
- **Multi-Chain Ensemble:** When multiple chains are present, statistics are calculated as **instantaneous ensemble averages** over all $M$ chains.

## 📊 Summary Statistics Explained

For a system with $M$ chains of length $N$:

### 1. RMS End-to-End Distance ($\langle R^2 \rangle^{1/2}$)
The instantaneous root-mean-square distance between the head and tail of all chains:

$$\text{RMS} = \sqrt{\frac{1}{M} \sum_{i=1}^{M} |\mathbf{R}_i(t)|^2}$$

*Calculation Note:* $\mathbf{R}_i(t)$ is the "unwrapped" vector, meaning it accounts for crossings of the Periodic Boundary Conditions to represent the true physical length of the chain.

### 2. Vector Autocorrelation ($C(t)$)
Measures the loss of memory of the initial chain configuration. It is the ensemble-averaged dot product of the current end-to-end vector with the initial vector, normalized:

$$C(t) = \frac{\sum_{i=1}^{M} \mathbf{R}_i(t) \cdot \mathbf{R}_i(0)}{\sum_{i=1}^{M} \mathbf{R}_i(0) \cdot \mathbf{R}_i(0)}$$

In the reptation regime, this decay tracks the time it takes for a chain to escape its initial primitive path "tube."

### 3. Radius of Gyration ($R_g$)
Calculated from the distribution of segments relative to the chain's center of mass:

$$R_g^2 = \frac{1}{M} \sum_{i=1}^{M} \left( \frac{1}{N} \sum_{j=1}^{N} (\mathbf{r}_{i,j} - \mathbf{r}_{i,cm})^2 \right)$$

## 🚀 Key Features
- **Real-time Ensemble Stats:** Observe how the average of 100 chains is much more stable than a single chain.
- **AI Physicist Insight:** Gemini 3 analyzes these ensemble averages to predict if your system is in the "entangled" or "Rouse" regime.
