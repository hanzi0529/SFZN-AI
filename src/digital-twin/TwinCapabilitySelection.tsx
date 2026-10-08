import { useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { CURRENT_USER, isNewDemoUser } from "../role-center/demoAccount";
import type { ResourceKind } from "../role-center/domain";
import { actions, useRoleStore } from "../role-center/store";
import { Empty } from "../role-center/ui";

type Mode = "normal" | "advanced" | "professional";
type View = Mode | "mine" | "market" | "configured";
const labels: Record<Exclude<ResourceKind, "model">, string> = { expert: "专家", skill: "技能", mcp: "MCP" };
const icons: Record<Exclude<ResourceKind, "model">, string> = { expert: "专", skill: "技", mcp: "M" };
const modeLabels: Record<Mode, string> = { normal: "普通模式", advanced: "高级模式", professional: "专业模式" };
const displayName = (id: string, name: string) => ({ e3: "项目管理专家（通用）", m4: "经营数据平台（通用）" })[id] || name;
// Demo classification mirrors the September PC plaza; production mode metadata comes from the capability catalog.
const expertModes: Record<string, Mode[]> = {
  e1: ["professional"], e2: ["professional"], e3: ["normal", "advanced"], e4: ["advanced"],
  "gm-project-expert": ["advanced"], "gm-finance-expert": ["normal", "advanced"], "gm-business-expert": ["professional"],
};
const mcpModes: Record<string, Mode[]> = {
  "gm-project-platform": ["advanced", "professional"], "gm-finance-platform": ["normal", "advanced"],
  "gm-business-platform": ["professional"], m1: ["normal", "advanced", "professional"], m2: ["advanced", "professional"],
  m3: ["normal", "advanced"], m4: ["professional"], m5: ["advanced"], m6: ["advanced"],
};
const myExpertIds = new Set(["gm-project-expert", "gm-finance-expert", "gm-business-expert"]);
const mySkillIds = new Set(["gm-project-query", "gm-progress-query", "gm-project-risk", "gm-finance-query", "gm-budget-analysis", "gm-business-brief"]);
const tabs: Record<Exclude<ResourceKind, "model">, { id: View; label: string }[]> = {
  expert: [{ id: "configured", label: "已配置专家" }, { id: "market", label: "专家市场" }],
  skill: [{ id: "configured", label: "已配置技能" }, { id: "mine", label: "我的技能" }],
  mcp: [{ id: "configured", label: "已配置 MCP" }, { id: "market", label: "MCP 广场" }],
};
const expertMarketTabs: { id: Mode | "mine"; label: string }[] = [
  { id: "normal", label: "普通模式" }, { id: "advanced", label: "高级模式" },
  { id: "professional", label: "专业模式" }, { id: "mine", label: "我的" },
];

export default function TwinCapabilitySelection({ kind }: { kind: Exclude<ResourceKind, "model"> }) {
  const store = useRoleStore();
  const [view, setView] = useState<View>("configured");
  const [expertMarketView, setExpertMarketView] = useState<Mode | "mine">("normal");
  const [query, setQuery] = useState("");
  const selected = new Set(store.personal[CURRENT_USER]?.ids || []);
  const resources = store.resources.filter((resource) => resource.kind === kind);
  const activeView = kind === "expert" && view === "market" ? expertMarketView : view;
  const visible = resources.filter((resource) => {
    if (!`${displayName(resource.id, resource.name)}${resource.description}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (activeView === "configured") return selected.has(resource.id);
    if (activeView === "mine") return !isNewDemoUser() && (kind === "expert" ? myExpertIds.has(resource.id) : mySkillIds.has(resource.id));
    if (activeView === "market") return true;
    return (expertModes[resource.id] || ["normal"]).includes(activeView);
  });
  const label = labels[kind];
  const selectedCount = resources.filter((resource) => selected.has(resource.id)).length;
  return <div className="twin-marketplace">
    <header><div><h2>{label}</h2><p>浏览可用{label}，选择当前分身要使用的能力。</p></div><span>{selectedCount} 项已选</span></header>
    <div className="twin-market-toolbar">
      <nav className="twin-market-tabs" aria-label={`${label}分类`}>{tabs[kind].map((tab) => <button key={tab.id} className={view === tab.id ? "active" : ""} onClick={() => setView(tab.id)}>{tab.label}</button>)}</nav>
      <label className="twin-market-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label={`搜索${label}`} placeholder={`搜索${label}名称`} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    {kind === "expert" && view === "market" && <nav className="twin-expert-subtabs" aria-label="专家市场分类">{expertMarketTabs.map((tab) => <button key={tab.id} className={expertMarketView === tab.id ? "active" : ""} onClick={() => setExpertMarketView(tab.id)}>{tab.label}</button>)}</nav>}
    <div className="twin-market-grid">{visible.map((resource) => {
      const chosen = selected.has(resource.id);
      const modes = kind === "expert" ? expertModes[resource.id] || ["normal"] : kind === "mcp" ? mcpModes[resource.id] || ["normal"] : [];
      const name = displayName(resource.id, resource.name);
      return <article className={`twin-market-card ${kind === "expert" ? "is-expert" : ""} ${chosen ? "is-chosen" : ""}`} key={resource.id}>
        <i>{icons[kind]}</i><div><h3>{name}</h3>{modes.length > 0 && <div className="twin-market-tags">{modes.map((mode) => <span key={mode}>{modeLabels[mode]}</span>)}</div>}</div>
        <p>{resource.description}</p>
        <footer>{kind !== "expert" && <span role="switch" aria-label={`${name}的启用状态（只读）`} aria-checked={resource.active} aria-disabled="true" className={`twin-readonly-switch ${resource.active ? "on" : ""}`} />}<button className={`twin-select-action ${chosen ? "selected" : ""}`} aria-label={`${chosen ? "从分身移除" : "加入分身"}${name}`} title={chosen ? "从分身移除" : "加入分身"} onClick={() => actions.twinSelectResource(resource.id, !chosen)}>{chosen ? <Minus size={16} /> : <Plus size={16} />}</button></footer>
      </article>;
    })}</div>
    {!visible.length && <Empty title={activeView === "configured" ? `当前分身还没有配置${label}` : activeView === "mine" ? `我的${label}中暂无可选项` : `没有匹配的${label}`} />}
  </div>;
}
