
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import random
import math
import time
import os
import threading
import sys

# Try to import Google GenAI SDK
try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    print("Warning: google-genai package not found. AI features disabled.")

class SimulationParams:
    def __init__(self):
        self.lattice_size = 50
        self.num_chains = 15
        self.chain_length = 20
        self.obstacle_concentration = 0.12
        self.max_steps = 50000 # Default sweeps
        self.simulation_speed = 100 # Steps per frame

class SimulationStats:
    def __init__(self):
        self.steps = 0
        self.rms_end_to_end = 0.0
        self.mean_end_to_end = 0.0
        self.radius_of_gyration = 0.0
        self.mean_radius_of_gyration = 0.0
        self.autocorrelation = 1.0
        self.raw_autocorrelation = 0.0
        self.acceptance_ratio = 0.0
        self.successful_moves = 0
        self.is_finished = False

class SimulationEngine:
    def __init__(self, params):
        self.params = params
        self.chains = []
        self.obstacles = set()
        self.occupied = {}
        self.initial_r0 = []
        self.initial_r0_sq_sum = 0.0
        self.steps = 0
        self.successful_moves = 0
        
        # History for graphs (keep last 200 points for performance)
        self.history_steps = []
        self.history_rms = []
        self.history_auto = []
        
        self.reset()

    def reset(self):
        self.steps = 0
        self.successful_moves = 0
        self.obstacles = set()
        self.occupied = {}
        self.chains = []
        self.initial_r0 = []
        self.initial_r0_sq_sum = 0.0
        self.history_steps = []
        self.history_rms = []
        self.history_auto = []

        L = self.params.lattice_size
        
        # Initialize Obstacles
        total_sites = L * L
        num_obstacles = int(total_sites * self.params.obstacle_concentration)
        placed = 0
        while placed < num_obstacles:
            x = random.randint(0, L - 1)
            y = random.randint(0, L - 1)
            key = f"{x},{y}"
            if key not in self.obstacles:
                self.obstacles.add(key)
                placed += 1

        # Initialize Chains (Grow-or-Retry)
        for _ in range(self.params.num_chains):
            for _ in range(200): # Attempts
                temp_chain = []
                start_x = random.randint(0, L - 1)
                start_y = random.randint(0, L - 1)
                
                if self.is_site_occupied(start_x, start_y):
                    continue
                
                temp_chain.append({'x': start_x, 'y': start_y})
                self.increment_occupancy(start_x, start_y)
                
                growth_failed = False
                for _ in range(1, self.params.chain_length):
                    last = temp_chain[-1]
                    neighbors = self.get_neighbors(last['x'], last['y'])
                    valid_neighbors = [p for p in neighbors if not self.is_site_occupied(p['x'], p['y'])]
                    
                    if valid_neighbors:
                        next_pos = random.choice(valid_neighbors)
                        temp_chain.append(next_pos)
                        self.increment_occupancy(next_pos['x'], next_pos['y'])
                    else:
                        growth_failed = True
                        break
                
                if not growth_failed and len(temp_chain) == self.params.chain_length:
                    self.chains.append(temp_chain)
                    break
                else:
                    # Rollback
                    for p in temp_chain:
                        self.decrement_occupancy(p['x'], p['y'])

        # Capture initial configuration
        for chain in self.chains:
            r0 = self.get_unwrapped_end_to_end(chain)
            self.initial_r0.append(r0)
            self.initial_r0_sq_sum += (r0['x']**2 + r0['y']**2)

    def increment_occupancy(self, x, y):
        key = f"{x},{y}"
        self.occupied[key] = self.occupied.get(key, 0) + 1

    def decrement_occupancy(self, x, y):
        key = f"{x},{y}"
        count = self.occupied.get(key, 0)
        if count <= 1:
            if key in self.occupied:
                del self.occupied[key]
        else:
            self.occupied[key] = count - 1

    def is_site_occupied(self, x, y):
        key = f"{x},{y}"
        return (key in self.obstacles) or (key in self.occupied)

    def get_neighbors(self, x, y):
        L = self.params.lattice_size
        return [
            {'x': (x + 1) % L, 'y': y},
            {'x': (x - 1 + L) % L, 'y': y},
            {'x': x, 'y': (y + 1) % L},
            {'x': x, 'y': (y - 1 + L) % L}
        ]

    def get_unwrapped_end_to_end(self, chain):
        L = self.params.lattice_size
        rx, ry = 0, 0
        for i in range(len(chain) - 1):
            p1 = chain[i]
            p2 = chain[i + 1]
            dx = p2['x'] - p1['x']
            dy = p2['y'] - p1['y']
            if dx > 1: dx -= L
            elif dx < -1: dx += L
            if dy > 1: dy -= L
            elif dy < -1: dy += L
            rx += dx
            ry += dy
        return {'x': rx, 'y': ry}

    def step(self):
        if self.steps >= self.params.max_steps:
            return
        
        attempts = max(1, self.params.num_chains)
        for _ in range(attempts):
            self.reptate()
        self.steps += 1

    def reptate(self):
        if not self.chains:
            return
        
        chain_idx = random.randint(0, len(self.chains) - 1)
        chain = self.chains[chain_idx]
        
        is_head = random.random() < 0.5
        head_pos = chain[0] if is_head else chain[-1]
        tail_pos = chain[-1] if is_head else chain[0]
        
        neighbors = self.get_neighbors(head_pos['x'], head_pos['y'])
        valid_moves = []
        
        for p in neighbors:
            key = f"{p['x']},{p['y']}"
            if key in self.obstacles:
                continue
            
            occ_count = self.occupied.get(key, 0)
            if occ_count == 0:
                valid_moves.append(p)
            elif p['x'] == tail_pos['x'] and p['y'] == tail_pos['y'] and occ_count == 1:
                valid_moves.append(p)
                
        if valid_moves:
            next_pos = random.choice(valid_moves)
            self.decrement_occupancy(tail_pos['x'], tail_pos['y'])
            if is_head:
                chain.insert(0, next_pos)
                chain.pop()
            else:
                chain.append(next_pos)
                chain.pop(0)
            self.increment_occupancy(next_pos['x'], next_pos['y'])
            self.successful_moves += 1

    def get_stats(self):
        stats = SimulationStats()
        stats.steps = self.steps
        stats.successful_moves = self.successful_moves
        stats.is_finished = self.steps >= self.params.max_steps
        
        if not self.chains:
            return stats

        L = self.params.lattice_size
        sum_r2 = 0.0
        sum_r = 0.0
        sum_rg2 = 0.0
        sum_rg = 0.0
        sum_dot = 0.0
        
        for idx, chain in enumerate(self.chains):
            # End-to-End
            r_unwrapped = self.get_unwrapped_end_to_end(chain)
            r2 = r_unwrapped['x']**2 + r_unwrapped['y']**2
            sum_r2 += r2
            sum_r += math.sqrt(r2)
            
            # Radius of Gyration
            curr_x, curr_y = 0, 0
            chain_u_x = [0]
            chain_u_y = [0]
            for i in range(len(chain) - 1):
                p1 = chain[i]
                p2 = chain[i+1]
                dx = p2['x'] - p1['x']
                dy = p2['y'] - p1['y']
                if dx > 1: dx -= L
                elif dx < -1: dx += L
                if dy > 1: dy -= L
                elif dy < -1: dy += L
                curr_x += dx
                curr_y += dy
                chain_u_x.append(curr_x)
                chain_u_y.append(curr_y)
            
            mean_x = sum(chain_u_x) / len(chain)
            mean_y = sum(chain_u_y) / len(chain)
            
            rg2 = 0.0
            for i in range(len(chain)):
                rg2 += (chain_u_x[i] - mean_x)**2 + (chain_u_y[i] - mean_y)**2
            rg2 /= len(chain)
            sum_rg2 += rg2
            sum_rg += math.sqrt(rg2)
            
            # Autocorrelation
            r0 = self.initial_r0[idx]
            sum_dot += (r_unwrapped['x'] * r0['x'] + r_unwrapped['y'] * r0['y'])

        N = len(self.chains)
        stats.rms_end_to_end = math.sqrt(sum_r2 / N)
        stats.mean_end_to_end = sum_r / N
        stats.radius_of_gyration = math.sqrt(sum_rg2 / N)
        stats.mean_radius_of_gyration = sum_rg / N
        
        initial_avg_r2 = self.initial_r0_sq_sum / N if N > 0 else 1
        stats.autocorrelation = sum_dot / initial_avg_r2 if initial_avg_r2 != 0 else 0
        stats.raw_autocorrelation = sum_dot / N
        
        if self.steps > 0:
            stats.acceptance_ratio = self.successful_moves / (self.steps * N)

        # Update History
        if self.steps % 100 == 0: # Downsample
            self.history_steps.append(self.steps)
            self.history_rms.append(stats.rms_end_to_end)
            self.history_auto.append(stats.autocorrelation)
            if len(self.history_steps) > 200:
                self.history_steps.pop(0)
                self.history_rms.pop(0)
                self.history_auto.pop(0)

        return stats

class GraphCanvas(tk.Canvas):
    def __init__(self, parent, width, height, color, title):
        super().__init__(parent, width=width, height=height, bg="#1e293b", highlightthickness=0)
        self.line_color = color
        self.title_text = title

    def draw_graph(self, data, y_min=None, y_max=None):
        self.delete("all")
        w = self.winfo_width()
        h = self.winfo_height()
        
        if w < 10 or h < 10: return # Not rendered yet

        # Title
        self.create_text(10, 10, text=self.title_text, fill="#94a3b8", anchor="nw", font=("Helvetica", 8, "bold"))

        if not data or len(data) < 2:
            return

        if y_min is None: y_min = min(data)
        if y_max is None: y_max = max(data)
        
        # Add small padding to range to check for zero division
        if abs(y_max - y_min) < 0.0001: 
            y_max += 0.1
            y_min -= 0.1
        
        padding = 20
        graph_w = w - padding * 2
        graph_h = h - padding * 2
        
        points = []
        for i, val in enumerate(data):
            x = padding + (i / (len(data) - 1)) * graph_w
            # Invert Y: higher value = smaller y
            y = h - padding - ((val - y_min) / (y_max - y_min)) * graph_h
            points.append((x, y))

        self.create_line(points, fill=self.line_color, width=2, smooth=True)
        
        # Draw min/max text
        self.create_text(w-5, padding, text=f"{y_max:.2f}", fill="#64748b", font=("Arial", 7), anchor="e")
        self.create_text(w-5, h-padding, text=f"{y_min:.2f}", fill="#64748b", font=("Arial", 7), anchor="e")

class SummaryDialog(tk.Toplevel):
    def __init__(self, parent, stats, params):
        super().__init__(parent)
        self.title("Simulation Finished - Summary")
        self.geometry("600x700")
        self.configure(bg="#0f172a")
        
        self.stats = stats
        self.params = params
        
        # Make modal
        self.transient(parent)
        self.grab_set()
        
        # Header
        tk.Label(self, text="SIMULATION REPORT", fg="white", bg="#0f172a", font=("Helvetica", 16, "bold")).pack(pady=20)
        
        stats_frame = tk.Frame(self, bg="#1e293b", padx=20, pady=20)
        stats_frame.pack(fill=tk.X, padx=20)
        
        grid = tk.Frame(stats_frame, bg="#1e293b")
        grid.pack(fill=tk.X)
        
        self.add_stat(grid, 0, 0, "Total Sweeps", f"{stats.steps}")
        self.add_stat(grid, 0, 1, "Acceptance Ratio", f"{stats.acceptance_ratio:.2%}")
        self.add_stat(grid, 1, 0, "RMS End-to-End", f"{stats.rms_end_to_end:.3f}")
        self.add_stat(grid, 1, 1, "Radius of Gyration", f"{stats.radius_of_gyration:.3f}")
        self.add_stat(grid, 2, 0, "Autocorrelation", f"{stats.autocorrelation:.4f}")
        self.add_stat(grid, 2, 1, "Raw Correlation", f"{stats.raw_autocorrelation:.2f}")

        # AI Section
        self.ai_frame = tk.Frame(self, bg="#0f172a", pady=20)
        self.ai_frame.pack(fill=tk.BOTH, expand=True, padx=20)
        
        self.btn_ai = tk.Button(self.ai_frame, text="✨ Analyze Results with AI", command=self.run_ai_analysis, 
                           bg="#4f46e5", fg="white", font=("Helvetica", 11, "bold"), padx=15, pady=10, relief=tk.FLAT)
        self.btn_ai.pack(anchor="w", fill=tk.X)
        
        if not GENAI_AVAILABLE:
            self.btn_ai.config(state=tk.DISABLED, text="AI SDK Not Found (pip install google-genai)", bg="#334155")
        
        self.ai_output = tk.Text(self.ai_frame, bg="#1e293b", fg="#cbd5e1", font=("Consolas", 10), wrap=tk.WORD, height=15, relief=tk.FLAT, padx=10, pady=10)
        self.ai_output.pack(fill=tk.BOTH, expand=True, pady=10)
        
        # Close Button
        tk.Button(self, text="Close", command=self.destroy, bg="#334155", fg="white", padx=20).pack(pady=10)

    def add_stat(self, parent, r, c, label, value):
        f = tk.Frame(parent, bg="#1e293b", pady=5)
        f.grid(row=r, column=c, sticky="ew", padx=10)
        tk.Label(f, text=label, fg="#94a3b8", bg="#1e293b", font=("Helvetica", 9)).pack(anchor="w")
        tk.Label(f, text=value, fg="white", bg="#1e293b", font=("Helvetica", 12, "bold")).pack(anchor="w")
        parent.columnconfigure(c, weight=1)

    def run_ai_analysis(self):
        self.ai_output.delete("1.0", tk.END)
        self.ai_output.insert("1.0", "Consulting AI physicist... please wait...")
        self.btn_ai.config(state=tk.DISABLED, text="Analyzing...")
        
        # Run in thread
        threading.Thread(target=self._ai_thread, daemon=True).start()

    def _ai_thread(self):
        api_key = os.environ.get("VITE_API_KEY") # Attempt to read from common env pattern
        if not api_key:
             # Try to find .env file
            try:
                if os.path.exists(".env"):
                    with open(".env", "r") as f:
                        for line in f:
                            if line.startswith("VITE_API_KEY="):
                                api_key = line.strip().split("=")[1]
                                break
            except:
                pass
        
        # Also try just API_KEY
        if not api_key:
            api_key = os.environ.get("API_KEY")

        if not api_key:
            self.update_ai_text("Error: VITE_API_KEY not found in environment or .env file.\nPlease create a .env file with VITE_API_KEY=your_key")
            return

        try:
            client = genai.Client(api_key=api_key)
            
            prompt = f"""
            Analyze the following polymer reptation Monte Carlo simulation results:
            - Lattice: {self.params.lattice_size}x{self.params.lattice_size}
            - Chains: {self.params.num_chains}, Length (N): {self.params.chain_length}
            - Obstacle Density: {self.params.obstacle_concentration * 100:.1f}%
            - Sweeps Completed: {self.stats.steps}
            - RMS End-to-End: {self.stats.rms_end_to_end:.3f}
            - Radius of Gyration: {self.stats.radius_of_gyration:.3f}
            - Autocorrelation: {self.stats.autocorrelation:.3f}
            - Acceptance Ratio: {self.stats.acceptance_ratio:.2%}
            
            Explain the physical significance of the autocorrelation decay. If it's still near 1.0, what does that say about the relaxation time relative to the simulation duration? Mention how the obstacle density affects the 'tube' width in the De Gennes reptation model. Use professional physics terminology.
            """
            
            response = client.models.generate_content(
                model='gemini-2.0-flash-exp', 
                contents=prompt
            )
            
            self.update_ai_text(response.text)
            
        except Exception as e:
            self.update_ai_text(f"AI Analysis Failed: {str(e)}")

    def update_ai_text(self, text):
        self.ai_output.delete("1.0", tk.END)
        self.ai_output.insert("1.0", text)
        self.btn_ai.config(state=tk.NORMAL, text="✨ Analyze Results with AI")

class ReptationApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Polymer Reptation MC Simulator - Python Lab")
        self.root.geometry("1200x900")
        self.root.configure(bg="#0f172a")

        self.params = SimulationParams()
        self.engine = SimulationEngine(self.params)
        self.is_playing = False
        self.animation_id = None
        self.colors = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#2dd4bf']

        self.setup_ui()
        self.draw_lattice()

    def setup_ui(self):
        # Main Layout
        main_frame = tk.Frame(self.root, bg="#0f172a")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        # Header
        header_frame = tk.Frame(main_frame, bg="#0f172a")
        header_frame.pack(fill=tk.X, pady=(0, 20))
        tk.Label(header_frame, text="POLYMER REPTATION LAB", font=("Helvetica", 24, "bold"), fg="white", bg="#0f172a").pack(side=tk.LEFT)
        
        status_text = "AI Ready" if GENAI_AVAILABLE else "AI Disabled (Missing SDK)"
        status_color = "#10b981" if GENAI_AVAILABLE else "#64748b"
        tk.Label(header_frame, text=status_text, font=("Helvetica", 10), fg=status_color, bg="#0f172a").pack(side=tk.LEFT, padx=10, pady=10)

        # Content Area (Canvas + Controls)
        content_frame = tk.Frame(main_frame, bg="#0f172a")
        content_frame.pack(fill=tk.BOTH, expand=True)

        # Canvas Area
        self.canvas_size = 600
        self.canvas = tk.Canvas(content_frame, width=self.canvas_size, height=self.canvas_size, bg="#000000", highlightthickness=0)
        self.canvas.pack(side=tk.LEFT, padx=(0, 20))

        # Sidebar
        sidebar = tk.Frame(content_frame, bg="#0f172a", width=350)
        sidebar.pack(side=tk.RIGHT, fill=tk.Y, expand=True)

        # Stats
        stats_frame = tk.LabelFrame(sidebar, text="Real-time Statistics", font=("Helvetica", 12, "bold"), fg="#94a3b8", bg="#1e293b", padx=10, pady=10, relief=tk.FLAT)
        stats_frame.pack(fill=tk.X, pady=(0, 20))

        self.stat_vars = {
            'steps': tk.StringVar(value="0"),
            'rms': tk.StringVar(value="0.00"),
            'rg': tk.StringVar(value="0.00"),
            'auto': tk.StringVar(value="1.00"),
            'acc': tk.StringVar(value="0.0%")
        }

        self.create_stat_row(stats_frame, "Sweeps:", self.stat_vars['steps'])
        self.create_stat_row(stats_frame, "RMS End-to-End:", self.stat_vars['rms'])
        self.create_stat_row(stats_frame, "Radius of Gyration:", self.stat_vars['rg'])
        self.create_stat_row(stats_frame, "Autocorrelation:", self.stat_vars['auto'])
        self.create_stat_row(stats_frame, "Acceptance Ratio:", self.stat_vars['acc'])
        
        # Real-time Graphs
        graphs_frame = tk.Frame(sidebar, bg="#0f172a")
        graphs_frame.pack(fill=tk.X, pady=(0, 20))
        
        self.rms_graph = GraphCanvas(graphs_frame, width=160, height=100, color="#10b981", title="RMS Expansion")
        self.rms_graph.pack(side=tk.LEFT, padx=(0, 10), fill=tk.BOTH, expand=True)
        
        self.auto_graph = GraphCanvas(graphs_frame, width=160, height=100, color="#6366f1", title="Autocorrelation")
        self.auto_graph.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # Controls
        controls_frame = tk.LabelFrame(sidebar, text="Configuration", font=("Helvetica", 12, "bold"), fg="#94a3b8", bg="#1e293b", padx=10, pady=10, relief=tk.FLAT)
        controls_frame.pack(fill=tk.X, pady=(0, 20))

        self.param_vars = {
            'lattice': tk.IntVar(value=self.params.lattice_size),
            'chains': tk.IntVar(value=self.params.num_chains),
            'length': tk.IntVar(value=self.params.chain_length),
            'obstacles': tk.DoubleVar(value=self.params.obstacle_concentration),
            'speed': tk.IntVar(value=self.params.simulation_speed),
            'sweeps': tk.IntVar(value=self.params.max_steps)
        }

        self.create_control_row(controls_frame, "Lattice Size", self.param_vars['lattice'], 10, 100)
        self.create_control_row(controls_frame, "Num Chains", self.param_vars['chains'], 1, 50)
        self.create_control_row(controls_frame, "Chain Length", self.param_vars['length'], 2, 100)
        self.create_control_row(controls_frame, "Obstacles %", self.param_vars['obstacles'], 0.0, 0.5, resolution=0.01)
        self.create_control_row(controls_frame, "Speed", self.param_vars['speed'], 1, 500)
        self.create_control_row(controls_frame, "Max Sweeps", self.param_vars['sweeps'], 1000, 100000, resolution=1000)

        # Buttons
        btn_frame = tk.Frame(sidebar, bg="#0f172a")
        btn_frame.pack(fill=tk.X)

        # Three Buttons: Start, Pause/Resume, Stop
        self.btn_start = tk.Button(btn_frame, text="Start", command=self.start_sim, bg="#4f46e5", fg="white", font=("Helvetica", 10, "bold"), relief=tk.FLAT, padx=10, pady=8)
        self.btn_start.pack(fill=tk.X, pady=2)
        
        self.btn_pause = tk.Button(btn_frame, text="Pause / Resume", command=self.toggle_pause, bg="#eab308", fg="white", font=("Helvetica", 10, "bold"), relief=tk.FLAT, padx=10, pady=2, state=tk.DISABLED)
        self.btn_pause.pack(fill=tk.X, pady=2)
        
        self.btn_stop = tk.Button(btn_frame, text="Stop & Analyze", command=self.stop_simulation, bg="#b91c1c", fg="white", font=("Helvetica", 10, "bold"), relief=tk.FLAT, padx=10, pady=2, state=tk.DISABLED)
        self.btn_stop.pack(fill=tk.X, pady=2)

        tk.Frame(btn_frame, height=10, bg="#0f172a").pack() # Spacer

        self.btn_reset = tk.Button(btn_frame, text="Reset & Apply", command=self.reset_simulation, bg="#334155", fg="white", font=("Helvetica", 10, "bold"), relief=tk.FLAT, padx=10, pady=8)
        self.btn_reset.pack(fill=tk.X, pady=5)
    
    def create_stat_row(self, parent, label, var):
        frame = tk.Frame(parent, bg="#1e293b")
        frame.pack(fill=tk.X, pady=2)
        tk.Label(frame, text=label, fg="#cbd5e1", bg="#1e293b", font=("Helvetica", 9)).pack(side=tk.LEFT)
        tk.Label(frame, textvariable=var, fg="#38bdf8", bg="#1e293b", font=("Helvetica", 9, "bold")).pack(side=tk.RIGHT)

    def create_control_row(self, parent, label, var, min_val, max_val, resolution=1):
        frame = tk.Frame(parent, bg="#1e293b")
        frame.pack(fill=tk.X, pady=5)
        tk.Label(frame, text=label, fg="#cbd5e1", bg="#1e293b", font=("Helvetica", 9)).pack(anchor="w")
        scale = tk.Scale(frame, variable=var, from_=min_val, to=max_val, orient=tk.HORIZONTAL, resolution=resolution, bg="#1e293b", fg="white", highlightthickness=0, troughcolor="#334155", activebackground="#4f46e5")
        scale.pack(fill=tk.X)

    def start_sim(self):
        if not self.is_playing:
            self.is_playing = True
            self.btn_start.config(state=tk.DISABLED, bg="#334155")
            self.btn_pause.config(state=tk.NORMAL)
            self.btn_stop.config(state=tk.NORMAL)
            self.animate()

    def toggle_pause(self):
        self.is_playing = not self.is_playing
        if self.is_playing:
            self.btn_pause.config(text="Pause")
            self.animate()
        else:
            self.btn_pause.config(text="Resume")
            if self.animation_id:
                self.root.after_cancel(self.animation_id)
                self.animation_id = None
                
    def stop_simulation(self):
        self.is_playing = False
        if self.animation_id:
            self.root.after_cancel(self.animation_id)
            self.animation_id = None
        
        self.btn_start.config(state=tk.NORMAL, bg="#4f46e5")
        self.btn_pause.config(state=tk.DISABLED, text="Pause / Resume")
        self.btn_stop.config(state=tk.DISABLED)
        
        # Show Summary
        stats = self.engine.get_stats()
        SummaryDialog(self.root, stats, self.params)

    def reset_simulation(self):
        # Update params from UI
        self.params.lattice_size = self.param_vars['lattice'].get()
        self.params.num_chains = self.param_vars['chains'].get()
        self.params.chain_length = self.param_vars['length'].get()
        self.params.obstacle_concentration = self.param_vars['obstacles'].get()
        self.params.simulation_speed = self.param_vars['speed'].get()
        self.params.max_steps = self.param_vars['sweeps'].get()

        self.engine = SimulationEngine(self.params)
        self.is_playing = False
        if self.animation_id:
            self.root.after_cancel(self.animation_id)
            self.animation_id = None
            
        self.btn_start.config(state=tk.NORMAL, bg="#4f46e5")
        self.btn_pause.config(state=tk.DISABLED, text="Pause / Resume")
        self.btn_stop.config(state=tk.DISABLED)
        
        self.update_stats_ui()
        self.draw_lattice()
        
        # Clear graphs
        self.rms_graph.delete("all")
        self.auto_graph.delete("all")

    def animate(self):
        if not self.is_playing:
            return

        steps_per_frame = self.params.simulation_speed
        for _ in range(steps_per_frame):
            self.engine.step()

        self.update_stats_ui()
        self.draw_lattice()

        if self.engine.steps >= self.engine.params.max_steps:
             # Auto-Stop
            self.stop_simulation()
        else:
            self.animation_id = self.root.after(10, self.animate)

    def update_stats_ui(self):
        stats = self.engine.get_stats()
        self.stat_vars['steps'].set(str(stats.steps))
        self.stat_vars['rms'].set(f"{stats.rms_end_to_end:.2f}")
        self.stat_vars['rg'].set(f"{stats.radius_of_gyration:.2f}")
        self.stat_vars['auto'].set(f"{stats.autocorrelation:.3f}")
        self.stat_vars['acc'].set(f"{stats.acceptance_ratio*100:.1f}%")
        
        # Update Graphs
        self.rms_graph.draw_graph(self.engine.history_rms)
        # Adaptive Y axis for autocorrelation (remove static min/max)
        self.auto_graph.draw_graph(self.engine.history_auto) 

    def draw_lattice(self):
        self.canvas.delete("all")
        
        L = self.params.lattice_size
        cell_size = self.canvas_size / L

        # Draw Obstacles
        for key in self.engine.obstacles:
            x, y = map(int, key.split(','))
            x1 = x * cell_size
            y1 = y * cell_size
            self.canvas.create_rectangle(x1 + 0.5, y1 + 0.5, x1+cell_size, y1+cell_size, fill="#ef4444", outline="")

        # Draw Chains
        for idx, chain in enumerate(self.engine.chains):
            color = self.colors[idx % len(self.colors)]
            
            # Segments
            for i in range(len(chain) - 1):
                p1 = chain[i]
                p2 = chain[i+1]
                
                # Check PBC for drawing
                dx = abs(p1['x'] - p2['x'])
                dy = abs(p1['y'] - p2['y'])
                
                if dx <= 1 and dy <= 1:
                    cx1 = p1['x'] * cell_size + cell_size/2
                    cy1 = p1['y'] * cell_size + cell_size/2
                    cx2 = p2['x'] * cell_size + cell_size/2
                    cy2 = p2['y'] * cell_size + cell_size/2
                    self.canvas.create_line(cx1, cy1, cx2, cy2, fill=color, width=max(2, cell_size * 0.4), capstyle=tk.ROUND)

            # Head
            if chain:
                head = chain[0]
                hx = head['x'] * cell_size + cell_size/2
                hy = head['y'] * cell_size + cell_size/2
                r = cell_size / 2.5
                self.canvas.create_oval(hx-r, hy-r, hx+r, hy+r, fill=color, outline="")

if __name__ == "__main__":
    root = tk.Tk()
    app = ReptationApp(root)
    root.mainloop()
