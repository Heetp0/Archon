﻿import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import BrowsePCModal from '../src/components/BrowsePCModal';

// Read and extract getDynamicGraph from ResearchMode.tsx
const filePath = path.resolve(__dirname, "../src/components/modes/ResearchMode.tsx");
const sourceCode = fs.readFileSync(filePath, "utf8");

// Extract the constants and the function
const nodesIndex = sourceCode.indexOf("const NODES");
const functionEndIndex = sourceCode.indexOf("export default function ResearchMode");

if (nodesIndex === -1 || functionEndIndex === -1) {
  throw new Error("Could not locate parser code in ResearchMode.tsx");
}

let codeToEval = sourceCode.substring(nodesIndex, functionEndIndex);

// Strip TypeScript annotations
codeToEval = codeToEval
  .replace(/:\s*GraphNode\[\]/g, "")
  .replace(/:\s*GraphEdge\[\]/g, "")
  .replace(/text:\s*string/g, "text")
  .replace(/:\s*GraphNode/g, "")
  .replace(/:\s*GraphEdge/g, "")
  .replace(/:\s*string\[\]/g, "");

// Evaluate function
const testEnv = new Function(`${codeToEval}; return { getDynamicGraph, NODES, EDGES };`)();
const { getDynamicGraph, NODES, EDGES } = testEnv;

describe("ResearchMode getDynamicGraph parser stress testing", () => {
  it("Scenario 1: extremely large researchText", () => {
    // 1. Large text with match early
    const earlyMatchText = `# Heading 1\n` + `**Bold 1**\n` + `a`.repeat(1024 * 1024 * 5); // 5MB
    const t0 = performance.now();
    const res1 = getDynamicGraph(earlyMatchText);
    const t1 = performance.now();
    expect(res1.nodes.length).toBeGreaterThan(0);
    expect(t1 - t0).toBeLessThan(150); // Should parse extremely fast because match count limit is 12 and headingRegex stops early

    // 2. Large text with matches at the very end
    const lateMatchText = `a`.repeat(1024 * 1024 * 5) + `\n# Late Heading\n**Late Bold**`;
    const t2 = performance.now();
    const res2 = getDynamicGraph(lateMatchText);
    const t3 = performance.now();
    expect(res2.nodes[0].label).toBe("Late Heading");
    expect(res2.nodes[1].label).toBe("Late Bold");
    expect(t3 - t2).toBeLessThan(500); // Should run fast enough

    // 3. Huge text with NO matches at all
    const noMatchText = `a`.repeat(1024 * 1024 * 5);
    const t4 = performance.now();
    const res3 = getDynamicGraph(noMatchText);
    const t5 = performance.now();
    expect(res3.nodes).toEqual(NODES); // returns default
    expect(t5 - t4).toBeLessThan(500);
  });

  it("Scenario 2: researchText contains no bold words or headings", () => {
    const text = "This is a regular research text without any headings or bold markup.";
    const result = getDynamicGraph(text);
    expect(result.nodes).toEqual(NODES);
    expect(result.edges).toEqual(EDGES);
  });

  it("Scenario 3: duplicate bold terms or headings", () => {
    const text = "# Heading 1\n# Heading 1\n**Bold 1**\n**Bold 1**\n**Heading 1**";
    const result = getDynamicGraph(text);
    // Should filter duplicates. Unique terms should be: "Heading 1", "Bold 1"
    const labels = result.nodes.map(n => n.label);
    expect(labels).toContain("Heading 1");
    expect(labels).toContain("Bold 1");
    expect(result.nodes.length).toBe(2);
  });

  it("Scenario 4: special characters in terms", () => {
    const text = "# Special <>&\"'\\/\n**Emoji 🚀**";
    const result = getDynamicGraph(text);
    expect(result.nodes[0].label).toBe("Special <>&\"'\\/");
    expect(result.nodes[1].label).toBe("Emoji 🚀");
  });
});

describe("BrowsePCModal quick locations and state updates", () => {
  it("T2.1: updates manualPath when quick locations are clicked", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<BrowsePCModal open={true} onClose={onClose} onSelect={onSelect} />);

    // Click on "Desktop"
    const desktopBtn = screen.getByText("Desktop");
    fireEvent.click(desktopBtn);

    // Verify input element has manualPath updated
    const input = screen.getByPlaceholderText(/e.g. D:\\Projects\\my-app/) as HTMLInputElement;
    expect(input.value).toBe("~/Desktop");

    // Click on "Home"
    const homeBtn = screen.getByText("Home");
    fireEvent.click(homeBtn);
    expect(input.value).toBe("~/Home");
  });

  it("T2.2: updates manualPath with manual typing and handles select", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<BrowsePCModal open={true} onClose={onClose} onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/e.g. D:\\Projects\\my-app/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "D:\\MyProject" } });
    expect(input.value).toBe("D:\\MyProject");

    const selectBtn = screen.getByText("Select");
    fireEvent.click(selectBtn);

    expect(onSelect).toHaveBeenCalledWith("D:\\MyProject");
    expect(input.value).toBe(""); // should be cleared
  });

  it("T2.3: rejects invalid path characters and sets error message", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<BrowsePCModal open={true} onClose={onClose} onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/e.g. D:\\Projects\\my-app/) as HTMLInputElement;
    const invalidPath = "C:\\Invalid|Path?*<>";
    fireEvent.change(input, { target: { value: invalidPath } });
    expect(input.value).toBe(invalidPath);

    const selectBtn = screen.getByText("Select");
    fireEvent.click(selectBtn);

    expect(onSelect).not.toHaveBeenCalled();
    const errorText = screen.getByText("Invalid characters in path");
    expect(errorText).toBeInTheDocument();
  });
});
