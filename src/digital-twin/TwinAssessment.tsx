import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { CURRENT_USER, isNewDemoUser, personalStorageKey } from "../role-center/demoAccount";
import { useRoleStore } from "../role-center/store";
import { Dialog, Empty } from "../role-center/ui";
import { readTwinLibraries } from "./twinKnowledgeData";

type Status = "已具备" | "待补充" | "已下发";
type StatusRow = { name: string; status: Status; detail: string };
type Snapshot = { at: string; rows: StatusRow[] };
const key = () => personalStorageKey("digital-twin-assessment-status-v1");
const colors: Record<Status, string> = { 已具备: "#4d99c9", 待补充: "#d7a153", 已下发: "#6584c6" };
function load(): Snapshot[] { try { return JSON.parse(localStorage.getItem(key()) || "[]"); } catch { return []; } }
export default function TwinAssessment() {
  const store = useRoleStore();
  const [history, setHistory] = useState(load);
  const [open, setOpen] = useState(false);
  const chosen = store.personal[CURRENT_USER]?.ids || [];
  const libraries = readTwinLibraries();
  const roleCount = (store.memberships[CURRENT_USER] || []).filter((item) => item.enabled).length;
  const profile = localStorage.getItem(personalStorageKey("digital-twin-gm-profile-mind"));
  const goals = localStorage.getItem(personalStorageKey("digital-twin-gm-profile-goals"));
  const memory = localStorage.getItem(personalStorageKey("digital-twin-work-memory-v1"));
  const a2a = localStorage.getItem(`comac-a2a-settings-v1:${CURRENT_USER}`);
  const rows: StatusRow[] = [
    { name: "工作画像", status: profile === "" || (isNewDemoUser() && profile === null) ? "待补充" : "已具备", detail: profile === "" || (isNewDemoUser() && profile === null) ? "尚未建立工作画像" : "已有工作画像，可随工作方式更新" },
    { name: "目标", status: goals === "" || (isNewDemoUser() && goals === null) ? "待补充" : "已具备", detail: goals === "" || (isNewDemoUser() && goals === null) ? "尚未填写工作目标" : "由本人维护目标与验收口径" },
    { name: "工作记忆", status: memory === "" || (isNewDemoUser() && memory === null) ? "待补充" : "已具备", detail: memory === "" || (isNewDemoUser() && memory === null) ? "尚无工作记忆" : "已保存当前上下文与经验" },
    { name: "A2A 协作", status: a2a === "" || (isNewDemoUser() && a2a === null) ? "待补充" : "已具备", detail: a2a === "" || (isNewDemoUser() && a2a === null) ? "尚未设定协作偏好" : "已设定分身协作方式" },
    { name: "岗位智能体", status: roleCount ? "已下发" : "待补充", detail: roleCount ? `后台已下发 ${roleCount} 个岗位智能体` : "等待后台下发岗位智能体" },
    { name: "能力与知识", status: chosen.length || libraries.some((item) => item.enabled) ? "已具备" : "待补充", detail: `已选 ${chosen.length} 项专家 / 技能 / MCP，启用 ${libraries.filter((item) => item.enabled).length} 个知识库` },
  ];
  const signature = JSON.stringify(rows.map(({ name, status, detail }) => [name, status, detail]));
  useEffect(() => {
    const previous = load();
    if (JSON.stringify(previous[0]?.rows.map(({ name, status, detail }) => [name, status, detail])) === signature) return;
    const next = [{ at: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }), rows: JSON.parse(signature).map(([name, status, detail]: string[]) => ({ name, status, detail })) }, ...previous].slice(0, 20) as Snapshot[];
    localStorage.setItem(key(), JSON.stringify(next));
    setHistory(next);
  }, [signature]);
  const runs = store.runs.filter((run) => run.userId === CURRENT_USER);
  const rated = runs.filter((run) => run.feedback);
  const bad = rated.filter((run) => run.feedback === "bad");
  const points = rows.map((_, index) => {
    const angle = index * Math.PI / 3 - Math.PI / 2;
    return { x: 150 + Math.cos(angle) * 103, y: 150 + Math.sin(angle) * 103 };
  });
  return <section className="flat-section twin-assessment-section">
    <div className="heading"><h2>分身评测</h2><button onClick={() => setOpen(true)}><History size={15} />评测记录</button></div>
    <div className="twin-assessment-grid">
      <article className="twin-assessment-main"><div><span>配置状态</span><h3>我的分身已具备什么</h3><p>各项仅展示当前状态，不代表能力分数或岗位达标程度。</p></div>
        <div className="twin-status-visual"><svg viewBox="0 0 300 300" role="img" aria-label="六项配置状态图"><circle cx="150" cy="150" r="103" fill="none" stroke="#e4edf4" strokeWidth="2" />{points.map((point, index) => <g key={rows[index].name}><line x1="150" y1="150" x2={point.x} y2={point.y} stroke="#dbe8f1" strokeWidth="2" /><circle cx={point.x} cy={point.y} r="21" fill={colors[rows[index].status]} /><text x={point.x} y={point.y + 5} textAnchor="middle" fill="white" fontSize="15" fontWeight="700">{index + 1}</text></g>)}<circle cx="150" cy="150" r="35" fill="#e8f3fb" /><text x="150" y="155" textAnchor="middle" fill="#2f75a8" fontSize="15" fontWeight="700">分身</text></svg></div>
        <div className="twin-status-list">{rows.map((row, index) => <div key={row.name}><i style={{ background: colors[row.status] }}>{index + 1}</i><span><strong>{row.name}</strong><small>{row.detail}</small></span><em style={{ color: colors[row.status] }}>{row.status}</em></div>)}</div>
      </article>
      <article className="twin-assessment-feedback"><span>运行反馈</span><h3>任务表现留在运行记录中</h3><p>这里仅汇总本人已评价的任务，不把反馈换算为分身分数。</p><div><strong>{runs.length}<small>运行记录</small></strong><strong>{rated.length}<small>已评价</small></strong><strong>{bad.length}<small>有问题</small></strong></div><p>可在下方“对话日志”查看具体任务、问题归因和本人反馈。</p></article>
    </div>
    {open && <Dialog title="评测记录" onClose={() => setOpen(false)} wide footer={<button onClick={() => setOpen(false)}>关闭</button>}>
      {history.length ? <div className="twin-assessment-history">{history.map((record) => <article key={record.at}><strong>{record.at}</strong><span>{record.rows.map((row) => `${row.name}：${row.status}`).join(" · ")}</span></article>)}</div> : <Empty title="暂无历史评测记录" />}
    </Dialog>}
  </section>;
}
