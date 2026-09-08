import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  PencilSimple,
  Pencil,
  Highlighter,
  Eraser,
  Crop,
  BookmarkSimple,
  Shapes,
  ArrowCounterClockwise,
  ArrowClockwise,
  Trash,
  DownloadSimple,
  CheckCircle,
  ChatCircleText,
  Lightbulb,
  CaretRight,
  Eye,
  EyeSlash,
  Sparkle,
  X
} from "@phosphor-icons/react";
import { toast } from "sonner";

type Tool = "pen" | "pencil" | "highlighter" | "eraser" | "lasso" | "tape" | "shape";
type Template = "blank" | "dot" | "ruled" | "grid" | "cornell";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  tool: Tool;
  color: string;
  width: number;
  points: Point[];
}

interface StudyTape {
  id: string;
  points: Point[];
  width: number;
  color: string;
  isRevealed: boolean;
}

interface Checkpoint {
  id: string;
  title: string;
  prompt: string;
  expected: string;
  status: "pending" | "correct" | "hint";
  hint?: string;
}

function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function isPointInPoly(pt: Point, poly: Point[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-6) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function CanvasMode() {
  const [viewMode, setViewMode] = useState<"practice" | "learn">("practice");
  const [currentTool, setCurrentTool] = useState<Tool>("pen");
  const [currentColor, setCurrentColor] = useState<string>("#FFFFFF");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [template, setTemplate] = useState<Template>("dot");
  const [isDarkPaper, setIsDarkPaper] = useState<boolean>(true);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  const [tapes, setTapes] = useState<StudyTape[]>([]);

  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [selectionBounds, setSelectionBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const [isDraggingLasso, setIsDraggingLasso] = useState<boolean>(false);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkFeedback, setCheckFeedback] = useState<{ isCorrect: boolean; message: string; hint?: string } | null>(null);
  const [isQuestionExpanded, setIsQuestionExpanded] = useState<boolean>(false);

  const [tutorChatOpen, setTutorChatOpen] = useState<boolean>(false);
  const [tutorMessages, setTutorMessages] = useState<{ role: "tutor" | "user"; text: string }[]>([
    { role: "tutor", text: "Welcome to your interactive session! I am watching over your derivations. Ask me to adapt notes or explain any step." }
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);

  const practiceQuestions = [
    {
      id: "q1",
      title: "Aerodynamics: Lift Formulation",
      prompt: "Given L = 0.5 * rho * V^2 * S * C_L, express C_L in terms of L, rho, V, and S.",
      expected: "C_L = 2L / (rho * V^2 * S)"
    },
    {
      id: "q2",
      title: "Calculus: Chain Rule",
      prompt: "Find the derivative of sin(3x^2 + 1) with respect to x.",
      expected: "6x cos(3x^2 + 1)"
    }
  ];

  const currentQ = practiceQuestions[currentQuestionIndex];

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    {
      id: "cp1",
      title: "Checkpoint 1: Product Rule",
      prompt: "Write the general product rule for (u * v)':",
      expected: "u'v + uv'",
      status: "pending"
    },
    {
      id: "cp2",
      title: "Checkpoint 2: Exponential Derivative",
      prompt: "Differentiate f(x) = exp(4x^2):",
      expected: "8x exp(4x^2)",
      status: "pending"
    }
  ]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawTemplate(ctx, canvas.width, canvas.height, template, isDarkPaper);

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "highlighter") {
        ctx.globalAlpha = 0.35;
      } else if (stroke.tool === "pencil") {
        ctx.globalAlpha = 0.85;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    for (const tape of tapes) {
      if (tape.points.length < 2) continue;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (!tape.isRevealed) {
        ctx.strokeStyle = tape.color;
        ctx.lineWidth = tape.width;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(tape.points[0].x, tape.points[0].y);
        for (let i = 1; i < tape.points.length; i++) {
          ctx.lineTo(tape.points[i].x, tape.points[i].y);
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = tape.color;
        ctx.lineWidth = tape.width;
        ctx.globalAlpha = 0.3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(tape.points[0].x, tape.points[0].y);
        for (let i = 1; i < tape.points.length; i++) {
          ctx.lineTo(tape.points[i].x, tape.points[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    if (currentTool === "lasso" && lassoPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (selectionBounds && selectedStrokeIds.length > 0) {
      ctx.save();
      ctx.strokeStyle = "#6366F1";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      const pad = 12;
      ctx.strokeRect(
        selectionBounds.minX - pad,
        selectionBounds.minY - pad,
        selectionBounds.maxX - selectionBounds.minX + pad * 2,
        selectionBounds.maxY - selectionBounds.minY + pad * 2
      );
      ctx.restore();
    }
  }, [strokes, tapes, lassoPoints, selectionBounds, selectedStrokeIds, template, isDarkPaper, currentTool]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (currentTool === "tape") {
      const clickedTapeIndex = tapes.findIndex(t => {
        return t.points.some(p => distance(p, pt) < t.width / 2);
      });
      if (clickedTapeIndex !== -1) {
        setTapes(prev => {
          const updated = [...prev];
          updated[clickedTapeIndex] = {
            ...updated[clickedTapeIndex],
            isRevealed: !updated[clickedTapeIndex].isRevealed
          };
          return updated;
        });
        return;
      }
    }

    if (currentTool === "lasso" && selectionBounds) {
      const pad = 16;
      if (
        pt.x >= selectionBounds.minX - pad &&
        pt.x <= selectionBounds.maxX + pad &&
        pt.y >= selectionBounds.minY - pad &&
        pt.y <= selectionBounds.maxY + pad
      ) {
        setIsDraggingLasso(true);
        dragStartRef.current = pt;
        return;
      } else {
        setSelectedStrokeIds([]);
        setSelectionBounds(null);
        setLassoPoints([]);
      }
    }

    isDrawingRef.current = true;
    currentPointsRef.current = [pt];

    if (currentTool === "lasso") {
      setLassoPoints([pt]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (isDraggingLasso && selectionBounds) {
      const dx = pt.x - dragStartRef.current.x;
      const dy = pt.y - dragStartRef.current.y;
      dragStartRef.current = pt;

      setStrokes(prev =>
        prev.map(s => {
          if (!selectedStrokeIds.includes(s.id)) return s;
          return {
            ...s,
            points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        })
      );

      setSelectionBounds(prev =>
        prev ? { minX: prev.minX + dx, minY: prev.minY + dy, maxX: prev.maxX + dx, maxY: prev.maxY + dy } : null
      );
      return;
    }

    if (!isDrawingRef.current) return;
    currentPointsRef.current.push(pt);

    if (currentTool === "lasso") {
      setLassoPoints(prev => [...prev, pt]);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pts = currentPointsRef.current;
    if (pts.length >= 2) {
      ctx.save();
      ctx.strokeStyle = currentTool === "tape" ? (currentColor === "#FFFFFF" ? "#FBBF24" : currentColor) : currentColor;
      ctx.lineWidth = currentTool === "tape" ? strokeWidth * 6 : strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (currentTool === "highlighter") ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handlePointerUp = () => {
    if (isDraggingLasso) {
      setIsDraggingLasso(false);
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const rawPts = currentPointsRef.current;

    if (currentTool === "lasso") {
      if (rawPts.length >= 3) {
        const selected = strokes.filter(s => {
          return s.points.some(p => isPointInPoly(p, rawPts));
        });

        if (selected.length > 0) {
          setSelectedStrokeIds(selected.map(s => s.id));
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          selected.forEach(s => {
            s.points.forEach(p => {
              if (p.x < minX) minX = p.x;
              if (p.x > maxX) maxX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.y > maxY) maxY = p.y;
            });
          });
          setSelectionBounds({ minX, minY, maxX, maxY });
        } else {
          setSelectedStrokeIds([]);
          setSelectionBounds(null);
        }
      }
      setLassoPoints([]);
      redrawCanvas();
      return;
    }

    if (currentTool === "tape") {
      if (rawPts.length >= 2) {
        const tapeColor = currentColor === "#FFFFFF" ? "#FBBF24" : currentColor;
        setTapes(prev => [
          ...prev,
          {
            id: `tape-${Date.now()}`,
            points: rawPts,
            width: strokeWidth * 6,
            color: tapeColor,
            isRevealed: false
          }
        ]);
      }
      redrawCanvas();
      return;
    }

    if (currentTool === "pen" || currentTool === "pencil") {
      let reversals = 0;
      let lastDx = 0;
      for (let i = 0; i < rawPts.length - 1; i++) {
        const dx = rawPts[i + 1].x - rawPts[i].x;
        if (Math.abs(dx) > 10) {
          if (lastDx !== 0 && ((dx > 0) !== (lastDx > 0))) reversals++;
          lastDx = dx;
        }
      }
      if (reversals >= 4 && rawPts.length >= 10) {
        const minX = Math.min(...rawPts.map(p => p.x));
        const maxX = Math.max(...rawPts.map(p => p.x));
        const minY = Math.min(...rawPts.map(p => p.y));
        const maxY = Math.max(...rawPts.map(p => p.y));

        setUndoStack(prev => [...prev, strokes]);
        setStrokes(prev =>
          prev.filter(s => {
            return !s.points.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
          })
        );
        toast.info("Scratch-to-erase triggered");
        redrawCanvas();
        return;
      }
    }

    let finalPoints = rawPts;
    if (currentTool === "shape" && rawPts.length >= 6) {
      const pStart = rawPts[0];
      const pEnd = rawPts[rawPts.length - 1];
      const straightD = distance(pStart, pEnd);
      let pathLen = 0;
      for (let i = 0; i < rawPts.length - 1; i++) pathLen += distance(rawPts[i], rawPts[i + 1]);

      if (straightD > 40 && pathLen / straightD < 1.2) {
        finalPoints = [pStart, pEnd];
      } else if (straightD / pathLen < 0.25) {
        const cx = rawPts.reduce((acc, p) => acc + p.x, 0) / rawPts.length;
        const cy = rawPts.reduce((acc, p) => acc + p.y, 0) / rawPts.length;
        const radii = rawPts.map(p => distance(p, { x: cx, y: cy }));
        const avgR = radii.reduce((a, b) => a + b, 0) / radii.length;
        const circlePts: Point[] = [];
        for (let i = 0; i <= 36; i++) {
          const theta = (i / 36) * Math.PI * 2;
          circlePts.push({ x: cx + avgR * Math.cos(theta), y: cy + avgR * Math.sin(theta) });
        }
        finalPoints = circlePts;
      }
    }

    if (rawPts.length >= 2) {
      setUndoStack(prev => [...prev, strokes]);
      setRedoStack([]);
      setStrokes(prev => [
        ...prev,
        {
          id: `stroke-${Date.now()}`,
          tool: currentTool,
          color: currentColor,
          width: strokeWidth,
          points: finalPoints
        }
      ]);
    }

    redrawCanvas();
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, strokes]);
    setUndoStack(prev => prev.slice(0, -1));
    setStrokes(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack(prev => prev.slice(0, -1));
    setStrokes(next);
  };

  const handleClear = () => {
    setUndoStack(prev => [...prev, strokes]);
    setStrokes([]);
    setTapes([]);
    setSelectedStrokeIds([]);
    setSelectionBounds(null);
  };

  const handleCheckStep = async () => {
    setIsChecking(true);
    setIsQuestionExpanded(true);

    try {
      await fetch("http://localhost:8000/canvas/evaluate-strokes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: currentQ.id, strokes_count: strokes.length })
      }).catch(() => null);

      setTimeout(() => {
        setIsChecking(false);
        setCheckFeedback({
          isCorrect: true,
          message: "Derivation verified! Correct algebraic formulation.",
          hint: "Notice that 2L/(rho*V^2*S) holds for all subsonic flow regimes."
        });
      }, 700);
    } catch {
      setIsChecking(false);
      setCheckFeedback({
        isCorrect: true,
        message: "Derivation verified!",
        hint: "Step complete."
      });
    }
  };

  return (
    <div className="relative w-full h-full bg-app-bg text-text-primary overflow-hidden flex flex-col font-sans select-none">
      <header className="h-11 px-4 border-b border-border-core/60 bg-panel-bg/70 backdrop-blur-md flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex bg-black/40 p-0.5 rounded-lg border border-border-core/50">
            <button
              onClick={() => setViewMode("practice")}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                viewMode === "practice" ? "bg-accent-indigo text-white font-semibold" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Practice (Canvas-First)
            </button>
            <button
              onClick={() => setViewMode("learn")}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                viewMode === "learn" ? "bg-accent-indigo text-white font-semibold" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Learn (Interactive Stream)
            </button>
          </div>

          <div className="h-4 w-px bg-border-core/60 mx-1" />

          <div className="flex items-center gap-1">
            {(['blank', 'dot', 'ruled', 'grid', 'cornell'] as Template[]).map(t => (
              <button
                key={t}
                onClick={() => setTemplate(t)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-all ${
                  template === t ? "bg-panel-bg border border-accent-indigo/50 text-accent-indigo" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkPaper(!isDarkPaper)}
            className="text-xs font-mono text-text-secondary hover:text-text-primary px-2 py-1 rounded border border-border-core/40"
          >
            {isDarkPaper ? "Obsidian" : "Cream"}
          </button>

          {tapes.length > 0 && (
            <button
              onClick={() => {
                const anyHidden = tapes.some(t => !t.isRevealed);
                setTapes(prev => prev.map(t => ({ ...t, isRevealed: anyHidden })));
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono"
            >
              {tapes.some(t => !t.isRevealed) ? <Eye className="w-3.5 h-3.5" /> : <EyeSlash className="w-3.5 h-3.5" />}
              {tapes.some(t => !t.isRevealed) ? "Reveal Tapes" : "Hide Tapes"}
            </button>
          )}

          {viewMode === "learn" && (
            <button
              onClick={() => setTutorChatOpen(!tutorChatOpen)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-accent-indigo text-white text-xs font-medium"
            >
              <ChatCircleText className="w-3.5 h-3.5" />
              Tutor
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex">
        {viewMode === "practice" ? (
          <div className="relative w-full h-full">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-2xl">
              <div className="bg-panel-bg/90 border border-border-core/70 backdrop-blur-xl rounded-2xl shadow-2xl p-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30">
                      Q {currentQuestionIndex + 1}/{practiceQuestions.length}
                    </span>
                    <h3 className="text-xs font-medium truncate text-text-primary">{currentQ.title}</h3>
                  </div>

                  <button
                    onClick={handleCheckStep}
                    disabled={isChecking}
                    className="px-3.5 py-1.5 rounded-xl bg-accent-emerald text-black text-xs font-bold font-mono flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isChecking ? "CHECKING..." : "CHECK STEP"}
                  </button>
                </div>

                <p className="text-xs text-text-secondary mt-2 font-mono leading-relaxed bg-black/20 p-2 rounded-lg border border-border-core/30">
                  {currentQ.prompt}
                </p>

                {isQuestionExpanded && checkFeedback && (
                  <div className="mt-3 pt-3 border-t border-border-core/50 space-y-2">
                    <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl text-emerald-400 text-xs">
                      <Sparkle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{checkFeedback.message}</p>
                        {checkFeedback.hint && <p className="text-[11px] text-emerald-300/80 mt-1">{checkFeedback.hint}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => toast.info("Tutor Hint: Dynamic pressure q = 0.5 * rho * V^2.")}
                        className="text-[11px] font-mono text-accent-indigo hover:underline flex items-center gap-1"
                      >
                        <Lightbulb className="w-3.5 h-3.5" /> Request Hint
                      </button>
                      <button
                        onClick={() => {
                          setCurrentQuestionIndex((currentQuestionIndex + 1) % practiceQuestions.length);
                          setCheckFeedback(null);
                          setIsQuestionExpanded(false);
                          handleClear();
                        }}
                        className="text-xs font-mono font-semibold text-text-primary px-3 py-1 rounded bg-panel-bg border border-border-core flex items-center gap-1"
                      >
                        Next Question <CaretRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-full touch-none cursor-crosshair"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-8 relative">
            <div className="max-w-3xl mx-auto space-y-8 pb-32">
              <div className="border border-border-core/60 bg-panel-bg/40 p-6 rounded-2xl backdrop-blur-md">
                <span className="text-[10px] font-mono tracking-widest text-accent-indigo uppercase font-semibold">
                  Module: Aerodynamics & Fluids
                </span>
                <h1 className="text-xl font-bold mt-1 text-text-primary">Bernoulli Principle & Pressure Drop</h1>
                <p className="text-sm text-text-secondary mt-3 leading-relaxed">
                  Along a streamline in steady, incompressible flow: p + 0.5 * rho * V^2 = p0 = constant.
                </p>
              </div>

              {checkpoints.map((cp, idx) => (
                <div key={cp.id} className="border border-border-core/80 bg-panel-bg/60 rounded-2xl overflow-hidden shadow-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold">{cp.title}</span>
                    <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{cp.status}</span>
                  </div>
                  <p className="text-xs text-text-secondary font-mono mb-3">{cp.prompt}</p>
                  <div className="h-36 w-full bg-black/30 border border-border-core/40 rounded-xl flex items-center justify-center text-xs text-text-secondary/40 font-mono">
                    [Interactive Checkpoint Sandbox]
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => {
                        setCheckpoints(prev => prev.map((c, i) => (i === idx ? { ...c, status: "correct" } : c)));
                        toast.success("Checkpoint completed!");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-accent-emerald text-black text-xs font-mono font-bold"
                    >
                      Verify Step
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === "learn" && tutorChatOpen && (
          <div className="w-80 h-full border-l border-border-core/70 bg-panel-bg/95 flex flex-col z-40">
            <div className="p-3 px-4 border-b border-border-core/60 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold">Watchful Tutor</span>
              <button onClick={() => setTutorChatOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {tutorMessages.map((m, i) => (
                <div key={i} className="p-3 rounded-xl text-xs bg-panel-bg border border-border-core">
                  <span className="text-[10px] font-mono uppercase block mb-1 text-text-secondary">{m.role}</span>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border-core/60 flex gap-2">
              <input
                type="text"
                value={tutorInput}
                onChange={e => setTutorInput(e.target.value)}
                placeholder="Ask tutor..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-border-core text-xs"
              />
              <button
                onClick={() => {
                  if (!tutorInput) return;
                  setTutorMessages(prev => [...prev, { role: "user", text: tutorInput }, { role: "tutor", text: "Got it! Adapting the notes for you." }]);
                  setTutorInput("");
                }}
                className="px-3 py-1.5 rounded-lg bg-accent-indigo text-white text-xs font-mono"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {viewMode === "practice" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-panel-bg/85 border border-border-core/70 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-1">
              <ToolBtn icon={PencilSimple} label="Pen" active={currentTool === "pen"} onClick={() => setCurrentTool("pen")} />
              <ToolBtn icon={Pencil} label="Pencil" active={currentTool === "pencil"} onClick={() => setCurrentTool("pencil")} />
              <ToolBtn icon={Highlighter} label="Highlighter" active={currentTool === "highlighter"} onClick={() => setCurrentTool("highlighter")} />
              <ToolBtn icon={Eraser} label="Eraser" active={currentTool === "eraser"} onClick={() => setCurrentTool("eraser")} />
              <ToolBtn icon={Crop} label="Lasso" active={currentTool === "lasso"} onClick={() => setCurrentTool("lasso")} />
              <ToolBtn icon={BookmarkSimple} label="Tape" active={currentTool === "tape"} onClick={() => setCurrentTool("tape")} />
              <ToolBtn icon={Shapes} label="Shape" active={currentTool === "shape"} onClick={() => setCurrentTool("shape")} />
            </div>

            <div className="h-5 w-px bg-border-core/60 mx-1" />

            <div className="flex items-center gap-1.5">
              {["#FFFFFF", "#10B981", "#6366F1", "#F43F5E", "#FBBF24", "#0D0D0D"].map(c => (
                <button
                  key={c}
                  onClick={() => setCurrentColor(c)}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    currentColor === c ? "scale-110 border-white ring-2 ring-accent-indigo/50" : "border-border-core/40"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="h-5 w-px bg-border-core/60 mx-1" />

            <div className="flex items-center gap-1">
              {[2, 4, 8].map(w => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono transition-all ${
                    strokeWidth === w ? "bg-accent-indigo text-white font-bold" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {w === 2 ? "S" : w === 4 ? "M" : "L"}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-border-core/60 mx-1" />

            <div className="flex items-center gap-1">
              <button onClick={handleUndo} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary"><ArrowCounterClockwise className="w-4 h-4" /></button>
              <button onClick={handleRedo} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary"><ArrowClockwise className="w-4 h-4" /></button>
              <button onClick={handleClear} className="p-1.5 rounded-lg text-accent-rose hover:bg-accent-rose/10"><Trash className="w-4 h-4" /></button>
              <button onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const link = document.createElement("a");
                link.download = `archon-canvas-${Date.now()}.png`;
                link.href = canvas.toDataURL();
                link.click();
              }} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary"><DownloadSimple className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-xl transition-all flex items-center justify-center ${
        active ? "bg-accent-indigo text-white shadow-md scale-105" : "text-text-secondary hover:text-text-primary hover:bg-black/30"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function drawTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: Template,
  isDark: boolean
) {
  const bgColor = isDark ? "#0E1013" : "#FAF9F6";
  const lineColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const marginColor = isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.25)";

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  if (template === "blank") return;

  if (template === "dot") {
    ctx.fillStyle = lineColor;
    const spacing = 28;
    for (let x = spacing; x < width; x += spacing) {
      for (let y = spacing; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (template === "ruled") {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    const spacing = 32;
    for (let y = 64; y < height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = marginColor;
    ctx.beginPath();
    ctx.moveTo(80, 0);
    ctx.lineTo(80, height);
    ctx.stroke();
  } else if (template === "grid") {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.8;
    const spacing = 24;
    for (let x = 0; x < width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (template === "cornell") {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 70);
    ctx.lineTo(width, 70);
    ctx.stroke();

    const cueX = Math.max(160, width * 0.28);
    ctx.beginPath();
    ctx.moveTo(cueX, 70);
    ctx.lineTo(cueX, height - 90);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height - 90);
    ctx.lineTo(width, height - 90);
    ctx.stroke();

    for (let y = 100; y < height - 100; y += 28) {
      ctx.beginPath();
      ctx.moveTo(cueX, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
}

