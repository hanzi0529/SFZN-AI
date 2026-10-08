import { isNewDemoUser, personalStorageKey } from "../role-center/demoAccount";

export type Item = { id: string; name: string; kind: "file" | "note"; content?: string; at: string };
export type Library = { id: string; name: string; kind: "enterprise" | "personal"; enabled: boolean; items: Item[] };
export const twinKnowledgeKey = () => personalStorageKey("digital-twin-knowledge-folders-v1");
const seed: Library[] = [
  { id: "company-projects", name: "重点项目资料库", kind: "enterprise", enabled: true, items: [{ id: "e1", name: "项目计划基线.pdf", kind: "file", at: "2026-09-15" }, { id: "e2", name: "项目验收清单.docx", kind: "file", at: "2026-09-15" }] },
  { id: "company-rules", name: "企业制度资料库", kind: "enterprise", enabled: true, items: [{ id: "e3", name: "对外材料管理制度.pdf", kind: "file", at: "2026-09-15" }] },
  { id: "my-projects", name: "我的项目经验", kind: "personal", enabled: true, items: [{ id: "p1", name: "项目复盘.docx", kind: "file", at: "2026-09-18" }, { id: "p2", name: "风险判断笔记.md", kind: "note", content: "# 风险判断笔记\n复盘风险时，先核对计划基线、受影响节点、责任人和下一步措施。", at: "2026-09-20" }] },
  { id: "my-methods", name: "我的工作方法", kind: "personal", enabled: false, items: [{ id: "p3", name: "经营差异分析.md", kind: "note", content: "# 经营差异分析\n先区分付款时点变化、范围调整和实际节约。", at: "2026-09-22" }] },
];
export function readTwinLibraries(): Library[] {
  const initial = isNewDemoUser() ? seed.filter((folder) => folder.kind === "enterprise").map((folder) => ({ ...folder, enabled: false })) : seed;
  try { return JSON.parse(localStorage.getItem(twinKnowledgeKey()) || "null") || initial; }
  catch { return initial; }
}
