"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  Lock, 
  Plus, 
  Edit3 
} from "lucide-react";
import TiltedGrid from "@/components/TiltedGrid";

const priorityClass = {
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
};

/** Safely extract a display string from a risk item */
function riskLabel(risk) {
  if (typeof risk === "string") return risk;
  if (typeof risk === "object" && risk !== null) {
    return risk.issue || risk.description || risk.title || JSON.stringify(risk);
  }
  return String(risk);
}

export default function PlanDashboard({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const token = params.token;
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") || "full";

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCats, setExpandedCats] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [newTask, setNewTask] = useState({ task: "", category: "Logistics", priority: "Medium", deadline: "" });

  const validScopes = ["logistics", "marketing", "technical", "operations", "full"];

  useEffect(() => {
    if (!token) return;

    const load = () => {
      fetch(`/api/plan?token=${token}&scope=${scope}`)
        .then((res) => {
          if (!res.ok) throw new Error("Plan not found");
          return res.json();
        })
        .then((data) => {
          setPlan(data.plan || data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [token, scope]);

  if (!validScopes.includes(scope)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10 text-center">
        <TiltedGrid />
        <div className="relative z-10 floating-card p-10 max-w-md">
          <h2 className="text-2xl font-serif text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm">Invalid workspace scope provided.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TiltedGrid />
        <div className="relative z-10 text-center space-y-4">
          <div className="w-12 h-12 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Initializing Workspace…</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TiltedGrid />
        <div className="relative z-10 floating-card p-10 text-center max-w-md">
          <h2 className="text-2xl font-serif mb-2">System Error</h2>
          <p className="text-muted-foreground text-sm">{error || "Plan not found"}</p>
          <button 
            onClick={() => window.location.href = '/access'}
            className="mt-6 text-xs font-bold uppercase tracking-widest text-primary underline"
          >
            Go to Access Portal
          </button>
        </div>
      </div>
    );
  }

  const timeline = plan.timeline || [];
  const flatTasks = Array.isArray(plan.tasks) ? plan.tasks : [];
  const promo = plan.promo || plan.promotion;
  const budget = plan.budget;
  const risks = plan.risks || [];

  // Filter tasks by scope
  const filteredTasksList = scope === "full" 
    ? flatTasks 
    : flatTasks.filter(t => (t.category || "General").toLowerCase() === scope);

  const groupedTasks = {};
  for (const t of filteredTasksList) {
    const cat = t.category || "General";
    if (!groupedTasks[cat]) groupedTasks[cat] = [];
    groupedTasks[cat].push(t);
  }

  const handleTaskToggle = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "done" ? "pending" : "done";
    
    // Optimistic Update
    setPlan({
      ...plan,
      tasks: plan.tasks?.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    });

    try {
      await fetch("/api/task-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, task_id: taskId, status: newStatus }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.task) return;
    try {
      await fetch("/api/add-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, task: { ...newTask, id: `m-${Date.now()}`, status: "pending" } }),
      });
      setNewTask({ task: "", category: "Logistics", priority: "Medium", deadline: "" });
      setEditMode(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative min-h-screen pb-20">
      <TiltedGrid />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
          <div>
            <p className="label-caps text-muted-foreground mb-1">
              Workspace · {scope === 'full' ? 'Admin' : scope}
            </p>
            <h1 className="text-3xl md:text-4xl font-serif text-foreground">
              {plan.event_name || plan.name || "Your Event"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 lowercase">
               {plan.event_type} · {plan.duration}
            </p>
          </div>

          <div className="flex gap-2">
            {scope === "full" && (
              <motion.button
                whileHover={{ y: -1 }}
                onClick={() => setEditMode(!editMode)}
                className={`glass-card px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors ${editMode ? "bg-primary text-primary-foreground" : ""}`}
              >
                <Edit3 size={14} />
                {editMode ? "EXIT EDIT" : "EDIT PLAN"}
              </motion.button>
            )}
            <button 
              onClick={() => window.location.href = '/access'}
              className="glass-card px-4 py-2 text-xs font-bold"
            >
              LOGOUT
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Dashboard Sidebar: Timeline */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="floating-card p-6 h-fit">
            <h2 className="label-caps mb-4">Timeline</h2>
            <div className="space-y-0">
              {timeline.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-foreground/20 mt-1.5 shrink-0" />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {item.time}
                    </p>
                    <p className="text-sm text-foreground mt-0.5">{item.activity || item.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Main Dashboard Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Task Board */}
            <div className="space-y-4">
              <h2 className="label-caps">Departmental Task Board</h2>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(groupedTasks).map(([catKey, items], ci) => (
                  <motion.div key={catKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.05 }} className="floating-card p-4">
                    <button 
                      onClick={() => setExpandedCats(prev => ({...prev, [catKey]: !prev[catKey]}))}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{catKey}</h3>
                        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{items.length} Tasks</span>
                      </div>
                      <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expandedCats[catKey] ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {expandedCats[catKey] && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-2 overflow-hidden">
                          {items.map((task) => (
                            <div key={task.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                              <button onClick={() => handleTaskToggle(task.id, task.status)} className="mt-0.5 shrink-0">
                                <CheckCircle2 size={16} className={task.status === "done" ? "text-emerald-500" : "text-muted-foreground/30"} fill={task.status === "done" ? "currentColor" : "none"} />
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {task.task}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-muted-foreground">{task.deadline}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${priorityClass[task.priority?.toLowerCase()] || ""}`}>
                                    {task.priority}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              {editMode && (
                <div className="floating-card p-6 border-2 border-dashed border-primary/20">
                  <h3 className="text-xs font-bold uppercase mb-4 flex items-center gap-2">
                    <Plus size={14} /> Add Immediate Task
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="input-recessed md:col-span-2 w-full" placeholder="Task Description" value={newTask.task} onChange={e => setNewTask({...newTask, task: e.target.value})} />
                    <select className="input-recessed" value={newTask.category} onChange={e => setNewTask({...newTask, category: e.target.value})}>
                      <option>Logistics</option>
                      <option>Marketing</option>
                      <option>Technical</option>
                      <option>Operations</option>
                    </select>
                    <button onClick={handleAddTask} className="bg-primary text-primary-foreground py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                      Add Task
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Metrics — Only for full scope */}
            {scope === "full" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {promo && (
                  <div className="floating-card p-5">
                    <h3 className="label-caps mb-3 text-primary/80">Promotion Strategy</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground italic">"{promo.strategy}"</p>
                  </div>
                )}
                {budget && (
                  <div className="floating-card p-5">
                    <h3 className="label-caps mb-3 text-primary/80">Estimated Budget</h3>
                    <div className="space-y-1">
                      {budget.map((b, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{b.item}</span>
                          <span className="font-bold">{b.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
